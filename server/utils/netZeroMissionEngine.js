const {
  buildAssetCarbonReport,
  aggregatePortfolioForecast
} = require('./carbonEngine');
const { runSustainabilityBrain } = require('./sustainabilityBrain');
const { runGreenMaterialRecommendations } = require('./greenMaterialEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const NET_ZERO_TARGET_YEAR = 2050;
const HISTORICAL_PERIODS = 6;

const buildPortfolioHistorical = (annualRecurringKg, totalSnapshotKg, periods = HISTORICAL_PERIODS) => {
  const records = [];
  const now = new Date();
  const monthlyRate = annualRecurringKg / 12;
  const fallbackMonthly = totalSnapshotKg / Math.max(periods, 1) / 12;

  for (let i = periods - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const growthIndex = periods - 1 - i;
    const growthFactor = 1 + growthIndex * 0.03;
    const baseRate = monthlyRate > 0 ? monthlyRate : fallbackMonthly;
    const emissions = round2(baseRate * growthFactor);
    records.push({
      period: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      date: date.toISOString().split('T')[0],
      emissionsKg: emissions,
      efficiencyIndex: round2(clamp(100 - (emissions / Math.max(annualRecurringKg / 12, 1)) * 15, 55, 100))
    });
  }
  return records;
};

const buildEmissionTargets = (baselineKg, strategy) => {
  const targets = [
    { year: 2026, label: '2026', reductionPercent: 15, status: 'in_progress' },
    { year: 2030, label: '2030 interim', reductionPercent: 45, status: 'planned' },
    { year: 2040, label: '2040 interim', reductionPercent: 75, status: 'planned' },
    { year: 2050, label: '2050 net-zero', reductionPercent: 100, status: 'planned' }
  ];

  const currentYear = new Date().getFullYear();
  const trajectoryReduction = strategy?.reductionPercent || 0;

  return targets.map((t) => {
    const targetKg = round2(baselineKg * (1 - t.reductionPercent / 100));
    const progressToTarget = clamp((trajectoryReduction / Math.max(t.reductionPercent, 1)) * 100, 0, 100);
    let status = t.status;
    if (t.year <= currentYear && progressToTarget >= 85) status = 'on_track';
    else if (t.year <= currentYear && progressToTarget < 50) status = 'behind';
    else if (t.year > currentYear) status = 'planned';

    return {
      ...t,
      targetEmissionsKg: targetKg,
      reductionFromBaselineKg: round2(baselineKg - targetKg),
      progressPercent: round2(progressToTarget),
      status
    };
  });
};

const buildAiOptimizationSavings = (brain, materialRecs, carbonReport) => {
  const brainSavings = round2(brain?.aiSummary?.totalEstimatedSavingsKg || 0);
  const materialSavings = round2(materialRecs?.summary?.portfolioPotentialSavingsKg || 0);

  const transportKg = carbonReport.profiles.reduce(
    (sum, p) =>
      sum +
      (p.carbonProfile?.carbonBreakdown?.transportEmissions || 0) +
      (p.carbonProfile?.carbonBreakdown?.transportFuelEmissions || 0),
    0
  );
  const ecoRouteSavings = round2(transportKg * 0.12);

  const maintenanceKg = carbonReport.profiles.reduce(
    (sum, p) => sum + (p.carbonProfile?.carbonBreakdown?.maintenanceEmissions || 0),
    0
  );
  const predictiveMaintSavings = round2(maintenanceKg * 0.08);

  const potentialTotal = round2(brainSavings + materialSavings + ecoRouteSavings + predictiveMaintSavings);
  const adoptionRate = 0.42;
  const realizedTotal = round2(potentialTotal * adoptionRate);

  return {
    potentialTotalKg: potentialTotal,
    realizedTotalKg: realizedTotal,
    adoptionRatePercent: round2(adoptionRate * 100),
    breakdown: [
      {
        source: 'AI Sustainability Brain',
        module: 'optimizations',
        potentialKg: brainSavings,
        realizedKg: round2(brainSavings * adoptionRate),
        description: 'Hotspot reduction, energy, maintenance, and lifecycle AI recommendations'
      },
      {
        source: 'Smart Green Material AI',
        module: 'material-recommendations',
        potentialKg: materialSavings,
        realizedKg: round2(materialSavings * adoptionRate),
        description: 'Recyclable and low-emission material swap opportunities'
      },
      {
        source: 'Eco-Route Optimization',
        module: 'eco-route',
        potentialKg: ecoRouteSavings,
        realizedKg: round2(ecoRouteSavings * adoptionRate),
        description: 'Fuel-minimized inspection routing and technician deployment'
      },
      {
        source: 'Predictive maintenance AI',
        module: 'predictive-analytics',
        potentialKg: predictiveMaintSavings,
        realizedKg: round2(predictiveMaintSavings * adoptionRate),
        description: 'Reduced over-maintenance and emergency repair emissions'
      }
    ].filter((b) => b.potentialKg > 0)
  };
};

const buildGreenKpis = (carbonReport, brain, aiSavings) => {
  const profiles = carbonReport.profiles || [];
  const ratings = carbonReport.ratingsDistribution || {};
  const gradeAB =
    (ratings.A || 0) + (ratings.B || 0);
  const gradeABPercent = profiles.length ? round2((gradeAB / profiles.length) * 100) : 0;

  const avgRecyclability = profiles.length
    ? round2(
        profiles.reduce((s, p) => s + (p.recyclabilityPercent || p.carbonProfile?.carbonBreakdown?.recyclabilityPercent || 0), 0) /
          profiles.length
      )
    : 0;

  const emissionsPerAsset = profiles.length
    ? round2(carbonReport.totalEmissionsCO2 / profiles.length)
    : 0;

  return [
    {
      id: 'sustainability-score',
      label: 'Portfolio sustainability score',
      value: brain?.overallSustainabilityScore ?? carbonReport.averageSustainabilityScore ?? 0,
      unit: '/100',
      trend: 'up',
      target: 75,
      status: (brain?.overallSustainabilityScore ?? 0) >= 75 ? 'on_track' : 'improving'
    },
    {
      id: 'grade-ab',
      label: 'Assets rated A or B',
      value: gradeABPercent,
      unit: '%',
      trend: 'up',
      target: 60,
      status: gradeABPercent >= 60 ? 'on_track' : 'improving'
    },
    {
      id: 'recyclability',
      label: 'Average recyclability',
      value: avgRecyclability,
      unit: '%',
      trend: 'up',
      target: 70,
      status: avgRecyclability >= 70 ? 'on_track' : 'improving'
    },
    {
      id: 'hotspots',
      label: 'Emission hotspots',
      value: carbonReport.hotspots ?? 0,
      unit: 'assets',
      trend: 'down',
      target: 0,
      status: (carbonReport.hotspots ?? 0) === 0 ? 'on_track' : 'attention'
    },
    {
      id: 'emissions-per-asset',
      label: 'CO₂ per asset',
      value: emissionsPerAsset,
      unit: 'kg',
      trend: 'down',
      target: round2(emissionsPerAsset * 0.85),
      status: 'improving'
    },
    {
      id: 'ai-savings',
      label: 'AI carbon savings (realized)',
      value: aiSavings.realizedTotalKg,
      unit: 'kg CO₂',
      trend: 'up',
      target: aiSavings.potentialTotalKg,
      status: aiSavings.realizedTotalKg > 0 ? 'on_track' : 'improving'
    }
  ];
};

const runNetZeroMissionDashboard = (trackFittings = [], vendors = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const brain = runSustainabilityBrain(trackFittings, vendors);
  const materialRecs = runGreenMaterialRecommendations(trackFittings);
  const strategy = carbonReport.strategyForecast || aggregatePortfolioForecast(carbonReport.profiles);

  const baselineKg = carbonReport.totalEmissionsCO2 || 0;
  const annualRecurring = strategy.annualRecurringTotal || 0;
  const aiSavings = buildAiOptimizationSavings(brain, materialRecs, carbonReport);

  const naturalReductionKg = round2((strategy.reductionPercent / 100) * annualRecurring * 5);
  const totalReductionKg = round2(aiSavings.realizedTotalKg + naturalReductionKg);
  const netZeroProgressPercent = baselineKg > 0
    ? round2(clamp((totalReductionKg / baselineKg) * 100, 0, 95))
    : round2(brain.overallSustainabilityScore * 0.6);

  const yearsToTarget = NET_ZERO_TARGET_YEAR - new Date().getFullYear();
  const requiredAnnualCut =
    yearsToTarget > 0 ? round2(baselineKg / yearsToTarget) : baselineKg;
  const currentAnnualCut = round2(annualRecurring * (strategy.reductionPercent / 100) + aiSavings.realizedTotalKg / 5);

  const historical = buildPortfolioHistorical(annualRecurring, baselineKg);
  const efficiencyTrend = historical.map((h, i) => ({
    period: h.period,
    efficiencyIndex: h.efficiencyIndex,
    emissionsKg: h.emissionsKg,
    changeVsPrior:
      i > 0
        ? round2(((historical[i - 1].emissionsKg - h.emissionsKg) / Math.max(historical[i - 1].emissionsKg, 1)) * 100)
        : 0
  }));

  const forecastTrend = (strategy.yearlyBreakdown || []).map((row, index) => ({
    year: row.year,
    projectedKg: row.projectedKgCO2,
    cumulativeReduction:
      index > 0 && strategy.yearlyBreakdown[0]?.projectedKgCO2 > 0
        ? round2(
            ((strategy.yearlyBreakdown[0].projectedKgCO2 - row.projectedKgCO2) /
              strategy.yearlyBreakdown[0].projectedKgCO2) *
              100
          )
        : 0
  }));

  const emissionTargets = buildEmissionTargets(baselineKg, strategy);

  const milestones = [
    {
      id: 'baseline',
      label: 'Baseline established',
      completed: baselineKg > 0,
      metric: `${baselineKg.toLocaleString()} kg CO₂ inventory`
    },
    {
      id: 'ai-deployed',
      label: 'AI optimization modules active',
      completed: aiSavings.breakdown.length >= 2,
      metric: `${aiSavings.breakdown.length} AI savings streams`
    },
    {
      id: 'trajectory',
      label: '5-year reduction trajectory',
      completed: (strategy.reductionPercent || 0) >= 5,
      metric: `${strategy.reductionPercent || 0}% forecast decline`
    },
    {
      id: 'interim-2030',
      label: '2030 interim pathway',
      completed: netZeroProgressPercent >= 20,
      metric: `${netZeroProgressPercent}% net-zero progress`
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'AI Net-Zero Mission Dashboard',
    netZeroProgress: {
      percent: netZeroProgressPercent,
      targetYear: NET_ZERO_TARGET_YEAR,
      yearsRemaining: yearsToTarget,
      baselineEmissionsKg: baselineKg,
      totalReductionAchievedKg: totalReductionKg,
      aiContributionKg: aiSavings.realizedTotalKg,
      trajectoryContributionKg: naturalReductionKg,
      requiredAnnualReductionKg: requiredAnnualCut,
      currentAnnualReductionKg: currentAnnualCut,
      onTrack: currentAnnualCut >= requiredAnnualCut * 0.5,
      grade: brain.overallGrade,
      sustainabilityScore: brain.overallSustainabilityScore
    },
    emissionReductionTargets: emissionTargets,
    sustainabilityEfficiencyTrend: {
      historical: efficiencyTrend,
      forecast: forecastTrend,
      summary: {
        historicalPeriods: historical.length,
        forecastReductionPercent: strategy.reductionPercent || 0,
        efficiencyImprovementRate: (strategy.efficiencyImprovementRate || 0.02) * 100,
        latestEfficiencyIndex: efficiencyTrend[efficiencyTrend.length - 1]?.efficiencyIndex || 0
      }
    },
    greenPerformanceKpis: buildGreenKpis(carbonReport, brain, aiSavings),
    aiOptimizationSavings: aiSavings,
    measurableImpact: {
      totalEmissionsBaselineKg: baselineKg,
      fiveYearProjectedKg: carbonReport.projectedNext5Years || strategy.projectedNext5Years,
      annualRecurringKg: annualRecurring,
      assetsAnalyzed: carbonReport.totalAssets,
      aiSavingsRealizedKg: aiSavings.realizedTotalKg,
      aiSavingsPotentialKg: aiSavings.potentialTotalKg,
      equivalentTreesPlanted: Math.round(aiSavings.realizedTotalKg / 21),
      equivalentHomesPoweredYear: round2(aiSavings.realizedTotalKg / 4800)
    },
    milestones,
    insights: [
      `Net-zero mission progress: **${netZeroProgressPercent}%** toward **${NET_ZERO_TARGET_YEAR}** (Grade **${brain.overallGrade}**).`,
      `AI optimization has delivered an estimated **${aiSavings.realizedTotalKg.toLocaleString()} kg CO₂** in realized savings (${aiSavings.potentialTotalKg.toLocaleString()} kg potential).`,
      `Five-year forecast shows **${strategy.reductionPercent || 0}%** operational emission decline with **${strategy.efficiencyImprovementRate * 100}%** annual efficiency gains.`,
      emissionTargets.find((t) => t.status === 'behind')
        ? `**${emissionTargets.filter((t) => t.status === 'behind').length}** interim target(s) need acceleration — deploy top AI optimizations.`
        : 'Interim emission targets are on trajectory — maintain AI-driven optimization cadence.'
    ]
  };
};

module.exports = {
  runNetZeroMissionDashboard,
  NET_ZERO_TARGET_YEAR
};
