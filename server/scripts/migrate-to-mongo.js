/*
 Migration script: copy dynamic data from SQLite (Sequelize models)
 into MongoDB (Mongoose). Only seeds two static users (admin/inspector).
 Usage: from server folder run `node scripts/migrate-to-mongo.js`
 Ensure `npm install` run after adding `mongoose`.
*/

const path = require('path');
const bcrypt = require('bcryptjs');

const { connectMongo } = require('../config/mongo');
const { User: MUser, TrackFitting: MTrack, Inspection: MInspection, Vendor: MVendor } = require('../models_mongo');

// Sequelize models
const TrackFitting = require('../models/TrackFitting');
const Inspection = require('../models/Inspection');
const Vendor = require('../models/Vendor');
// Note: we DO NOT migrate existing users; we seed only two static users below

const transformTrack = (t) => {
  return {
    qrCode: t.qr_code || t.qrCode || null,
    itemType: t.item_type || t.itemType || null,
    itemSubType: t.item_sub_type || t.itemSubType || null,
    serialNumber: t.serial_number || t.serialNumber || null,
    batchNumber: t.batch_number || t.batchNumber || null,
    lotNumber: t.lot_number || t.lotNumber || null,
    vendorId: t.vendor_id || t.vendorId || null,
    vendorName: t.vendor_name || t.vendorName || null,
    vendorCode: t.vendor_code || t.vendorCode || null,
    manufacturingDate: t.manufacturing_date || t.manufacturingDate || null,
    manufacturingLocation: t.manufacturing_location || t.manufacturingLocation || null,
    machineId: t.machine_id || t.machineId || null,
    operatorId: t.operator_id || t.operatorId || null,
    material: t.material || null,
    dimensions: {
      length: t.dimensions_length || t.dimensionsLength || null,
      width: t.dimensions_width || t.dimensionsWidth || null,
      height: t.dimensions_height || t.dimensionsHeight || null,
      unit: t.dimensions_unit || t.dimensionsUnit || null
    },
    weight: t.weight || null,
    grade: t.grade || null,
    standard: t.standard || null,
    inspections: t.inspections || null,
    maintenance: t.maintenance || null,
    status: t.status || null,
    currentLocation: t.current_location || t.currentLocation || null,
    locationCoords: {
      latitude: t.latitude || null,
      longitude: t.longitude || null
    },
    trackSectionKm: t.track_section_km || t.trackSectionKm || null,
    serviceLife: t.service_life || t.serviceLife || null,
    failureDate: t.failure_date || t.failureDate || null,
    failureReason: t.failure_reason || t.failureReason || null,
    replacementDate: t.replacement_date || t.replacementDate || null,
    createdBy: t.created_by || t.createdBy || null,
    lastModifiedBy: t.last_modified_by || t.lastModifiedBy || null,
    fromStation: t.from_station || t.fromStation || null,
    toStation: t.to_station || t.toStation || null,
    version: t.version || 1,
    extra: {}
  };
};

const transformInspection = (i) => {
  return {
    inspectionId: i.inspection_id || i.inspectionId || null,
    trackFittingId: i.track_fitting_id || i.trackFittingId || null,
    qrCode: i.qr_code || i.qrCode || null,
    inspectionType: i.inspection_type || i.inspectionType || null,
    scheduledDate: i.scheduled_date || i.scheduledDate || null,
    actualDate: i.actual_date || i.actualDate || null,
    inspectorId: i.inspector_id || i.inspectorId || null,
    inspectorName: i.inspector_name || i.inspectorName || null,
    inspectorDesignation: i.inspector_designation || i.inspectorDesignation || null,
    inspectorDepartment: i.inspector_department || i.inspectorDepartment || null,
    locationName: i.location_name || i.locationName || null,
    coords: {
      latitude: i.latitude || null,
      longitude: i.longitude || null
    },
    trackSection: i.track_section || i.trackSection || null,
    km: i.km || null,
    criteria: i.criteria || null,
    overallResult: i.overall_result || i.overallResult || null,
    findings: i.findings || null,
    recommendations: i.recommendations || null,
    documents: i.documents || null,
    nextInspectionScheduledDate: i.next_inspection_scheduled_date || i.nextInspectionScheduledDate || null,
    nextInspectionInterval: i.next_inspection_interval || i.nextInspectionInterval || null,
    nextInspectionType: i.next_inspection_type || i.nextInspectionType || null,
    status: i.status || null,
    aiAnalysis: i.ai_analysis || i.aiAnalysis || null,
    notes: i.notes || null,
    isAnomalous: i.is_anomalous || i.isAnomalous || false,
    anomalyDetails: i.anomaly_details || i.anomalyDetails || null,
    createdBy: i.created_by || i.createdBy || null,
    lastModifiedBy: i.last_modified_by || i.lastModifiedBy || null,
    extra: {}
  };
};

