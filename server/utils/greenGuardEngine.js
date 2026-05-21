const axios = require('axios');
const {
  buildAssetCarbonReport,
  computeTrackFittingCarbonProfile,
  computeVendorCarbonScore
} = require('./carbonEngine');
const { runSustainabilityBrain } = require('./sustainabilityBrain');
const { buildAssetTwinNode } = require('./digitalTwinEngine');

const round2 = (value) => Math.round(value * 100) / 100;

const SIMULATION_PRESETS = [
  {
    id: 'rail-green',
    label: 'Switch to rail transport + high recyclability',
    scenarios: { transportMode: 'rail', recyclability: 0.85 }
  },
  {
    id: 'steel-light',
    label: 'Lighter steel grade + preventive maintenance',
    scenarios: { material: 'steel', maintenanceFrequencyPerYear: 1, recyclability: 0.7 }
  },
  {
    id: 'net-zero-prep',
    label: 'Net-zero prep: rail + LED energy cut + extended life',
    scenarios: { transportMode: 'rail', energyUsageKWh: 40, serviceLife: 30, recyclability: 0.9 }
  }
];

const buildFleetContext = (trackFittings, vendors) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const brain = runSustainabilityBrain(trackFittings, vendors);
  const vendorScores = vendors.map((v) => computeVendorCarbonScore(v));

  const profiles = carbonReport.profiles.map((item) => ({
    id: item._id,
    serialNumber: item.serialNumber,
    itemType: item.itemType,
    vendorName: item.vendorName,
    profile: item.carbonProfile
  }));

  const worst = [...profiles].sort(
    (a, b) => b.profile.totalEmissionsCO2 - a.profile.totalEmissionsCO2
  )[0];
  const best = [...profiles].sort(
    (a, b) => a.profile.totalEmissionsCO2 - b.profile.totalEmissionsCO2
  )[0];

  return { carbonReport, brain, vendorScores, profiles, worst, best };
};

const buildInsights = (ctx) => {
  const { carbonReport, brain } = ctx;
  const alerts = (brain.riskAlerts || []).slice(0, 6).map((a) => ({
    title: a.title,
    message: a.message,
    severity: a.severity
  }));

  return {
    alerts,
    narrative: {
      executiveSummary: `Portfolio sustainability score is **${brain.overallSustainabilityScore}** (Grade **${brain.overallGrade}**) across **${carbonReport.totalAssets}** assets with **${carbonReport.totalEmissionsCO2.toLocaleString()} kg** total CO₂ footprint.`,
      insights: [
        `Projected 5-year operational emissions: **${carbonReport.projectedNext5Years?.toLocaleString() || 0} kg**`,
        `Active emission hotspots: **${carbonReport.hotspots}** asset(s)`,
        `Top priority: ${brain.optimizations[0]?.title || 'Maintain current green trajectory'}`
      ]
    }
  };
};

const buildPathways = (ctx) => {
  const base = ctx.carbonReport.totalEmissionsCO2 || 1000;
  const recurring = ctx.carbonReport.strategyForecast?.annualRecurringTotal || base * 0.2;
  const targetYear = 2050;
  const currentYear = new Date().getFullYear();

  const makeMilestones = (reductionRate) => {
    const milestones = [];
    for (let y = currentYear; y <= targetYear; y += 5) {
      const yearsOut = y - currentYear;
      const factor = Math.pow(1 - reductionRate, yearsOut / 5);
      milestones.push({ year: y, emissionsKg: round2((base + recurring * 5) * factor) });
    }
    return milestones;
  };

  const pathways = [
    {
      id: 'aggressive',
      name: 'Accelerated decarbonization',
      color: '#22c55e',
      description: 'Fast-track material substitution and rail logistics',
      reductionPercent: 45,
      onTrack: true,
      milestones: makeMilestones(0.08)
    },
    {
      id: 'balanced',
      name: 'Balanced pathway',
      color: '#3b82f6',
      description: 'Steady efficiency gains aligned with fleet renewal',
      reductionPercent: 32,
      onTrack: true,
      milestones: makeMilestones(0.05)
    },
    {
      id: 'conservative',
      name: 'Conservative pathway',
      color: '#eab308',
      description: 'Minimal disruption; maintenance-led improvements',
      reductionPercent: 18,
      onTrack: ctx.brain.overallSustainabilityScore >= 55,
      milestones: makeMilestones(0.03)
    }
  ];

  return {
    targetYear,
    pathways,
    aiRecommendation:
      ctx.brain.overallSustainabilityScore >= 70
        ? 'Fleet is on track — prioritize the balanced pathway while piloting accelerated decarbonization on hotspot segments.'
        : 'Adopt the accelerated pathway for hotspot assets and enforce green procurement on vendors scoring below 50.'
  };
};

