const express = require('express');
const { body, validationResult } = require('express-validator');
const { Inspection, TrackFitting, User } = require('../models_mongo');
const { auth } = require('../middleware/auth');
const { sendEmail } = require('../utils/mailer');

const router = express.Router();

// Get all inspections with filters (MongoDB-backed)
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      inspectionType,
      status,
      inspector,
      dateFrom,
      dateTo,
      sortBy = 'scheduledDate',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    // If user is an inspector, only show their inspections
    if (req.user.role === 'inspector') {
      filter.inspectorName = req.user.username;
    } else if (inspector) {
      filter.inspectorName = new RegExp(inspector, 'i');
    }

    if (inspectionType) filter.inspectionType = inspectionType;
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.scheduledDate = {};
      if (dateFrom) filter.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) filter.scheduledDate.$lte = new Date(dateTo);
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;
    const sortDirection = sortOrder && sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDirection };

    // Optimize: Select only necessary fields for listing/reports
    const selectFields = 'inspectionId trackFittingId inspectionType scheduledDate actualDate inspectorName trackSection km overallResult documents status aiAnalysis isAnomalous';

    const [inspections, count] = await Promise.all([
      Inspection.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select(selectFields)
        .lean()
        .exec(),
      Inspection.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        inspections,
        pagination: {
          current: pageNum,
          pages: Math.ceil(count / limitNum),
          total: count
        }
      }
    });
  } catch (error) {
    console.error('Get inspections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inspections',
      error: error.message
    });
  }
});

// Get inspection statistics (MongoDB)
router.get('/stats', auth, async (req, res) => {
  try {
    const total = await Inspection.countDocuments();
    
    if (total === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          byType: {},
          byStatus: {},
          byResult: {}
        }
      });
    }

    const inspections = await Inspection.find().lean();

    const byType = {};
    const byStatus = {};
    const byResult = {};

    inspections.forEach(inspection => {
      const type = inspection.inspectionType;
      if (!byType[type]) {
        byType[type] = { total: 0, byStatus: {}, byResult: {} };
      }
      byType[type].total++;
      byType[type].byStatus[inspection.status] = (byType[type].byStatus[inspection.status] || 0) + 1;
      if (inspection.overallResult) {
        byType[type].byResult[inspection.overallResult] = (byType[type].byResult[inspection.overallResult] || 0) + 1;
      }

      byStatus[inspection.status] = (byStatus[inspection.status] || 0) + 1;
      if (inspection.overallResult) {
        byResult[inspection.overallResult] = (byResult[inspection.overallResult] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        total,
        byType,
        byStatus,
        byResult
      }
    });

  } catch (error) {
    console.error('Get inspection stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inspection statistics',
      error: error.message
    });
  }
});

