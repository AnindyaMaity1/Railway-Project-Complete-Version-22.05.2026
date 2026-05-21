const { buildAssetCarbonReport, computeVendorCarbonScore } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const DIMENSION_WEIGHTS = {
  carbon: 0.25,
  energy: 0.15,
  maintenance: 0.15,
  material: 0.15,
  lifecycle: 0.15,
  vendor: 0.15
};

const scoreFromRatio = (value, goodAt, badAt) => {
  if (value <= goodAt) return 100;
  if (value >= badAt) return 0;
  return round2(100 - ((value - goodAt) / (badAt - goodAt)) * 100);
};

const analyzeCarbonDimension = (carbonReport) => {
  const assetCount = carbonReport.totalAssets || 0;
  const hotspotRatio = assetCount > 0 ? carbonReport.hotspots / assetCount : 0;
  const avgScore = carbonReport.averageSustainabilityScore || 0;
  const hotspotPenalty = clamp(hotspotRatio * 120, 0, 40);
  const score = clamp(round2(avgScore - hotspotPenalty), 0, 100);

  return {
    score,
    metrics: {
      totalEmissionsKg: carbonReport.totalEmissionsCO2 || 0,
      averageImpact: carbonReport.averageLifecycleImpactScore || 0,
      hotspots: carbonReport.hotspots || 0,
      hotspotRatio: round2(hotspotRatio * 100)
    }
  };
};

const analyzeEnergyDimension = (profiles) => {
  if (!profiles.length) {
    return { score: 50, metrics: { totalKWh: 0, avgKWhPerAsset: 0, energyEmissionsKg: 0 } };
  }

  let totalKWh = 0;
  let energyEmissions = 0;
  profiles.forEach((item) => {
    const kwh = Number(item.energyUsageKWh || item.carbonData?.energyUsageKWh || 0);
    totalKWh += kwh;
    energyEmissions += item.carbonProfile.carbonBreakdown.energyEmissions;
  });

  const avgKWh = totalKWh / profiles.length;
  const score = scoreFromRatio(avgKWh, 40, 250);

  return {
    score,
    metrics: {
      totalKWh: round2(totalKWh),
      avgKWhPerAsset: round2(avgKWh),
      energyEmissionsKg: round2(energyEmissions)
    }
  };
};

const analyzeMaintenanceDimension = (profiles) => {
  if (!profiles.length) {
    return { score: 50, metrics: { avgFrequency: 0, overMaintainedAssets: 0 } };
  }

  let frequencySum = 0;
  let overMaintained = 0;
  let efficiencySum = 0;

  profiles.forEach((item) => {
    const frequency = Number(
      item.maintenanceFrequencyPerYear || item.carbonData?.maintenanceFrequencyPerYear || 0
    );
    const maintenanceCount = Array.isArray(item.maintenance) ? item.maintenance.length : 0;
    const ageYears = item.carbonProfile.ageYears || 0;
    const eventsPerYear = ageYears > 0 ? maintenanceCount / ageYears : maintenanceCount;
    const excess = Math.max(0, eventsPerYear - frequency);
    if (frequency > 3 || excess > 1.5) overMaintained += 1;
    frequencySum += frequency;
    const efficiency = clamp(100 - frequency * 12 - excess * 20, 0, 100);
    efficiencySum += efficiency;
  });

  const avgFrequency = frequencySum / profiles.length;
  const score = round2(efficiencySum / profiles.length);

  return {
    score,
    metrics: {
      avgFrequency: round2(avgFrequency),
      overMaintainedAssets: overMaintained,
      maintenanceEmissionsKg: round2(
        profiles.reduce((sum, item) => sum + item.carbonProfile.carbonBreakdown.maintenanceEmissions, 0)
      )
    }
  };
};

const analyzeMaterialDimension = (profiles) => {
  if (!profiles.length) {
    return { score: 50, metrics: { avgRecyclability: 0, highIntensityMaterials: 0 } };
  }

  let recyclabilitySum = 0;
  let highIntensity = 0;
  let materialEmissions = 0;

  profiles.forEach((item) => {
    const recyclability = Number(
      item.recyclabilityPercent || item.carbonData?.recyclabilityPercent || 0
    );
    recyclabilitySum += recyclability;
    materialEmissions += item.carbonProfile.carbonBreakdown.materialEmissions;
    const material = (item.material || item.itemType || '').toLowerCase();
    if (material.includes('aluminum') || material.includes('plastic')) highIntensity += 1;
  });

  const avgRecyclability = recyclabilitySum / profiles.length;
  const intensityRatio = highIntensity / profiles.length;
  const recyclabilityScore = clamp(avgRecyclability, 0, 100);
  const intensityPenalty = clamp(intensityRatio * 100, 0, 50);
  const score = round2(recyclabilityScore * 0.6 + (100 - intensityPenalty) * 0.4);

  return {
    score,
    metrics: {
      avgRecyclability: round2(avgRecyclability),
      highIntensityMaterials: highIntensity,
      materialEmissionsKg: round2(materialEmissions)
    }
  };
};

