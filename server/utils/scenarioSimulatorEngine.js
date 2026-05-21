const { buildAssetCarbonReport, computeTrackFittingCarbonProfile } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const COST_PER_KG_CO2 = 0.045;
const COST_PER_MAINTENANCE_KG = 2.8;
const COST_PER_TRANSPORT_KM = 0.22;

const SCENARIO_DEFINITIONS = [
  {
    id: 'recycled_materials',
    question: 'What if recycled materials are used?',
    label: 'Recycled materials',
    icon: 'recycle',
    description:
      'Portfolio-wide shift to recycled alloys and high-recyclability components — lower embodied carbon in manufacturing.',
    color: '#22c55e',
    apply: (item) => {
      const material = (item.material || item.itemType || 'steel').toLowerCase();
      const baseMfg = Number(item.manufacturingEmissionsKgCO2 || 0);
      const weight = Number(item.weight || 50);
      const recycledMfg = baseMfg > 0 ? round2(baseMfg * 0.72) : round2(weight * 1.2);
      return {
        ...item,
        recyclabilityPercent: Math.max(Number(item.recyclabilityPercent || 0), 85),
        manufacturingEmissionsKgCO2: recycledMfg,
        material: material.includes('steel') ? 'steel' : item.material
      };
    }
  },
  {
    id: 'reduced_inspections',
    question: 'What if inspections are reduced?',
    label: 'Reduced inspections',
    icon: 'inspection',
    description:
      'Smart inspection scheduling — fewer routine visits where condition data shows low risk, cutting maintenance CO₂.',
    color: '#0ea5e9',
    apply: (item) => {
      const freq = Number(item.maintenanceFrequencyPerYear || 2);
      const reduced = clamp(Math.round(freq * 0.6 * 10) / 10, 1, freq);
      const maint = Array.isArray(item.maintenance) ? item.maintenance : [];
      const trimmedCount = Math.max(0, Math.floor(maint.length * 0.55));
      return {
        ...item,
        maintenanceFrequencyPerYear: reduced,
        maintenance: maint.slice(0, trimmedCount)
      };
    }
  },
  {
    id: 'optimized_routes',
    question: 'What if maintenance routes are optimized?',
    label: 'Optimized routes',
    icon: 'route',
    description:
      'Eco-route consolidation — combined corridor runs, rail-preferred logistics, and shorter inspection travel.',
    color: '#6366f1',
    apply: (item) => {
      const dist = Number(item.transportDistanceKm || 0);
      return {
        ...item,
        transportMode: 'rail',
        transportDistanceKm: dist > 0 ? round2(dist * 0.55) : dist,
        fuelConsumptionLiters: round2(Number(item.fuelConsumptionLiters || 0) * 0.5)
      };
    }
  }
];

const simulateItem = (item, applyFn) => {
  const baseline = computeTrackFittingCarbonProfile(item);
  const modified = applyFn({ ...item });
  const projected = computeTrackFittingCarbonProfile(modified);
  const carbonSaved = round2(Math.max(0, baseline.totalEmissionsCO2 - projected.totalEmissionsCO2));
  const scoreDelta = round2(projected.sustainabilityScore - baseline.sustainabilityScore);

  const maintSaved = round2(
    Math.max(0, baseline.carbonBreakdown.maintenanceEmissions - projected.carbonBreakdown.maintenanceEmissions)
  );
  const transportSaved = round2(
    Math.max(
      0,
      baseline.carbonBreakdown.transportEmissions +
        baseline.carbonBreakdown.transportFuelEmissions -
        (projected.carbonBreakdown.transportEmissions + projected.carbonBreakdown.transportFuelEmissions)
    )
  );
  const materialSaved = round2(
    Math.max(0, baseline.carbonBreakdown.materialEmissions - projected.carbonBreakdown.materialEmissions)
  );

  let costSaved = round2(carbonSaved * COST_PER_KG_CO2 + maintSaved * COST_PER_MAINTENANCE_KG);
  if (transportSaved > 0) {
    const kmEstimate = Number(item.transportDistanceKm || 0) * 0.45;
    costSaved = round2(costSaved + kmEstimate * COST_PER_TRANSPORT_KM);
  }
  if (materialSaved > 0) costSaved = round2(costSaved + materialSaved * 1.1);

  return {
    baseline,
    projected,
    carbonReductionKg: carbonSaved,
    costSavingsUsd: costSaved,
    sustainabilityScoreDelta: scoreDelta,
    gradeImproved: projected.sustainabilityRating < baseline.sustainabilityRating,
    breakdown: {
      maintenanceKg: maintSaved,
      transportKg: transportSaved,
      materialKg: materialSaved,
      energyKg: round2(
        Math.max(0, baseline.carbonBreakdown.energyEmissions - projected.carbonBreakdown.energyEmissions)
      )
    }
  };
};

