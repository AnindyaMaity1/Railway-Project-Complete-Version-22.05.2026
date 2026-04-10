const express = require('express');
const { body, validationResult } = require('express-validator');
const { TrackFitting, Inspection, Vendor } = require('../models_mongo');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate performance report
router.post('/performance', [
  auth,
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('itemType').optional().isIn(['elastic_rail_clip', 'rail_pad', 'liner', 'sleeper']),
  body('location').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, itemType, location } = req.body;

    // Build filter for track fittings
    const filter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (itemType) filter.itemType = itemType;
    if (location) filter.currentLocation = new RegExp(location, 'i');

    // Get track fittings data
    const trackFittings = await TrackFitting.find(filter)
      .populate('vendorId', 'companyName vendorCode')
      .select('itemType status qualityGrade manufacturingDate warrantyEndDate currentLocation inspections maintenance');

    // Get inspections for these track fittings
    const inspections = await Inspection.find({
      trackFittingId: { $in: trackFittings.map(tf => tf._id) },
      actualDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).select('trackFittingId overallResult actualDate');

    // Calculate performance metrics
    const metrics = calculatePerformanceMetrics(trackFittings, inspections);

    // Generate report data
    const report = {
      reportType: 'performance',
      period: { startDate, endDate },
      filters: { itemType, location },
      generatedAt: new Date(),
      generatedBy: req.user.id,
      summary: {
        totalItems: trackFittings.length,
        performanceScore: metrics.performanceScore,
        qualityGrade: metrics.qualityGrade,
        maintenanceEfficiency: metrics.maintenanceEfficiency,
        averageServiceLife: metrics.averageServiceLife
      },
      details: {
        byItemType: metrics.byItemType,
        byStatus: metrics.byStatus,
        byQuality: metrics.byQuality,
        byVendor: metrics.byVendor,
        trends: metrics.trends
      },
      recommendations: generatePerformanceRecommendations(metrics)
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Performance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance report',
      error: error.message
    });
  }
});

// Generate quality analysis report
router.post('/quality', [
  auth,
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, itemType, vendor } = req.body;

    // Build filter
    const filter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (itemType) filter.itemType = itemType;
    if (vendor) filter.vendorName = new RegExp(vendor, 'i');

    // Get track fittings and inspections data
    const trackFittings = await TrackFitting.find(filter)
      .populate('vendorId', 'companyName vendorCode')
      .select('itemType qualityGrade inspections manufacturingDate vendorName vendorCode');

    const inspections = await Inspection.find({
      trackFittingId: { $in: trackFittings.map(tf => tf._id) },
      actualDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).select('overallResult findings recommendations');

    // Calculate quality metrics
    const qualityMetrics = calculateQualityMetrics(trackFittings, inspections);

    const report = {
      reportType: 'quality',
      period: { startDate, endDate },
      filters: { itemType, vendor },
      generatedAt: new Date(),
      generatedBy: req.user.id,
      summary: {
        totalItems: trackFittings.length,
        totalInspections: inspections.length,
        passRate: qualityMetrics.passRate,
        averageQualityGrade: qualityMetrics.averageQualityGrade,
        qualityIssues: qualityMetrics.qualityIssues
      },
      details: {
        qualityDistribution: qualityMetrics.qualityDistribution,
        inspectionResults: qualityMetrics.inspectionResults,
        commonIssues: qualityMetrics.commonIssues,
        byItemType: qualityMetrics.byItemType,
        byVendor: qualityMetrics.byVendor
      },
      recommendations: generateQualityRecommendations(qualityMetrics)
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Quality report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate quality report',
      error: error.message
    });
  }
});

// Generate inventory status report
router.post('/inventory', [
  auth,
  body('asOfDate').isISO8601().withMessage('Valid as of date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { asOfDate, location, itemType } = req.body;

    // Build filter
    const filter = {
      createdAt: { $lte: new Date(asOfDate) }
    };

    if (location) filter.currentLocation = new RegExp(location, 'i');
    if (itemType) filter.itemType = itemType;

    // Get inventory data
    const trackFittings = await TrackFitting.find(filter)
      .populate('vendorId', 'companyName vendorCode')
      .select('itemType status currentLocation vendorName vendorCode manufacturingDate warrantyEndDate qualityGrade');

    // Calculate inventory metrics
    const inventoryMetrics = calculateInventoryMetrics(trackFittings, asOfDate);

    const report = {
      reportType: 'inventory',
      asOfDate,
      filters: { location, itemType },
      generatedAt: new Date(),
      generatedBy: req.user.id,
      summary: {
        totalItems: trackFittings.length,
        activeItems: inventoryMetrics.activeItems,
        maintenanceItems: inventoryMetrics.maintenanceItems,
        totalValue: inventoryMetrics.totalValue,
        averageAge: inventoryMetrics.averageAge
      },
      details: {
        byItemType: inventoryMetrics.byItemType,
        byStatus: inventoryMetrics.byStatus,
        byLocation: inventoryMetrics.byLocation,
        byVendor: inventoryMetrics.byVendor,
        ageDistribution: inventoryMetrics.ageDistribution,
        warrantyStatus: inventoryMetrics.warrantyStatus
      },
      recommendations: generateInventoryRecommendations(inventoryMetrics)
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate inventory report',
      error: error.message
    });
  }
});

