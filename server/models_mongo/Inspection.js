const { Schema } = require('mongoose');

module.exports = new Schema({
  inspectionId: { type: String, index: true, unique: true },
  trackFittingId: { type: Schema.Types.Mixed },
  qrCode: { type: String },
  inspectionType: { type: String },
  scheduledDate: { type: Date, index: true },
  actualDate: { type: Date, index: true },
  inspectorId: { type: String },
  inspectorName: { type: String, index: true },
  inspectorDesignation: { type: String },
  inspectorDepartment: { type: String },
  locationName: { type: String },
  coords: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  trackSection: { type: String, index: true },
  km: { type: Number, index: true },
  criteria: { type: Schema.Types.Mixed, default: [] },
  overallResult: { type: String, index: true },
  findings: { type: Schema.Types.Mixed, default: [] },
  recommendations: { type: Schema.Types.Mixed, default: [] },
  documents: { type: Schema.Types.Mixed, default: [] },
  nextInspectionScheduledDate: { type: Date },
  nextInspectionInterval: { type: Number },
  nextInspectionType: { type: String },
  status: { type: String, index: true },
  aiAnalysis: { type: Schema.Types.Mixed },
  notes: { type: String },
  isAnomalous: { type: Boolean, default: false },
  anomalyDetails: { type: Schema.Types.Mixed },
  createdBy: { type: String },
  lastModifiedBy: { type: String },
  extra: { type: Schema.Types.Mixed }
}, { timestamps: true });
