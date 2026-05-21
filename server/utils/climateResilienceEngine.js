const { buildAssetCarbonReport, computeTrackFittingCarbonProfile } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const RISK_LEVELS = {
  critical: { label: 'Critical', color: '#ef4444', min: 70 },
  high: { label: 'High', color: '#f97316', min: 50 },
  moderate: { label: 'Moderate', color: '#eab308', min: 30 },
  low: { label: 'Low', color: '#22c55e', min: 0 }
};

const getRiskLevel = (score) => {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
};

const getZoneKey = (item) => {
  const km = Number(item.trackSectionKm);
  if (!Number.isNaN(km) && km >= 0) {
    const zone = Math.floor(km / 5) * 5;
    return { key: `km-${zone}`, label: `KM ${zone}–${zone + 5}`, sortOrder: zone, kmStart: zone };
  }
  if (item.currentLocation) {
    return { key: `loc-${item.currentLocation}`, label: item.currentLocation, sortOrder: 9999, kmStart: null };
  }
  return { key: 'zone-hub', label: 'Central Hub', sortOrder: 10000, kmStart: null };
};

const locationText = (item) =>
  [item.currentLocation, item.fromStation, item.toStation, item.manufacturingLocation]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const FLOOD_KEYWORDS = /river|bridge|coastal|lowland|flood|marsh|creek|delta|wetland|monsoon|embankment|culvert/i;
const HEAT_KEYWORDS = /desert|plain|solar|exposed|open|southern|tropical|arid/i;

const scoreFloodVulnerability = (item, zone) => {
  const loc = locationText(item);
  let score = 0;
  if (FLOOD_KEYWORDS.test(loc)) score += 35;
  if (zone.kmStart != null && zone.kmStart <= 15) score += 25;
  if (zone.kmStart != null && zone.kmStart <= 5) score += 15;
  const lat = item.locationCoords?.latitude ?? item.fromStationLatitude;
  if (lat != null && lat < 15) score += 12;
  const maint = Number(item.maintenanceFrequencyPerYear || 0);
  if (maint >= 3) score += 10;
  const failures = item.failureReason && /water|flood|corrosion|rust/i.test(item.failureReason) ? 20 : 0;
  score += failures;
  const bridge = /bridge|viaduct/i.test(loc) ? 12 : 0;
  score += bridge;
  return clamp(score, 0, 100);
};

const scoreHeatImpact = (item) => {
  const material = (item.material || item.itemType || '').toLowerCase();
  let score = 0;
  if (/steel|rail|iron|metal/i.test(material)) score += 28;
  const energy = Number(item.energyUsageKWh || 0);
  score += clamp(energy / 8, 0, 25);
  const loc = locationText(item);
  if (HEAT_KEYWORDS.test(loc)) score += 18;
  const p = item.carbonProfile;
  if (p) {
    if (p.ageYears >= 8) score += 15;
    if (p.remainingLifeYears <= 4) score += 12;
    if (p.hotspot) score += 10;
  }
  const km = Number(item.trackSectionKm);
  if (!Number.isNaN(km) && km >= 20) score += clamp((km - 20) * 0.8, 0, 20);
  return clamp(score, 0, 100);
};

const scoreClimateStress = (item) => {
  const p = item.carbonProfile;
  if (!p) return 30;
  const lifeRatio = p.remainingLifeYears / Math.max(p.ageYears + p.remainingLifeYears, 1);
  const degradation = clamp((1 - lifeRatio) * 55, 0, 55);
  const maintStress = clamp((Array.isArray(item.maintenance) ? item.maintenance.length : 0) * 4, 0, 25);
  const impactStress = clamp(p.lifecycleImpactScore * 0.35, 0, 35);
  const ratingStress = ['D', 'E'].includes(p.sustainabilityRating) ? 15 : 0;
  return clamp(degradation + maintStress + impactStress + ratingStress, 0, 100);
};

const scoreWeatherSustainabilityRisk = (flood, heat, stress, item) => {
  const transportKm = Number(item.transportDistanceKm || 0);
  const transportRisk = clamp(transportKm / 25, 0, 15);
  const composite = flood * 0.3 + heat * 0.3 + stress * 0.25 + transportRisk;
  const seasonal = clamp(composite + (new Date().getMonth() >= 5 && new Date().getMonth() <= 9 ? 8 : 0), 0, 100);
  return round2(seasonal);
};

