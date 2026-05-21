const { buildAssetCarbonReport, computeVendorCarbonScore } = require('./carbonEngine');
const { runSustainabilityBrain } = require('./sustainabilityBrain');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const UN_SDG_CATALOG = [
  {
    id: 'SDG7',
    number: 7,
    title: 'Affordable and Clean Energy',
    color: '#f9d71c',
    platformModules: ['energy-efficiency', 'material-sustainability', 'emission-forecasting']
  },
  {
    id: 'SDG9',
    number: 9,
    title: 'Industry, Innovation and Infrastructure',
    color: '#f36e21',
    platformModules: ['vendor-carbon', 'emission-hotspots', 'asset-health']
  },
  {
    id: 'SDG11',
    number: 11,
    title: 'Sustainable Cities and Communities',
    color: '#f89f1d',
    platformModules: ['sustainability-rating', 'waste-management', 'green-certifications']
  },
  {
    id: 'SDG12',
    number: 12,
    title: 'Responsible Consumption and Production',
    color: '#c88b2e',
    platformModules: ['recyclability', 'maintenance-opt', 'transport-emissions']
  },
  {
    id: 'SDG13',
    number: 13,
    title: 'Climate Action',
    color: '#487a2e',
    platformModules: ['carbon-accounting', 'lifecycle-impact', 'replacement-cycle', 'emission-forecasting']
  },
  {
    id: 'SDG17',
    number: 17,
    title: 'Partnerships for the Goals',
    color: '#183a5c',
    platformModules: ['maintenance-opt', 'lifecycle-impact']
  }
];

const PLATFORM_ACTIONS = [
  { id: 'carbon-accounting', label: 'Carbon Accounting', category: 'climate' },
  { id: 'emission-hotspots', label: 'AI Sustainability Brain', category: 'innovation' },
  { id: 'vendor-carbon', label: 'Sustainability Digital Twin', category: 'infrastructure' },
  { id: 'lifecycle-impact', label: 'GreenGuard Bot', category: 'climate' },
  { id: 'sustainability-rating', label: 'Eco-Route Optimization', category: 'transport' },
  { id: 'energy-efficiency', label: 'Predictive Sustainability Analytics', category: 'innovation' },
  { id: 'waste-management', label: 'Sustainability Risk Heatmap', category: 'infrastructure' },
  { id: 'recyclability', label: 'Smart Green Material AI', category: 'consumption' },
  { id: 'maintenance-opt', label: 'Vendor Sustainability Intelligence', category: 'partnerships' },
  { id: 'replacement-cycle', label: 'Climate Resilience Intelligence', category: 'climate' },
  { id: 'material-sustainability', label: 'AI Net-Zero Mission Dashboard', category: 'climate' },
  { id: 'transport-emissions', label: 'Autonomous Sustainability', category: 'consumption' },
  { id: 'green-certifications', label: 'Railway Green Score', category: 'cities' },
  { id: 'emission-forecasting', label: 'Scenario Simulator', category: 'climate' },
  { id: 'asset-health', label: 'Global SDG Alignment Engine', category: 'reporting' }
];

const GREEN_TRANSPORT_INITIATIVES = [
  {
    id: 'modal-shift-rail',
    title: 'Modal shift to low-carbon rail logistics',
    description: 'Prioritize rail over truck/air for track component transport and inspection mobility.',
    sdgLinks: ['SDG11', 'SDG13'],
    metricKey: 'railSharePercent'
  },
  {
    id: 'eco-route',
    title: 'Eco-route inspection optimization',
    description: 'Consolidated technician routes reduce fuel use and corridor access emissions.',
    sdgLinks: ['SDG11', 'SDG13', 'SDG9'],
    metricKey: 'routeOptimizationScore'
  },
  {
    id: 'fleet-decarbon',
    title: 'Fleet decarbonization pathway',
    description: 'Energy intensity tracking and net-zero mission alignment for operational assets.',
    sdgLinks: ['SDG7', 'SDG13'],
    metricKey: 'decarbonPathwayScore'
  },
  {
    id: 'green-procurement',
    title: 'Green procurement & supplier standards',
    description: 'Vendor sustainability scoring drives ethical, low-carbon supply chains.',
    sdgLinks: ['SDG12', 'SDG17'],
    metricKey: 'greenVendorPercent'
  }
];

