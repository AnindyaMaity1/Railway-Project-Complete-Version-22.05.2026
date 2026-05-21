const MATERIAL_EMISSION_FACTORS = {
  steel: 1.9,
  aluminum: 8.1,
  concrete: 0.13,
  rubber: 3.0,
  plastic: 6.0,
  composite: 5.5,
  wood: 0.4,
  default: 2.5
};

const TRANSPORT_EMISSION_FACTORS = {
  rail: 0.02,
  truck: 0.18,
  ship: 0.015,
  air: 0.6,
  default: 0.25
};

const FUEL_EMISSION_FACTORS = {
  diesel: 2.68,
  petrol: 2.31,
  natural_gas: 2.75,
  electricity: 0.5,
  default: 2.7
};

const ENERGY_EMISSION_FACTOR = 0.5; // kg CO2 per kWh
const MAINTENANCE_KG_PER_EVENT = 18;
const MAINTENANCE_KG_PER_ANNUAL_FREQUENCY = 12;
const WASTE_KG_CO2_PER_KG = 0.5;
const REPLACEMENT_KG_PER_KG_WEIGHT = 0.4;
const MIN_REPLACEMENT_KG = 10;
const DEFAULT_SERVICE_LIFE_YEARS = 25;
const EFFICIENCY_IMPROVEMENT_PER_YEAR = 0.02;
const FORECAST_YEARS = 5;
const HISTORICAL_PERIODS = 6;

const LIFECYCLE_REFERENCE_KG = {
  material: 200,
  transport: 50,
  energy: 30,
  maintenance: 40,
  waste: 25
};

const round2 = (value) => Math.round(value * 100) / 100;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getRating = (score) => {
  if (score <= 25) return 'A';
  if (score <= 45) return 'B';
  if (score <= 65) return 'C';
  if (score <= 85) return 'D';
  return 'E';
};

const getMaterialFactor = (material) => {
  if (!material) return MATERIAL_EMISSION_FACTORS.default;
  const normalized = material.toLowerCase().trim();
  const match = Object.keys(MATERIAL_EMISSION_FACTORS).find(
    (key) => key !== 'default' && normalized.includes(key)
  );
  return match ? MATERIAL_EMISSION_FACTORS[match] : MATERIAL_EMISSION_FACTORS.default;
};

const getTransportFactor = (mode) => {
  if (!mode) return TRANSPORT_EMISSION_FACTORS.default;
  const normalized = mode.toLowerCase().trim();
  return TRANSPORT_EMISSION_FACTORS[normalized] || TRANSPORT_EMISSION_FACTORS.default;
};

const getFuelFactor = (fuelType) => {
  if (!fuelType) return FUEL_EMISSION_FACTORS.default;
  const normalized = fuelType.toLowerCase().trim();
  return FUEL_EMISSION_FACTORS[normalized] || FUEL_EMISSION_FACTORS.default;
};

const getAssetAgeYears = (manufacturingDate) => {
  if (!manufacturingDate) return 0;
  const mfg = new Date(manufacturingDate);
  if (Number.isNaN(mfg.getTime())) return 0;
  const ms = Date.now() - mfg.getTime();
  return Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000));
};

const computeLifecycleImpactScore = (breakdown) => {
  const materialNorm = clamp((breakdown.materialEmissions / LIFECYCLE_REFERENCE_KG.material) * 100, 0, 100);
  const transportNorm = clamp(
    ((breakdown.transportEmissions + breakdown.transportFuelEmissions) / LIFECYCLE_REFERENCE_KG.transport) * 100,
    0,
    100
  );
  const energyNorm = clamp((breakdown.energyEmissions / LIFECYCLE_REFERENCE_KG.energy) * 100, 0, 100);
  const maintenanceNorm = clamp((breakdown.maintenanceEmissions / LIFECYCLE_REFERENCE_KG.maintenance) * 100, 0, 100);
  const wasteNorm = clamp((breakdown.wasteEmissions / LIFECYCLE_REFERENCE_KG.waste) * 100, 0, 100);
  const recyclabilityPenalty = clamp((100 - breakdown.recyclabilityPercent) * 0.25, 0, 25);

  const weighted =
    materialNorm * 0.35 +
    transportNorm * 0.2 +
    energyNorm * 0.15 +
    maintenanceNorm * 0.15 +
    wasteNorm * 0.1 +
    recyclabilityPenalty * 0.05;

  return round2(clamp(weighted, 0, 100));
};

