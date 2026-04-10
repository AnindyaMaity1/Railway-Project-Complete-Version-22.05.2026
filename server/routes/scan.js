const express = require('express');
const { body, validationResult } = require('express-validator');
const { TrackFitting, Inspection, Vendor } = require('../models_mongo');
const { auth } = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();

// Process scanned QR code
router.post('/process', [
  auth,
  body('qrCode').notEmpty(),
  body('scanLocation').isObject(),
  body('scanLocation.coordinates').isObject(),
  body('scanLocation.coordinates.latitude').isNumeric(),
  body('scanLocation.coordinates.longitude').isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { qrCode, scanLocation, scanType = 'general' } = req.body;

    const trackFitting = await TrackFitting.findOne({ qrCode }).lean();
    if (!trackFitting) {
      return res.status(404).json({
        success: false,
        message: 'Track fitting not found',
        qrCode
      });
    }

    const vendor = trackFitting.vendorId ? await Vendor.findById(trackFitting.vendorId).lean() : null;

    const locationChanged = trackFitting.currentLocation !== scanLocation.name;
    if (locationChanged) {
      await TrackFitting.findByIdAndUpdate(trackFitting._id, {
        $set: {
          currentLocation: scanLocation.name,
          locationCoords: {
            lat: scanLocation.coordinates.latitude,
            lng: scanLocation.coordinates.longitude
          },
          trackSectionKm: scanLocation.km || trackFitting.trackSectionKm
        }
      });
    }

    const recentInspections = await Inspection.find({ trackFittingId: trackFitting._id })
      .sort({ actualDate: -1 })
      .limit(5)
      .lean();

    const performanceMetrics = calculatePerformanceMetrics(trackFitting, recentInspections);

    let aiAnalysis = null;
    try {
      const aiResponse = await axios.post(`${process.env.AI_SERVICE_URL}/analyze`, {
        trackFittingId: trackFitting._id,
        qrCode,
        scanLocation,
        scanType,
        performanceMetrics
      });
      aiAnalysis = aiResponse.data;
    } catch (aiError) {
      console.warn('AI analysis not available:', aiError.message);
    }

    const responseData = {
      trackFitting: {
        id: trackFitting._id,
        qrCode: trackFitting.qrCode,
        itemType: trackFitting.itemType,
        itemSubType: trackFitting.itemSubType,
        serialNumber: trackFitting.serialNumber,
        batchNumber: trackFitting.batchNumber,
        lotNumber: trackFitting.lotNumber,
        status: trackFitting.status || 'manufactured',
        specifications: {
          material: trackFitting.material,
          dimensions: trackFitting.dimensions || {},
          weight: trackFitting.weight,
          grade: trackFitting.grade,
          standard: trackFitting.standard
        },
        vendor: vendor,
        vendorName: trackFitting.vendorName,
        manufacturing: {
          date: trackFitting.manufacturingDate,
          location: trackFitting.manufacturingLocation || 'Factory',
          machineId: trackFitting.machineId,
          operatorId: trackFitting.operatorId
        },
        location: {
          current: trackFitting.currentLocation || 'Factory',
          coordinates: trackFitting.locationCoords || {},
          trackSection: trackFitting.trackSection,
          km: trackFitting.trackSectionKm
        },
        quality: {
          qualityGrade: trackFitting.qualityGrade || 'A'
        }
      },
      inspections: recentInspections,
      performance: performanceMetrics,
      aiAnalysis,
      scanInfo: {
        scanTime: new Date().toISOString(),
        scannedBy: req.user._id,
        scanLocation,
        locationChanged
      }
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('QR scan processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process QR code scan',
      error: error.message
    });
  }
});