const buildLeaderboard = (ctx) => {
  const topGreenAssets = [...ctx.profiles]
    .sort((a, b) => b.profile.sustainabilityScore - a.profile.sustainabilityScore)
    .slice(0, 8)
    .map((item, index) => ({
      rank: index + 1,
      serialNumber: item.serialNumber || 'N/A',
      score: item.profile.sustainabilityScore,
      badge: index === 0 ? 'eco_champion' : index < 3 ? 'green_star' : null
    }));

  return { topGreenAssets };
};

const buildProcurement = (ctx) => {
  return ctx.vendorScores
    .map((v) => ({
      companyName: v.vendorName || 'Unknown vendor',
      recommendation: v.sustainabilityScore >= 70 ? 'preferred' : v.sustainabilityScore >= 50 ? 'approved' : 'review',
      currentRating: v.sustainabilityScore >= 70 ? 'A' : v.sustainabilityScore >= 50 ? 'B' : 'C',
      carbonIntensity: v.carbonIntensity
    }))
    .sort((a, b) => b.currentRating.localeCompare(a.currentRating));
};

const applyScenarios = (item, scenarios) => {
  const merged = {
    ...item,
    material: scenarios.material || item.material,
    transportMode: scenarios.transportMode || item.transportMode,
    maintenanceFrequencyPerYear:
      scenarios.maintenanceFrequencyPerYear ?? item.maintenanceFrequencyPerYear,
    energyUsageKWh: scenarios.energyUsageKWh ?? item.energyUsageKWh,
    serviceLife: scenarios.serviceLife || item.serviceLife,
    recyclabilityPercent:
      scenarios.recyclability != null
        ? Math.round(scenarios.recyclability * 100)
        : item.recyclabilityPercent
  };
  return computeTrackFittingCarbonProfile(merged);
};

const runSimulation = (item, scenarios) => {
  const baseline = computeTrackFittingCarbonProfile(item);
  const projected = applyScenarios(item, scenarios);
  const saved = round2(baseline.totalEmissionsCO2 - projected.totalEmissionsCO2);
  const percentReduction =
    baseline.totalEmissionsCO2 > 0
      ? round2((saved / baseline.totalEmissionsCO2) * 100)
      : 0;

  return {
    baseline: {
      totalCo2eKg: baseline.totalEmissionsCO2,
      grade: baseline.sustainabilityRating
    },
    projected: {
      totalCo2eKg: projected.totalEmissionsCO2,
      grade: projected.sustainabilityRating
    },
    impact: {
      co2eSavedKg: Math.max(0, saved),
      percentReduction: Math.max(0, percentReduction)
    },
    aiInsight:
      percentReduction >= 15
        ? `Strong scenario: ${percentReduction}% reduction achievable with ${Object.keys(scenarios).join(', ')} adjustments.`
        : `Moderate impact (${percentReduction}%). Combine transport mode shift with recyclability improvements for greater savings.`
  };
};

