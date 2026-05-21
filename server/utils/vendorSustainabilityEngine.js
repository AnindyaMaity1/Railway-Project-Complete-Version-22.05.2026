const { buildAssetCarbonReport, computeVendorCarbonScore } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const GREEN_TIERS = [
  { tier: 'A', label: 'Green Leader', minScore: 80, color: '#22c55e' },
  { tier: 'B', label: 'Sustainable Partner', minScore: 65, color: '#3b82f6' },
  { tier: 'C', label: 'Approved', minScore: 50, color: '#eab308' },
  { tier: 'D', label: 'Under Review', minScore: 35, color: '#f97316' },
  { tier: 'E', label: 'High Risk', minScore: 0, color: '#ef4444' }
];

const getGreenTier = (score) => {
  const match = GREEN_TIERS.find((t) => score >= t.minScore);
  return match || GREEN_TIERS[GREEN_TIERS.length - 1];
};

const normalizeCertifications = (certifications) => {
  if (!certifications) return [];
  if (Array.isArray(certifications)) return certifications.map(String);
  if (typeof certifications === 'object') return Object.keys(certifications);
  return [];
};

const computeEthicalSourcingScore = (vendor) => {
  const certs = normalizeCertifications(vendor.certifications);
  const certScore = clamp(certs.length * 12 + (vendor.carbonEvaluation?.greenCertificationCount || 0) * 8, 0, 45);
  const complaints = vendor.performance?.qualityComplaints || 0;
  const supplies = Math.max(vendor.performance?.totalSupplies || 1, 1);
  const complaintPenalty = clamp((complaints / supplies) * 80, 0, 35);
  const onTime = vendor.performance?.onTimeDelivery || 0;
  const deliveryScore = clamp(onTime * 0.25, 0, 25);
  const hasRegistration = vendor.registrationNumber || vendor.gstNumber ? 8 : 0;
  const ethicalFlags = [];
  if (certs.some((c) => /iso|14001|ethical|fair/i.test(c))) ethicalFlags.push('Environmental certification');
  if (vendor.carbonEvaluation?.greenCertificationCount > 0) ethicalFlags.push('Green credentials verified');
  if (complaints > 5) ethicalFlags.push('Elevated quality complaints');
  if (onTime < 70) ethicalFlags.push('Delivery reliability concern');

  const score = clamp(certScore + deliveryScore + hasRegistration - complaintPenalty + 35, 0, 100);
  return {
    score: round2(score),
    rating: score >= 75 ? 'strong' : score >= 55 ? 'adequate' : 'needs_improvement',
    flags: ethicalFlags,
    certificationCount: certs.length + (vendor.carbonEvaluation?.greenCertificationCount || 0)
  };
};

const computeEmissionEfficiency = (vendor, linkedAssets, fleetAvgIntensity) => {
  const intensity = vendor.carbonEvaluation?.carbonIntensity || 120;
  const linkedEmissions = linkedAssets.reduce(
    (sum, a) => sum + a.carbonProfile.totalEmissionsCO2,
    0
  );
  const perAsset =
    linkedAssets.length > 0 ? linkedEmissions / linkedAssets.length : intensity;
  const intensityScore = clamp(100 - (intensity / 200) * 100, 0, 100);
  const fleetCompare =
    fleetAvgIntensity > 0 ? clamp(100 - (perAsset / fleetAvgIntensity) * 50, 0, 100) : 50;
  const efficiencyScore = round2(intensityScore * 0.6 + fleetCompare * 0.4);

  return {
    score: efficiencyScore,
    carbonIntensity: intensity,
    linkedAssetCount: linkedAssets.length,
    linkedEmissionsKg: round2(linkedEmissions),
    emissionsPerAssetKg: round2(perAsset),
    benchmark: fleetAvgIntensity,
    level: efficiencyScore >= 70 ? 'efficient' : efficiencyScore >= 45 ? 'average' : 'inefficient'
  };
};

