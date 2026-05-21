const { buildAssetCarbonReport, computeVendorCarbonScore } = require('./carbonEngine');
const { runGreenMaterialRecommendations } = require('./greenMaterialEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const RECOMMENDATION_TYPES = {
  replace_asset: {
    label: 'Replace asset',
    icon: 'replace',
    description: 'AI decides whether to replace now or defer for lower lifecycle emissions'
  },
  delay_maintenance: {
    label: 'Delay maintenance',
    icon: 'maintenance',
    description: 'Postpone non-critical servicing to cut operational CO₂'
  },
  combine_routes: {
    label: 'Combine inspection routes',
    icon: 'route',
    description: 'Merge corridor visits to reduce transport emissions'
  },
  alternative_material: {
    label: 'Alternative material',
    icon: 'material',
    description: 'Switch to lower-carbon or recyclable materials'
  },
  greener_vendor: {
    label: 'Greener vendor',
    icon: 'vendor',
    description: 'Route procurement to higher-scoring sustainable suppliers'
  }
};

const makeId = (type, key) => `${type}-${String(key || 'x').replace(/[^a-zA-Z0-9-_]/g, '-')}`;

const buildReplaceRecommendations = (profiles) => {
  const recs = [];
  profiles.forEach((item) => {
    const p = item.carbonProfile;
    if (!p) return;
    const key = item.serialNumber || item._id?.toString() || item.qrCode;
    let decision = 'later';
    let priority = 'medium';
    let confidence = 72;
    let rationale = '';

    if (p.remainingLifeYears <= 2 || (['D', 'E'].includes(p.sustainabilityRating) && p.hotspot)) {
      decision = 'now';
      priority = 'high';
      confidence = 88;
      rationale = `Remaining life ${p.remainingLifeYears} yr with ${p.sustainabilityRating} rating — replacement avoids escalating emissions and failure risk.`;
    } else if (p.remainingLifeYears >= 6 && !p.hotspot && p.sustainabilityScore >= 55) {
      decision = 'later';
      priority = 'low';
      confidence = 85;
      rationale = `${p.remainingLifeYears} yr remaining life — defer replacement to avoid premature manufacturing CO₂.`;
    } else if (p.remainingLifeYears >= 3 && p.remainingLifeYears < 6) {
      decision = 'monitor';
      priority = 'medium';
      confidence = 78;
      rationale = 'Condition-based monitoring recommended — replace only if degradation accelerates.';
    } else {
      decision = 'now';
      priority = 'medium';
      confidence = 75;
      rationale = 'Asset approaching end-of-life window — schedule replacement in next planning cycle.';
    }

    const savingsKg =
      decision === 'later'
        ? round2(p.carbonBreakdown.replacementEmissions * 0.35)
        : decision === 'now'
          ? round2(p.totalEmissionsCO2 * 0.08)
          : round2(p.annualRecurringEmissions * 0.5);

    recs.push({
      id: makeId('replace', key),
      type: 'replace_asset',
      autonomy: 'autonomous',
      priority,
      confidence,
      decision,
      actionLabel: decision === 'now' ? 'Replace now' : decision === 'later' ? 'Replace later' : 'Monitor & decide',
      title: `${decision === 'now' ? 'Replace now' : decision === 'later' ? 'Defer replacement' : 'Monitor asset'}: ${item.serialNumber || item.itemType || 'Asset'}`,
      rationale,
      target: {
        serialNumber: item.serialNumber,
        itemType: item.itemType,
        location: item.currentLocation,
        trackSectionKm: item.trackSectionKm
      },
      impact: {
        estimatedSavingsKg: savingsKg,
        emissionsIfIgnoredKg: round2(p.predictedFiveYearEmissions * 0.1)
      },
      metrics: {
        remainingLifeYears: p.remainingLifeYears,
        sustainabilityRating: p.sustainabilityRating,
        totalEmissionsKg: p.totalEmissionsCO2
      }
    });
  });

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
};