const buildHistoricalEmissions = (annualRecurringKg, totalSnapshotKg, periods = HISTORICAL_PERIODS) => {
  const records = [];
  const now = new Date();
  const monthlyRate = annualRecurringKg / 12;
  const fallbackMonthly = totalSnapshotKg / Math.max(periods, 1) / 12;

  for (let i = periods - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const growthIndex = periods - 1 - i;
    const growthFactor = 1 + growthIndex * 0.03;
    const baseRate = monthlyRate > 0 ? monthlyRate : fallbackMonthly;
    records.push({
      date: date.toISOString().split('T')[0],
      totalKgCO2: round2(baseRate * growthFactor),
      source: monthlyRate > 0 ? 'operational recurring' : 'inventory estimate',
      notes: i === periods - 1 ? 'Most recent period' : 'Historic estimate'
    });
  }

  return records;
};

const buildYearlyForecast = (annualRecurringKg, remainingLifeYears, years = FORECAST_YEARS) => {
  const forecast = [];
  let fiveYearTotal = 0;

  for (let year = 1; year <= years; year += 1) {
    if (year > remainingLifeYears) {
      forecast.push({
        year: `Year ${year}`,
        projectedKgCO2: 0,
        comment: 'Beyond remaining service life'
      });
      continue;
    }

    const efficiencyFactor = Math.pow(1 - EFFICIENCY_IMPROVEMENT_PER_YEAR, year - 1);
    const projected = round2(annualRecurringKg * efficiencyFactor);
    fiveYearTotal += projected;
    forecast.push({
      year: `Year ${year}`,
      projectedKgCO2: projected,
      comment: year === 1 ? 'Near-term forecast' : 'Long-term projection'
    });
  }

  return { forecast, fiveYearTotal: round2(fiveYearTotal) };
};

const aggregatePortfolioForecast = (profiles, years = FORECAST_YEARS) => {
  const yearlyBreakdown = Array.from({ length: years }, (_, index) => ({
    year: `Year ${index + 1}`,
    projectedKgCO2: 0
  }));

  let projectedNext5Years = 0;
  let annualRecurringTotal = 0;

  profiles.forEach((item) => {
    const { annualRecurringEmissions, emissionTrend } = item.carbonProfile;
    annualRecurringTotal += annualRecurringEmissions;
    projectedNext5Years += item.carbonProfile.predictedFiveYearEmissions;

    emissionTrend.forEach((entry, index) => {
      if (index < years) {
        yearlyBreakdown[index].projectedKgCO2 += entry.projectedKgCO2;
      }
    });
  });

  yearlyBreakdown.forEach((entry) => {
    entry.projectedKgCO2 = round2(entry.projectedKgCO2);
  });

  const yearOne = yearlyBreakdown[0]?.projectedKgCO2 || 0;
  const yearFive = yearlyBreakdown[years - 1]?.projectedKgCO2 || 0;
  const reductionPercent =
    yearOne > 0 ? round2(((yearOne - yearFive) / yearOne) * 100) : 0;

  return {
    yearlyBreakdown,
    projectedNext5Years: round2(projectedNext5Years),
    annualRecurringTotal: round2(annualRecurringTotal),
    reductionPercent,
    efficiencyImprovementRate: EFFICIENCY_IMPROVEMENT_PER_YEAR
  };
};

const computeVendorCarbonScore = (vendor = {}) => {
  const quality = vendor.qualityRating || 0;
  const avgRating = vendor.performance?.averageRating || 0;
  const onTime = vendor.performance?.onTimeDelivery || 0;
  const carbonIntensity = vendor.carbonEvaluation?.carbonIntensity || 120;
  const greenCert = (vendor.carbonEvaluation?.greenCertificationCount || 0) * 3;

  const intensityPenalty = clamp(carbonIntensity * 0.35, 0, 60);
  const score = clamp(
    100 - intensityPenalty + avgRating * 6 + quality * 4 + onTime * 0.3 + greenCert,
    0,
    100
  );

  return {
    vendorId: vendor._id,
    vendorName: vendor.companyName,
    carbonIntensity,
    sustainabilityScore: round2(score),
    greenCertifications: vendor.carbonEvaluation?.greenCertificationCount || 0,
    evaluationNote:
      score >= 70
        ? 'Low-carbon supplier'
        : score >= 50
          ? 'Moderate carbon performance'
          : 'High carbon risk'
  };
};

