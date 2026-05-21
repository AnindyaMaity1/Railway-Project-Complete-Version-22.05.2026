const {
  computeTrackFittingCarbonProfile,
  buildAssetCarbonReport
} = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const MATERIAL_ALTERNATIVES = {
  steel: [
    {
      id: 'steel-recycled-alloy',
      name: 'Recycled Alloy Variant',
      material: 'steel',
      emissionFactor: 1.2,
      recyclabilityPercent: 88,
      serviceLifeYearsBonus: 3,
      recommendationType: 'recyclable_alternative',
      description: 'Post-consumer recycled alloy with equivalent structural rating for clips and fasteners.'
    },
    {
      id: 'steel-low-carbon',
      name: 'Low-Carbon Structural Steel',
      material: 'steel',
      emissionFactor: 1.35,
      recyclabilityPercent: 72,
      serviceLifeYearsBonus: 0,
      recommendationType: 'lower_emission',
      description: 'Electric-arc furnace steel with 30% lower embodied carbon vs standard grade.'
    },
    {
      id: 'steel-composite-hybrid',
      name: 'Steel-Composite Hybrid Clip',
      material: 'composite',
      emissionFactor: 4.2,
      recyclabilityPercent: 65,
      serviceLifeYearsBonus: 5,
      recommendationType: 'long_life_component',
      description: 'Hybrid design extends service life and reduces replacement frequency.'
    }
  ],
  aluminum: [
    {
      id: 'aluminum-recycled',
      name: 'Recycled Aluminum Extrusion',
      material: 'aluminum',
      emissionFactor: 2.8,
      recyclabilityPercent: 92,
      serviceLifeYearsBonus: 2,
      recommendationType: 'recyclable_alternative',
      description: 'Secondary aluminum ingot — up to 95% less energy than primary smelting.'
    },
    {
      id: 'aluminum-magnesium',
      name: 'Lower-Emission Al-Mg Alloy',
      material: 'aluminum',
      emissionFactor: 5.2,
      recyclabilityPercent: 80,
      serviceLifeYearsBonus: 1,
      recommendationType: 'lower_emission',
      description: 'Lightweight alloy with reduced smelting intensity for bracket applications.'
    }
  ],
  rubber: [
    {
      id: 'rubber-recycled-epdm',
      name: 'Recycled EPDM Pad',
      material: 'rubber',
      emissionFactor: 1.6,
      recyclabilityPercent: 75,
      serviceLifeYearsBonus: 1,
      recommendationType: 'recyclable_alternative',
      description: 'Recycled elastomer pads for sleeper and pad applications.'
    },
    {
      id: 'rubber-bio',
      name: 'Bio-Based Rubber Compound',
      material: 'rubber',
      emissionFactor: 2.1,
      recyclabilityPercent: 55,
      serviceLifeYearsBonus: 2,
      recommendationType: 'sustainable_replacement',
      description: 'Partial bio-feedstock replacement for petroleum-based rubber.'
    }
  ],
  plastic: [
    {
      id: 'plastic-recycled-pet',
      name: 'Recycled PET Composite',
      material: 'plastic',
      emissionFactor: 2.8,
      recyclabilityPercent: 90,
      serviceLifeYearsBonus: 0,
      recommendationType: 'recyclable_alternative',
      description: 'Closed-loop recycled polymer for insulators and covers.'
    }
  ],
  composite: [
    {
      id: 'composite-recycled',
      name: 'Recycled Fiber Composite',
      material: 'composite',
      emissionFactor: 3.2,
      recyclabilityPercent: 70,
      serviceLifeYearsBonus: 4,
      recommendationType: 'recyclable_alternative',
      description: 'Recycled glass-fiber composite for non-critical structural elements.'
    }
  ],
  concrete: [
    {
      id: 'concrete-low-clinker',
      name: 'Low-Clinker Concrete Sleeper',
      material: 'concrete',
      emissionFactor: 0.09,
      recyclabilityPercent: 40,
      serviceLifeYearsBonus: 5,
      recommendationType: 'lower_emission',
      description: 'Supplementary cementitious materials reduce sleeper carbon intensity.'
    },
    {
      id: 'concrete-long-life',
      name: 'High-Durability Sleeper Mix',
      material: 'concrete',
      emissionFactor: 0.11,
      recyclabilityPercent: 35,
      serviceLifeYearsBonus: 8,
      recommendationType: 'long_life_component',
      description: 'Extended 40-year design life lowers lifecycle replacement emissions.'
    }
  ],
  default: [
    {
      id: 'default-recycled-steel',
      name: 'Recycled Alloy Variant',
      material: 'steel',
      emissionFactor: 1.2,
      recyclabilityPercent: 85,
      serviceLifeYearsBonus: 2,
      recommendationType: 'recyclable_alternative',
      description: 'General-purpose recycled steel alternative for unspecified fittings.'
    },
    {
      id: 'default-sustainable-composite',
      name: 'Sustainable Composite Replacement',
      material: 'composite',
      emissionFactor: 4.5,
      recyclabilityPercent: 68,
      serviceLifeYearsBonus: 4,
      recommendationType: 'sustainable_replacement',
      description: 'Balanced composite option with improved recyclability and lifespan.'
    }
  ]
};

