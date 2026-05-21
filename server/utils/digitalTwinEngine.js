const { buildAssetCarbonReport } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getSegmentKey = (item) => {
  const km = Number(item.trackSectionKm);
  if (!Number.isNaN(km) && km >= 0) {
    const zone = Math.floor(km / 5) * 5;
    return {
      key: `km-${zone}`,
      label: `Track KM ${zone}–${zone + 5}`,
      sortOrder: zone
    };
  }
  if (item.currentLocation) {
    return { key: `loc-${item.currentLocation}`, label: item.currentLocation, sortOrder: 9999 };
  }
  if (item.fromStation && item.toStation) {
    return {
      key: `route-${item.fromStation}-${item.toStation}`,
      label: `${item.fromStation} → ${item.toStation}`,
      sortOrder: 9998
    };
  }
  return { key: 'hub-central', label: 'Central Corridor Hub', sortOrder: 10000 };
};

const computeDegradationPercent = (profile, item) => {
  const ageRatio = profile.ageYears / Math.max(profile.serviceLifeYears, 1);
  const maintenanceCount = Array.isArray(item.maintenance) ? item.maintenance.length : 0;
  const inspectionPenalty = Array.isArray(item.inspections) && item.inspections.length > 3 ? 8 : 0;
  const wear =
    ageRatio * 65 +
    maintenanceCount * 2.5 +
    profile.lifecycleImpactScore * 0.25 +
    inspectionPenalty;
  return clamp(round2(wear), 0, 100);
};

const healthStatusFromScore = (score) => {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 45) return 'fair';
  if (score >= 25) return 'degraded';
  return 'critical';
};

const twinStatusColor = (status) => {
  const map = {
    excellent: '#22c55e',
    good: '#3b82f6',
    fair: '#eab308',
    degraded: '#f97316',
    critical: '#ef4444'
  };
  return map[status] || '#94a3b8';
};

const buildAssetTwinNode = (item) => {
  const profile = item.carbonProfile;
  const degradationPercent = computeDegradationPercent(profile, item);
  const structuralHealth = round2(100 - degradationPercent);
  const energyKwh = Number(item.energyUsageKWh || item.carbonData?.energyUsageKWh || 0);
  const trackKm = Number(item.trackSectionKm);
  const emissionIntensity = round2(
    profile.totalEmissionsCO2 / Math.max(!Number.isNaN(trackKm) && trackKm > 0 ? trackKm : 1, 0.1)
  );
  const realTimeImpactKg = round2(profile.annualRecurringEmissions / 365);
  const monthlyDegradationRate = clamp(degradationPercent / Math.max(profile.ageYears * 12, 6), 0.2, 4);

  const predictedHealth = {
    months6: clamp(round2(structuralHealth - monthlyDegradationRate * 6), 0, 100),
    months12: clamp(round2(structuralHealth - monthlyDegradationRate * 12), 0, 100),
    months24: clamp(round2(structuralHealth - monthlyDegradationRate * 24), 0, 100)
  };

  const segment = getSegmentKey(item);

  return {
    id: item._id,
    serialNumber: item.serialNumber,
    itemType: item.itemType,
    status: item.status,
    segmentKey: segment.key,
    segmentLabel: segment.label,
    coordinates: {
      lat: item.locationCoords?.latitude ?? item.toStationLatitude ?? item.fromStationLatitude ?? null,
      lng: item.locationCoords?.longitude ?? item.toStationLongitude ?? item.fromStationLongitude ?? null,
      trackSectionKm: !Number.isNaN(trackKm) ? trackKm : null
    },
    environmentalImpact: {
      totalKgCO2: profile.totalEmissionsCO2,
      annualRecurringKg: profile.annualRecurringEmissions,
      realTimeKgPerDay: realTimeImpactKg,
      rating: profile.sustainabilityRating,
      hotspot: profile.hotspot
    },
    degradation: {
      percent: degradationPercent,
      structuralHealth,
      status: healthStatusFromScore(structuralHealth),
      ageYears: profile.ageYears,
      remainingLifeYears: profile.remainingLifeYears
    },
    energy: {
      kWh: energyKwh,
      co2Kg: profile.carbonBreakdown.energyEmissions,
      intensityPerKwh: 0.5
    },
    emissionIntensity: {
      kgCO2PerKm: emissionIntensity,
      kgCO2PerAsset: profile.totalEmissionsCO2,
      level: emissionIntensity > 50 ? 'high' : emissionIntensity > 20 ? 'medium' : 'low'
    },
    predictedSustainabilityHealth: predictedHealth,
    twinNodeStatus: healthStatusFromScore(structuralHealth)
  };
};

