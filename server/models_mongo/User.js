const { Schema } = require('mongoose');

module.exports = new Schema({
  username: { type: String, required: true, unique: true, maxlength: 30 },
  email: { type: String, required: false, unique: false },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'inspector', 'vendor', 'operator'], default: 'operator' },
  department: { type: String },
  employeeId: { type: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  permissions: { type: Schema.Types.Mixed, default: [] }
}, { timestamps: true });