const SMART_INFRASTRUCTURE_OBJECTIVES = [
  {
    id: 'digital-twin',
    title: 'Digital twin & asset traceability',
    description: 'QR-linked track fittings with live carbon profiles and lifecycle digital twins.',
    sdgLinks: ['SDG9', 'SDG11'],
    metricKey: 'traceabilityScore'
  },
  {
    id: 'predictive-analytics',
    title: 'Predictive sustainability analytics',
    description: 'AI forecasts carbon-heavy zones, costly assets, and intervention priorities.',
    sdgLinks: ['SDG9', 'SDG13'],
    metricKey: 'predictiveScore'
  },
  {
    id: 'climate-resilience',
    title: 'Climate-resilient corridor intelligence',
    description: 'Flood, heat, and weather-risk mapping for adaptive rail infrastructure.',
    sdgLinks: ['SDG11', 'SDG13'],
    metricKey: 'resilienceScore'
  },
  {
    id: 'agentic-ops',
    title: 'Agentic autonomous sustainability ops',
    description: 'AI agents issue replace, maintenance, route, material, and vendor decisions.',
    sdgLinks: ['SDG9', 'SDG12'],
    metricKey: 'agenticScore'
  }
];

const computeFleetMetrics = (profiles, vendors, carbonReport, brain) => {
  const n = Math.max(profiles.length, 1);
  const railCount = profiles.filter((p) =>
    (p.transportMode || '').toLowerCase().includes('rail')
  ).length;
  const railSharePercent = round2((railCount / n) * 100);

  const avgRecyclability = round2(
    profiles.reduce(
      (s, p) => s + Number(p.recyclabilityPercent || p.carbonProfile?.carbonBreakdown?.recyclabilityPercent || 0),
      0
    ) / n
  );

  const avgEnergy = round2(
    profiles.reduce((s, p) => s + Number(p.energyUsageKWh || 0), 0) / n
  );
  const energyScore = clamp(100 - avgEnergy / 2.5, 0, 100);

  const withLocation = profiles.filter(
    (p) => p.trackSectionKm != null || p.currentLocation || p.qrCode
  ).length;
  const traceabilityScore = round2((withLocation / n) * 100);

  const vendorScores = vendors.map((v) => computeVendorCarbonScore(v));
  const greenVendorPercent =
    vendorScores.length > 0
      ? round2(
          (vendorScores.filter((v) => v.sustainabilityScore >= 70).length / vendorScores.length) * 100
        )
      : 0;

  const strategy = carbonReport.strategyForecast || {};
  const decarbonPathwayScore = clamp(
    (strategy.reductionPercent || 0) * 2 + (brain?.overallSustainabilityScore || 50) * 0.5,
    0,
    100
  );

  const routeOptimizationScore = clamp(
    55 + railSharePercent * 0.3 + (profiles.length >= 5 ? 15 : 0),
    0,
    100
  );

  const predictiveScore = clamp(
    (brain?.overallSustainabilityScore || 50) + (carbonReport.hotspots > 0 ? 10 : 20),
    0,
    100
  );

  const avgRemaining = profiles.length
    ? profiles.reduce((s, p) => s + (p.carbonProfile?.remainingLifeYears || 0), 0) / profiles.length
    : 0;
  const resilienceScore = clamp(avgRemaining * 8 + (100 - (carbonReport.hotspots / n) * 100) * 0.3, 0, 100);

  const agenticScore = clamp(
    (brain?.optimizations?.length || 0) * 8 + (brain?.overallSustainabilityScore || 50) * 0.6,
    0,
    100
  );

  return {
    railSharePercent,
    avgRecyclability,
    energyScore,
    traceabilityScore,
    greenVendorPercent,
    decarbonPathwayScore,
    routeOptimizationScore,
    predictiveScore,
    resilienceScore,
    agenticScore,
    totalAssets: profiles.length,
    totalEmissionsKg: carbonReport.totalEmissionsCO2,
    sustainabilityScore: brain?.overallSustainabilityScore || carbonReport.averageSustainabilityScore,
    forecastReductionPercent: strategy.reductionPercent || 0
  };
};

