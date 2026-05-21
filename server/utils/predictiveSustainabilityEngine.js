const { buildAssetCarbonReport, computeTrackFittingCarbonProfile } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const EFFICIENCY_DECLINE = 0.02;
const HORIZON_YEARS = [1, 2, 3, 5];

const getZoneKey = (item) => {
  const km = Number(item.trackSectionKm);
  if (!Number.isNaN(km) && km >= 0) {
    const zone = Math.floor(km / 5) * 5;
    return { key: `km-${zone}`, label: `Track KM ${zone}–${zone + 5}`, sortOrder: zone };
  }
  if (item.currentLocation) {
    return { key: `loc-${item.currentLocation}`, label: item.currentLocation, sortOrder: 9999 };
  }
  return { key: 'zone-general', label: 'General Corridor', sortOrder: 10000 };
};

const predictAssetFutureCost = (item, profile) => {
  const annual = profile.annualRecurringEmissions;
  const remaining = Math.max(profile.remainingLifeYears, 1);
  const ageRatio = profile.ageYears / Math.max(profile.serviceLifeYears, 1);
  const degradationRate = clamp(0.03 + ageRatio * 0.04 + (profile.hotspot ? 0.05 : 0), 0.02, 0.12);

  const horizons = HORIZON_YEARS.map((years) => {
    let cumulative = 0;
    for (let y = 1; y <= years; y += 1) {
      if (y > remaining) break;
      cumulative += annual * Math.pow(1 + degradationRate, y - 1);
    }
    const replacementBump = years >= profile.remainingLifeYears ? profile.carbonBreakdown.replacementEmissions : 0;
    return {
      years,
      projectedKgCO2: round2(cumulative + replacementBump),
      label: years === 1 ? '1 year' : `${years} years`
    };
  });

  const fiveYearCost = horizons.find((h) => h.years === 5)?.projectedKgCO2 || horizons[horizons.length - 1].projectedKgCO2;
  const expenseScore = clamp(
    fiveYearCost * 0.4 + profile.lifecycleImpactScore * 0.35 + (profile.hotspot ? 25 : 0) + annual * 0.5,
    0,
    100
  );

  const willBecomeExpensive = expenseScore >= 65 || (fiveYearCost > profile.totalEmissionsCO2 * 1.8 && fiveYearCost > 200);
  const trend = degradationRate > 0.08 ? 'accelerating' : degradationRate > 0.05 ? 'rising' : 'stable';

  return {
    id: item._id,
    serialNumber: item.serialNumber,
    itemType: item.itemType,
    material: item.material,
    currentLocation: item.currentLocation,
    trackSectionKm: item.trackSectionKm,
    currentEmissionsKg: profile.totalEmissionsCO2,
    annualRecurringKg: annual,
    remainingLifeYears: profile.remainingLifeYears,
    sustainabilityRating: profile.sustainabilityRating,
    expenseScore: round2(expenseScore),
    fiveYearProjectedKg: fiveYearCost,
    willBecomeExpensive,
    trend,
    riskLevel: expenseScore >= 80 ? 'critical' : expenseScore >= 65 ? 'high' : expenseScore >= 45 ? 'medium' : 'low',
    horizons,
    drivers: [
      profile.hotspot && 'Emission hotspot trajectory',
      annual > profile.totalEmissionsCO2 * 0.4 && 'High recurring operational CO₂',
      profile.remainingLifeYears <= 3 && 'Near-term replacement cycle',
      ageRatio > 0.7 && 'Late lifecycle degradation'
    ].filter(Boolean)
  };
};

