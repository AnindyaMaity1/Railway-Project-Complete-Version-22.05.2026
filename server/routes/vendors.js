const express = require('express');
const { body, validationResult } = require('express-validator');
const { Vendor } = require('../models_mongo');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Get all vendors
router.get('/', auth, async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ companyName: 1 }).lean().exec();
    res.json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching vendors' });
  }
});

// Get vendor statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const vendors = await Vendor.find().lean().exec();
    if (vendors.length === 0) {
      return res.json({
        success: true,
        data: {
          total: 0,
          byStatus: {},
          bySpecialization: {},
          byBusinessType: {},
          totalSupplies: 0,
          avgRating: 0
        }
      });
    }

    const byStatus = {};
    const bySpecialization = {};
    const byBusinessType = {};
    let totalSupplies = 0;
    let totalRating = 0;

    vendors.forEach(vendor => {
      byStatus[vendor.status] = (byStatus[vendor.status] || 0) + 1;
      if (vendor.specializations) {
        (vendor.specializations || []).forEach(spec => {
          bySpecialization[spec] = (bySpecialization[spec] || 0) + 1;
        });
      }
      byBusinessType[vendor.businessType] = (byBusinessType[vendor.businessType] || 0) + 1;
      if (vendor.performance && vendor.performance.totalSupplies) totalSupplies += vendor.performance.totalSupplies;
      if (vendor.qualityRating) totalRating += vendor.qualityRating;
    });

    res.json({
      success: true,
      data: {
        total: vendors.length,
        byStatus,
        bySpecialization,
        byBusinessType,
        totalSupplies,
        avgRating: vendors.length > 0 ? Math.round((totalRating / vendors.length) * 100) / 100 : 0
      }
    });

  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor statistics', error: error.message });
  }
});

// Create new vendor - Admin only
router.post('/', [
  auth,
  adminOnly,
  body('vendorCode').notEmpty().withMessage('Vendor code is required'),
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('contactPerson.name').notEmpty().withMessage('Contact person name is required'),
  body('businessDetails.businessType').isIn(['manufacturer', 'supplier', 'contractor', 'service_provider']).withMessage('Valid business type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      vendorCode,
      companyName,
      contactPerson,
      address,
      contact,
      businessDetails,
      specializations = [],
      status = 'active',
      notes,
      qualityRating,
      performance
    } = req.body;

    const existingVendor = await Vendor.findOne({ vendorCode }).lean().exec();
    if (existingVendor) return res.status(400).json({ success: false, message: 'Vendor with this code already exists' });

    const vendorDoc = {
      vendorCode: vendorCode.toUpperCase(),
      companyName,
      contactPersonName: contactPerson.name,
      contactPersonDesignation: contactPerson.designation || '',
      contactPersonEmail: contactPerson.email || '',
      contactPersonPhone: contactPerson.phone || '',
      address: {
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        pincode: address?.pincode || '',
        country: address?.country || 'India'
      },
      contactEmail: contact?.email || '',
      contactPhone: contact?.phone || '',
      contactWebsite: contact?.website || '',
      gstNumber: businessDetails?.gstNumber || '',
      panNumber: businessDetails?.panNumber || '',
      registrationNumber: businessDetails?.registrationNumber || '',
      incorporationDate: businessDetails?.incorporationDate ? new Date(businessDetails.incorporationDate) : null,
      businessType: businessDetails?.businessType || 'manufacturer',
      specializations: specializations || [],
      status,
      notes,
      performance: {
        totalSupplies: performance?.totalSupplies || 0,
        onTimeDelivery: performance?.onTimeDelivery || 0,
        qualityComplaints: performance?.qualityComplaints || 0,
        averageRating: performance?.averageRating || qualityRating || 0
      },
      qualityRating: typeof qualityRating === 'number'
        ? qualityRating
        : (performance?.averageRating || 0),
      createdBy: req.user.id,
      lastModifiedBy: req.user.id
    };

    const vendor = await Vendor.create(vendorDoc);
    res.status(201).json({ success: true, message: 'Vendor created successfully', data: vendor });

  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to create vendor', error: error.message });
  }
});