const scoreSdgAlignment = (sdg, metrics, brain) => {
  let score = 50;
  const contributions = [];

  switch (sdg.id) {
    case 'SDG7':
      score = metrics.energyScore;
      contributions.push(`Energy optimization index: ${metrics.energyScore}/100`);
      if (metrics.avgRecyclability > 60) contributions.push('Material circularity supports clean production');
      break;
    case 'SDG9':
      score = round2((metrics.traceabilityScore + metrics.predictiveScore + metrics.agenticScore) / 3);
      contributions.push(`Digital traceability: ${metrics.traceabilityScore}% of assets`);
      contributions.push(`Predictive analytics readiness: ${metrics.predictiveScore}/100`);
      break;
    case 'SDG11':
      score = round2(
        (metrics.railSharePercent * 0.35 +
          metrics.routeOptimizationScore * 0.35 +
          metrics.resilienceScore * 0.3)
      );
      contributions.push(`Rail modal share: ${metrics.railSharePercent}%`);
      contributions.push(`Corridor resilience score: ${metrics.resilienceScore}/100`);
      break;
    case 'SDG12':
      score = round2((metrics.avgRecyclability + metrics.agenticScore + metrics.greenVendorPercent) / 3);
      contributions.push(`Average recyclability: ${metrics.avgRecyclability}%`);
      contributions.push(`Green vendor share: ${metrics.greenVendorPercent}%`);
      break;
    case 'SDG13':
      score = round2(
        (metrics.decarbonPathwayScore * 0.5 +
          (metrics.sustainabilityScore || 50) * 0.35 +
          metrics.forecastReductionPercent * 2) / 1.2
      );
      score = clamp(score, 0, 100);
      contributions.push(`Portfolio sustainability: ${metrics.sustainabilityScore}/100`);
      contributions.push(`5-year forecast reduction: ${metrics.forecastReductionPercent}%`);
      contributions.push(`Total footprint tracked: ${metrics.totalEmissionsKg.toLocaleString()} kg CO₂`);
      break;
    case 'SDG17':
      score = round2(metrics.greenVendorPercent * 0.7 + (brain?.dimensions?.vendor?.score || 50) * 0.3);
      contributions.push('Multi-stakeholder vendor sustainability intelligence');
      contributions.push(`Partnership-ready green suppliers: ${metrics.greenVendorPercent}%`);
      break;
    default:
      break;
  }

  const level = score >= 80 ? 'strong' : score >= 60 ? 'moderate' : 'developing';
  const mappedActions = PLATFORM_ACTIONS.filter((a) =>
    sdg.platformModules.includes(a.id)
  );

  return {
    ...sdg,
    alignmentScore: round2(score),
    alignmentLevel: level,
    contributions,
    platformActions: mappedActions,
    targets: getSdgTargets(sdg.number)
  };
};

const getSdgTargets = (num) => {
  const targets = {
    7: '7.2 Increase renewable energy share; 7.3 Double energy efficiency rate',
    9: '9.1 Develop sustainable infrastructure; 9.4 Upgrade industries for sustainability',
    11: '11.2 Public transport systems; 11.6 Reduce environmental impact of cities',
    12: '12.2 Sustainable management of resources; 12.5 Substantially reduce waste',
    13: '13.2 Integrate climate measures; 13.3 Improve education & capacity on climate',
    17: '17.16 Multi-stakeholder partnerships; 17.17 Encourage SDG partnerships'
  };
  return targets[num] || 'Aligned with UN 2030 Agenda';
};

const buildInitiativeScores = (initiatives, metrics) =>
  initiatives.map((init) => ({
    ...init,
    score: round2(metrics[init.metricKey] ?? 50),
    status:
      (metrics[init.metricKey] ?? 50) >= 75
        ? 'on_track'
        : (metrics[init.metricKey] ?? 50) >= 50
          ? 'progressing'
          : 'needs_focus'
  }));