const analyzeLifecycleDimension = (profiles) => {
  if (!profiles.length) {
    return { score: 50, metrics: { avgHealthPercent: 0, endOfLifeSoon: 0 } };
  }

  let healthSum = 0;
  let endOfLifeSoon = 0;

  profiles.forEach((item) => {
    const serviceLife = item.carbonProfile.serviceLifeYears || 1;
    const remaining = item.carbonProfile.remainingLifeYears || 0;
    const healthPercent = clamp((remaining / serviceLife) * 100, 0, 100);
    healthSum += healthPercent;
    if (remaining <= 2) endOfLifeSoon += 1;
  });

  const avgHealth = healthSum / profiles.length;
  const eolPenalty = clamp((endOfLifeSoon / profiles.length) * 80, 0, 35);
  const score = clamp(round2(avgHealth - eolPenalty), 0, 100);

  return {
    score,
    metrics: {
      avgHealthPercent: round2(avgHealth),
      endOfLifeSoon,
      avgRemainingYears: round2(
        profiles.reduce((sum, item) => sum + item.carbonProfile.remainingLifeYears, 0) /
          profiles.length
      )
    }
  };
};

const analyzeVendorDimension = (vendorScores) => {
  if (!vendorScores.length) {
    return { score: 50, metrics: { vendorCount: 0, highRiskVendors: 0, avgIntensity: 0 } };
  }

  const avgScore =
    vendorScores.reduce((sum, vendor) => sum + vendor.sustainabilityScore, 0) /
    vendorScores.length;
  const highRisk = vendorScores.filter((vendor) => vendor.sustainabilityScore < 50).length;
  const avgIntensity =
    vendorScores.reduce((sum, vendor) => sum + vendor.carbonIntensity, 0) /
    vendorScores.length;

  return {
    score: round2(avgScore),
    metrics: {
      vendorCount: vendorScores.length,
      highRiskVendors: highRisk,
      avgIntensity: round2(avgIntensity)
    }
  };
};

const buildRiskAlerts = (dimensions, carbonReport, profiles, vendorScores) => {
  const alerts = [];

  if (dimensions.carbon.metrics.hotspots > 0) {
    alerts.push({
      id: 'carbon-hotspots',
      severity: dimensions.carbon.metrics.hotspots >= 5 ? 'critical' : 'warning',
      dimension: 'carbon',
      title: 'Emission hotspots detected',
      message: `${dimensions.carbon.metrics.hotspots} asset(s) exceed dynamic emission thresholds.`,
      metric: `${dimensions.carbon.metrics.hotspots} hotspots`
    });
  }

  if (dimensions.energy.score < 55) {
    alerts.push({
      id: 'energy-usage-high',
      severity: dimensions.energy.score < 35 ? 'critical' : 'warning',
      dimension: 'energy',
      title: 'High energy intensity',
      message: `Average energy use is ${dimensions.energy.metrics.avgKWhPerAsset} kWh per asset.`,
      metric: `${dimensions.energy.metrics.energyEmissionsKg} kg CO₂`
    });
  }

  if (dimensions.maintenance.metrics.overMaintainedAssets > 0) {
    alerts.push({
      id: 'maintenance-inefficiency',
      severity: 'warning',
      dimension: 'maintenance',
      title: 'Maintenance inefficiency',
      message: `${dimensions.maintenance.metrics.overMaintainedAssets} asset(s) show excess maintenance versus planned cadence.`,
      metric: `${dimensions.maintenance.metrics.overMaintainedAssets} assets`
    });
  }

  if (dimensions.material.metrics.avgRecyclability < 50) {
    alerts.push({
      id: 'material-recyclability-low',
      severity: 'warning',
      dimension: 'material',
      title: 'Low recyclability portfolio',
      message: `Portfolio recyclability is ${dimensions.material.metrics.avgRecyclability}% — below the 50% target.`,
      metric: `${dimensions.material.metrics.avgRecyclability}%`
    });
  }

  if (dimensions.lifecycle.metrics.endOfLifeSoon > 0) {
    alerts.push({
      id: 'lifecycle-eol',
      severity: dimensions.lifecycle.metrics.endOfLifeSoon >= 3 ? 'critical' : 'warning',
      dimension: 'lifecycle',
      title: 'Assets nearing end of service life',
      message: `${dimensions.lifecycle.metrics.endOfLifeSoon} asset(s) have ≤2 years remaining service life.`,
      metric: `${dimensions.lifecycle.metrics.endOfLifeSoon} assets`
    });
  }

  if (dimensions.vendor.metrics.highRiskVendors > 0) {
    alerts.push({
      id: 'vendor-risk',
      severity: dimensions.vendor.metrics.highRiskVendors >= 2 ? 'critical' : 'warning',
      dimension: 'vendor',
      title: 'High-risk vendor exposure',
      message: `${dimensions.vendor.metrics.highRiskVendors} vendor(s) scored below 50 on sustainability.`,
      metric: `${dimensions.vendor.metrics.highRiskVendors} vendors`
    });
  }

  const strategy = carbonReport.strategyForecast || {};
  if (strategy.reductionPercent < 5 && (carbonReport.projectedNext5Years || 0) > 0) {
    alerts.push({
      id: 'forecast-trajectory-weak',
      severity: 'info',
      dimension: 'carbon',
      title: 'Forecast efficiency gains are limited',
      message: 'Five-year trajectory shows under 5% reduction — additional interventions recommended.',
      metric: `${strategy.reductionPercent || 0}% reduction`
    });
  }

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
};