const transformVendor = (v) => ({
  vendorCode: v.vendor_code || v.vendorCode || null,
  companyName: v.company_name || v.companyName || null,
  contactPersonName: v.contact_person_name || v.contactPersonName || null,
  contactPersonDesignation: v.contact_person_designation || v.contactPersonDesignation || null,
  contactPersonEmail: v.contact_person_email || v.contactPersonEmail || null,
  contactPersonPhone: v.contact_person_phone || v.contactPersonPhone || null,
  address: {
    street: v.address_street || v.addressStreet || null,
    city: v.address_city || v.addressCity || null,
    state: v.address_state || v.addressState || null,
    pincode: v.address_pincode || v.addressPincode || null,
    country: v.address_country || v.addressCountry || null
  },
  contactEmail: v.contact_email || v.contactEmail || null,
  contactPhone: v.contact_phone || v.contactPhone || null,
  contactWebsite: v.contact_website || v.contactWebsite || null,
  gstNumber: v.gst_number || v.gstNumber || null,
  panNumber: v.pan_number || v.panNumber || null,
  registrationNumber: v.registration_number || v.registrationNumber || null,
  incorporationDate: v.incorporation_date || v.incorporationDate || null,
  businessType: v.business_type || v.businessType || null,
  certifications: v.certifications || null,
  qualityRating: v.quality_rating || v.qualityRating || null,
  documents: v.documents || null,
  notes: v.notes || null,
  status: v.status || null,
  bank: {
    accountNumber: v.bank_account_number || v.bankAccountNumber || null,
    name: v.bank_name || v.bankName || null,
    ifsc: v.bank_ifsc_code || v.bankIfscCode || null,
    branch: v.bank_branch || v.bankBranch || null
  },
  createdBy: v.created_by || v.createdBy || null,
  lastModifiedBy: v.last_modified_by || v.lastModifiedBy || null
});


const run = async () => {
  try {
    await connectMongo();

    console.log('Reading TrackFittings from SQLite...');
    const trackRows = await TrackFitting.findAll({ raw: true });
    console.log(`Found ${trackRows.length} track fittings`);

    const trackDocs = trackRows.map(transformTrack).filter(t => t.qrCode);
    if (trackDocs.length) {
      // upsert by qrCode
      const bulkOps = trackDocs.map(d => ({
        updateOne: {
          filter: { qrCode: d.qrCode },
          update: { $set: d },
          upsert: true
        }
      }));
      await MTrack.bulkWrite(bulkOps);
      console.log('Track fittings migrated:', trackDocs.length);
    }

    console.log('Reading Inspections from SQLite...');
    const inspRows = await Inspection.findAll({ raw: true });
    console.log(`Found ${inspRows.length} inspections`);
    const inspDocs = inspRows.map(transformInspection).filter(i => i.inspectionId || i.qrCode);
    if (inspDocs.length) {
      const bulkOps = inspDocs.map(d => ({
        updateOne: {
          filter: { inspectionId: d.inspectionId || d.qrCode },
          update: { $set: d },
          upsert: true
        }
      }));
      await MInspection.bulkWrite(bulkOps);
      console.log('Inspections migrated:', inspDocs.length);
    }

    console.log('Reading Vendors from SQLite...');
    const vendorRows = await Vendor.findAll({ raw: true });
    console.log(`Found ${vendorRows.length} vendors`);
    const vendorDocs = vendorRows.map(transformVendor).filter(v => v.vendorCode || v.companyName);
    if (vendorDocs.length) {
      const bulkOps = vendorDocs.map(d => ({
        updateOne: {
          filter: { vendorCode: d.vendorCode },
          update: { $set: d },
          upsert: true
        }
      }));
      await MVendor.bulkWrite(bulkOps);
      console.log('Vendors migrated:', vendorDocs.length);
    }

    // NOTE: static seeding removed to avoid hardcoded data.
    // If you need to seed admin/inspector users, run a dedicated seeding script.

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
};

run();