// Create new inspection
router.post('/', [
  auth,
  body('trackFittingId').notEmpty().withMessage('Track fitting identifier is required'),
  body('inspectionType').isIn(['initial', 'periodic', 'maintenance', 'quality', 'safety', 'pre_installation', 'post_installation']).withMessage('Valid inspection type is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('inspectorName').notEmpty().withMessage('Inspector name is required'),
  body('locationName').optional().notEmpty().withMessage('Location name cannot be empty when provided')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const inspectionData = { ...req.body };

    // Ensure assignedDate is always set when creating a new inspection
    if (!inspectionData.assignedDate) {
      inspectionData.assignedDate = new Date();
    }

    // Ensure we always have a sequential, non‑null inspectionId like INS0001, INS0002...
    if (!inspectionData.inspectionId) {
      const last = await Inspection.findOne({}).sort({ inspectionId: -1 }).lean().exec();
      let nextNumber = 1;
      if (last && typeof last.inspectionId === 'string') {
        const match = last.inspectionId.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const padded = nextNumber.toString().padStart(4, '0');
      inspectionData.inspectionId = `INS${padded}`;
    }

    // Default status to in_progress if not provided (inspection in progress after scheduling)
if (!inspectionData.status) {
      inspectionData.status = 'in_progress';
    }

    inspectionData.createdBy = req.user._id;

    // Skip AI service call - disabled
    const aiAnalysis = {
      is_anomalous: false,
      anomaly_score: 0,
      details: ["AI analysis disabled."]
    };

    const newInspection = await Inspection.create({
      ...inspectionData,
      isAnomalous: aiAnalysis.is_anomalous,
      anomalyDetails: aiAnalysis
    });

    if (req.io) {
      req.io.emit('new-inspection', {
        message: `New inspection scheduled for ${newInspection.trackFittingId}`,
        inspection: newInspection
      });
    }

    // Automation: Send email to inspector
    try {
      const inspector = await User.findOne({ username: newInspection.inspectorName });
      if (inspector && inspector.email) {
        await sendEmail(
          inspector.email,
          'New Inspection Assigned',
          `<h3>Inspection Notification</h3>
           <p>Hello ${inspector.username},</p>
           <p><strong>You have a new inspection assigned to you.</strong></p>
           <ul>
             <li><strong>Inspection ID:</strong> ${newInspection.inspectionId}</li>
             <li><strong>Track Fitting:</strong> ${newInspection.trackFittingId}</li>
           </ul>
           <p>Please log in to the Railway QR System to start the work.</p>`
        );
      }
    } catch (emailErr) {
      console.error('Failed to send assignment email:', emailErr);
    }

    res.status(201).json({
      success: true,
      data: newInspection
    });
  } catch (error) {
    console.error('Create inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create inspection',
      error: error.message
    });
  }
});

// Get inspection by ID (MongoDB)
router.get('/:id', auth, async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id).lean();

    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    res.json({
      success: true,
      data: inspection
    });

  } catch (error) {
    console.error('Error fetching inspection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inspection',
      error: error.message
    });
  }
});

