const { buildAssetCarbonReport, computeVendorCarbonScore } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const FACTOR_WEIGHTS = {
  carbonEfficiency: 0.2,
  assetLongevity: 0.18,
  wasteReduction: 0.15,
  energyOptimization: 0.15,
  vendorSustainability: 0.17,
  maintenanceEfficiency: 0.15
};

const FACTOR_META = {
  carbonEfficiency: {
    label: 'Carbon efficiency',
    description: 'Emissions intensity and sustainability ratings per asset'
  },
  assetLongevity: {
    label: 'Asset longevity',
    description: 'Remaining useful life vs service life — fewer premature replacements'
  },
  wasteReduction: {
    label: 'Waste reduction',
    description: 'Recyclability and low waste-generation footprint'
  },
  energyOptimization: {
    label: 'Energy optimization',
    description: 'kWh usage and energy-related CO₂ per asset'
  },
  vendorSustainability: {
    label: 'Vendor sustainability',
    description: 'Supplier green scores and carbon intensity'
  },
  maintenanceEfficiency: {
    label: 'Maintenance efficiency',
    description: 'Right-sized maintenance cadence without over-servicing'
  }
};

const GRADE_BANDS = [
  { grade: 'A+', label: 'Green Leader', min: 90, color: '#15803d' },
  { grade: 'A', label: 'Excellent', min: 80, color: '#22c55e' },
  { grade: 'B', label: 'Good', min: 70, color: '#3b82f6' },
  { grade: 'C', label: 'Moderate', min: 60, color: '#eab308' },
  { grade: 'D', label: 'Needs improvement', min: 50, color: '#f97316' },
  { grade: 'E', label: 'Critical', min: 0, color: '#ef4444' }
];

const getGrade = (score) => GRADE_BANDS.find((b) => score >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1];

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

const scoreFromRatio = (value, goodAt, badAt) => {
  if (value <= goodAt) return 100;
  if (value >= badAt) return 0;
  return round2(100 - ((value - goodAt) / (badAt - goodAt)) * 100);
};

const scoreCarbonEfficiency = (assets, fleetAvgEmissionsPerAsset) => {
  if (!assets.length) return { score: 50, metrics: {} };
  let sum = 0;
  assets.forEach((item) => {
    const p = item.carbonProfile;
    const intensityScore = scoreFromRatio(
      p.totalEmissionsCO2,
      fleetAvgEmissionsPerAsset * 0.5,
      fleetAvgEmissionsPerAsset * 2
    );
    const ratingBonus = { A: 15, B: 10, C: 5, D: 0, E: -10 }[p.sustainabilityRating] || 0;
    const hotspotPenalty = p.hotspot ? -15 : 0;
    sum += clamp(intensityScore + ratingBonus + hotspotPenalty + p.sustainabilityScore * 0.25, 0, 100);
  });
  const avgEmissions = assets.reduce((s, a) => s + a.carbonProfile.totalEmissionsCO2, 0) / assets.length;
  return {
    score: round2(sum / assets.length),
    metrics: {
      avgEmissionsKg: round2(avgEmissions),
      hotspotCount: assets.filter((a) => a.carbonProfile.hotspot).length
    }
  };
};

const scoreAssetLongevity = (assets) => {
  if (!assets.length) return { score: 50, metrics: {} };
  let sum = 0;
  assets.forEach((item) => {
    const p = item.carbonProfile;
    const ratio = p.remainingLifeYears / Math.max(p.serviceLifeYears, 1);
    sum += clamp(ratio * 100 - (p.remainingLifeYears <= 2 ? 20 : 0), 0, 100);
  });
  const avgRemaining = assets.reduce((s, a) => s + a.carbonProfile.remainingLifeYears, 0) / assets.length;
  return {
    score: round2(sum / assets.length),
    metrics: { avgRemainingLifeYears: round2(avgRemaining) }
  };
};

const scoreWasteReduction = (assets) => {
  if (!assets.length) return { score: 50, metrics: {} };
  let sum = 0;
  let wasteTotal = 0;
  assets.forEach((item) => {
    const recyclability = Number(item.recyclabilityPercent || item.carbonProfile?.carbonBreakdown?.recyclabilityPercent || 0);
    const waste = item.carbonProfile.carbonBreakdown.wasteEmissions;
    wasteTotal += waste;
    const wasteScore = scoreFromRatio(waste, 5, 80);
    sum += clamp(recyclability * 0.65 + wasteScore * 0.35, 0, 100);
  });
  const avgRecyclability = assets.reduce(
    (s, a) => s + Number(a.recyclabilityPercent || a.carbonProfile?.carbonBreakdown?.recyclabilityPercent || 0),
    0
  ) / assets.length;
  return {
    score: round2(sum / assets.length),
    metrics: { avgRecyclabilityPercent: round2(avgRecyclability), wasteEmissionsKg: round2(wasteTotal) }
  };
};

