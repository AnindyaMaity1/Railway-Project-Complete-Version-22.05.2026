const express = require('express');
const QRCode = require('qrcode');
const { body, validationResult, query } = require('express-validator');
const { TrackFitting, Vendor } = require('../models_mongo');
const { auth, adminOnly } = require('../middleware/auth');
const NodeGeocoder = require('node-geocoder');
const axios = require('axios');

const router = express.Router();

const geocoderOptions = {
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null,
  userAgent: 'Railway-QR-System/1.0'
};
const geocoder = NodeGeocoder(geocoderOptions);

const generateQrText = (trackFitting, vendor) => {
  const dims = trackFitting.dimensions || {};
  const details = [
    `Type: ${(trackFitting.itemType || '').replace(/_/g, ' ')}`,
    `SN: ${trackFitting.serialNumber}`,
    `Batch: ${trackFitting.batchNumber || 'N/A'}`,
    `Lot: ${trackFitting.lotNumber || 'N/A'}`,
    `Vendor: ${vendor ? vendor.companyName : (trackFitting.vendorName || 'N/A')}`,
    `Material: ${trackFitting.material || 'N/A'}`,
    `Dims: ${dims.length || 0}x${dims.width || 0}x${dims.height || 0}${dims.unit || 'mm'}`,
    `Weight: ${trackFitting.weight || 0}kg`,
    `MfgDate: ${trackFitting.manufacturingDate ? new Date(trackFitting.manufacturingDate).toISOString().split('T')[0] : 'N/A'}`,
    `DB_ID: ${trackFitting._id}`,
    `FromStation: ${trackFitting.fromStation || 'N/A'}`,
    `ToStation: ${trackFitting.toStation || 'N/A'}`
  ];
  return details.join('\n');
};

router.post('/generate', [
  auth,
  adminOnly,
  body('itemType').isIn(['elastic_rail_clip', 'rail_pad', 'liner', 'sleeper']),
  body('serialNumber').notEmpty(),
  body('batchNumber').notEmpty(),
  body('lotNumber').notEmpty(),
  body('vendorId').notEmpty(),
  body('fromStation').notEmpty(),
  body('toStation').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      itemType,
      itemSubType,
      serialNumber,
      batchNumber,
      lotNumber,
      vendorId,
      specifications = {},
      manufacturing = {},
      warranty = {},
      fromStation,
      toStation
    } = req.body;

    let fromStationLatitude = null;
    let fromStationLongitude = null;
    let toStationLatitude = null;
    let toStationLongitude = null;

    if (fromStation) {
      const fromGeo = await geocoder.geocode(fromStation);
      if (fromGeo && fromGeo.length > 0) {
        fromStationLatitude = fromGeo[0].latitude;
        fromStationLongitude = fromGeo[0].longitude;
      }
    }

    if (toStation) {
      const toGeo = await geocoder.geocode(toStation);
      if (toGeo && toGeo.length > 0) {
        toStationLatitude = toGeo[0].latitude;
        toStationLongitude = toGeo[0].longitude;
      }
    }

    const vendor = await Vendor.findById(vendorId).lean();

    // Create a temp qrCode for initial save, will be updated after
    const tempQrCode = `QR-${serialNumber}-${Date.now()}`;

    const trackFitting = await TrackFitting.create({
      qrCode: tempQrCode,
      itemType,
      itemSubType: itemSubType || `${itemType}_standard`,
      serialNumber,
      batchNumber,
      lotNumber,
      vendorId: vendorId,
      vendorName: vendor ? vendor.companyName : (req.body.vendorName || 'Unknown Vendor'),
      vendorCode: vendor ? vendor.vendorCode : (req.body.vendorCode || 'UNK'),
      material: specifications.material || 'Steel',
      dimensions: {
        length: specifications.dimensions?.length || 0,
        width: specifications.dimensions?.width || 0,
        height: specifications.dimensions?.height || 0,
        unit: specifications.dimensions?.unit || 'mm'
      },
      weight: specifications.weight || 0,
      grade: specifications.grade || 'Standard',
      standard: specifications.standard || 'IS',
      qualityGrade: req.body.qualityGrade || 'A',
      manufacturingDate: manufacturing?.date || new Date(),
      manufacturingLocation: manufacturing?.location || 'Factory',
      machineId: manufacturing?.machineId || 'MACH_001',
      operatorId: req.user._id,
      warrantyStartDate: warranty?.startDate || new Date(),
      warrantyEndDate: warranty?.endDate || new Date(Date.now() + (warranty?.duration || 12) * 30 * 24 * 60 * 60 * 1000),
      warrantyDuration: warranty?.duration || 12,
      warrantyTerms: warranty?.terms || 'Standard warranty terms apply',
      currentLocation: 'Factory',
      locationCoords: { lat: 0, lng: 0 },
      trackSectionKm: 0,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
      fromStation,
      toStation,
      fromStationLatitude,
      fromStationLongitude,
      toStationLatitude,
      toStationLongitude
    });

    // Now generate the full QR code text with the actual _id
    const qrCodeData = generateQrText(trackFitting, vendor);

    await TrackFitting.findByIdAndUpdate(trackFitting._id, { $set: { qrCode: qrCodeData } });

    const qrCodeOptions = {
      type: 'png',
      quality: 0.92,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      width: parseInt(process.env.QR_CODE_SIZE) || 300,
      errorCorrectionLevel: process.env.QR_CODE_ERROR_CORRECTION_LEVEL || 'M'
    };

    const qrCodeImage = await QRCode.toDataURL(qrCodeData, qrCodeOptions);

    res.json({
      success: true,
      data: {
        qrCode: qrCodeData,
        qrCodeImage,
        trackFittingId: trackFitting._id,
        serialNumber: trackFitting.serialNumber,
        itemType: trackFitting.itemType
      }
    });

    if (req.io) {
      req.io.emit('new-item', {
        message: `A new ${trackFitting.itemType} has been added.`,
        item: trackFitting
      });
    }

  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error.message
    });
  }
});

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