const buildSegmentTwins = (assetNodes) => {
  const segmentMap = new Map();

  assetNodes.forEach((asset) => {
    if (!segmentMap.has(asset.segmentKey)) {
      segmentMap.set(asset.segmentKey, {
        segmentKey: asset.segmentKey,
        label: asset.segmentLabel,
        assets: [],
        sortOrder: 0
      });
    }
    const segment = segmentMap.get(asset.segmentKey);
    segment.assets.push(asset);
  });

  return Array.from(segmentMap.values())
    .map((segment) => {
      const count = segment.assets.length;
      const avgHealth =
        segment.assets.reduce((sum, a) => sum + a.degradation.structuralHealth, 0) / count;
      const totalImpact = segment.assets.reduce(
        (sum, a) => sum + a.environmentalImpact.totalKgCO2,
        0
      );
      const realTimeImpact = segment.assets.reduce(
        (sum, a) => sum + a.environmentalImpact.realTimeKgPerDay,
        0
      );
      const totalEnergy = segment.assets.reduce((sum, a) => sum + a.energy.kWh, 0);
      const avgIntensity =
        segment.assets.reduce((sum, a) => sum + a.emissionIntensity.kgCO2PerKm, 0) / count;
      const avgDegradation =
        segment.assets.reduce((sum, a) => sum + a.degradation.percent, 0) / count;
      const predicted6m =
        segment.assets.reduce((sum, a) => sum + a.predictedSustainabilityHealth.months6, 0) /
        count;
      const predicted12m =
        segment.assets.reduce((sum, a) => sum + a.predictedSustainabilityHealth.months12, 0) /
        count;
      const hotspotCount = segment.assets.filter((a) => a.environmentalImpact.hotspot).length;
      const status = healthStatusFromScore(avgHealth);

      return {
        segmentKey: segment.segmentKey,
        label: segment.label,
        assetCount: count,
        structuralHealth: round2(avgHealth),
        degradationPercent: round2(avgDegradation),
        status,
        color: twinStatusColor(status),
        environmentalImpactKg: round2(totalImpact),
        realTimeImpactKgPerDay: round2(realTimeImpact),
        energyKWh: round2(totalEnergy),
        emissionIntensityKgPerKm: round2(avgIntensity),
        predictedSustainabilityHealth: {
          months6: round2(predicted6m),
          months12: round2(predicted12m)
        },
        hotspotCount
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
};

const buildHealthTimeline = (assetNodes, months = 12) => {
  const timeline = [];
  const avgHealth =
    assetNodes.length > 0
      ? assetNodes.reduce((sum, a) => sum + a.degradation.structuralHealth, 0) / assetNodes.length
      : 50;
  const avgMonthlyDecline =
    assetNodes.length > 0
      ? assetNodes.reduce((sum, a) => sum + a.degradation.percent / Math.max(a.degradation.ageYears * 12, 6), 0) /
        assetNodes.length
      : 0.5;

  for (let m = 0; m <= months; m += 1) {
    timeline.push({
      month: m === 0 ? 'Now' : `+${m}mo`,
      sustainabilityHealth: round2(clamp(avgHealth - avgMonthlyDecline * m, 0, 100)),
      degradation: round2(clamp(100 - (avgHealth - avgMonthlyDecline * m), 0, 100))
    });
  }
  return timeline;
};

const buildImpactPulse = (assetNodes, points = 12) => {
  const baseDaily = assetNodes.reduce((sum, a) => sum + a.environmentalImpact.realTimeKgPerDay, 0);
  const pulse = [];
  for (let i = points - 1; i >= 0; i -= 1) {
    const variance = 0.92 + ((points - i) % 5) * 0.02;
    pulse.push({
      label: `T-${i * 2}h`,
      impactKg: round2((baseDaily / 12) * variance)
    });
  }
  return pulse;
};

const runDigitalTwin = (trackFittings = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const assetNodes = carbonReport.profiles.map(buildAssetTwinNode);
  const segments = buildSegmentTwins(assetNodes);

  const totalEnergy = assetNodes.reduce((sum, a) => sum + a.energy.kWh, 0);
  const realTimeDaily = assetNodes.reduce((sum, a) => sum + a.environmentalImpact.realTimeKgPerDay, 0);
  const avgHealth =
    assetNodes.length > 0
      ? assetNodes.reduce((sum, a) => sum + a.degradation.structuralHealth, 0) / assetNodes.length
      : 0;
  const avgIntensity =
    assetNodes.length > 0
      ? assetNodes.reduce((sum, a) => sum + a.emissionIntensity.kgCO2PerKm, 0) / assetNodes.length
      : 0;
  const avgDegradation =
    assetNodes.length > 0
      ? assetNodes.reduce((sum, a) => sum + a.degradation.percent, 0) / assetNodes.length
      : 0;

  const predicted6m =
    assetNodes.length > 0
      ? assetNodes.reduce((sum, a) => sum + a.predictedSustainabilityHealth.months6, 0) /
        assetNodes.length
      : 0;
  const predicted12m =
    assetNodes.length > 0
      ? assetNodes.reduce((sum, a) => sum + a.predictedSustainabilityHealth.months12, 0) /
        assetNodes.length
      : 0;

  return {
    twinId: `RAIL-TWIN-${Date.now()}`,
    syncStatus: 'live',
    lastSyncAt: new Date().toISOString(),
    corridor: {
      name: 'Railway Infrastructure Digital Twin',
      totalAssets: assetNodes.length,
      segmentCount: segments.length,
      totalLengthKm: round2(
        assetNodes.reduce((sum, a) => sum + (a.coordinates.trackSectionKm || 0), 0)
      )
    },
    globalMetrics: {
      realTimeEnvironmentalImpactKgPerDay: round2(realTimeDaily),
      totalEnvironmentalImpactKg: carbonReport.totalEmissionsCO2,
      totalEnergyConsumptionKWh: round2(totalEnergy),
      avgEmissionIntensityKgPerKm: round2(avgIntensity),
      avgStructuralHealth: round2(avgHealth),
      avgDegradationPercent: round2(avgDegradation),
      predictedSustainabilityHealth: {
        months6: round2(predicted6m),
        months12: round2(predicted12m),
        status6m: healthStatusFromScore(predicted6m),
        status12m: healthStatusFromScore(predicted12m)
      },
      hotspots: carbonReport.hotspots
    },
    segments,
    assets: assetNodes,
    healthTimeline: buildHealthTimeline(assetNodes),
    impactPulse: buildImpactPulse(assetNodes),
    projectedOperations: carbonReport.strategyForecast || null
  };
};

module.exports = {
  runDigitalTwin,
  buildAssetTwinNode,
  healthStatusFromScore,
  twinStatusColor
};