// Generate vendor performance report
router.post('/vendor-performance', [
  auth,
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, vendorId } = req.body;

    // Get vendor data
    const vendors = vendorId 
      ? await Vendor.findById(vendorId)
      : await Vendor.find({ status: 'active' });

    if (!vendors || (Array.isArray(vendors) && vendors.length === 0)) {
      return res.status(404).json({
        success: false,
        message: 'No vendors found'
      });
    }

    const vendorList = Array.isArray(vendors) ? vendors : [vendors];

    // Get track fittings for each vendor
    const vendorPerformance = await Promise.all(
      vendorList.map(async (vendor) => {
        const trackFittings = await TrackFitting.find({
          vendorId: vendor._id,
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }).select('itemType qualityGrade status manufacturingDate');

        const inspections = await Inspection.find({
          trackFittingId: { $in: trackFittings.map(tf => tf._id) },
          actualDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }).select('overallResult');

        return calculateVendorPerformance(vendor, trackFittings, inspections);
      })
    );

    const report = {
      reportType: 'vendor-performance',
      period: { startDate, endDate },
      generatedAt: new Date(),
      generatedBy: req.user.id,
      summary: {
        totalVendors: vendorList.length,
        averagePerformance: vendorPerformance.reduce((sum, v) => sum + v.performanceScore, 0) / vendorList.length,
        topPerformer: vendorPerformance.reduce((max, v) => v.performanceScore > max.performanceScore ? v : max),
        bottomPerformer: vendorPerformance.reduce((min, v) => v.performanceScore < min.performanceScore ? v : min)
      },
      details: vendorPerformance,
      recommendations: generateVendorRecommendations(vendorPerformance)
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Vendor performance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate vendor performance report',
      error: error.message
    });
  }
});

// Get report history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, reportType } = req.query;

    // Mock report history - in production, this would be stored in a reports collection
    const mockReports = [
      {
        id: '1',
        name: 'Monthly Performance Report',
        type: 'performance',
        generatedDate: '2024-01-15',
        generatedBy: req.user.id,
        status: 'completed',
        summary: 'Overall performance improved by 5% compared to last month'
      },
      {
        id: '2',
        name: 'Quality Analysis Report',
        type: 'quality',
        generatedDate: '2024-01-14',
        generatedBy: req.user.id,
        status: 'completed',
        summary: 'Quality grade distribution shows 90% items in A-B category'
      }
    ];

    const filteredReports = reportType 
      ? mockReports.filter(r => r.type === reportType)
      : mockReports;

    res.json({
      success: true,
      data: {
        reports: filteredReports,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(filteredReports.length / limit),
          total: filteredReports.length
        }
      }
    });

  } catch (error) {
    console.error('Get report history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report history',
      error: error.message
    });
  }
});