// Get scan history for a track fitting
router.get('/history/:trackFittingId', auth, async (req, res) => {
  try {
    const { trackFittingId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const trackFitting = await TrackFitting.findById(trackFittingId);
    if (!trackFitting) {
      return res.status(404).json({
        success: false,
        message: 'Track fitting not found'
      });
    }

    // Get inspection history
    const inspections = await Inspection.find({ trackFittingId })
      .sort({ actualDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('inspector.inspectorId', 'name designation department');

    // Get maintenance history
    const maintenanceHistory = trackFitting.maintenance || [];

    res.json({
      success: true,
      data: {
        trackFitting: {
          id: trackFitting._id,
          serialNumber: trackFitting.serialNumber,
          itemType: trackFitting.itemType,
          status: trackFitting.status
        },
        inspections,
        maintenance: maintenanceHistory,
        totalInspections: inspections.length,
        totalMaintenance: maintenanceHistory.length
      }
    });

  } catch (error) {
    console.error('Scan history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scan history',
      error: error.message
    });
  }
});

// Batch scan processing
router.post('/batch-process', [
  auth,
  body('scans').isArray({ min: 1, max: 100 }),
  body('scans.*.qrCode').notEmpty(),
  body('scans.*.scanLocation').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scans, scanLocation } = req.body;
    const results = [];

    for (const scan of scans) {
      try {
        const trackFitting = await TrackFitting.findOne({ qrCode: scan.qrCode });
        
        if (trackFitting) {
          // Update location
          trackFitting.location = {
            current: scan.scanLocation.name,
            coordinates: scan.scanLocation.coordinates,
            trackSection: scan.scanLocation.trackSection || trackFitting.location.trackSection,
            km: scan.scanLocation.km || trackFitting.location.km
          };
          await trackFitting.save();

          results.push({
            success: true,
            qrCode: scan.qrCode,
            serialNumber: trackFitting.serialNumber,
            itemType: trackFitting.itemType,
            status: trackFitting.status
          });
        } else {
          results.push({
            success: false,
            qrCode: scan.qrCode,
            error: 'Track fitting not found'
          });
        }
      } catch (itemError) {
        results.push({
          success: false,
          qrCode: scan.qrCode,
          error: itemError.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalScans: scans.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });

  } catch (error) {
    console.error('Batch scan processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch scans',
      error: error.message
    });
  }
});

// Helper function to calculate performance metrics
function calculatePerformanceMetrics(trackFitting, recentInspections = []) {
  const now = new Date();
  const manufacturingDate = trackFitting.manufacturingDate ? new Date(trackFitting.manufacturingDate) : now;
  const serviceLife = Math.max(0, Math.floor((now - manufacturingDate) / (1000 * 60 * 60 * 24))); // days

  // Use either inspections from trackFitting or the provided recentInspections
  const inspections = (trackFitting.inspections && trackFitting.inspections.length > 0) 
    ? trackFitting.inspections 
    : recentInspections;
    
  const totalInspections = inspections.length;
  const passedInspections = inspections.filter(i => 
    i.overallResult === 'pass' || i.result === 'pass' || i.status === 'passed'
  ).length;
  
  const failedInspections = totalInspections - passedInspections;

  // Calculate pass rate
  let inspectionPassRate = 0;
  if (totalInspections > 0) {
    inspectionPassRate = Math.round((passedInspections / totalInspections) * 100);
  } else if (trackFitting.status === 'manufactured' || trackFitting.status === 'inspected' || trackFitting.qualityGrade === 'A') {
    // If no inspections yet but status is good, assume 100% pass rate for the initial state
    inspectionPassRate = 100;
  }

  // Ensure service life is at least 1 if it's not today
  let finalServiceLife = serviceLife;
  if (finalServiceLife === 0 && manufacturingDate < now && Math.floor((now - manufacturingDate) / (1000 * 60)) > 1) {
    // If it's more than a minute old but less than a day, show it as 1 day to indicate it's active
    finalServiceLife = 1;
  }

  const maintenance = trackFitting.maintenance || [];
  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);

  const warrantyEndDate = trackFitting.warrantyEndDate ? new Date(trackFitting.warrantyEndDate) : null;
  const warrantyExpired = warrantyEndDate ? warrantyEndDate < now : true;
  const warrantyDaysRemaining = (warrantyEndDate && !warrantyExpired) ? 
    Math.floor((warrantyEndDate - now) / (1000 * 60 * 60 * 24)) : 0;

  return {
    serviceLife: finalServiceLife,
    inspectionPassRate,
    totalInspections,
    failedInspections,
    totalMaintenanceCost,
    warrantyExpired,
    warrantyDaysRemaining,
    qualityGrade: trackFitting.qualityGrade || 'A',
    lastInspectionDate: inspections.length > 0 ? 
      (inspections[0].actualDate || inspections[0].date) : (trackFitting.manufacturingDate || now),
    nextMaintenanceDue: maintenance.length > 0 ? 
      maintenance[maintenance.length - 1].nextDue : null
  };
}

module.exports = router;