// Get vendor by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).exec();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor', error: error.message });
  }
});

// Update vendor - Admin only
router.put('/:id', [
  auth,
  adminOnly,
  body('companyName').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'blacklisted']).withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { companyName, contactPerson, address, contact, businessDetails, specializations, status, notes, qualityRating } = req.body;

    const updateData = {};
    if (companyName) updateData.companyName = companyName;
    if (contactPerson) {
      updateData.contactPersonName = contactPerson.name || contactPerson;
      if (contactPerson.designation) updateData.contactPersonDesignation = contactPerson.designation;
      if (contactPerson.email) updateData.contactPersonEmail = contactPerson.email;
      if (contactPerson.phone) updateData.contactPersonPhone = contactPerson.phone;
    }
    if (address) updateData.address = address;
    if (contact) {
      if (contact.email) updateData.contactEmail = contact.email;
      if (contact.phone) updateData.contactPhone = contact.phone;
      if (contact.website) updateData.contactWebsite = contact.website;
    }
    if (businessDetails) {
      if (businessDetails.gstNumber) updateData.gstNumber = businessDetails.gstNumber;
      if (businessDetails.panNumber) updateData.panNumber = businessDetails.panNumber;
      if (businessDetails.registrationNumber) updateData.registrationNumber = businessDetails.registrationNumber;
      if (businessDetails.incorporationDate) updateData.incorporationDate = new Date(businessDetails.incorporationDate);
      if (businessDetails.businessType) updateData.businessType = businessDetails.businessType;
    }
    if (specializations) updateData.specializations = specializations;
    if (qualityRating !== undefined) updateData.qualityRating = qualityRating;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    updateData.lastModifiedBy = req.user.id;

    const vendor = await Vendor.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true, runValidators: true }).exec();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    res.json({ success: true, message: 'Vendor updated successfully', data: vendor });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to update vendor', error: error.message });
  }
});

// Update vendor performance - Admin only
router.put('/:id/performance', [
  auth,
  adminOnly,
  body('totalSupplies').optional().isNumeric().withMessage('Total supplies must be a number'),
  body('onTimeDelivery').optional().isNumeric().withMessage('On-time delivery must be a number'),
  body('qualityComplaints').optional().isNumeric().withMessage('Quality complaints must be a number'),
  body('averageRating').optional().isNumeric().withMessage('Average rating must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { totalSupplies, onTimeDelivery, qualityComplaints, averageRating } = req.body;

    const vendor = await Vendor.findById(req.params.id).exec();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    vendor.performance = vendor.performance || {};
    if (totalSupplies !== undefined) vendor.performance.totalSupplies = totalSupplies;
    if (onTimeDelivery !== undefined) vendor.performance.onTimeDelivery = onTimeDelivery;
    if (qualityComplaints !== undefined) vendor.performance.qualityComplaints = qualityComplaints;
    if (averageRating !== undefined) {
      vendor.performance.averageRating = averageRating;
      vendor.qualityRating = averageRating;
    }
    vendor.lastModifiedBy = req.user.id;
    await vendor.save();

    res.json({ success: true, message: 'Vendor performance updated successfully', data: vendor });
  } catch (error) {
    console.error('Update vendor performance error:', error);
    res.status(500).json({ success: false, message: 'Failed to update vendor performance', error: error.message });
  }
});