const buildVendorProfile = (vendor, linkedAssets, fleetAvgIntensity) => {
  const carbon = computeVendorCarbonScore(vendor);
  const ethical = computeEthicalSourcingScore(vendor);
  const emission = computeEmissionEfficiency(vendor, linkedAssets, fleetAvgIntensity);
  const greenScore = round2(
    carbon.sustainabilityScore * 0.4 + ethical.score * 0.3 + emission.score * 0.3
  );
  const tier = getGreenTier(greenScore);

  let procurementAction = 'review';
  if (greenScore >= 75 && ethical.rating !== 'needs_improvement') procurementAction = 'preferred';
  else if (greenScore >= 55) procurementAction = 'approved';
  else if (greenScore < 40) procurementAction = 'phase_out';

  return {
    vendorId: vendor._id,
    vendorCode: vendor.vendorCode,
    companyName: vendor.companyName || 'Unknown vendor',
    businessType: vendor.businessType,
    status: vendor.status || 'active',
    greenRanking: {
      score: greenScore,
      tier: tier.tier,
      tierLabel: tier.label,
      color: tier.color,
      rank: 0
    },
    carbonScore: carbon,
    ethicalSourcing: ethical,
    emissionEfficiency: emission,
    procurement: {
      action: procurementAction,
      label:
        procurementAction === 'preferred'
          ? 'Preferred supplier'
          : procurementAction === 'approved'
            ? 'Approved with monitoring'
            : procurementAction === 'phase_out'
              ? 'Phase-out candidate'
              : 'Requires sustainability review',
      rationale: buildProcurementRationale(greenScore, ethical, emission, carbon)
    },
    linkedAssets: linkedAssets.length,
    onTimeDelivery: vendor.performance?.onTimeDelivery || 0,
    qualityRating: vendor.qualityRating || 0
  };
};

const buildProcurementRationale = (greenScore, ethical, emission, carbon) => {
  const parts = [];
  if (greenScore >= 70) parts.push('Strong composite green score');
  if (ethical.score >= 70) parts.push('solid ethical sourcing profile');
  if (emission.score >= 65) parts.push('efficient emission performance');
  if (carbon.carbonIntensity < 90) parts.push('low carbon intensity');
  if (ethical.rating === 'needs_improvement') parts.push('ethical gaps require audit');
  if (emission.level === 'inefficient') parts.push('high linked asset emissions');
  if (carbon.carbonIntensity > 140) parts.push('elevated supplier carbon intensity');
  return parts.length ? parts.join('; ') + '.' : 'Standard vendor profile — continue monitoring.';
};

const buildProcurementSuggestions = (profiles) => {
  const suggestions = [];

  const preferred = profiles.filter((p) => p.procurement.action === 'preferred');
  const phaseOut = profiles.filter((p) => p.procurement.action === 'phase_out');
  const review = profiles.filter((p) => p.procurement.action === 'review');

  if (preferred.length > 0) {
    suggestions.push({
      priority: 'high',
      type: 'allocate',
      title: 'Increase share with green leaders',
      description: `Route new track fitting procurement to **${preferred.slice(0, 2).map((p) => p.companyName).join('** and **')}** — Tier A/B vendors with lowest emission intensity.`,
      vendors: preferred.slice(0, 3).map((p) => p.companyName),
      estimatedImpact: 'Up to 18% supply-chain CO₂ reduction'
    });
  }

  if (phaseOut.length > 0) {
    suggestions.push({
      priority: 'high',
      type: 'reduce',
      title: 'Phase out high-risk suppliers',
      description: `Transition volume away from **${phaseOut.map((p) => p.companyName).join(', ')}** over the next contract cycle.`,
      vendors: phaseOut.map((p) => p.companyName),
      estimatedImpact: 'Reduce exposure to high-intensity sourcing'
    });
  }

  if (review.length > 0) {
    suggestions.push({
      priority: 'medium',
      type: 'audit',
      title: 'Schedule sustainability audits',
      description: `${review.length} vendor(s) need ethical and emissions documentation before renewal.`,
      vendors: review.slice(0, 4).map((p) => p.companyName),
      estimatedImpact: 'Compliance and transparency uplift'
    });
  }

  suggestions.push({
    priority: 'medium',
    type: 'certify',
    title: 'Mandate green certification pathway',
    description:
      'Require ISO 14001 or equivalent for vendors below Tier B within 12 months to align with net-zero procurement policy.',
    vendors: profiles.filter((p) => p.ethicalSourcing.certificationCount < 2).slice(0, 3).map((p) => p.companyName),
    estimatedImpact: 'Portfolio-wide ethical score improvement'
  });

  return suggestions;
};

