const { Schema } = require('mongoose');

module.exports = new Schema({
  vendorCode: { type: String, index: true },
  companyName: { type: String },
  contactPersonName: { type: String },
  contactPersonDesignation: { type: String },
  contactPersonEmail: { type: String },
  contactPersonPhone: { type: String },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    country: { type: String }
  },
  contactEmail: { type: String },
  contactPhone: { type: String },
  contactWebsite: { type: String },
  gstNumber: { type: String },
  panNumber: { type: String },
  registrationNumber: { type: String },
  incorporationDate: { type: Date },
  businessType: { type: String },
  specializations: [{ type: String, default: [] }],
  certifications: { type: Schema.Types.Mixed, default: [] },
  qualityRating: { type: Number },
  performance: {
    totalSupplies: { type: Number, default: 0 },
    onTimeDelivery: { type: Number, default: 0 },
    qualityComplaints: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 }
  },
  carbonEvaluation: {
    carbonIntensity: { type: Number, default: 120 },
    sustainabilityScore: { type: Number, default: 0 },
    greenCertificationCount: { type: Number, default: 0 },
    lastReviewedDate: { type: Date }
  },
  documents: { type: Schema.Types.Mixed, default: [] },
  notes: { type: String },
  status: { type: String },
  bank: {
    accountNumber: { type: String },
    name: { type: String },
    ifsc: { type: String },
    branch: { type: String }
  },
  createdBy: { type: String },
  lastModifiedBy: { type: String }
}, { timestamps: true });
