const { computeTrackFittingCarbonProfile } = require('./carbonEngine');

const round2 = (value) => Math.round(value * 100) / 100;
const FUEL_LITRES_PER_KM = 0.08;
const DIESEL_CO2_PER_LITRE = 2.68;
const TRAVEL_CO2_PER_KM = 0.18;
const AVG_SPEED_KMH = 45;
const DEFAULT_DEPOT = { latitude: 28.6139, longitude: 77.209, label: 'Operations Depot' };

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const resolveCoords = (item, index) => {
  const lat =
    item.coords?.latitude ??
    item.locationCoords?.latitude ??
    item.fromStationLatitude ??
    null;
  const lng =
    item.coords?.longitude ??
    item.locationCoords?.longitude ??
    item.fromStationLongitude ??
    null;

  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0)) {
    return { latitude: lat, longitude: lng };
  }

  const km = Number(item.trackSectionKm ?? item.km ?? index * 3);
  return {
    latitude: DEFAULT_DEPOT.latitude + km * 0.012,
    longitude: DEFAULT_DEPOT.longitude + km * 0.009
  };
};

const buildWorkStops = (trackFittings, inspections) => {
  const stops = [];
  const seen = new Set();

  trackFittings.forEach((fitting, index) => {
    const profile = computeTrackFittingCarbonProfile(fitting);
    const coords = resolveCoords(fitting, index);
    const needsMaintenance =
      profile.hotspot ||
      (profile.remainingLifeYears <= 3 && profile.remainingLifeYears > 0) ||
      (fitting.maintenanceFrequencyPerYear || 0) >= 2;

    if (!needsMaintenance && fitting.status !== 'maintenance_required') return;

    const id = String(fitting._id);
    if (seen.has(id)) return;
    seen.add(id);

    stops.push({
      id,
      type: 'maintenance',
      label: fitting.serialNumber || fitting.currentLocation || `Asset ${index + 1}`,
      locationName: fitting.currentLocation || `KM ${fitting.trackSectionKm ?? '—'}`,
      trackSectionKm: Number(fitting.trackSectionKm) || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      priority: profile.hotspot ? 'high' : profile.remainingLifeYears <= 2 ? 'high' : 'medium',
      priorityScore: profile.hotspot ? 90 : 50 + profile.lifecycleImpactScore * 0.4,
      co2ImpactKg: profile.totalEmissionsCO2,
      itemType: fitting.itemType
    });
  });

  inspections
    .filter((insp) => ['scheduled', 'pending', 'in_progress'].includes((insp.status || '').toLowerCase()))
    .forEach((insp, index) => {
      const coords = resolveCoords(insp, index + 100);
      const id = `insp-${insp._id}`;
      if (seen.has(id)) return;
      seen.add(id);

      stops.push({
        id,
        type: 'inspection',
        label: insp.inspectionId || insp.trackSection || `Inspection ${index + 1}`,
        locationName: insp.locationName || insp.trackSection || 'Track section',
        trackSectionKm: Number(insp.km) || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        priority: insp.isAnomalous ? 'high' : 'medium',
        priorityScore: insp.isAnomalous ? 85 : 60,
        co2ImpactKg: 0,
        inspectionType: insp.inspectionType,
        scheduledDate: insp.scheduledDate
      });
    });

  if (stops.length === 0) {
    trackFittings.slice(0, 12).forEach((fitting, index) => {
      const profile = computeTrackFittingCarbonProfile(fitting);
      const coords = resolveCoords(fitting, index);
      stops.push({
        id: String(fitting._id),
        type: index % 2 === 0 ? 'maintenance' : 'inspection',
        label: fitting.serialNumber || `Stop ${index + 1}`,
        locationName: fitting.currentLocation || `KM ${fitting.trackSectionKm ?? index}`,
        trackSectionKm: Number(fitting.trackSectionKm) || index * 2,
        latitude: coords.latitude,
        longitude: coords.longitude,
        priority: 'medium',
        priorityScore: 40 + profile.lifecycleImpactScore * 0.3,
        co2ImpactKg: profile.totalEmissionsCO2,
        itemType: fitting.itemType
      });
    });
  }

  return stops.sort((a, b) => b.priorityScore - a.priorityScore);
};

