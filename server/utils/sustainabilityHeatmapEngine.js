const { buildAssetCarbonReport, computeTrackFittingCarbonProfile } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const COLORS = {
  critical: '#ef4444',
  moderate: '#eab308',
  sustainable: '#22c55e'
};

const getZoneKey = (item) => {
  const km = Number(item.trackSectionKm);
  if (!Number.isNaN(km) && km >= 0) {
    const zone = Math.floor(km / 5) * 5;
    return { key: `km-${zone}`, label: `KM ${zone}–${zone + 5}`, sortOrder: zone };
  }
  if (item.currentLocation) {
    return { key: `loc-${item.currentLocation}`, label: item.currentLocation, sortOrder: 9999 };
  }
  return { key: 'zone-hub', label: 'Central Hub', sortOrder: 10000 };
};

const statusFromScore = (score) => {
  if (score >= 70) return 'critical';
  if (score >= 40) return 'moderate';
  return 'sustainable';
};

const buildZoneMetrics = (assets) => {
  let emissions = 0;
  let annual = 0;
  let energy = 0;
  let waste = 0;
  let recyclabilitySum = 0;
  let maintenanceFreqSum = 0;
  let maintenanceCountSum = 0;
  let sustainabilitySum = 0;
  let impactSum = 0;
  let ageSum = 0;
  let remainingSum = 0;
  let serviceLifeSum = 0;
  let hotspots = 0;
  let poorRatings = 0;

  assets.forEach((item) => {
    const p = item.carbonProfile;
    const b = p.carbonBreakdown;
    emissions += p.totalEmissionsCO2;
    annual += p.annualRecurringEmissions;
    energy += Number(item.energyUsageKWh || 0);
    waste += b.wasteEmissions;
    recyclabilitySum += Number(item.recyclabilityPercent || 0);
    maintenanceFreqSum += Number(item.maintenanceFrequencyPerYear || 0);
    maintenanceCountSum += Array.isArray(item.maintenance) ? item.maintenance.length : 0;
    sustainabilitySum += p.sustainabilityScore;
    impactSum += p.lifecycleImpactScore;
    ageSum += p.ageYears;
    remainingSum += p.remainingLifeYears;
    serviceLifeSum += p.serviceLifeYears;
    if (p.hotspot) hotspots += 1;
    if (['D', 'E'].includes(p.sustainabilityRating)) poorRatings += 1;
  });

  const count = assets.length;
  return {
    assetCount: count,
    totalEmissionsKg: round2(emissions),
    annualRecurringKg: round2(annual),
    avgEnergyKWh: round2(energy / count),
    wasteEmissionsKg: round2(waste),
    avgRecyclability: round2(recyclabilitySum / count),
    avgMaintenanceFrequency: round2(maintenanceFreqSum / count),
    maintenanceEvents: maintenanceCountSum,
    avgSustainabilityScore: round2(sustainabilitySum / count),
    avgLifecycleImpact: round2(impactSum / count),
    avgAgeYears: round2(ageSum / count),
    avgRemainingLifeYears: round2(remainingSum / count),
    hotspotCount: hotspots,
    poorRatingCount: poorRatings,
    emissionsPerAsset: round2(emissions / count)
  };
};

const scoreHighEmission = (m, fleetAvg) => {
  const intensity = m.emissionsPerAsset / Math.max(fleetAvg.emissionsPerAsset, 1);
  return clamp(intensity * 55 + (m.hotspotCount / m.assetCount) * 45, 0, 100);
};

const scoreResourceWastage = (m) => {
  const energyNorm = clamp(m.avgEnergyKWh / 2, 0, 50);
  const wasteNorm = clamp(m.wasteEmissionsKg / 3, 0, 30);
  const recyclPenalty = clamp((100 - m.avgRecyclability) * 0.4, 0, 40);
  return clamp(energyNorm + wasteNorm + recyclPenalty, 0, 100);
};

const scoreOverMaintained = (m) => {
  const freqScore = clamp(m.avgMaintenanceFrequency * 22, 0, 60);
  const excessEvents = m.maintenanceEvents / Math.max(m.assetCount * m.avgAgeYears, 1);
  const excessScore = clamp(excessEvents * 25, 0, 40);
  return clamp(freqScore + excessScore, 0, 100);
};

const scorePoorSustainability = (m) => {
  return clamp(
    (100 - m.avgSustainabilityScore) * 0.5 + m.avgLifecycleImpact * 0.35 + (m.poorRatingCount / m.assetCount) * 100 * 0.25,
    0,
    100
  );
};

const scoreClimateVulnerable = (m) => {
  const lifeRatio = m.avgRemainingLifeYears / Math.max(m.avgAgeYears + m.avgRemainingLifeYears, 1);
  const ageStress = clamp((1 - lifeRatio) * 70, 0, 70);
  const eolStress = m.avgRemainingLifeYears <= 3 ? 35 : m.avgRemainingLifeYears <= 6 ? 18 : 0;
  return clamp(ageStress + eolStress + (m.hotspotCount / m.assetCount) * 20, 0, 100);
};