const scoreEnergyOptimization = (assets) => {
  if (!assets.length) return { score: 50, metrics: {} };
  let sum = 0;
  let kwhTotal = 0;
  assets.forEach((item) => {
    const kwh = Number(item.energyUsageKWh || 0);
    kwhTotal += kwh;
    sum += scoreFromRatio(kwh, 30, 200);
  });
  return {
    score: round2(sum / assets.length),
    metrics: {
      avgKWhPerAsset: round2(kwhTotal / assets.length),
      energyEmissionsKg: round2(assets.reduce((s, a) => s + a.carbonProfile.carbonBreakdown.energyEmissions, 0))
    }
  };
};

const scoreVendorSustainability = (assets, vendorScoreMap) => {
  if (!assets.length) return { score: 50, metrics: { linkedVendors: 0 } };
  const scores = [];
  const seen = new Set();
  assets.forEach((item) => {
    const key = (item.vendorName || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    const vs = vendorScoreMap.get(key);
    if (vs) scores.push(vs.sustainabilityScore);
  });
  const score = scores.length ? round2(scores.reduce((a, b) => a + b, 0) / scores.length) : 55;
  return {
    score,
    metrics: { linkedVendors: scores.length, avgVendorScore: score }
  };
};

const scoreMaintenanceEfficiency = (assets) => {
  if (!assets.length) return { score: 50, metrics: {} };
  let sum = 0;
  let overMaintained = 0;
  assets.forEach((item) => {
    const freq = Number(item.maintenanceFrequencyPerYear || 0);
    const events = Array.isArray(item.maintenance) ? item.maintenance.length : 0;
    const age = item.carbonProfile.ageYears || 1;
    const excess = Math.max(0, events / age - freq);
    if (freq > 3 || excess > 1.5) overMaintained += 1;
    sum += clamp(100 - freq * 14 - excess * 22, 0, 100);
  });
  return {
    score: round2(sum / assets.length),
    metrics: {
      avgFrequencyPerYear: round2(
        assets.reduce((s, a) => s + Number(a.maintenanceFrequencyPerYear || 0), 0) / assets.length
      ),
      overMaintainedAssets: overMaintained
    }
  };
};

const computeZoneFactors = (assets, fleetAvgEmissions, vendorScoreMap) => ({
  carbonEfficiency: scoreCarbonEfficiency(assets, fleetAvgEmissions),
  assetLongevity: scoreAssetLongevity(assets),
  wasteReduction: scoreWasteReduction(assets),
  energyOptimization: scoreEnergyOptimization(assets),
  vendorSustainability: scoreVendorSustainability(assets, vendorScoreMap),
  maintenanceEfficiency: scoreMaintenanceEfficiency(assets)
});

const compositeFromFactors = (factors) => {
  let total = 0;
  const breakdown = {};
  Object.entries(FACTOR_WEIGHTS).forEach(([key, weight]) => {
    const factorScore = factors[key]?.score ?? 50;
    const weighted = round2(factorScore * weight);
    breakdown[key] = {
      score: factorScore,
      weight: round2(weight * 100),
      weightedContribution: weighted,
      label: FACTOR_META[key].label,
      description: FACTOR_META[key].description
    };
    total += weighted;
  });
  return { score: round2(total), factors: breakdown };
};

const aggregatePortfolioFactors = (zoneScores) => {
  const keys = Object.keys(FACTOR_WEIGHTS);
  const aggregated = {};
  let totalWeight = 0;
  zoneScores.forEach((z) => {
    const w = z.assetCount;
    totalWeight += w;
    keys.forEach((key) => {
      if (!aggregated[key]) aggregated[key] = { sum: 0, weight: 0 };
      aggregated[key].sum += (z.factors[key]?.score || 50) * w;
      aggregated[key].weight += w;
    });
  });
  const factorScores = {};
  keys.forEach((key) => {
    factorScores[key] = {
      score: aggregated[key].weight > 0 ? round2(aggregated[key].sum / aggregated[key].weight) : 50,
      label: FACTOR_META[key].label,
      description: FACTOR_META[key].description,
      weight: round2(FACTOR_WEIGHTS[key] * 100)
    };
  });
  return compositeFromFactors(
    Object.fromEntries(keys.map((k) => [k, { score: factorScores[k].score }]))
  );
};

const runRailwayGreenScore = (trackFittings = [], vendors = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const profiles = carbonReport.profiles;

  const vendorScoreMap = new Map();
  vendors.forEach((v) => {
    const key = (v.companyName || '').trim().toLowerCase();
    if (key) vendorScoreMap.set(key, computeVendorCarbonScore(v));
  });

  const fleetAvgEmissions =
    profiles.length > 0 ? carbonReport.totalEmissionsCO2 / profiles.length : 100;

  const zoneMap = new Map();
  profiles.forEach((item) => {
    const zone = getZoneKey(item);
    if (!zoneMap.has(zone.key)) zoneMap.set(zone.key, { ...zone, assets: [] });
    zoneMap.get(zone.key).assets.push(item);
  });

  const zoneList = Array.from(zoneMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);

  const zoneScores = zoneList.map((zone) => {
    const rawFactors = computeZoneFactors(zone.assets, fleetAvgEmissions, vendorScoreMap);
    const composite = compositeFromFactors(rawFactors);
    const grade = getGrade(composite.score);
    return {
      zoneKey: zone.key,
      label: zone.label,
      assetCount: zone.assets.length,
      zoneSustainabilityScore: composite.score,
      displayScore: `${composite.score}/100`,
      grade: grade.grade,
      gradeLabel: grade.label,
      color: grade.color,
      factors: composite.factors,
      rank: 0
    };
  });

  const ranked = [...zoneScores]
    .sort((a, b) => b.zoneSustainabilityScore - a.zoneSustainabilityScore)
    .map((z, i) => ({ ...z, rank: i + 1 }));

  const portfolioComposite =
    ranked.length > 0
      ? round2(
          ranked.reduce((s, z) => s + z.zoneSustainabilityScore * z.assetCount, 0) /
            Math.max(ranked.reduce((sum, z) => sum + z.assetCount, 0), 1)
        )
      : round2(carbonReport.averageSustainabilityScore || 50);

  const portfolioFactors = aggregatePortfolioFactors(ranked);
  const portfolioGrade = getGrade(portfolioComposite);

  const certifications = [];
  if (portfolioComposite >= 90) certifications.push({ name: 'Railway Green Leader', badge: 'A+', status: 'active' });
  if (portfolioComposite >= 75) certifications.push({ name: 'Carbon Efficient Corridor', badge: 'A', status: 'active' });
  if (portfolioComposite >= 60) certifications.push({ name: 'Sustainability Compliant', badge: 'B+', status: 'active' });
  if (ranked.filter((z) => z.zoneSustainabilityScore >= 85).length >= 2) {
    certifications.push({ name: 'Multi-Zone Excellence', badge: '★', status: 'active' });
  }

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'Railway Green Score',
    signatureFeature: true,
    railwayGreenScore: {
      score: portfolioComposite,
      displayScore: `${portfolioComposite}/100`,
      grade: portfolioGrade.grade,
      gradeLabel: portfolioGrade.label,
      color: portfolioGrade.color,
      maxScore: 100
    },
    portfolioFactors: portfolioFactors.factors,
    factorWeights: Object.fromEntries(
      Object.entries(FACTOR_WEIGHTS).map(([k, v]) => [k, round2(v * 100)])
    ),
    factorMeta: FACTOR_META,
    gradeBands: GRADE_BANDS,
    zoneScores: ranked,
    topZones: ranked.slice(0, 5),
    improvementZones: [...ranked].sort((a, b) => a.zoneSustainabilityScore - b.zoneSustainabilityScore).slice(0, 5),
    certifications,
    summary: {
      totalZones: ranked.length,
      totalAssets: profiles.length,
      avgZoneScore: ranked.length
        ? round2(ranked.reduce((s, z) => s + z.zoneSustainabilityScore, 0) / ranked.length)
        : 0,
      zonesAbove90: ranked.filter((z) => z.zoneSustainabilityScore >= 90).length,
      zonesBelow60: ranked.filter((z) => z.zoneSustainabilityScore < 60).length,
      leadingZone: ranked[0]?.label || null,
      leadingZoneScore: ranked[0]?.zoneSustainabilityScore || 0
    },
    insights: [
      ranked[0]
        ? `Signature metric — **${ranked[0].label}** leads with Zone Sustainability Score **${ranked[0].zoneSustainabilityScore}/100** (${ranked[0].grade}).`
        : 'Add track fittings with corridor km or location to compute Railway Green Scores.',
      `Portfolio Railway Green Score: **${portfolioComposite}/100** (Grade **${portfolioGrade.grade}**).`,
      portfolioFactors.carbonEfficiency?.score < 65 &&
        `Carbon efficiency factor at **${portfolioFactors.carbonEfficiency.score}** — prioritize hotspot reduction.`,
      portfolioFactors.vendorSustainability?.score < 65 &&
        `Vendor sustainability at **${portfolioFactors.vendorSustainability.score}** — shift procurement to Tier A suppliers.`,
      ranked.filter((z) => z.zoneSustainabilityScore >= 90).length > 0 &&
        `**${ranked.filter((z) => z.zoneSustainabilityScore >= 90).length}** zone(s) achieved Green Leader status (90+).`
    ].filter(Boolean)
  };
};

module.exports = {
  runRailwayGreenScore,
  FACTOR_WEIGHTS,
  FACTOR_META,
  GRADE_BANDS,
  getGrade
};