const buildOptimizations = (dimensions, carbonReport, profiles) => {
  const suggestions = [];

  if (dimensions.carbon.score < 70) {
    suggestions.push({
      priority: 'high',
      dimension: 'carbon',
      title: 'Reduce emission hotspots',
      impact: 'High',
      suggestion:
        'Prioritize retrofit or replacement for top CO₂ assets and shift procurement to lower-intensity materials.',
      estimatedSavingsKg: round2((carbonReport.totalEmissionsCO2 || 0) * 0.12)
    });
  }

  if (dimensions.energy.score < 65) {
    suggestions.push({
      priority: 'high',
      dimension: 'energy',
      title: 'Optimize energy consumption',
      impact: 'Medium-High',
      suggestion:
        'Deploy smart metering, schedule high-load maintenance off-peak, and target assets above 100 kWh.',
      estimatedSavingsKg: round2(dimensions.energy.metrics.energyEmissionsKg * 0.18)
    });
  }

  if (dimensions.maintenance.score < 65) {
    suggestions.push({
      priority: 'medium',
      dimension: 'maintenance',
      title: 'Align maintenance cadence',
      impact: 'Medium',
      suggestion:
        'Switch from reactive to predictive maintenance to cut over-servicing and recurring CO₂.',
      estimatedSavingsKg: round2(dimensions.maintenance.metrics.maintenanceEmissionsKg * 0.15)
    });
  }

  if (dimensions.material.score < 70) {
    suggestions.push({
      priority: 'medium',
      dimension: 'material',
      title: 'Improve material sustainability',
      impact: 'Medium',
      suggestion:
        'Increase recyclability above 70% and substitute aluminum/plastic where steel or composite is viable.',
      estimatedSavingsKg: round2(dimensions.material.metrics.materialEmissionsKg * 0.1)
    });
  }

  if (dimensions.lifecycle.score < 60) {
    suggestions.push({
      priority: 'high',
      dimension: 'lifecycle',
      title: 'Extend asset useful life',
      impact: 'High',
      suggestion:
        'Defer replacement for assets with >2 years remaining life through condition-based monitoring.',
      estimatedSavingsKg: round2((carbonReport.projectedNext5Years || 0) * 0.08)
    });
  }

  if (dimensions.vendor.score < 60) {
    suggestions.push({
      priority: 'medium',
      dimension: 'vendor',
      title: 'Rebalance supplier portfolio',
      impact: 'Medium',
      suggestion:
        'Route new procurement to vendors with sustainability scores ≥70 and green certifications.',
      estimatedSavingsKg: null
    });
  }

  const truckAssets = profiles.filter(
    (item) =>
      (item.transportMode || item.carbonData?.transportMode || '').toLowerCase() === 'truck'
  ).length;
  if (truckAssets > 0) {
    suggestions.push({
      priority: 'low',
      dimension: 'carbon',
      title: 'Shift transport mode to rail',
      impact: 'Low-Medium',
      suggestion: `${truckAssets} asset(s) use truck transport — consolidate shipments and switch to rail where possible.`,
      estimatedSavingsKg: round2(truckAssets * 25)
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
};

const buildEnvironmentalForecast = (carbonReport) => {
  const strategy = carbonReport.strategyForecast || {};
  const yearly = strategy.yearlyBreakdown || [];
  const yearOne = yearly[0]?.projectedKgCO2 || 0;
  const yearFive = yearly[yearly.length - 1]?.projectedKgCO2 || 0;

  return {
    horizonYears: yearly.length || 5,
    projectedNext5YearsKg: carbonReport.projectedNext5Years || 0,
    annualRecurringKg: strategy.annualRecurringTotal || 0,
    yearlyBreakdown: yearly,
    reductionPercent: strategy.reductionPercent || 0,
    efficiencyImprovementRate: strategy.efficiencyImprovementRate || 0.02,
    trajectory:
      (strategy.reductionPercent || 0) >= 8
        ? 'improving'
        : (strategy.reductionPercent || 0) >= 3
          ? 'stable'
          : 'needs_attention',
    narrative:
      yearFive < yearOne
        ? `Operational emissions are projected to fall from ${yearOne.toLocaleString()} kg (Year 1) to ${yearFive.toLocaleString()} kg (Year 5) through recurring-efficiency gains.`
        : 'Emissions trajectory is flat — implement optimization actions to unlock forecasted reductions.'
  };
};

const runSustainabilityBrain = (trackFittings = [], vendors = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const profiles = carbonReport.profiles;
  const vendorScores = vendors.map((vendor) => computeVendorCarbonScore(vendor));

  const dimensions = {
    carbon: analyzeCarbonDimension(carbonReport),
    energy: analyzeEnergyDimension(profiles),
    maintenance: analyzeMaintenanceDimension(profiles),
    material: analyzeMaterialDimension(profiles),
    lifecycle: analyzeLifecycleDimension(profiles),
    vendor: analyzeVendorDimension(vendorScores)
  };

  const dimensionScores = Object.fromEntries(
    Object.entries(dimensions).map(([key, value]) => [key, value.score])
  );

  const overallSustainabilityScore = round2(
    Object.entries(DIMENSION_WEIGHTS).reduce(
      (sum, [key, weight]) => sum + (dimensionScores[key] || 0) * weight,
      0
    )
  );

  const overallGrade =
    overallSustainabilityScore >= 80
      ? 'A'
      : overallSustainabilityScore >= 65
        ? 'B'
        : overallSustainabilityScore >= 50
          ? 'C'
          : overallSustainabilityScore >= 35
            ? 'D'
            : 'E';

  const riskAlerts = buildRiskAlerts(dimensions, carbonReport, profiles, vendorScores);
  const optimizations = buildOptimizations(dimensions, carbonReport, profiles);
  const environmentalForecast = buildEnvironmentalForecast(carbonReport);

  const topHotspotAssets = [...profiles]
    .filter((item) => item.carbonProfile.hotspot)
    .sort((a, b) => b.carbonProfile.totalEmissionsCO2 - a.carbonProfile.totalEmissionsCO2)
    .slice(0, 6)
    .map((item) => ({
      id: item._id,
      serialNumber: item.serialNumber,
      itemType: item.itemType,
      location: item.currentLocation,
      totalEmissionsCO2: item.carbonProfile.totalEmissionsCO2,
      rating: item.carbonProfile.sustainabilityRating
    }));

  const totalEstimatedSavings = round2(
    optimizations.reduce((sum, item) => sum + (item.estimatedSavingsKg || 0), 0)
  );

  return {
    status: 'active',
    lastAnalyzedAt: new Date().toISOString(),
    overallSustainabilityScore,
    overallGrade,
    dimensionScores,
    dimensionDetails: dimensions,
    riskAlerts,
    optimizations,
    environmentalForecast,
    topHotspotAssets,
    portfolio: {
      totalAssets: carbonReport.totalAssets,
      totalEmissionsCO2: carbonReport.totalEmissionsCO2,
      hotspots: carbonReport.hotspots
    },
    aiSummary: {
      headline:
        overallSustainabilityScore >= 70
          ? 'Portfolio sustainability performance is strong with targeted improvement opportunities.'
          : overallSustainabilityScore >= 50
            ? 'Portfolio is moderate — address high-priority risks to improve trajectory.'
            : 'Portfolio requires immediate sustainability intervention across multiple dimensions.',
      totalEstimatedSavingsKg: totalEstimatedSavings,
      criticalAlerts: riskAlerts.filter((alert) => alert.severity === 'critical').length,
      optimizationCount: optimizations.length
    }
  };
};

module.exports = {
  runSustainabilityBrain,
  analyzeCarbonDimension,
  analyzeEnergyDimension,
  analyzeMaintenanceDimension,
  analyzeMaterialDimension,
  analyzeLifecycleDimension,
  analyzeVendorDimension
};