router.get('/shortest-path', auth, [
  query('inspectorLat').isFloat(),
  query('inspectorLon').isFloat(),
  query('qrCodeId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { inspectorLat, inspectorLon, qrCodeId } = req.query;

    // Search by serialNumber instead of _id as it's the QR code ID user sees
    const trackFitting = await TrackFitting.findOne({ serialNumber: qrCodeId }).lean();

    if (!trackFitting) {
      return res.status(404).json({ success: false, message: 'Track fitting with this serial number not found.' });
    }

    // Determine target location (closest station or fitting's current location)
    const fromStationCoords = {
      latitude: parseFloat(trackFitting.fromStationLatitude),
      longitude: parseFloat(trackFitting.fromStationLongitude)
    };
    const toStationCoords = {
      latitude: parseFloat(trackFitting.toStationLatitude),
      longitude: parseFloat(trackFitting.toStationLongitude)
    };
    const fittingCoords = {
      latitude: trackFitting.locationCoords?.latitude || trackFitting.locationCoords?.lat,
      longitude: trackFitting.locationCoords?.longitude || trackFitting.locationCoords?.lng
    };

    let targetStationCoords = null;
    let targetStationName = null;

    // Helper to check if coordinates are valid
    const isValidCoord = (c) => c && !isNaN(c.latitude) && !isNaN(c.longitude) && c.latitude !== 0 && c.longitude !== 0;

    if (isValidCoord(fromStationCoords) && isValidCoord(toStationCoords)) {
      const distanceFromFromStation = haversineDistance(inspectorLat, inspectorLon, fromStationCoords.latitude, fromStationCoords.longitude);
      const distanceFromToStation = haversineDistance(inspectorLat, inspectorLon, toStationCoords.latitude, toStationCoords.longitude);
      
      if (distanceFromFromStation <= distanceFromToStation) {
        targetStationCoords = fromStationCoords;
        targetStationName = trackFitting.fromStation || 'From Station';
      } else {
        targetStationCoords = toStationCoords;
        targetStationName = trackFitting.toStation || 'To Station';
      }
    } else if (isValidCoord(fromStationCoords)) {
      targetStationCoords = fromStationCoords;
      targetStationName = trackFitting.fromStation || 'From Station';
    } else if (isValidCoord(toStationCoords)) {
      targetStationCoords = toStationCoords;
      targetStationName = trackFitting.toStation || 'To Station';
    } else if (isValidCoord(fittingCoords)) {
      targetStationCoords = fittingCoords;
      targetStationName = trackFitting.currentLocation || 'Track Fitting Location';
    }

    if (!targetStationCoords) {
      return res.status(400).json({ success: false, message: 'No valid coordinates found for this track fitting or its stations.' });
    }

    try {
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${inspectorLon},${inspectorLat};${targetStationCoords.longitude},${targetStationCoords.latitude}?overview=full&geometries=geojson`;
      const osrmResponse = await axios.get(osrmUrl);
      
      if (!osrmResponse.data.routes || osrmResponse.data.routes.length === 0) {
        throw new Error('No route found between your location and the target.');
      }

      const route = osrmResponse.data;
      res.json({
        success: true,
        data: {
          closestStation: targetStationName,
          closestStationCoordinates: targetStationCoords,
          fromStation: trackFitting.fromStation,
          fromStationCoordinates: fromStationCoords,
          toStation: trackFitting.toStation,
          toStationCoordinates: toStationCoords,
          route: route.routes[0].geometry.coordinates,
          distance: route.routes[0].distance,
          duration: route.routes[0].duration
        }
      });
    } catch (osrmError) {
      console.error('OSRM Route error:', osrmError.message);
      // Fallback: Return direct distance if routing fails
      const directDist = haversineDistance(inspectorLat, inspectorLon, targetStationCoords.latitude, targetStationCoords.longitude);
      res.json({
        success: true,
        data: {
          closestStation: targetStationName,
          closestStationCoordinates: targetStationCoords,
          fromStation: trackFitting.fromStation,
          fromStationCoordinates: fromStationCoords,
          toStation: trackFitting.toStation,
          toStationCoordinates: toStationCoords,
          route: [[inspectorLon, inspectorLat], [targetStationCoords.longitude, targetStationCoords.latitude]],
          distance: directDist,
          duration: (directDist / 13.88), // Assume 50km/h (13.88 m/s)
          isDirect: true
        }
      });
    }

  } catch (error) {
    console.error('Shortest path error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate shortest path',
      error: error.message
    });
  }
});

router.post('/laser-marking', [
  auth,
  body('trackFittingId').notEmpty(),
  body('laserSettings').isObject()
], async (req, res) => {
  try {
    const { trackFittingId, laserSettings } = req.body;

    const trackFitting = await TrackFitting.findById(trackFittingId).lean();
    if (!trackFitting) {
      return res.status(404).json({
        success: false,
        message: 'Track fitting not found'
      });
    }

    const laserQROptions = {
      type: 'svg',
      margin: 0,
      color: { dark: '#000000', light: '#FFFFFF' },
      width: laserSettings.width || 50,
      errorCorrectionLevel: 'H'
    };

    const laserQRCode = await QRCode.toString(trackFitting.qrCode || '', laserQROptions);

    const markingData = {
      qrCode: trackFitting.qrCode,
      laserSettings: {
        power: laserSettings.power || 80,
        speed: laserSettings.speed || 1000,
        frequency: laserSettings.frequency || 20000,
        coordinates: {
          x: laserSettings.x || 0,
          y: laserSettings.y || 0,
          z: laserSettings.z || 0
        }
      },
      svgData: laserQRCode,
      markingInstructions: {
        material: trackFitting.material,
        surface: 'smooth',
        depth: '0.1mm',
        contrast: 'high'
      }
    };

    res.json({
      success: true,
      data: markingData
    });

  } catch (error) {
    console.error('Laser marking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate laser marking data',
      error: error.message
    });
  }
});

router.post('/bulk-generate', [
  auth,
  adminOnly,
  body('items').isArray({ min: 1, max: 1000 }),
  body('items.*.itemType').isIn(['elastic_rail_clip', 'rail_pad', 'liner', 'sleeper']),
  body('items.*.serialNumber').notEmpty(),
  body('items.*.batchNumber').notEmpty(),
  body('items.*.lotNumber').notEmpty(),
  body('vendorId').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, vendorId, vendorName, vendorCode } = req.body;
    const results = [];

    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found for bulk operation' });
    }

    for (const item of items) {
      try {
        const trackFitting = await TrackFitting.create({
          qrCode: '',
          itemType: item.itemType,
          itemSubType: item.itemSubType || `${item.itemType}_standard`,
          serialNumber: item.serialNumber,
          batchNumber: item.batchNumber,
          lotNumber: item.lotNumber,
          vendorId: vendorId,
          vendorName: vendor.companyName,
          vendorCode: vendor.vendorCode || 'UNK',
          material: item.specifications?.material || 'Steel',
          dimensions: {
            length: item.specifications?.dimensions?.length || 0,
            width: item.specifications?.dimensions?.width || 0,
            height: item.specifications?.dimensions?.height || 0,
            unit: item.specifications?.dimensions?.unit || 'mm'
          },
          weight: item.specifications?.weight || 0,
          grade: item.specifications?.grade || 'Standard',
          standard: item.specifications?.standard || 'IS',
          qualityGrade: item.qualityGrade || 'A',
          manufacturingDate: item.manufacturing?.date || new Date(),
          manufacturingLocation: item.manufacturing?.location || 'Factory',
          machineId: item.manufacturing?.machineId || 'MACH_001',
          operatorId: req.user._id,
          warrantyStartDate: item.warranty?.startDate || new Date(),
          warrantyEndDate: item.warranty?.endDate || new Date(Date.now() + (item.warranty?.duration || 12) * 30 * 24 * 60 * 60 * 1000),
          warrantyDuration: item.warranty?.duration || 12,
          warrantyTerms: item.warranty?.terms || 'Standard warranty terms apply',
          currentLocation: 'Factory',
          locationCoords: { lat: 0, lng: 0 },
          trackSectionKm: 0,
          createdBy: req.user._id,
          lastModifiedBy: req.user._id,
          fromStation: item.fromStation || 'N/A',
          toStation: item.toStation || 'N/A'
        });

        const qrCodeData = generateQrText(trackFitting, vendor);
        await TrackFitting.findByIdAndUpdate(trackFitting._id, { $set: { qrCode: qrCodeData } });

        results.push({
          success: true,
          serialNumber: item.serialNumber,
          qrCode: qrCodeData,
          trackFittingId: trackFitting._id
        });

      } catch (itemError) {
        results.push({
          success: false,
          serialNumber: item.serialNumber,
          error: itemError.message
        });
      }
    }

    if (req.io) {
      req.io.emit('bulk-update', {
        message: `${results.filter(r => r.success).length} new items added in a bulk operation.`,
        report: {
          totalItems: items.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    }

    res.json({
      success: true,
      data: {
        totalItems: items.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });

  } catch (error) {
    console.error('Bulk QR generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bulk QR codes',
      error: error.message
    });
  }
});

module.exports = router;
