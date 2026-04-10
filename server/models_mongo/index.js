const { mongoose } = require('../config/mongo');
const Mongoose = mongoose.model.bind(mongoose);

const UserSchema = require('./User');
const TrackFittingSchema = require('./TrackFitting');
const InspectionSchema = require('./Inspection');
const VendorSchema = require('./Vendor');

const User = Mongoose('User', UserSchema);
const TrackFitting = Mongoose('TrackFitting', TrackFittingSchema);
const Inspection = Mongoose('Inspection', InspectionSchema);
const Vendor = Mongoose('Vendor', VendorSchema);

module.exports = { User, TrackFitting, Inspection, Vendor };