const buildZoneClimateProfile = (zone, assets) => {
  const profiles = assets.map((a) => ({
    ...a,
    floodScore: scoreFloodVulnerability(a, zone),
    heatScore: scoreHeatImpact(a),
    stressScore: scoreClimateStress(a)
  }));

  const avg = (key) =>
    profiles.length ? round2(profiles.reduce((s, p) => s + p[key], 0) / profiles.length) : 0;

  const floodScore = avg('floodScore');
  const heatScore = avg('heatScore');
  const stressScore = avg('stressScore');
  const weatherRisk = profiles.length
    ? round2(
        profiles.reduce(
          (s, p) => s + scoreWeatherSustainabilityRisk(p.floodScore, p.heatScore, p.stressScore, p),
          0
        ) / profiles.length
      )
    : 0;

  const adaptationComposite = round2(floodScore * 0.35 + heatScore * 0.3 + stressScore * 0.2 + weatherRisk * 0.15);
  const level = getRiskLevel(adaptationComposite);

  const floodPrediction =
    floodScore >= 65
      ? 'High probability of inundation during extreme rainfall — prioritize drainage audit within 90 days.'
      : floodScore >= 40
        ? 'Moderate flood exposure — monitor embankment saturation and culvert capacity.'
        : 'Low flood vulnerability under current corridor profile.';

  const heatImpact =
    heatScore >= 65
      ? 'Thermal expansion and rail buckling risk elevated — schedule heat-stress inspections before peak season.'
      : heatScore >= 40
        ? 'Moderate heat impact on track fittings — increased fatigue on steel components expected.'
        : 'Heat impact within manageable thresholds for current materials.';

  return {
    zoneKey: zone.key,
    label: zone.label,
    assetCount: assets.length,
    floodVulnerability: {
      score: floodScore,
      level: getRiskLevel(floodScore),
      prediction: floodPrediction,
      horizon: floodScore >= 50 ? '6–12 months' : '12–24 months',
      confidence: floodScore >= 50 ? 'high' : 'medium'
    },
    heatImpact: {
      score: heatScore,
      level: getRiskLevel(heatScore),
      summary: heatImpact,
      peakRiskMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug'],
      trackBucklingRisk: heatScore >= 55 ? 'elevated' : heatScore >= 35 ? 'moderate' : 'low'
    },
    climateStress: {
      score: stressScore,
      level: getRiskLevel(stressScore),
      degradationIndex: stressScore,
      infrastructureAgeStress: assets.length
        ? round2(
            assets.reduce((s, a) => s + (a.carbonProfile?.ageYears || 0), 0) / assets.length
          )
        : 0
    },
    weatherSustainabilityRisk: {
      score: weatherRisk,
      level: getRiskLevel(weatherRisk),
      seasonalOutlook:
        weatherRisk >= 55 ? 'adverse' : weatherRisk >= 35 ? 'variable' : 'stable',
      disruptionFactors: [
        floodScore >= 45 && 'Heavy rainfall / flooding',
        heatScore >= 45 && 'Extreme heat events',
        stressScore >= 50 && 'Accelerated asset degradation',
        weatherRisk >= 50 && 'Supply-chain weather delays'
      ].filter(Boolean)
    },
    adaptationScore: adaptationComposite,
    adaptationLevel: level,
    color: RISK_LEVELS[level].color
  };
};

const buildAdaptationActions = (zones) => {
  const actions = [];
  const criticalFlood = zones.filter((z) => z.floodVulnerability.level === 'critical' || z.floodVulnerability.level === 'high');
  const criticalHeat = zones.filter((z) => z.heatImpact.level === 'critical' || z.heatImpact.level === 'high');

  if (criticalFlood.length > 0) {
    actions.push({
      priority: 'high',
      type: 'flood',
      title: 'Flood resilience upgrades',
      description: `Deploy smart drainage sensors and embankment reinforcement in **${criticalFlood.slice(0, 2).map((z) => z.label).join('**, **')}**.`,
      zones: criticalFlood.slice(0, 4).map((z) => z.label),
      impact: 'Reduce flood-related service disruption by up to 35%'
    });
  }

  if (criticalHeat.length > 0) {
    actions.push({
      priority: 'high',
      type: 'heat',
      title: 'Heat-adapted track materials',
      description: `Pilot heat-resistant fasteners and expansion joints in **${criticalHeat.slice(0, 2).map((z) => z.label).join('**, **')}** before peak summer.`,
      zones: criticalHeat.slice(0, 4).map((z) => z.label),
      impact: 'Mitigate thermal buckling and fitting fatigue'
    });
  }

  actions.push({
    priority: 'medium',
    type: 'monitor',
    title: 'Climate monitoring network',
    description:
      'Integrate IoT weather stations at corridor km markers for real-time flood, heat, and wind sustainability alerts.',
    zones: zones.slice(0, 3).map((z) => z.label),
    impact: 'Early warning for weather sustainability risk'
  });

  actions.push({
    priority: 'medium',
    type: 'policy',
    title: 'Climate adaptation capital plan',
    description:
      'Align replacement cycles with climate stress scores — defer low-stress zones, accelerate high-stress corridors.',
    zones: zones.filter((z) => z.climateStress.score >= 50).slice(0, 3).map((z) => z.label),
    impact: 'Portfolio-wide resilience ROI improvement'
  });

  return actions;
};