// Helper functions
function calculatePerformanceMetrics(trackFittings, inspections = []) {
  const total = trackFittings.length;
  if (total === 0) return {};

  const byItemType = {};
  const byStatus = {};
  const byQuality = {};
  const byVendor = {};

  let totalServiceLife = 0;
  
  // Track inspections per fitting
  const inspectionsByFitting = {};
  inspections.forEach(ins => {
    const tfId = ins.trackFittingId.toString();
    if (!inspectionsByFitting[tfId]) inspectionsByFitting[tfId] = [];
    inspectionsByFitting[tfId].push(ins);
  });

  let totalInspectionsCount = inspections.length;
  let passedInspectionsCount = inspections.filter(i => i.overallResult === 'pass').length;

  trackFittings.forEach(tf => {
    // By item type
    byItemType[tf.itemType] = (byItemType[tf.itemType] || 0) + 1;
    
    // By status
    byStatus[tf.status] = (byStatus[tf.status] || 0) + 1;
    
    // By quality
    const grade = tf.qualityGrade || 'Unknown';
    byQuality[grade] = (byQuality[grade] || 0) + 1;
    
    // By vendor
    const vendor = tf.vendorName || 'Unknown';
    byVendor[vendor] = (byVendor[vendor] || 0) + 1;

    // Service life
    if (tf.manufacturingDate) {
      const serviceLife = (new Date() - new Date(tf.manufacturingDate)) / (1000 * 60 * 60 * 24);
      totalServiceLife += serviceLife;
    }

    // Add inspections from tf if they exist (legacy support)
    if (tf.inspections && Array.isArray(tf.inspections) && tf.inspections.length > 0) {
      const fittingInspections = tf.inspections;
      totalInspectionsCount += fittingInspections.length;
      passedInspectionsCount += fittingInspections.filter(i => i.overallResult === 'pass' || i.result === 'pass').length;
    }
  });

  // Calculate real performance metrics
  const performanceScore = totalInspectionsCount > 0 ? (passedInspectionsCount / totalInspectionsCount) * 100 : 0;
  const qualityGrade = calculateQualityGrade(byQuality, total);
  const maintenanceEfficiency = calculateMaintenanceEfficiency(trackFittings);
  const averageServiceLife = total > 0 ? totalServiceLife / total : 0;
  
  // Calculate trends (monthly performance over the last 6 months)
  const trends = calculateTrends(trackFittings, inspections);

  return {
    performanceScore: Math.round(performanceScore * 100) / 100,
    qualityGrade,
    maintenanceEfficiency: Math.round(maintenanceEfficiency * 100) / 100,
    averageServiceLife: Math.round(averageServiceLife * 100) / 100,
    byItemType,
    byStatus,
    byQuality,
    byVendor,
    trends
  };
}

function calculateQualityMetrics(trackFittings, inspections) {
  const totalInspections = inspections.length;
  const passedInspections = inspections.filter(i => i.overallResult === 'pass').length;
  const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;

  const qualityDistribution = {};
  const inspectionResults = {};
  const commonIssues = {};

  trackFittings.forEach(tf => {
    const grade = tf.qualityGrade || 'Unknown';
    qualityDistribution[grade] = (qualityDistribution[grade] || 0) + 1;
  });

  inspections.forEach(ins => {
    const result = ins.overallResult || 'Unknown';
    inspectionResults[result] = (inspectionResults[result] || 0) + 1;

    if (ins.findings) {
      ins.findings.forEach(finding => {
        const category = finding.category || 'Other';
        commonIssues[category] = (commonIssues[category] || 0) + 1;
      });
    }
  });

  return {
    passRate,
    averageQualityGrade: 'A',
    qualityIssues: Object.values(commonIssues).reduce((sum, count) => sum + count, 0),
    qualityDistribution,
    inspectionResults,
    commonIssues,
    byItemType: {},
    byVendor: {}
  };
}

function calculateInventoryMetrics(trackFittings, asOfDate) {
  const total = trackFittings.length;
  const activeItems = trackFittings.filter(tf => tf.status === 'in_service').length;
  const maintenanceItems = trackFittings.filter(tf => tf.status === 'maintenance').length;

  const byItemType = {};
  const byStatus = {};
  const byLocation = {};
  const byVendor = {};

  let totalValue = 0;
  let totalAge = 0;

  trackFittings.forEach(tf => {
    byItemType[tf.itemType] = (byItemType[tf.itemType] || 0) + 1;
    byStatus[tf.status] = (byStatus[tf.status] || 0) + 1;
    
    const location = tf.currentLocation || 'Unknown';
    byLocation[location] = (byLocation[location] || 0) + 1;
    
    const vendor = tf.vendorName || 'Unknown';
    byVendor[vendor] = (byVendor[vendor] || 0) + 1;

    // Mock value calculation
    totalValue += 1000; // Mock value per item

    // Age calculation
    if (tf.manufacturingDate) {
      const age = (new Date(asOfDate) - new Date(tf.manufacturingDate)) / (1000 * 60 * 60 * 24);
      totalAge += age;
    }
  });

  return {
    activeItems,
    maintenanceItems,
    totalValue,
    averageAge: total > 0 ? totalAge / total : 0,
    byItemType,
    byStatus,
    byLocation,
    byVendor,
    ageDistribution: {},
    warrantyStatus: {}
  };
}

function calculateVendorPerformance(vendor, trackFittings, inspections) {
  const totalItems = trackFittings.length;
  const totalInspections = inspections.length;
  const passedInspections = inspections.filter(i => i.overallResult === 'pass').length;
  
  const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;
  const performanceScore = (passRate + vendor.qualityRating * 20) / 2;

  return {
    vendorId: vendor._id,
    vendorCode: vendor.vendorCode,
    companyName: vendor.companyName,
    totalItems,
    totalInspections,
    passRate,
    performanceScore,
    qualityRating: vendor.qualityRating,
    onTimeDelivery: vendor.performance?.onTimeDelivery || 0,
    qualityComplaints: vendor.performance?.qualityComplaints || 0
  };
}

function generatePerformanceRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.performanceScore < 80) {
    recommendations.push('Focus on improving overall performance metrics');
  }
  
  if (metrics.maintenanceEfficiency < 85) {
    recommendations.push('Optimize maintenance scheduling and processes');
  }
  
  if (metrics.averageServiceLife < 300) {
    recommendations.push('Investigate factors affecting service life');
  }

  return recommendations;
}

function generateQualityRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.passRate < 90) {
    recommendations.push('Improve quality control processes');
  }
  
  if (metrics.qualityIssues > 10) {
    recommendations.push('Address common quality issues');
  }

  return recommendations;
}

function generateInventoryRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.maintenanceItems > metrics.activeItems * 0.1) {
    recommendations.push('High maintenance ratio - review maintenance processes');
  }
  
  if (metrics.averageAge > 400) {
    recommendations.push('Consider replacement of aging items');
  }

  return recommendations;
}

function generateVendorRecommendations(vendorPerformance) {
  const recommendations = [];
  
  const lowPerformers = vendorPerformance.filter(v => v.performanceScore < 70);
  if (lowPerformers.length > 0) {
    recommendations.push('Review contracts with low-performing vendors');
  }

  return recommendations;
}

// Helper function to calculate quality grade based on distribution
function calculateQualityGrade(byQuality, total) {
  if (total === 0) return 'Unknown';
  
  const gradeWeights = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
  let weightedSum = 0;
  let totalItems = 0;
  
  Object.entries(byQuality).forEach(([grade, count]) => {
    if (gradeWeights[grade] !== undefined) {
      weightedSum += gradeWeights[grade] * count;
      totalItems += count;
    }
  });
  
  if (totalItems === 0) return 'Unknown';
  
  const averageGrade = weightedSum / totalItems;
  
  if (averageGrade >= 3.5) return 'A';
  if (averageGrade >= 2.5) return 'B';
  if (averageGrade >= 1.5) return 'C';
  if (averageGrade >= 0.5) return 'D';
  return 'F';
}

// Helper function to calculate maintenance efficiency
function calculateMaintenanceEfficiency(trackFittings) {
  if (trackFittings.length === 0) return 0;
  
  let totalMaintenanceTime = 0;
  let totalMaintenanceCount = 0;
  
  trackFittings.forEach(tf => {
    if (tf.maintenance && tf.maintenance.length > 0) {
      tf.maintenance.forEach(maintenance => {
        if (maintenance.duration) {
          totalMaintenanceTime += maintenance.duration;
          totalMaintenanceCount++;
        }
      });
    }
  });
  
  if (totalMaintenanceCount === 0) return 100; // No maintenance needed = 100% efficient
  
  // Calculate efficiency based on maintenance frequency and duration
  const averageMaintenanceTime = totalMaintenanceTime / totalMaintenanceCount;
  const maintenanceFrequency = totalMaintenanceCount / trackFittings.length;
  
  // Lower maintenance time and frequency = higher efficiency
  const timeEfficiency = Math.max(0, 100 - (averageMaintenanceTime / 10));
  const frequencyEfficiency = Math.max(0, 100 - (maintenanceFrequency * 20));
  
  return (timeEfficiency + frequencyEfficiency) / 2;
}

// Helper function to calculate trends
function calculateTrends(trackFittings, inspections = []) {
  const trends = [];
  const now = new Date();
  
  // Calculate performance for each of the last 6 months
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const monthFittings = trackFittings.filter(tf => {
      const createdDate = new Date(tf.createdAt);
      return createdDate >= monthStart && createdDate <= monthEnd;
    });
    
    const monthInspections = inspections.filter(ins => {
      const actualDate = new Date(ins.actualDate);
      return actualDate >= monthStart && actualDate <= monthEnd;
    });
    
    let monthPerformance = 0;
    let totalInspections = monthInspections.length;
    let passedInspections = monthInspections.filter(i => i.overallResult === 'pass').length;
    
    // Also consider inspections stored in track fittings for this month
    monthFittings.forEach(tf => {
      if (tf.inspections && Array.isArray(tf.inspections)) {
        const tfMonthInspections = tf.inspections.filter(i => {
          const date = new Date(i.actualDate || i.date);
          return date >= monthStart && date <= monthEnd;
        });
        totalInspections += tfMonthInspections.length;
        passedInspections += tfMonthInspections.filter(i => i.overallResult === 'pass' || i.result === 'pass').length;
      }
    });
    
    monthPerformance = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;
    
    trends.push({
      month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
      performance: Math.round(monthPerformance * 100) / 100,
      items: monthFittings.length
    });
  }
  
  return trends;
}

module.exports = router;