const computeTrackFittingCarbonProfile = (trackFitting = {}) => {
  const material = trackFitting.material || trackFitting.itemType || '';
  const materialFactor = getMaterialFactor(material);
  const weight = Number(trackFitting.weight || 0);
  const manufacturingEmissions = Number(
    trackFitting.carbonData?.manufacturingEmissionsKgCO2 ||
      trackFitting.manufacturingEmissionsKgCO2 ||
      0
  );

  const materialEmissions =
    manufacturingEmissions > 0
      ? round2(manufacturingEmissions)
      : round2(weight * materialFactor);

  const transportMode =
    trackFitting.carbonData?.transportMode || trackFitting.transportMode || 'rail';
  const transportDistanceKm = Number(
    trackFitting.carbonData?.transportDistanceKm || trackFitting.transportDistanceKm || 0
  );
  const transportFactor = getTransportFactor(transportMode);
  const freightTonnes = weight > 0 ? weight / 1000 : 1;
  const transportEmissions = round2(transportDistanceKm * transportFactor * freightTonnes);

  const fuelConsumptionLiters = Number(
    trackFitting.carbonData?.fuelConsumptionLiters || trackFitting.fuelConsumptionLiters || 0
  );
  const fuelFactor = getFuelFactor(
    trackFitting.carbonData?.fuelType || trackFitting.fuelType || 'diesel'
  );
  const transportFuelEmissions = round2(fuelConsumptionLiters * fuelFactor);

  const energyUsageKWh = Number(
    trackFitting.carbonData?.energyUsageKWh || trackFitting.energyUsageKWh || 0
  );
  const energyEmissions = round2(energyUsageKWh * ENERGY_EMISSION_FACTOR);

  const maintenanceCount = Array.isArray(trackFitting.maintenance)
    ? trackFitting.maintenance.length
    : 0;
  const maintenanceFrequency = Number(
    trackFitting.carbonData?.maintenanceFrequencyPerYear ||
      trackFitting.maintenanceFrequencyPerYear ||
      0
  );
  const maintenanceHistorical = round2(maintenanceCount * MAINTENANCE_KG_PER_EVENT);
  const maintenancePlannedAnnual = round2(maintenanceFrequency * MAINTENANCE_KG_PER_ANNUAL_FREQUENCY);
  const maintenanceEmissions = round2(maintenanceHistorical + maintenancePlannedAnnual);

  const replacementCycles = Number(
    trackFitting.carbonData?.replacementCycles || trackFitting.replacementCycles || 0
  );
  const replacementUnit = Math.max(MIN_REPLACEMENT_KG, weight * REPLACEMENT_KG_PER_KG_WEIGHT);
  const replacementEmissions = round2(
    (replacementCycles > 0 ? replacementCycles : 1) * replacementUnit
  );

  const wasteGenerationKg = Number(
    trackFitting.carbonData?.wasteGenerationKg || trackFitting.wasteGenerationKg || 0
  );
  const recyclabilityPercent = clamp(
    Number(
      trackFitting.carbonData?.recyclabilityPercent || trackFitting.recyclabilityPercent || 0
    ),
    0,
    100
  );
  const wasteEmissions = round2(
    wasteGenerationKg * WASTE_KG_CO2_PER_KG * (1 - recyclabilityPercent / 100)
  );

  const carbonBreakdown = {
    materialEmissions,
    transportEmissions,
    transportFuelEmissions,
    energyEmissions,
    maintenanceEmissions,
    replacementEmissions,
    wasteEmissions,
    recyclabilityPercent
  };

  const totalEmissionsCO2 = round2(
    materialEmissions +
      transportEmissions +
      transportFuelEmissions +
      energyEmissions +
      maintenanceEmissions +
      replacementEmissions +
      wasteEmissions
  );

  const lifecycleImpactScore = computeLifecycleImpactScore(carbonBreakdown);
  const sustainabilityRating = getRating(lifecycleImpactScore);

  const ageYears = getAssetAgeYears(trackFitting.manufacturingDate);
  const serviceLifeYears = Number(
    trackFitting.serviceLife ||
      trackFitting.carbonData?.equipmentLifespanYears ||
      trackFitting.equipmentLifespanYears ||
      DEFAULT_SERVICE_LIFE_YEARS
  );
  const remainingLifeYears = Math.max(0, serviceLifeYears - ageYears);

  const maintenanceAnnualFromHistory =
    ageYears > 0 ? round2(maintenanceHistorical / ageYears) : 0;
  const maintenanceAnnualKg = Math.max(maintenancePlannedAnnual, maintenanceAnnualFromHistory);

  const replacementAnnualKg =
    serviceLifeYears > 0 ? round2(replacementEmissions / serviceLifeYears) : 0;

  const energyAnnualKg = energyEmissions;
  const wasteAnnualKg = wasteEmissions;

  const annualRecurringEmissions = round2(
    maintenanceAnnualKg + replacementAnnualKg + energyAnnualKg + wasteAnnualKg
  );

  const { forecast: emissionTrend, fiveYearTotal: predictedFiveYearEmissions } =
    buildYearlyForecast(annualRecurringEmissions, remainingLifeYears);

  const predictedLifetimeEmissions = round2(
    annualRecurringEmissions * remainingLifeYears
  );

  const historicalEmissions = buildHistoricalEmissions(
    annualRecurringEmissions,
    totalEmissionsCO2
  );

  const emissionThreshold = Math.max(250, totalEmissionsCO2 * 0.75);
  const hotspotScore = totalEmissionsCO2 >= emissionThreshold || lifecycleImpactScore >= 70;

  const recommendations = [];
  if (hotspotScore) {
    recommendations.push(
      'Review highest-emission components and seek lower-carbon material options.'
    );
  }
  if (recyclabilityPercent < 50) {
    recommendations.push(
      'Increase recyclability targets to reduce waste emissions and improve lifecycle score.'
    );
  }
  if (remainingLifeYears <= 1 && serviceLifeYears > 0) {
    recommendations.push(
      'Optimize replacement timing to avoid premature asset turnover and reduce lifecycle CO₂.'
    );
  }
  if (energyUsageKWh > 100) {
    recommendations.push(
      'Investigate energy efficiency improvements for manufacturing and maintenance.'
    );
  }
  if (transportMode === 'truck' && transportDistanceKm > 50) {
    recommendations.push(
      'Consider rail transport or consolidation to reduce transportation CO₂ per km.'
    );
  }
  if (annualRecurringEmissions > totalEmissionsCO2 * 0.5 && serviceLifeYears > 0) {
    recommendations.push(
      'Recurring operational emissions are high relative to embodied carbon — tighten maintenance and replacement cadence.'
    );
  }

  return {
    totalEmissionsCO2,
    annualRecurringEmissions,
    lifecycleImpactScore,
    sustainabilityRating,
    sustainabilityScore: round2(100 - lifecycleImpactScore),
    predictedLifetimeEmissions,
    predictedFiveYearEmissions,
    emissionTrend,
    historicalEmissions,
    carbonBreakdown,
    remainingLifeYears: round2(remainingLifeYears),
    serviceLifeYears,
    ageYears: round2(ageYears),
    hotspot: hotspotScore,
    recommendations,
    lastUpdated: new Date().toISOString()
  };
};