const buildAssetTwin = (item) => {
  const profile = computeTrackFittingCarbonProfile(item);
  const twinNode = buildAssetTwinNode({ ...item, carbonProfile: profile });
  const health = twinNode.degradation.structuralHealth;

  return {
    twin: {
      twinId: `TWIN-${item.serialNumber || item._id}`,
      sustainabilityPulse:
        health >= 75 ? 'healthy' : health >= 50 ? 'watch' : 'critical',
      twinHealthScore: health,
      aiTwinSummary: `Asset ${item.serialNumber || 'unknown'} — ${profile.sustainabilityRating} rating, ${profile.totalEmissionsCO2} kg CO₂, ${twinNode.degradation.remainingLifeYears} years remaining life.`,
      lifeProgressPercent: round2(
        (profile.ageYears / Math.max(profile.serviceLifeYears, 1)) * 100
      ),
      lifecyclePhase:
        profile.remainingLifeYears > 10
          ? 'operational'
          : profile.remainingLifeYears > 2
            ? 'mature'
            : 'end-of-life',
      emissionVelocityKgPerMonth: round2(profile.annualRecurringEmissions / 12),
      riskZones: profile.hotspot
        ? [{ label: 'Emission hotspot' }, { label: 'Elevated lifecycle impact' }]
        : health < 50
          ? [{ label: 'Structural degradation' }]
          : []
    },
    benchmark: {
      aiBenchmarkNote: `Compared to fleet average sustainability score, this asset is ${
        profile.sustainabilityScore >= 65 ? 'above' : 'below'
      } median performance.`
    }
  };
};

const buildCertificate = (item) => {
  const profile = computeTrackFittingCarbonProfile(item);
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);

  return {
    issuer: 'RailGreen GreenGuard Certification',
    certificateId: `RG-${Date.now().toString(36).toUpperCase()}`,
    metrics: {
      grade: profile.sustainabilityRating,
      totalCo2eKg: profile.totalEmissionsCO2,
      sustainabilityScore: profile.sustainabilityScore
    },
    validUntil: validUntil.toISOString()
  };
};

const ruleBasedReply = (message, ctx) => {
  const m = message.toLowerCase();
  const { carbonReport, brain, worst, best, vendorScores } = ctx;

  if (m.includes('footprint') || m.includes('total carbon') || m.includes('total co')) {
    return `Your fleet total carbon footprint is **${carbonReport.totalEmissionsCO2.toLocaleString()} kg CO₂** across **${carbonReport.totalAssets}** assets. Annual recurring emissions are **${carbonReport.strategyForecast?.annualRecurringTotal?.toLocaleString() || 0} kg/yr**, with **${carbonReport.projectedNext5Years?.toLocaleString() || 0} kg** projected over the next 5 years.`;
  }
  if (m.includes('worst') || m.includes('highest') || m.includes('most emit')) {
    if (!worst) return 'No assets in inventory yet — add track fittings to analyze emissions.';
    return `Highest emitter: **${worst.serialNumber || 'Unknown'}** (${worst.itemType || 'asset'}) at **${worst.profile.totalEmissionsCO2.toLocaleString()} kg CO₂** with rating **${worst.profile.sustainabilityRating}**. ${worst.profile.hotspot ? 'Flagged as an emission hotspot.' : ''}`;
  }
  if (m.includes('net-zero') || m.includes('2050')) {
    return `Net-zero pathway: current score **${brain.overallSustainabilityScore}** (Grade **${brain.overallGrade}**). Target reduction trajectory shows **${carbonReport.strategyForecast?.reductionPercent || 0}%** decline from Year 1 to Year 5. Prioritize: ${brain.optimizations.slice(0, 2).map((o) => o.title).join('; ') || 'efficiency upgrades'}.`;
  }
  if (m.includes('vendor') || m.includes('supplier') || m.includes('greenest')) {
    const top = [...vendorScores].sort((a, b) => b.sustainabilityScore - a.sustainabilityScore)[0];
    if (!top) return 'No vendors on file. Add vendors to enable green procurement scoring.';
    return `Greenest supplier: **${top.vendorName}** (score **${top.sustainabilityScore}**, intensity **${top.carbonIntensity}**). ${vendorScores.filter((v) => v.sustainabilityScore < 50).length} vendor(s) need sustainability review.`;
  }
  if (m.includes('score') || m.includes('low') || m.includes('improve')) {
    return `Overall sustainability score: **${brain.overallSustainabilityScore}** (Grade **${brain.overallGrade}**). Weakest dimensions: ${Object.entries(brain.dimensionScores).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([k, v]) => `${k} (${v})`).join(', ')}. Top action: **${brain.optimizations[0]?.suggestion || 'Extend asset service life and improve recyclability.'}**`;
  }
  if (m.includes('reduce') || m.includes('quarter')) {
    return `This quarter, focus on **${brain.optimizations[0]?.title || 'hotspot reduction'}** (est. **${brain.aiSummary?.totalEstimatedSavingsKg?.toLocaleString() || 0} kg** savings potential). ${brain.riskAlerts[0] ? `Active alert: ${brain.riskAlerts[0].title}.` : ''}`;
  }
  if (m.includes('energy') || m.includes('kwh')) {
    const energyDim = brain.dimensionDetails?.energy?.metrics;
    return `Energy dimension score: **${brain.dimensionScores.energy}**. Portfolio draw: **${energyDim?.totalKWh?.toLocaleString() || 0} kWh** (${energyDim?.energyEmissionsKg || 0} kg CO₂ from energy).`;
  }
  if (best && (m.includes('best') || m.includes('green asset'))) {
    return `Best performing asset: **${best.serialNumber}** with **${best.profile.totalEmissionsCO2} kg CO₂** and sustainability score **${best.profile.sustainabilityScore}**.`;
  }

  return `Based on live fleet data: **${carbonReport.totalEmissionsCO2.toLocaleString()} kg CO₂** total, score **${brain.overallSustainabilityScore}**, **${carbonReport.hotspots}** hotspots. Ask about footprint, worst emitter, vendors, net-zero, or how to improve your score.`;
};