// Complete inspection (Inspector action)
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      actualDate, 
      overallResult, 
      findings, 
      aiAnalysis, 
      documents, 
      trackSection, 
      km,
      isAnomalous
    } = req.body;

    const inspection = await Inspection.findById(id);
    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    const updated = await Inspection.findByIdAndUpdate(
      id,
      {
        $set: {
          status: status || 'completed',
          actualDate: actualDate || new Date(),
          overallResult,
          findings,
          aiAnalysis,
          documents,
          trackSection,
          km,
          isAnomalous,
          lastModifiedBy: req.user._id
        }
      },
      { new: true }
    );

    // If inspection failed, update track fitting status to maintenance
    if (overallResult === 'fail') {
      await TrackFitting.findOneAndUpdate(
        { serialNumber: inspection.trackFittingId },
        { $set: { status: 'maintenance' } }
      );
    } else if (overallResult === 'pass') {
      await TrackFitting.findOneAndUpdate(
        { serialNumber: inspection.trackFittingId },
        { $set: { status: 'inspected' } }
      );
    }

    if (req.io) {
      req.io.emit('update-inspection', {
        message: `Inspection ${updated.inspectionId} completed by ${req.user.username}`,
        inspection: updated
      });
    }

    res.json({
      success: true,
      message: 'Inspection completed successfully',
      data: updated
    });
  } catch (error) {
    console.error('Complete inspection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update inspection (Admin action)
router.put('/:id', async (req, res) => {
  try {
    console.log('PUT /api/inspections/:id called with id:', req.params.id, 'body:', req.body);
    
    const {
      status,
      actualDate,
      overallResult,
      findings = [],
      recommendations = [],
      documents = [],
      notes,
      inspectorName,
      scheduledDate,
      inspectionType
    } = req.body;

    const updateData = {};

    if (status) updateData.status = status;
    if (actualDate) updateData.actualDate = new Date(actualDate);
    if (overallResult) updateData.overallResult = overallResult;
    if (findings && findings.length > 0) updateData.findings = findings;
    if (recommendations && recommendations.length > 0) updateData.recommendations = recommendations;
    if (documents && documents.length > 0) updateData.documents = documents;
    if (notes) updateData.notes = notes;
    if (inspectorName) updateData.inspectorName = inspectorName;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (inspectionType) updateData.inspectionType = inspectionType;

    console.log('Looking for inspection with id:', req.params.id);
    const inspection = await Inspection.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    
    if (!inspection) {
      console.log('Inspection not found with id:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    console.log('Updating inspection with data:', updateData);

    console.log('Inspection updated successfully!');
    
    if (req.io) {
      req.io.emit('update-inspection', {
        message: `Inspection ${inspection.inspectionId} has been updated`,
        inspection: inspection
      });
    }

    res.json({
      success: true,
      message: 'Inspection updated successfully',
      data: inspection
    });

  } catch (error) {
    console.error('Update inspection error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update inspection'
    });
  }
});

// Complete inspection (MongoDB)
router.post('/:id/complete', [
  auth,
  body('overallResult').isIn(['pass', 'fail', 'conditional']).withMessage('Valid result is required'),
  body('findings').isArray().withMessage('Findings must be an array'),
  body('recommendations').isArray().withMessage('Recommendations must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      overallResult,
      findings,
      recommendations,
      documents = [],
      notes
    } = req.body;

    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    const updateData = {
      status: 'completed',
      actualDate: new Date(),
      overallResult,
      findings,
      recommendations,
      documents,
      notes,
      lastModifiedBy: req.user.id
    };

    const updated = await Inspection.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    if (overallResult === 'fail') {
      await TrackFitting.findByIdAndUpdate(
        inspection.trackFittingId,
        { $set: { status: 'maintenance' } }
      );
    }

    if (req.io) {
      req.io.emit('update-inspection', {
        message: `Inspection ${updated.inspectionId} completed`,
        inspection: updated
      });
    }

    res.json({
      success: true,
      message: 'Inspection completed successfully',
      data: updated
    });

  } catch (error) {
    console.error('Complete inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete inspection',
      error: error.message
    });
  }
});

// Get inspections by track fitting (MongoDB)
router.get('/track-fitting/:trackFittingId', auth, async (req, res) => {
  try {
    const { trackFittingId } = req.params;
    const { limit = 20 } = req.query;

    const inspections = await Inspection.find({ trackFittingId })
      .sort({ scheduledDate: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: inspections
    });

  } catch (error) {
    console.error('Get inspections by track fitting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inspections by track fitting',
      error: error.message
    });
  }
});

// Get overdue inspections (MongoDB)
router.get('/overdue/list', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInspections = await Inspection.find({
      status: 'scheduled',
      scheduledDate: { $lt: today }
    })
      .sort({ scheduledDate: 1 })
      .lean();

    if (overdueInspections.length > 0) {
      const ids = overdueInspections.map(i => i._id);
      await Inspection.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'overdue' } }
      );
    }

    res.json({
      success: true,
      data: overdueInspections
    });

  } catch (error) {
    console.error('Get overdue inspections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue inspections',
      error: error.message
    });
  }
});

// Cancel inspection (MongoDB)
router.put('/:id/cancel', [
  auth,
  body('reason').notEmpty().withMessage('Cancellation reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;

    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    const updated = await Inspection.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          status: 'cancelled', 
          notes: `Cancelled: ${reason}`,
          lastModifiedBy: req.user.id
        } 
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Inspection cancelled successfully',
      data: updated
    });

  } catch (error) {
    console.error('Cancel inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel inspection',
      error: error.message
    });
  }
});

// Delete inspection (MongoDB)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Inspection.findByIdAndDelete(id).exec();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Inspection not found'
      });
    }

    if (req.io) {
      req.io.emit('delete-inspection', {
        message: `Inspection deleted`,
        id: id
      });
    }

    return res.json({
      success: true,
      message: 'Inspection deleted successfully'
    });
  } catch (error) {
    console.error('Delete inspection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete inspection',
      error: error.message
    });
  }
});

module.exports = router;