const runSdgAlignmentEngine = (trackFittings = [], vendors = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const brain = runSustainabilityBrain(trackFittings, vendors);
  const metrics = computeFleetMetrics(carbonReport.profiles, vendors, carbonReport, brain);

  const sdgAlignments = UN_SDG_CATALOG.map((sdg) => scoreSdgAlignment(sdg, metrics, brain)).sort(
    (a, b) => b.alignmentScore - a.alignmentScore
  );
  const overallIndex = round2(
    sdgAlignments.reduce((s, a) => s + a.alignmentScore, 0) / sdgAlignments.length
  );
  const overallGrade =
    overallIndex >= 85 ? 'A' : overallIndex >= 70 ? 'B' : overallIndex >= 55 ? 'C' : 'D';

  const greenTransport = buildInitiativeScores(GREEN_TRANSPORT_INITIATIVES, metrics);
  const smartInfrastructure = buildInitiativeScores(SMART_INFRASTRUCTURE_OBJECTIVES, metrics);

  const researchHighlights = [
    {
      title: 'UN 2030 Agenda integration',
      body: 'Platform modules map to **6 SDGs** with measurable fleet-derived alignment scores — suitable for sustainability reporting and academic case studies.'
    },
    {
      title: 'Green transportation',
      body: `**${metrics.railSharePercent}%** rail-modal share and eco-route intelligence directly support low-carbon mobility targets (SDG 11 & 13).`
    },
    {
      title: 'Smart infrastructure',
      body: `**${metrics.traceabilityScore}%** asset traceability and agentic AI operations align with resilient, innovation-led infrastructure (SDG 9).`
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'Global SDG Alignment Engine',
    summary: {
      overallSdgAlignmentIndex: overallIndex,
      overallGrade,
      sdgCount: sdgAlignments.length,
      strongAlignments: sdgAlignments.filter((s) => s.alignmentLevel === 'strong').length,
      greenTransportAvg: round2(
        greenTransport.reduce((s, g) => s + g.score, 0) / greenTransport.length
      ),
      smartInfraAvg: round2(
        smartInfrastructure.reduce((s, g) => s + g.score, 0) / smartInfrastructure.length
      ),
      totalAssets: metrics.totalAssets,
      reportingReady: overallIndex >= 60
    },
    overallAlignment: {
      index: overallIndex,
      displayScore: `${overallIndex}/100`,
      grade: overallGrade,
      label:
        overallIndex >= 80
          ? 'Internationally aligned'
          : overallIndex >= 60
            ? 'Progressing toward 2030 targets'
            : 'Accelerate SDG interventions'
    },
    unSustainableDevelopmentGoals: sdgAlignments,
    greenTransportationInitiatives: greenTransport,
    smartInfrastructureObjectives: smartInfrastructure,
    platformActionMap: PLATFORM_ACTIONS.map((action) => {
      const linkedSdgs = sdgAlignments.filter((s) =>
        s.platformActions.some((a) => a.id === action.id)
      );
      return { ...action, linkedSdgs: linkedSdgs.map((s) => `SDG ${s.number}`) };
    }),
    fleetMetrics: metrics,
    researchHighlights,
    insights: [
      `Global SDG alignment index: **${overallIndex}/100** (Grade **${overallGrade}**) across ${sdgAlignments.length} goals.`,
      sdgAlignments.sort((a, b) => b.alignmentScore - a.alignmentScore)[0] &&
        `Strongest alignment: **SDG ${sdgAlignments.sort((a, b) => b.alignmentScore - a.alignmentScore)[0].number}** (${sdgAlignments.sort((a, b) => b.alignmentScore - a.alignmentScore)[0].alignmentScore}/100).`,
      `Green transportation initiatives average **${round2(greenTransport.reduce((s, g) => s + g.score, 0) / greenTransport.length)}/100** — rail, routes, and decarbonization.`,
      `Smart infrastructure objectives average **${round2(smartInfrastructure.reduce((s, g) => s + g.score, 0) / smartInfrastructure.length)}/100** — digital twins, AI, and resilience.`
    ]
  };
};

module.exports = {
  runSdgAlignmentEngine,
  UN_SDG_CATALOG,
  PLATFORM_ACTIONS
};