// Add certification
router.post('/:id/certifications', [
  auth,
  body('name').notEmpty().withMessage('Certification name is required'),
  body('issuingAuthority').notEmpty().withMessage('Issuing authority is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required'),
  body('certificateNumber').notEmpty().withMessage('Certificate number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, issuingAuthority, issueDate, expiryDate, certificateNumber } = req.body;

    const vendor = await Vendor.findById(req.params.id).exec();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const certification = { name, issuingAuthority, issueDate: new Date(issueDate), expiryDate: new Date(expiryDate), certificateNumber };
    vendor.certifications = vendor.certifications || [];
    vendor.certifications.push(certification);
    vendor.lastModifiedBy = req.user.id;
    await vendor.save();

    res.json({ success: true, message: 'Certification added successfully', data: vendor });
  } catch (error) {
    console.error('Add certification error:', error);
    res.status(500).json({ success: false, message: 'Failed to add certification', error: error.message });
  }
});

// Search vendors
router.get('/search/:query', auth, async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;
    const vendors = await Vendor.find({
      $or: [
        { companyName: new RegExp(query, 'i') },
        { vendorCode: new RegExp(query, 'i') },
        { contactPersonName: new RegExp(query, 'i') },
        { gstNumber: new RegExp(query, 'i') }
      ]
    })
      .limit(parseInt(limit))
      .select('vendorCode companyName contactPersonName specializations status qualityRating')
      .lean()
      .exec();

    res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Search vendors error:', error);
    res.status(500).json({ success: false, message: 'Failed to search vendors', error: error.message });
  }
});

// Get vendor performance report
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).exec();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const performance = vendor.performance || { totalSupplies: 0, onTimeDelivery: 0, qualityComplaints: 0, averageRating: 0 };
    const qualityRating = vendor.qualityRating || 0;
    const performanceScore = calculatePerformanceScore(performance, qualityRating);
    const riskLevel = calculateRiskLevel(performance, qualityRating);

    res.json({
      success: true,
      data: {
        vendor: { id: vendor._id, vendorCode: vendor.vendorCode, companyName: vendor.companyName },
        performance: { ...performance, performanceScore, riskLevel, qualityRating },
        recommendations: generateRecommendations(performance, qualityRating)
      }
    });
  } catch (error) {
    console.error('Get vendor performance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch vendor performance', error: error.message });
  }
});

// Delete vendor (soft delete) - Admin only
router.delete('/:id', [auth, adminOnly], async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).exec();
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    vendor.status = 'inactive';
    vendor.lastModifiedBy = req.user.id;
    await vendor.save();
    res.json({ success: true, message: 'Vendor deactivated successfully' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete vendor', error: error.message });
  }
});

// Helper functions
function calculatePerformanceScore(performance, qualityRating) {
  const weights = { onTimeDelivery: 0.3, qualityRating: 0.4, totalSupplies: 0.2, qualityComplaints: 0.1 };
  const normalizedSupplies = Math.min(performance.totalSupplies / 1000, 1);
  const normalizedComplaints = Math.max(0, 1 - (performance.qualityComplaints / 10));
  const score = (
    (performance.onTimeDelivery / 100) * weights.onTimeDelivery +
    (qualityRating / 5) * weights.qualityRating +
    normalizedSupplies * weights.totalSupplies +
    normalizedComplaints * weights.qualityComplaints
  );
  return Math.round(score * 100) / 100;
}

function calculateRiskLevel(performance, qualityRating) {
  const score = calculatePerformanceScore(performance, qualityRating);
  if (score >= 0.8) return 'low';
  if (score >= 0.6) return 'medium';
  if (score >= 0.4) return 'high';
  return 'critical';
}

function generateRecommendations(performance, qualityRating) {
  const recommendations = [];
  if (performance.onTimeDelivery < 80) recommendations.push('Improve delivery timelines to meet performance standards');
  if (qualityRating < 4.0) recommendations.push('Focus on quality improvement initiatives');
  if (performance.qualityComplaints > 5) recommendations.push('Address quality issues and implement corrective measures');
  if (performance.totalSupplies < 100) recommendations.push('Increase supply capacity to meet demand');
  if (recommendations.length === 0) recommendations.push('Vendor is performing well, maintain current standards');
  return recommendations;
}

module.exports = router;