const TYPE_LABELS = {
  recyclable_alternative: 'Recyclable alternative',
  lower_emission: 'Lower-emission material',
  sustainable_replacement: 'Sustainable replacement',
  long_life_component: 'Long-life component'
};

const getBaseMaterialKey = (material, itemType) => {
  const text = `${material || ''} ${itemType || ''}`.toLowerCase();
  const keys = Object.keys(MATERIAL_ALTERNATIVES).filter((k) => k !== 'default');
  return keys.find((k) => text.includes(k)) || 'default';
};

const getCurrentMaterialLabel = (item) => {
  if (item.material) return item.material;
  if (item.itemType) return `Standard ${item.itemType.replace(/_/g, ' ')}`;
  return 'Standard component';
};

const simulateAlternativeEmissions = (item, alt) => {
  const weight = Number(item.weight || 25);
  const baselineProfile = computeTrackFittingCarbonProfile(item);
  const baselineMaterialKg = baselineProfile.carbonBreakdown.materialEmissions;

  const newMaterialKg = round2(weight * alt.emissionFactor);
  const materialDelta = baselineMaterialKg - newMaterialKg;

  const merged = {
    ...item,
    material: alt.name,
    manufacturingEmissionsKgCO2: newMaterialKg,
    recyclabilityPercent: Math.max(
      Number(item.recyclabilityPercent || 0),
      alt.recyclabilityPercent
    ),
    serviceLife: Number(item.serviceLife || 25) + alt.serviceLifeYearsBonus
  };
  const projectedProfile = computeTrackFittingCarbonProfile(merged);
  const totalSaved = round2(
    Math.max(0, baselineProfile.totalEmissionsCO2 - projectedProfile.totalEmissionsCO2)
  );
  const percentReduction =
    baselineProfile.totalEmissionsCO2 > 0
      ? round2((totalSaved / baselineProfile.totalEmissionsCO2) * 100)
      : round2((materialDelta / Math.max(baselineMaterialKg, 1)) * 100);

  return {
    baselineKg: baselineProfile.totalEmissionsCO2,
    projectedKg: projectedProfile.totalEmissionsCO2,
    co2SavedKg: totalSaved,
    percentReduction: clamp(percentReduction, 5, 65),
    projectedRating: projectedProfile.sustainabilityRating
  };
};