const runVendorSustainabilityIntelligence = (vendors = [], trackFittings = []) => {
  const carbonReport = buildAssetCarbonReport(trackFittings);
  const profiles = carbonReport.profiles;

  const assetsByVendor = new Map();
  profiles.forEach((item) => {
    const name = (item.vendorName || '').trim().toLowerCase();
    if (!name) return;
    if (!assetsByVendor.has(name)) assetsByVendor.set(name, []);
    assetsByVendor.get(name).push(item);
  });

  const fleetAvgIntensity =
    profiles.length > 0
      ? profiles.reduce((s, p) => s + p.carbonProfile.totalEmissionsCO2, 0) / profiles.length
      : 100;

  const vendorProfiles = vendors.map((vendor) => {
    const key = (vendor.companyName || '').trim().toLowerCase();
    const linked = assetsByVendor.get(key) || [];
    return buildVendorProfile(vendor, linked, fleetAvgIntensity);
  });

  const ranked = [...vendorProfiles]
    .sort((a, b) => b.greenRanking.score - a.greenRanking.score)
    .map((p, index) => ({
      ...p,
      greenRanking: { ...p.greenRanking, rank: index + 1 }
    }));

  const procurementSuggestions = buildProcurementSuggestions(ranked);
  const tierDistribution = GREEN_TIERS.reduce((acc, t) => {
    acc[t.tier] = ranked.filter((p) => p.greenRanking.tier === t.tier).length;
    return acc;
  }, {});

  const avgGreenScore = ranked.length
    ? round2(ranked.reduce((s, p) => s + p.greenRanking.score, 0) / ranked.length)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    moduleName: 'Vendor Sustainability Intelligence',
    summary: {
      totalVendors: ranked.length,
      tierDistribution,
      avgGreenScore,
      preferredCount: ranked.filter((p) => p.procurement.action === 'preferred').length,
      reviewCount: ranked.filter((p) => p.procurement.action === 'review').length,
      phaseOutCount: ranked.filter((p) => p.procurement.action === 'phase_out').length,
      linkedVendorCount: ranked.filter((p) => p.linkedAssets > 0).length
    },
    greenRanking: ranked,
    topPerformers: ranked.filter((p) => ['A', 'B'].includes(p.greenRanking.tier)).slice(0, 8),
    riskVendors: ranked.filter((p) => ['D', 'E'].includes(p.greenRanking.tier)).slice(0, 8),
    ethicalAnalysis: ranked.map((p) => ({
      vendorId: p.vendorId,
      companyName: p.companyName,
      score: p.ethicalSourcing.score,
      rating: p.ethicalSourcing.rating,
      flags: p.ethicalSourcing.flags,
      certificationCount: p.ethicalSourcing.certificationCount
    })),
    emissionEfficiencyLeaderboard: [...ranked]
      .sort((a, b) => b.emissionEfficiency.score - a.emissionEfficiency.score)
      .slice(0, 10)
      .map((p) => ({
        vendorId: p.vendorId,
        companyName: p.companyName,
        score: p.emissionEfficiency.score,
        carbonIntensity: p.emissionEfficiency.carbonIntensity,
        linkedEmissionsKg: p.emissionEfficiency.linkedEmissionsKg,
        level: p.emissionEfficiency.level
      })),
    procurementSuggestions,
    tiers: GREEN_TIERS,
    insights: [
      ranked[0]
        ? `Green leader: **${ranked[0].companyName}** (Tier ${ranked[0].greenRanking.tier}, score ${ranked[0].greenRanking.score}).`
        : 'Add vendors to enable AI green ranking.',
      `${ranked.filter((p) => p.procurement.action === 'preferred').length} vendor(s) recommended for preferred procurement status.`,
      `${ranked.filter((p) => p.ethicalSourcing.rating === 'needs_improvement').length} vendor(s) flagged for ethical sourcing improvement.`
    ]
  };
};

module.exports = {
  runVendorSustainabilityIntelligence,
  GREEN_TIERS,
  getGreenTier
};