const tryOllamaReply = async (message, ctx) => {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_LLM_MODEL;
  if (!baseUrl || !model) return null;

  const prompt = `You are GreenGuard, a railway sustainability AI advisor. Answer briefly using ONLY this fleet data:
Total CO2 kg: ${ctx.carbonReport.totalEmissionsCO2}
Assets: ${ctx.carbonReport.totalAssets}
Sustainability score: ${ctx.brain.overallSustainabilityScore}
Hotspots: ${ctx.carbonReport.hotspots}
User question: ${message}`;

  try {
    const res = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model,
        prompt,
        stream: false,
        options: {
          temperature: Number(process.env.OLLAMA_TEMPERATURE) || 0.7,
          num_predict: 280
        }
      },
      { timeout: Number(process.env.OLLAMA_GENERATE_TIMEOUT_MS) || 8000 }
    );
    const text = res.data?.response?.trim();
    return text || null;
  } catch {
    return null;
  }
};

const runCopilot = async (message, history = [], trackFittings = [], vendors = []) => {
  const ctx = buildFleetContext(trackFittings, vendors);

  let reply = ruleBasedReply(message, ctx);
  const ollamaReply = await tryOllamaReply(message, ctx);
  if (ollamaReply && ollamaReply.length > 40) {
    reply = ollamaReply;
  }

  const intents = [];
  const ml = message.toLowerCase();
  if (ml.includes('footprint') || ml.includes('carbon')) intents.push('carbon_footprint');
  if (ml.includes('vendor')) intents.push('vendor_analysis');
  if (ml.includes('net-zero')) intents.push('pathway');
  if (ml.includes('reduce') || ml.includes('improve')) intents.push('optimization');

  return {
    reply,
    segments: history.length ? ['context', 'fleet_data'] : ['fleet_data'],
    intents,
    dataUsed: {
      assetCount: ctx.carbonReport.totalAssets,
      fleetCo2eKg: ctx.carbonReport.totalEmissionsCO2
    }
  };
};

module.exports = {
  SIMULATION_PRESETS,
  buildFleetContext,
  buildInsights,
  buildPathways,
  buildLeaderboard,
  buildProcurement,
  runSimulation,
  buildAssetTwin,
  buildCertificate,
  runCopilot
};