const runSustainabilityRiskHeatmap = (trackFittings = []) => {
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

  const zones = Array.from(zoneMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  const allMetrics = zones.map((z) => buildZoneMetrics(z.assets));
  const fleetAvg = {
    emissionsPerAsset:
      allMetrics.reduce((s, m) => s + m.emissionsPerAsset, 0) / Math.max(allMetrics.length, 1)
  };

  const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(zones.length))));
  const cells = zones.map((zone, index) => {
    const m = buildZoneMetrics(zone.assets);
    const scores = {
      highEmission: scoreHighEmission(m, fleetAvg),
      resourceWastage: scoreResourceWastage(m),
      overMaintained: scoreOverMaintained(m),
      poorSustainability: scorePoorSustainability(m),
      climateVulnerable: scoreClimateVulnerable(m)
    };

    const compositeScore = round2(
      scores.highEmission * 0.28 +
        scores.resourceWastage * 0.2 +
        scores.overMaintained * 0.15 +
        scores.poorSustainability * 0.22 +
        scores.climateVulnerable * 0.15
    );

    const status = statusFromScore(compositeScore);
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      zoneKey: zone.key,
      label: zone.label,
      row,
      col,
      compositeScore,
      status,
      color: COLORS[status],
      flags: {
        highEmission: scores.highEmission >= 55,
        resourceWastage: scores.resourceWastage >= 50,
        overMaintained: scores.overMaintained >= 50,
        poorSustainability: scores.poorSustainability >= 50,
        climateVulnerable: scores.climateVulnerable >= 50
      },
      categoryScores: scores,
      metrics: m
    };
  });

  const pickByScore = (key, minScore = 50) =>
    cells
      .filter((c) => c.categoryScores[key] >= minScore)
      .sort((a, b) => b.categoryScores[key] - a.categoryScores[key])
      .map((c) => ({
        zoneKey: c.zoneKey,
        label: c.label,
        score: c.categoryScores[key],
        status: statusFromScore(c.categoryScores[key]),
        color: COLORS[statusFromScore(c.categoryScores[key])],
        assetCount: c.metrics.assetCount,
        summary:
          key === 'highEmission'
            ? `${c.metrics.totalEmissionsKg} kg CO₂ · ${c.metrics.hotspotCount} hotspots`
            : key === 'resourceWastage'
              ? `${c.metrics.avgEnergyKWh} kWh avg · ${c.metrics.avgRecyclability}% recyclability`
              : key === 'overMaintained'
                ? `${c.metrics.avgMaintenanceFrequency}/yr · ${c.metrics.maintenanceEvents} events`
                : key === 'poorSustainability'
                  ? `Score ${c.metrics.avgSustainabilityScore} · impact ${c.metrics.avgLifecycleImpact}`
                  : `${c.metrics.avgRemainingLifeYears}yr remaining · age ${c.metrics.avgAgeYears}yr`
      }));

  const counts = cells.reduce(
    (acc, c) => {
      acc[c.status] += 1;
      return acc;
    },
    { critical: 0, moderate: 0, sustainable: 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    legend: {
      critical: { label: 'Critical sustainability risk', color: COLORS.critical },
      moderate: { label: 'Moderate risk', color: COLORS.moderate },
      sustainable: { label: 'Sustainable zone', color: COLORS.sustainable }
    },
    summary: {
      totalZones: cells.length,
      criticalZones: counts.critical,
      moderateZones: counts.moderate,
      sustainableZones: counts.sustainable,
      totalAssets: profiles.length,
      portfolioEmissionsKg: carbonReport.totalEmissionsCO2
    },
    grid: { rows: Math.ceil(cells.length / cols) || 1, cols },
    cells,
    categories: {
      highEmissionSectors: pickByScore('highEmission'),
      resourceWastageZones: pickByScore('resourceWastage'),
      overMaintainedAreas: pickByScore('overMaintained', 45),
      poorSustainabilityRegions: pickByScore('poorSustainability'),
      climateVulnerableInfrastructure: pickByScore('climateVulnerable')
    },
    recommendations: [
      counts.critical > 0 &&
        `Immediate intervention required in **${counts.critical}** critical zone(s) — deploy decarbonization task forces.`,
      pickByScore('highEmission')[0] &&
        `Highest emission sector: **${pickByScore('highEmission')[0].label}** (${pickByScore('highEmission')[0].score} risk score).`,
      pickByScore('overMaintained')[0] &&
        `Reduce over-maintenance in **${pickByScore('overMaintained')[0].label}** to cut operational CO₂.`,
      counts.sustainable > 0 &&
        `**${counts.sustainable}** corridor zone(s) are sustainable — use as benchmarks for other sectors.`
    ].filter(Boolean)
  };
};

module.exports = {
  runSustainabilityRiskHeatmap,
  COLORS,
  statusFromScore
};