const analyzeComponents = (profiles) => {
  const groups = new Map();

  profiles.forEach((item) => {
    const componentKey = item.itemType || item.material || 'Unknown component';
    if (!groups.has(componentKey)) {
      groups.set(componentKey, {
        component: componentKey,
        assetCount: 0,
        totalEmissions: 0,
        totalAnnual: 0,
        impactSum: 0,
        poorRatings: 0,
        hotspots: 0
      });
    }
    const g = groups.get(componentKey);
    const p = item.carbonProfile;
    g.assetCount += 1;
    g.totalEmissions += p.totalEmissionsCO2;
    g.totalAnnual += p.annualRecurringEmissions;
    g.impactSum += p.lifecycleImpactScore;
    if (['D', 'E'].includes(p.sustainabilityRating)) g.poorRatings += 1;
    if (p.hotspot) g.hotspots += 1;
  });

  return Array.from(groups.values())
    .map((g) => {
      const avgImpact = g.impactSum / g.assetCount;
      const problemScore = round2(
        avgImpact * 0.45 +
          (g.poorRatings / g.assetCount) * 100 * 0.3 +
          (g.hotspots / g.assetCount) * 100 * 0.25
      );
      const longTermRisk =
        problemScore >= 70 ? 'critical' : problemScore >= 55 ? 'high' : problemScore >= 40 ? 'medium' : 'low';

      return {
        component: g.component,
        assetCount: g.assetCount,
        avgLifecycleImpact: round2(avgImpact),
        totalEmissionsKg: round2(g.totalEmissions),
        annualRecurringKg: round2(g.totalAnnual),
        poorRatingCount: g.poorRatings,
        hotspotCount: g.hotspots,
        problemScore,
        longTermRisk,
        createsLongTermProblems: problemScore >= 55,
        prediction: problemScore >= 70
          ? 'Structural sustainability liability — material or design intervention required within 3–5 years.'
          : problemScore >= 55
            ? 'Emerging long-term burden — monitor and plan retrofit or supplier change.'
            : 'Manageable lifecycle profile with routine optimization.'
      };
    })
    .sort((a, b) => b.problemScore - a.problemScore);
};

const analyzeCarbonHeavyZones = (profiles) => {
  const zones = new Map();

  profiles.forEach((item) => {
    const zone = getZoneKey(item);
    if (!zones.has(zone.key)) {
      zones.set(zone.key, {
        zoneKey: zone.key,
        label: zone.label,
        sortOrder: zone.sortOrder,
        assets: [],
        currentKg: 0,
        annualKg: 0,
        fiveYearKg: 0
      });
    }
    const z = zones.get(zone.key);
    const p = item.carbonProfile;
    z.assets.push(item);
    z.currentKg += p.totalEmissionsCO2;
    z.annualKg += p.annualRecurringEmissions;
    z.fiveYearKg += p.predictedFiveYearEmissions;
  });

  const zoneList = Array.from(zones.values()).map((z) => {
    const count = z.assets.length;
    const growthRate = 0.04;
    const projections = HORIZON_YEARS.map((years) => ({
      years,
      projectedKgCO2: round2(z.annualKg * years * Math.pow(1 + growthRate, years - 1) + z.currentKg * 0.15)
    }));

    const intensityScore = round2(z.fiveYearKg / Math.max(count, 1));
    return {
      zoneKey: z.zoneKey,
      label: z.label,
      assetCount: count,
      currentEmissionsKg: round2(z.currentKg),
      annualRecurringKg: round2(z.annualKg),
      fiveYearProjectedKg: round2(z.fiveYearKg),
      intensityPerAsset: intensityScore,
      projections,
      carbonHeavy: false,
      riskLevel: 'low'
    };
  });

  if (!zoneList.length) return [];

  const sorted = [...zoneList].sort((a, b) => b.fiveYearProjectedKg - a.fiveYearProjectedKg);
  const threshold = sorted[Math.floor(sorted.length * 0.25)]?.fiveYearProjectedKg || 0;

  return sorted.map((z, index) => {
    const carbonHeavy = z.fiveYearProjectedKg >= threshold && z.fiveYearProjectedKg > 100;
    const riskLevel =
      z.fiveYearProjectedKg >= threshold * 1.2 ? 'critical' : carbonHeavy ? 'high' : index < 3 ? 'medium' : 'low';
    return {
      ...z,
      carbonHeavy,
      riskLevel,
      rank: index + 1,
      forecastNarrative: carbonHeavy
        ? `Projected to accumulate **${z.fiveYearProjectedKg.toLocaleString()} kg CO₂** over 5 years — prioritize decarbonization in this corridor.`
        : `Moderate growth corridor — **${z.fiveYearProjectedKg.toLocaleString()} kg** five-year operational forecast.`
    };
  });
};