const runClimateResilienceIntelligence = (trackFittings = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  let profiles = carbonReport.profiles;

  if (!profiles.length) {
    trackFittings.slice(0, 12).forEach((item, i) => {
      profiles.push({
        ...item,
        trackSectionKm: item.trackSectionKm ?? i * 4,
        carbonProfile: computeTrackFittingCarbonProfile(item)
      });
    });
  }

  const zoneMap = new Map();
  profiles.forEach((item) => {
    const zone = getZoneKey(item);
    if (!zoneMap.has(zone.key)) {
      zoneMap.set(zone.key, { ...zone, assets: [] });
    }
    zoneMap.get(zone.key).assets.push(item);
  });

  const zoneList = Array.from(zoneMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  const corridorZones = zoneList.map((z) => buildZoneClimateProfile(z, z.assets));

  const portfolioFlood = corridorZones.length
    ? round2(corridorZones.reduce((s, z) => s + z.floodVulnerability.score, 0) / corridorZones.length)
    : 0;
  const portfolioHeat = corridorZones.length
    ? round2(corridorZones.reduce((s, z) => s + z.heatImpact.score, 0) / corridorZones.length)
    : 0;
  const portfolioStress = corridorZones.length
    ? round2(corridorZones.reduce((s, z) => s + z.climateStress.score, 0) / corridorZones.length)
    : 0;
  const portfolioWeather = corridorZones.length
    ? round2(corridorZones.reduce((s, z) => s + z.weatherSustainabilityRisk.score, 0) / corridorZones.length)
    : 0;

  const adaptationActions = buildAdaptationActions(corridorZones);

  const floodLeaderboard = [...corridorZones]
    .sort((a, b) => b.floodVulnerability.score - a.floodVulnerability.score)
    .slice(0, 8);
  const heatLeaderboard = [...corridorZones]
    .sort((a, b) => b.heatImpact.score - a.heatImpact.score)
    .slice(0, 8);
  const stressLeaderboard = [...corridorZones]
    .sort((a, b) => b.climateStress.score - a.climateStress.score)
    .slice(0, 8);
  const weatherLeaderboard = [...corridorZones]
    .sort((a, b) => b.weatherSustainabilityRisk.score - a.weatherSustainabilityRisk.score)
    .slice(0, 8);

  const criticalZones = corridorZones.filter(
    (z) => z.adaptationLevel === 'critical' || z.adaptationLevel === 'high'
  );

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'Climate Resilience Intelligence',
    riskLevels: RISK_LEVELS,
    summary: {
      totalZones: corridorZones.length,
      totalAssets: profiles.length,
      portfolioFloodVulnerability: portfolioFlood,
      portfolioHeatImpact: portfolioHeat,
      portfolioClimateStress: portfolioStress,
      portfolioWeatherRisk: portfolioWeather,
      criticalZones: criticalZones.length,
      highFloodZones: corridorZones.filter((z) => z.floodVulnerability.score >= 50).length,
      highHeatZones: corridorZones.filter((z) => z.heatImpact.score >= 50).length,
      adaptationReadiness:
        portfolioFlood < 40 && portfolioHeat < 40
          ? 'strong'
          : portfolioFlood < 55 && portfolioHeat < 55
            ? 'moderate'
            : 'needs_investment'
    },
    corridorZones,
    floodVulnerabilityPrediction: floodLeaderboard,
    heatImpactOnTracks: heatLeaderboard,
    climateStressAnalysis: stressLeaderboard,
    weatherSustainabilityRisk: weatherLeaderboard,
    adaptationActions,
    featuredZone: corridorZones.length
      ? [...corridorZones].sort((a, b) => b.adaptationScore - a.adaptationScore)[0]
      : null,
    insights: [
      corridorZones.length
        ? `**${corridorZones.length}** corridor zone(s) analyzed for climate adaptation intelligence.`
        : 'Add track fittings with km markers or locations to enable climate analysis.',
      criticalZones.length > 0
        ? `**${criticalZones.length}** zone(s) require priority climate adaptation — ${criticalZones[0].label} leads composite risk.`
        : 'No critical climate risk zones detected in current portfolio.',
      floodLeaderboard[0] &&
        `Highest flood vulnerability: **${floodLeaderboard[0].label}** (score ${floodLeaderboard[0].floodVulnerability.score}).`,
      heatLeaderboard[0] &&
        `Peak heat impact corridor: **${heatLeaderboard[0].label}** — ${heatLeaderboard[0].heatImpact.trackBucklingRisk} buckling risk.`
    ].filter(Boolean)
  };
};

module.exports = {
  runClimateResilienceIntelligence,
  RISK_LEVELS,
  getRiskLevel
};