const buildDelayMaintenanceRecommendations = (profiles) => {
  const recs = [];
  profiles.forEach((item) => {
    const p = item.carbonProfile;
    const freq = Number(item.maintenanceFrequencyPerYear || 0);
    const maintEvents = Array.isArray(item.maintenance) ? item.maintenance.length : 0;
    if (!p || freq < 2) return;
    if (p.remainingLifeYears < 3 && p.hotspot) return;

    const overMaintained = freq >= 3 || maintEvents > p.ageYears * 1.5;
    if (!overMaintained && freq < 2.5) return;

    const key = item.serialNumber || item._id?.toString();
    const delayMonths = freq >= 4 ? 4 : 2;
    const savingsKg = round2(p.carbonBreakdown.maintenanceEmissions * (delayMonths / 12) * 0.6);

    recs.push({
      id: makeId('delay', key),
      type: 'delay_maintenance',
      autonomy: 'autonomous',
      priority: savingsKg > 30 ? 'high' : 'medium',
      confidence: 80,
      decision: 'delay',
      actionLabel: `Delay ${delayMonths} months`,
      title: `Delay maintenance: ${item.serialNumber || item.itemType || 'Asset'}`,
      rationale: `Maintenance frequency ${freq}/yr exceeds condition-based need — defer ${delayMonths} months to reduce recurring CO₂ without safety compromise.`,
      target: {
        serialNumber: item.serialNumber,
        itemType: item.itemType,
        maintenanceFrequencyPerYear: freq
      },
      impact: {
        estimatedSavingsKg: savingsKg,
        emissionsIfIgnoredKg: 0
      },
      metrics: {
        maintenanceEvents: maintEvents,
        maintenanceEmissionsKg: p.carbonBreakdown.maintenanceEmissions
      }
    });
  });
  return recs.slice(0, 12);
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

const buildCombineRouteRecommendations = (profiles) => {
  const zoneMap = new Map();
  profiles.forEach((item) => {
    const zone = getZoneKey(item);
    if (!zoneMap.has(zone.key)) zoneMap.set(zone.key, { ...zone, assets: [] });
    zoneMap.get(zone.key).assets.push(item);
  });

  const recs = [];
  zoneMap.forEach((zone) => {
    if (zone.assets.length < 2) return;
    const transportKg = zone.assets.reduce(
      (s, a) =>
        s +
        (a.carbonProfile?.carbonBreakdown?.transportEmissions || 0) +
        (a.carbonProfile?.carbonBreakdown?.transportFuelEmissions || 0),
      0
    );
    const savingsKg = round2(transportKg * 0.15 * (zone.assets.length - 1));
    const hotspots = zone.assets.filter((a) => a.carbonProfile?.hotspot).length;

    recs.push({
      id: makeId('route', zone.key),
      type: 'combine_routes',
      autonomy: 'autonomous',
      priority: zone.assets.length >= 4 || hotspots > 0 ? 'high' : 'medium',
      confidence: 86,
      decision: 'combine',
      actionLabel: 'Combine inspection run',
      title: `Combine routes: ${zone.label}`,
      rationale: `Autonomous agent identified ${zone.assets.length} assets in **${zone.label}** — single technician visit replaces ${zone.assets.length} separate trips.`,
      target: {
        zoneKey: zone.key,
        label: zone.label,
        assetCount: zone.assets.length,
        serialNumbers: zone.assets.slice(0, 5).map((a) => a.serialNumber).filter(Boolean)
      },
      impact: {
        estimatedSavingsKg: savingsKg,
        tripsAvoided: zone.assets.length - 1,
        kmSavedEstimate: round2((zone.assets.length - 1) * 12)
      },
      metrics: {
        hotspotCount: hotspots,
        combinedAssets: zone.assets.length
      }
    });
  });

  return recs.sort((a, b) => b.impact.estimatedSavingsKg - a.impact.estimatedSavingsKg).slice(0, 10);
};

const buildMaterialRecommendations = (materialData) => {
  const top = materialData?.topRecommendations || [];
  return top.slice(0, 10).map((rec) => ({
    id: makeId('material', rec.id || rec.serialNumber),
    type: 'alternative_material',
    autonomy: 'autonomous',
    priority: rec.priority || 'medium',
    confidence: clamp(70 + (rec.impact?.percentReduction || 0) * 0.5, 75, 95),
    decision: 'switch',
    actionLabel: `Use ${rec.recommendedMaterial}`,
    title: `Switch material: ${rec.currentMaterial} → ${rec.recommendedMaterial}`,
    rationale: rec.description || `AI recommends ${rec.recommendedMaterial} for ${rec.impact?.percentReduction || 0}% CO₂ reduction.`,
    target: {
      serialNumber: rec.serialNumber,
      currentMaterial: rec.currentMaterial,
      recommendedMaterial: rec.recommendedMaterial,
      itemType: rec.itemType
    },
    impact: {
      estimatedSavingsKg: rec.impact?.co2SavedKg || 0,
      percentReduction: rec.impact?.percentReduction || 0,
      projectedRating: rec.impact?.projectedRating
    },
    metrics: {
      recommendationType: rec.recommendationType
    }
  }));
};

const buildGreenerVendorRecommendations = (profiles, vendors) => {
  const vendorScores = vendors
    .map((v) => ({ ...computeVendorCarbonScore(v), companyName: v.companyName }))
    .sort((a, b) => b.sustainabilityScore - a.sustainabilityScore);

  const bestVendor = vendorScores[0];
  if (!bestVendor || bestVendor.sustainabilityScore < 55) return [];

  const vendorByName = new Map();
  vendors.forEach((v) => {
    vendorByName.set((v.companyName || '').trim().toLowerCase(), v);
  });

  const seen = new Set();
  const recs = [];

  profiles.forEach((item) => {
    const name = (item.vendorName || '').trim().toLowerCase();
    if (!name || seen.has(name)) return;
    const vendor = vendorByName.get(name);
    if (!vendor) return;
    const score = computeVendorCarbonScore(vendor);
    if (score.sustainabilityScore >= 70) return;
    if (bestVendor.sustainabilityScore - score.sustainabilityScore < 15) return;

    seen.add(name);
    const assetCount = profiles.filter((p) => (p.vendorName || '').trim().toLowerCase() === name).length;
    const savingsKg = round2(assetCount * 45 * ((bestVendor.sustainabilityScore - score.sustainabilityScore) / 100));

    recs.push({
      id: makeId('vendor', name),
      type: 'greener_vendor',
      autonomy: 'autonomous',
      priority: score.sustainabilityScore < 45 ? 'high' : 'medium',
      confidence: 82,
      decision: 'switch',
      actionLabel: `Switch to ${bestVendor.vendorName}`,
      title: `Greener vendor: replace ${vendor.companyName}`,
      rationale: `Current supplier scores **${score.sustainabilityScore}** vs **${bestVendor.sustainabilityScore}** for ${bestVendor.vendorName} — autonomous procurement redirect for ${assetCount} linked asset(s).`,
      target: {
        currentVendor: vendor.companyName,
        recommendedVendor: bestVendor.vendorName,
        linkedAssetCount: assetCount
      },
      impact: {
        estimatedSavingsKg: savingsKg,
        scoreImprovement: round2(bestVendor.sustainabilityScore - score.sustainabilityScore)
      },
      metrics: {
        currentScore: score.sustainabilityScore,
        targetScore: bestVendor.sustainabilityScore,
        carbonIntensity: score.carbonIntensity
      }
    });
  });

  return recs.slice(0, 8);
};

const runAutonomousSustainabilityRecommendations = (trackFittings = [], vendors = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const profiles = carbonReport.profiles;
  const materialData = runGreenMaterialRecommendations(trackFittings);

  const replaceRecs = buildReplaceRecommendations(profiles);
  const delayRecs = buildDelayMaintenanceRecommendations(profiles);
  const routeRecs = buildCombineRouteRecommendations(profiles);
  const materialRecs = buildMaterialRecommendations(materialData);
  const vendorRecs = buildGreenerVendorRecommendations(profiles, vendors);

  const all = [
    ...replaceRecs,
    ...delayRecs,
    ...routeRecs,
    ...materialRecs,
    ...vendorRecs
  ];

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...all].sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      b.confidence - a.confidence ||
      (b.impact?.estimatedSavingsKg || 0) - (a.impact?.estimatedSavingsKg || 0)
  );

  const byType = {};
  Object.keys(RECOMMENDATION_TYPES).forEach((type) => {
    byType[type] = sorted.filter((r) => r.type === type);
  });

  const totalSavingsPotential = round2(
    sorted.reduce((s, r) => s + (r.impact?.estimatedSavingsKg || 0), 0)
  );
  const autonomousCount = sorted.filter((r) => r.autonomy === 'autonomous').length;
  const highPriorityCount = sorted.filter((r) => r.priority === 'high').length;

  const featured = sorted[0] || null;
  const agentNarrative = [
    `Autonomous agent analyzed **${profiles.length}** assets and generated **${sorted.length}** independent sustainability actions.`,
    highPriorityCount > 0
      ? `**${highPriorityCount}** high-priority decisions require attention this planning cycle.`
      : 'No critical autonomous interventions — portfolio within adaptive thresholds.',
    `Combined optimization potential: **${totalSavingsPotential.toLocaleString()} kg CO₂**.`
  ];

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'Autonomous Sustainability Recommendations',
    agenticLabel: 'Agentic Sustainability Intelligence',
    recommendationTypes: RECOMMENDATION_TYPES,
    summary: {
      totalRecommendations: sorted.length,
      autonomousActions: autonomousCount,
      highPriorityCount,
      replaceNowCount: replaceRecs.filter((r) => r.decision === 'now').length,
      replaceLaterCount: replaceRecs.filter((r) => r.decision === 'later').length,
      maintenanceDelays: delayRecs.length,
      routesCombined: routeRecs.length,
      materialSwaps: materialRecs.length,
      vendorSwitches: vendorRecs.length,
      totalSavingsPotentialKg: totalSavingsPotential
    },
    agentSummary: {
      status: highPriorityCount > 3 ? 'active_intervention' : 'optimizing',
      narrative: agentNarrative,
      lastRun: new Date().toISOString(),
      confidenceAvg: sorted.length
        ? round2(sorted.reduce((s, r) => s + r.confidence, 0) / sorted.length)
        : 0
    },
    featured,
    recommendations: sorted,
    byType,
    insights: [
      featured
        ? `Top autonomous action: **${featured.actionLabel}** — ${featured.rationale.replace(/\*\*/g, '')}`
        : 'Add track fittings to enable autonomous sustainability recommendations.',
      `${replaceRecs.filter((r) => r.decision === 'now').length} replace-now vs ${replaceRecs.filter((r) => r.decision === 'later').length} defer-replacement decisions issued independently.`,
      routeRecs.length > 0 &&
        `Route agent recommends combining **${routeRecs.length}** inspection corridor(s) to cut transport emissions.`,
      vendorRecs.length > 0 &&
        `Procurement agent flagged **${vendorRecs.length}** vendor switch opportunity(ies).`
    ].filter(Boolean)
  };
};

module.exports = {
  runAutonomousSustainabilityRecommendations,
  RECOMMENDATION_TYPES
};