const buildRecommendationForAsset = (item, alt) => {
  const impact = simulateAlternativeEmissions(item, alt);
  const currentLabel = getCurrentMaterialLabel(item);

  return {
    id: `${item._id}-${alt.id}`,
    assetId: item._id,
    serialNumber: item.serialNumber,
    itemType: item.itemType,
    currentMaterial: currentLabel,
    recommendedMaterial: alt.name,
    recommendationType: alt.recommendationType,
    recommendationLabel: TYPE_LABELS[alt.recommendationType],
    description: alt.description,
    impact,
    recyclabilityGain: round2(alt.recyclabilityPercent - Number(item.recyclabilityPercent || 0)),
    serviceLifeGainYears: alt.serviceLifeYearsBonus,
    priority: impact.percentReduction >= 25 ? 'high' : impact.percentReduction >= 15 ? 'medium' : 'low',
    aiRationale: `Replacing **${currentLabel}** with **${alt.name}** yields an estimated **${impact.percentReduction}%** CO₂ reduction (${impact.co2SavedKg} kg saved) for this asset.`
  };
};

const runGreenMaterialRecommendations = (trackFittings = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const profiles = carbonReport.profiles;

  const allRecommendations = [];

  profiles.forEach((item) => {
    const baseKey = getBaseMaterialKey(item.material, item.itemType);
    const alts = MATERIAL_ALTERNATIVES[baseKey] || MATERIAL_ALTERNATIVES.default;

    alts.forEach((alt) => {
      const rec = buildRecommendationForAsset(item, alt);
      if (rec.impact.percentReduction >= 5) {
        allRecommendations.push(rec);
      }
    });
  });

  const sorted = [...allRecommendations].sort(
    (a, b) => b.impact.percentReduction - a.impact.percentReduction
  );

  const topRecommendations = sorted.slice(0, 24);
  const featured = topRecommendations[0] || null;

  const byType = {
    recyclable_alternative: sorted.filter((r) => r.recommendationType === 'recyclable_alternative').slice(0, 8),
    lower_emission: sorted.filter((r) => r.recommendationType === 'lower_emission').slice(0, 8),
    sustainable_replacement: sorted.filter((r) => r.recommendationType === 'sustainable_replacement').slice(0, 8),
    long_life_component: sorted.filter((r) => r.recommendationType === 'long_life_component').slice(0, 8)
  };

  const portfolioSavings = round2(
    topRecommendations.reduce((sum, r) => sum + r.impact.co2SavedKg, 0)
  );
  const avgReduction = topRecommendations.length
    ? round2(
        topRecommendations.reduce((sum, r) => sum + r.impact.percentReduction, 0) /
          topRecommendations.length
      )
    : 0;

  const materialCatalog = Object.entries(MATERIAL_ALTERNATIVES)
    .filter(([k]) => k !== 'default')
    .map(([key, alts]) => ({
      baseMaterial: key,
      alternativeCount: alts.length,
      bestAlternative: alts[0]?.name
    }));

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'Smart Green Material Recommendation AI',
    summary: {
      totalAssets: profiles.length,
      recommendationCount: sorted.length,
      topOpportunities: topRecommendations.length,
      portfolioPotentialSavingsKg: portfolioSavings,
      averageReductionPercent: avgReduction,
      highPriorityCount: sorted.filter((r) => r.priority === 'high').length
    },
    featured,
    topRecommendations,
    byType,
    materialCatalog,
    insights: [
      featured
        ? `Top opportunity: switch **${featured.currentMaterial}** → **${featured.recommendedMaterial}** for **${featured.impact.percentReduction}%** CO₂ reduction.`
        : 'Add track fittings with material and weight data to unlock AI material recommendations.',
      `Portfolio could avoid **${portfolioSavings.toLocaleString()} kg CO₂** by adopting top green material swaps.`,
      `${byType.recyclable_alternative.length} recyclable alternatives identified across the fleet.`
    ]
  };
};

module.exports = {
  runGreenMaterialRecommendations,
  MATERIAL_ALTERNATIVES,
  TYPE_LABELS
};
