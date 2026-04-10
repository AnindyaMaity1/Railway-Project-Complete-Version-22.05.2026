const express = require('express');
const { TrackFitting } = require('../models_mongo');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all track fittings with filters
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      itemType,
      status,
      vendor,
      search
    } = req.query;

    const filter = {};
    
    if (itemType) filter.itemType = itemType;
    if (status) filter.status = status;
    if (vendor) filter.vendorName = { $regex: vendor, $options: 'i' };
    if (search) {
      filter.$or = [
        { serialNumber: { $regex: search, $options: 'i' } },
        { batchNumber: { $regex: search, $options: 'i' } },
        { lotNumber: { $regex: search, $options: 'i' } },
        { currentLocation: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const trackFittings = await TrackFitting.find(filter).skip(skip).limit(parseInt(limit)).lean();
    const total = await TrackFitting.countDocuments(filter);

    const allItems = await TrackFitting.find(filter).lean();
    const stats = {
      total: allItems.length,
      byType: {},
      byStatus: {},
      byVendor: {}
    };
    
    allItems.forEach(item => {
      stats.byType[item.itemType] = (stats.byType[item.itemType] || 0) + 1;
      stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
      if (item.vendorName) {
        stats.byVendor[item.vendorName] = (stats.byVendor[item.vendorName] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        trackFittings,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
});

// Get last serial number for auto-generation - MUST be before /:id
router.get('/last-serial', auth, async (req, res) => {
  try {
    const lastItem = await TrackFitting.findOne({ serialNumber: { $exists: true, $ne: '' } })
      .sort({ createdAt: -1 })
      .select('serialNumber')
      .lean();
    
    let nextNumber = 1;
    if (lastItem && lastItem.serialNumber) {
      const match = lastItem.serialNumber.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    res.json({
      success: true,
      data: {
        lastSerialNumber: lastItem?.serialNumber || null,
        nextNumber
      }
    });
  } catch (error) {
    console.error('Error fetching last serial:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch last serial number' });
  }
});

// Create new track fitting
router.post('/', [auth, adminOnly], async (req, res) => {
  try {
    const {
      qrCode,
      itemType,
      itemSubType,
      serialNumber,
      batchNumber,
      lotNumber,
      vendorId,
      vendorName,
      vendorCode,
      manufacturingDate,
      manufacturingLocation,
      machineId,
      operatorId,
      material,
      dimensions,
      weight,
      grade,
      standard,
      status,
      currentLocation,
      locationCoords,
      trackSectionKm,
      serviceLife,
      fromStation,
      toStation,
      warrantyEndDate,
      qualityGrade
    } = req.body;

    // Check if serialNumber already exists
    const existing = await TrackFitting.findOne({ serialNumber });

    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Track fitting with this serial number already exists' 
      });
    }

    const newTrackFitting = new TrackFitting({
      qrCode: qrCode || `QR-${serialNumber || Date.now()}`,
      itemType: itemType || 'elastic_rail_clip',
      itemSubType: itemSubType || '',
      serialNumber,
      batchNumber: batchNumber || '',
      lotNumber: lotNumber || '',
      vendorId: vendorId || null,
      vendorName: vendorName || '',
      vendorCode: vendorCode || '',
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : new Date(),
      manufacturingLocation: manufacturingLocation || '',
      machineId: machineId || '',
      operatorId: operatorId || '',
      material: material || '',
      dimensions: dimensions || {},
      weight: weight || 0,
      grade: grade || '',
      standard: standard || '',
      status: status || 'manufactured',
      currentLocation: currentLocation || '',
      locationCoords: locationCoords || {},
      trackSectionKm: trackSectionKm || 0,
      serviceLife: serviceLife || 0,
      fromStation: fromStation || '',
      toStation: toStation || '',
      warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null,
      qualityGrade: qualityGrade || '',
      inspections: [],
      maintenance: []
    });

    await newTrackFitting.save();

    res.status(201).json({
      success: true,
      message: 'Track fitting created successfully',
      data: newTrackFitting
    });
  } catch (error) {
    console.error('Error creating track fitting:', error);
    res.status(500).json({ success: false, message: 'Failed to create track fitting' });
  }
});

// Update track fitting
router.put('/:id', [auth, adminOnly], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    delete updateData._id;
    delete updateData.id;

    if (updateData.manufacturingDate) {
      updateData.manufacturingDate = new Date(updateData.manufacturingDate);
    }

    const updated = await TrackFitting.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Track fitting not found' });
    }

    res.json({
      success: true,
      message: 'Track fitting updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating track fitting:', error);
    res.status(500).json({ success: false, message: 'Failed to update track fitting' });
  }
});

// Delete track fitting
router.delete('/:id', [auth, adminOnly], async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await TrackFitting.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Track fitting not found' });
    }

    res.json({
      success: true,
      message: 'Track fitting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting track fitting:', error);
    res.status(500).json({ success: false, message: 'Failed to delete track fitting' });
  }
});

// Get single track fitting - MUST be after /last-serial
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const trackFitting = await TrackFitting.findById(id).lean();

    if (!trackFitting) {
      return res.status(404).json({ success: false, message: 'Track fitting not found' });
    }

    res.json({
      success: true,
      data: trackFitting
    });
  } catch (error) {
    console.error('Error fetching track fitting:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch track fitting' });
  }
});

module.exports = router;