const nearestNeighborRoute = (depot, stops) => {
  const remaining = [...stops];
  const ordered = [];
  let current = depot;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((stop, idx) => {
      const d = haversineKm(current.latitude, current.longitude, stop.latitude, stop.longitude);
      const score = d - stop.priorityScore * 0.02;
      if (score < bestDist) {
        bestDist = score;
        bestIdx = idx;
      }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next;
  }

  return ordered;
};

const baselineRoute = (stops) => {
  return [...stops].sort((a, b) => {
    const kmA = a.trackSectionKm ?? 0;
    const kmB = b.trackSectionKm ?? 0;
    return kmA - kmB;
  });
};

const computeRouteMetrics = (depot, orderedStops) => {
  const legs = [];
  let totalKm = 0;
  let prev = depot;

  orderedStops.forEach((stop, index) => {
    const distanceKm = haversineKm(prev.latitude, prev.longitude, stop.latitude, stop.longitude);
    const fuelLitres = distanceKm * FUEL_LITRES_PER_KM;
    const co2Kg = round2(fuelLitres * DIESEL_CO2_PER_LITRE + distanceKm * TRAVEL_CO2_PER_KM * 0.15);
    totalKm += distanceKm;
    legs.push({
      order: index + 1,
      from: prev.label || 'Depot',
      to: stop.label,
      stopId: stop.id,
      distanceKm: round2(distanceKm),
      fuelLitres: round2(fuelLitres),
      co2Kg
    });
    prev = stop;
  });

  const returnKm = haversineKm(prev.latitude, prev.longitude, depot.latitude, depot.longitude);
  totalKm += returnKm;
  legs.push({
    order: legs.length + 1,
    from: prev.label,
    to: depot.label,
    stopId: 'depot-return',
    distanceKm: round2(returnKm),
    fuelLitres: round2(returnKm * FUEL_LITRES_PER_KM),
    co2Kg: round2(returnKm * FUEL_LITRES_PER_KM * DIESEL_CO2_PER_LITRE)
  });

  const fuelLitres = round2(totalKm * FUEL_LITRES_PER_KM);
  const co2Kg = round2(fuelLitres * DIESEL_CO2_PER_LITRE + totalKm * TRAVEL_CO2_PER_KM * 0.1);

  return {
    totalKm: round2(totalKm),
    fuelLitres,
    co2Kg,
    durationHours: round2(totalKm / AVG_SPEED_KMH),
    legs
  };
};

const clusterTechnicians = (orderedStops, depot, maxTechs = 3) => {
  if (!orderedStops.length) return [];

  const techCount = Math.min(maxTechs, Math.max(1, Math.ceil(orderedStops.length / 4)));
  const chunkSize = Math.ceil(orderedStops.length / techCount);
  const technicians = [];

  for (let t = 0; t < techCount; t += 1) {
    const chunk = orderedStops.slice(t * chunkSize, (t + 1) * chunkSize);
    if (!chunk.length) continue;

    const subMetrics = computeRouteMetrics(depot, chunk);
    technicians.push({
      technicianId: `TECH-${t + 1}`,
      name: `Field Team ${String.fromCharCode(65 + t)}`,
      zone: chunk[0].locationName || `Zone ${t + 1}`,
      stopCount: chunk.length,
      stops: chunk.map((s, i) => ({
        order: i + 1,
        id: s.id,
        label: s.label,
        type: s.type,
        priority: s.priority
      })),
      distanceKm: subMetrics.totalKm,
      fuelLitres: subMetrics.fuelLitres,
      co2Kg: subMetrics.co2Kg,
      durationHours: subMetrics.durationHours
    });
  }

  return technicians;
};

const runEcoRouteOptimization = (trackFittings = [], inspections = [], options = {}) => {
  const depot = {
    latitude: Number(options.depotLat) || DEFAULT_DEPOT.latitude,
    longitude: Number(options.depotLon) || DEFAULT_DEPOT.longitude,
    label: options.depotLabel || DEFAULT_DEPOT.label
  };

  const allStops = buildWorkStops(trackFittings, inspections);
  const maintenanceStops = allStops.filter((s) => s.type === 'maintenance');
  const inspectionStops = allStops.filter((s) => s.type === 'inspection');

  const optimizedMaintenance = nearestNeighborRoute(depot, maintenanceStops);
  const optimizedInspection = nearestNeighborRoute(depot, inspectionStops);
  const optimizedCombined = nearestNeighborRoute(depot, allStops);

  const baselineStops = baselineRoute(allStops);
  const optimizedMetrics = computeRouteMetrics(depot, optimizedCombined);
  const baselineMetrics = computeRouteMetrics(depot, baselineStops);

  const savingsKm = round2(Math.max(0, baselineMetrics.totalKm - optimizedMetrics.totalKm));
  const savingsPercent =
    baselineMetrics.totalKm > 0
      ? round2((savingsKm / baselineMetrics.totalKm) * 100)
      : 0;
  const co2SavedKg = round2(Math.max(0, baselineMetrics.co2Kg - optimizedMetrics.co2Kg));

  const technicians = clusterTechnicians(optimizedCombined, depot);

  const recommendations = [];
  if (savingsPercent >= 10) {
    recommendations.push(
      `Eco-route sequencing cuts travel by **${savingsPercent}%** (${savingsKm} km) versus KM-ordered runs.`
    );
  }
  if (optimizedMetrics.fuelLitres < baselineMetrics.fuelLitres) {
    recommendations.push(
      `Adopt the optimized plan to save **${co2SavedKg} kg CO₂** and **${round2(baselineMetrics.fuelLitres - optimizedMetrics.fuelLitres)} L** fuel per tour.`
    );
  }
  if (maintenanceStops.filter((s) => s.priority === 'high').length > 0) {
    recommendations.push('Schedule high-priority hotspot maintenance stops first in each technician zone.');
  }
  recommendations.push(
    `Deploy **${technicians.length}** technician team(s) along corridor clusters to minimize overlap and idle travel.`
  );

  return {
    generatedAt: new Date().toISOString(),
    depot,
    summary: {
      totalStops: allStops.length,
      maintenanceStops: maintenanceStops.length,
      inspectionStops: inspectionStops.length,
      optimizedDistanceKm: optimizedMetrics.totalKm,
      baselineDistanceKm: baselineMetrics.totalKm,
      savingsKm,
      savingsPercent,
      optimizedCo2Kg: optimizedMetrics.co2Kg,
      baselineCo2Kg: baselineMetrics.co2Kg,
      co2SavedKg,
      optimizedFuelLitres: optimizedMetrics.fuelLitres,
      baselineFuelLitres: baselineMetrics.fuelLitres,
      fuelSavedLitres: round2(Math.max(0, baselineMetrics.fuelLitres - optimizedMetrics.fuelLitres)),
      optimizedDurationHours: optimizedMetrics.durationHours,
      baselineDurationHours: baselineMetrics.durationHours,
      technicianTeams: technicians.length
    },
    maintenanceRoute: {
      algorithm: 'Priority-weighted nearest-neighbor',
      stops: optimizedMaintenance.map((stop, index) => ({
        order: index + 1,
        ...stop,
        legCo2Kg: optimizedMetrics.legs[index]?.co2Kg
      })),
      metrics: computeRouteMetrics(depot, optimizedMaintenance)
    },
    inspectionPlan: {
      algorithm: 'Fuel-minimized inspection sequencing',
      fuelOptimized: true,
      stops: optimizedInspection.map((stop, index) => ({
        order: index + 1,
        ...stop
      })),
      metrics: computeRouteMetrics(depot, optimizedInspection)
    },
    optimizedRoute: {
      stops: optimizedCombined.map((stop, index) => ({
        order: index + 1,
        id: stop.id,
        label: stop.label,
        type: stop.type,
        locationName: stop.locationName,
        latitude: stop.latitude,
        longitude: stop.longitude,
        priority: stop.priority,
        trackSectionKm: stop.trackSectionKm
      })),
      legs: optimizedMetrics.legs
    },
    technicianDeployment: technicians,
    travelEmissions: {
      optimized: optimizedMetrics,
      baseline: baselineMetrics,
      reduction: {
        km: savingsKm,
        percent: savingsPercent,
        co2Kg: co2SavedKg,
        fuelLitres: round2(Math.max(0, baselineMetrics.fuelLitres - optimizedMetrics.fuelLitres))
      }
    },
    recommendations
  };
};

module.exports = {
  runEcoRouteOptimization,
  haversineKm,
  buildWorkStops
};