const simulatePortfolio = (profiles, applyFn) => {
  if (!profiles.length) {
    return {
      carbonReductionKg: 0,
      carbonReductionPercent: 0,
      costSavingsUsd: 0,
      sustainabilityImprovement: 0,
      assetsImproved: 0,
      baselineTotalKg: 0,
      projectedTotalKg: 0,
      baselineAvgScore: 0,
      projectedAvgScore: 0,
      fiveYearSavingsKg: 0
    };
  }

  let baselineTotal = 0;
  let projectedTotal = 0;
  let baselineScoreSum = 0;
  let projectedScoreSum = 0;
  let costTotal = 0;
  let carbonSavedTotal = 0;
  let assetsImproved = 0;
  let fiveYearDelta = 0;

  profiles.forEach((item) => {
    const result = simulateItem(item, applyFn);
    baselineTotal += result.baseline.totalEmissionsCO2;
    projectedTotal += result.projected.totalEmissionsCO2;
    baselineScoreSum += result.baseline.sustainabilityScore;
    projectedScoreSum += result.projected.sustainabilityScore;
    costTotal += result.costSavingsUsd;
    carbonSavedTotal += result.carbonReductionKg;
    if (result.gradeImproved || result.sustainabilityScoreDelta > 2) assetsImproved += 1;
    fiveYearDelta +=
      result.baseline.predictedFiveYearEmissions - result.projected.predictedFiveYearEmissions;
  });

  const n = profiles.length;
  const carbonReductionPercent =
    baselineTotal > 0 ? round2((carbonSavedTotal / baselineTotal) * 100) : 0;

  return {
    carbonReductionKg: round2(carbonSavedTotal),
    carbonReductionPercent,
    costSavingsUsd: round2(costTotal),
    sustainabilityImprovement: round2(projectedScoreSum / n - baselineScoreSum / n),
    assetsImproved,
    assetsImprovedPercent: round2((assetsImproved / n) * 100),
    baselineTotalKg: round2(baselineTotal),
    projectedTotalKg: round2(projectedTotal),
    baselineAvgScore: round2(baselineScoreSum / n),
    projectedAvgScore: round2(projectedScoreSum / n),
    fiveYearSavingsKg: round2(Math.max(0, fiveYearDelta))
  };
};

const buildScenarioResult = (definition, profiles, carbonReport) => {
  const impact = simulatePortfolio(profiles, definition.apply);
  const narrative = buildNarrative(definition, impact);

  return {
    id: definition.id,
    question: definition.question,
    label: definition.label,
    description: definition.description,
    icon: definition.icon,
    color: definition.color,
    predictions: {
      carbonReduction: {
        kg: impact.carbonReductionKg,
        percent: impact.carbonReductionPercent,
        fiveYearKg: impact.fiveYearSavingsKg,
        label: `${impact.carbonReductionKg.toLocaleString()} kg CO₂ reduced`
      },
      costSavings: {
        usd: impact.costSavingsUsd,
        label: `$${impact.costSavingsUsd.toLocaleString()} estimated savings`
      },
      sustainabilityImprovement: {
        scoreDelta: impact.sustainabilityImprovement,
        baselineScore: impact.baselineAvgScore,
        projectedScore: impact.projectedAvgScore,
        assetsImproved: impact.assetsImproved,
        assetsImprovedPercent: impact.assetsImprovedPercent,
        label: `+${impact.sustainabilityImprovement} avg sustainability score`
      }
    },
    impact,
    aiNarrative: narrative,
    confidence: impact.carbonReductionPercent >= 12 ? 'high' : impact.carbonReductionPercent >= 5 ? 'medium' : 'low'
  };
};