const runPredictiveSustainabilityAnalytics = (trackFittings = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const profiles = carbonReport.profiles;

  const assetPredictions = profiles
    .map((item) => predictAssetFutureCost(item, item.carbonProfile))
    .sort((a, b) => b.expenseScore - a.expenseScore);

  const expensiveAssets = assetPredictions.filter((a) => a.willBecomeExpensive);
  const componentRisks = analyzeComponents(profiles);
  const problemComponents = componentRisks.filter((c) => c.createsLongTermProblems);
  const carbonHeavyZones = analyzeCarbonHeavyZones(profiles);
  const heavyZones = carbonHeavyZones.filter((z) => z.carbonHeavy);

  const portfolioForecast = carbonReport.strategyForecast || {};
  const timeline = (portfolioForecast.yearlyBreakdown || []).map((row, index) => ({
    period: row.year,
    projectedKgCO2: row.projectedKgCO2,
    cumulativeKg: round2(
      (portfolioForecast.yearlyBreakdown || [])
        .slice(0, index + 1)
        .reduce((sum, r) => sum + r.projectedKgCO2, 0)
    )
  }));

  const criticalCount = assetPredictions.filter((a) => a.riskLevel === 'critical').length;
  const headline =
    criticalCount > 0
      ? `${criticalCount} asset(s) on track to become environmentally expensive; ${heavyZones.length} carbon-heavy zone(s) identified.`
      : expensiveAssets.length > 0
        ? `${expensiveAssets.length} asset(s) show rising sustainability cost trajectories.`
        : 'Portfolio sustainability trajectory is stable — continue preventive monitoring.';

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'Predictive Sustainability Analytics',
    headline,
    summary: {
      totalAssets: profiles.length,
      expensiveAssetCount: expensiveAssets.length,
      problemComponentCount: problemComponents.length,
      carbonHeavyZoneCount: heavyZones.length,
      portfolioFiveYearKg: carbonReport.projectedNext5Years,
      avgExpenseScore: assetPredictions.length
        ? round2(assetPredictions.reduce((s, a) => s + a.expenseScore, 0) / assetPredictions.length)
        : 0
    },
    expensiveAssets: expensiveAssets.slice(0, 12),
    assetPredictions: assetPredictions.slice(0, 20),
    componentRisks: componentRisks.slice(0, 10),
    problemComponents: problemComponents.slice(0, 8),
    carbonHeavyZones,
    heavyZones: heavyZones.slice(0, 6),
    portfolioTimeline: timeline,
    recommendations: [
      expensiveAssets.length > 0 &&
        `Intervene on **${expensiveAssets.length}** assets predicted to become environmentally expensive before 5-year horizon.`,
      problemComponents.length > 0 &&
        `Address **${problemComponents[0].component}** — highest long-term sustainability problem score (${problemComponents[0].problemScore}).`,
      heavyZones.length > 0 &&
        `Deploy targeted decarbonization in **${heavyZones[0].label}** (rank #1 carbon-heavy zone).`,
      'Integrate predictive outputs with Eco-Route and Digital Twin for operational planning.'
    ].filter(Boolean)
  };
};

module.exports = {
  runPredictiveSustainabilityAnalytics,
  predictAssetFutureCost,
  analyzeComponents,
  analyzeCarbonHeavyZones
};