const buildAssetCarbonReport = (trackFittings = []) => {
  const profiles = trackFittings.map((item) => ({
    ...item,
    carbonProfile: computeTrackFittingCarbonProfile(item)
  }));

  const sortedHighEmission = [...profiles]
    .sort((a, b) => b.carbonProfile.totalEmissionsCO2 - a.carbonProfile.totalEmissionsCO2)
    .slice(0, 8)
    .map((item) => ({
      id: item._id,
      serialNumber: item.serialNumber,
      itemType: item.itemType,
      vendorName: item.vendorName,
      currentLocation: item.currentLocation,
      totalEmissionsCO2: item.carbonProfile.totalEmissionsCO2,
      annualRecurringEmissions: item.carbonProfile.annualRecurringEmissions,
      sustainabilityRating: item.carbonProfile.sustainabilityRating,
      hotspot: item.carbonProfile.hotspot
    }));

  const totalEmissionsCO2 = round2(
    profiles.reduce((sum, item) => sum + item.carbonProfile.totalEmissionsCO2, 0)
  );

  const averageImpact = profiles.length
    ? round2(
        profiles.reduce((sum, item) => sum + item.carbonProfile.lifecycleImpactScore, 0) /
          profiles.length
      )
    : 0;

  const ratingsDistribution = profiles.reduce((acc, item) => {
    const rating = item.carbonProfile.sustainabilityRating;
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {});

  const strategyForecast = aggregatePortfolioForecast(profiles);
  const hotspots = profiles.filter((item) => item.carbonProfile.hotspot).length;

  const averageSustainabilityScore = profiles.length
    ? round2(
        profiles.reduce((sum, item) => sum + item.carbonProfile.sustainabilityScore, 0) /
          profiles.length
      )
    : 0;

  return {
    totalAssets: profiles.length,
    totalEmissionsCO2,
    averageLifecycleImpactScore: averageImpact,
    averageSustainabilityScore,
    sustainabilityRatings: ratingsDistribution,
    highEmissionAssets: sortedHighEmission,
    projectedNext5Years: strategyForecast.projectedNext5Years,
    strategyForecast,
    hotspots,
    profiles
  };
};

module.exports = {
  computeTrackFittingCarbonProfile,
  computeVendorCarbonScore,
  buildAssetCarbonReport,
  buildYearlyForecast,
  aggregatePortfolioForecast
};