const buildNarrative = (definition, impact) => {
  if (impact.carbonReductionKg <= 0) {
    return `Scenario "${definition.label}" shows minimal change with current data — add transport, maintenance, and material fields to unlock stronger predictions.`;
  }
  const parts = [
    `AI predicts **${impact.carbonReductionKg.toLocaleString()} kg CO₂** reduction (${impact.carbonReductionPercent}%) across **${impact.assetsImproved}** improved assets.`,
    `Estimated cost savings: **$${impact.costSavingsUsd.toLocaleString()}** (operations + carbon value).`,
    `Sustainability score improves from **${impact.baselineAvgScore}** → **${impact.projectedAvgScore}** (+${impact.sustainabilityImprovement}).`
  ];
  if (impact.fiveYearSavingsKg > 0) {
    parts.push(`Five-year operational emissions drop by **${impact.fiveYearSavingsKg.toLocaleString()} kg**.`);
  }
  return parts.join(' ');
};

const runCombinedScenario = (profiles) => {
  const applyCombined = (item) => {
    let merged = { ...item };
    SCENARIO_DEFINITIONS.forEach((def) => {
      merged = def.apply(merged);
    });
    return merged;
  };
  const impact = simulatePortfolio(profiles, applyCombined);
  const overlapFactor = 0.72;
  return {
    id: 'all_scenarios',
    label: 'All scenarios combined',
    question: 'What if all three optimizations are applied?',
    predictions: {
      carbonReduction: {
        kg: round2(impact.carbonReductionKg * overlapFactor),
        percent: round2(impact.carbonReductionPercent * overlapFactor)
      },
      costSavings: { usd: round2(impact.costSavingsUsd * overlapFactor) },
      sustainabilityImprovement: {
        scoreDelta: round2(impact.sustainabilityImprovement * 1.05)
      }
    },
    impact: {
      ...impact,
      carbonReductionKg: round2(impact.carbonReductionKg * overlapFactor),
      costSavingsUsd: round2(impact.costSavingsUsd * overlapFactor),
      note: 'Combined estimate applies 72% overlap factor to avoid double-counting.'
    }
  };
};

const runScenarioSimulator = (trackFittings = [], options = {}) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const profiles = carbonReport.profiles;

  const scenarios = SCENARIO_DEFINITIONS.map((def) =>
    buildScenarioResult(def, profiles, carbonReport)
  );

  const combined = runCombinedScenario(profiles);
  const activeId = options.scenarioId || scenarios[0]?.id;
  const activeScenario = scenarios.find((s) => s.id === activeId) || scenarios[0];

  const comparisonChart = {
    labels: ['Baseline', ...scenarios.map((s) => s.label)],
    baselineKg: carbonReport.totalEmissionsCO2,
    values: [
      carbonReport.totalEmissionsCO2,
      ...scenarios.map((s) => s.impact.projectedTotalKg)
    ],
    savings: scenarios.map((s) => s.impact.carbonReductionKg)
  };

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'Sustainability Scenario Simulator',
    baseline: {
      totalEmissionsKg: carbonReport.totalEmissionsCO2,
      totalAssets: carbonReport.totalAssets,
      averageSustainabilityScore: carbonReport.averageSustainabilityScore,
      projectedFiveYearKg: carbonReport.projectedNext5Years,
      annualRecurringKg: carbonReport.strategyForecast?.annualRecurringTotal || 0
    },
    scenarios,
    combined,
    activeScenarioId: activeScenario?.id,
    comparisonChart,
    insights: [
      `Baseline portfolio: **${carbonReport.totalEmissionsCO2.toLocaleString()} kg CO₂** across **${carbonReport.totalAssets}** assets.`,
      scenarios[0] &&
        `Strongest single scenario: **${[...scenarios].sort((a, b) => b.impact.carbonReductionKg - a.impact.carbonReductionKg)[0].label}** saves **${[...scenarios].sort((a, b) => b.impact.carbonReductionKg - a.impact.carbonReductionKg)[0].impact.carbonReductionKg.toLocaleString()} kg**.`,
      `Run what-if simulations before capital planning — AI outputs carbon, cost, and score impacts instantly.`
    ]
  };
};

const runScenarioById = (trackFittings, scenarioId) => {
  const def = SCENARIO_DEFINITIONS.find((s) => s.id === scenarioId);
  if (!def) return null;
  const carbonReport = buildAssetCarbonReport(trackFittings);
  return buildScenarioResult(def, carbonReport.profiles, carbonReport);
};

module.exports = {
  runScenarioSimulator,
  runScenarioById,
  SCENARIO_DEFINITIONS,
  simulatePortfolio
};
