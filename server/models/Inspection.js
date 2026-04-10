const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inspection = sequelize.define('Inspection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  inspectionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  trackFittingId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  qrCode: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  inspectionType: {
    type: DataTypes.ENUM('initial', 'periodic', 'maintenance', 'quality', 'safety', 'pre_installation', 'post_installation'),
    allowNull: false
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  assignedDate: {
    type: DataTypes.DATE
  },
  actualDate: {
    type: DataTypes.DATE
  },
  inspectorId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inspectorName: {
    type: DataTypes.STRING
  },
  inspectorDesignation: {
    type: DataTypes.STRING
  },
  inspectorDepartment: {
    type: DataTypes.STRING
  },
  locationName: {
    type: DataTypes.STRING
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8)
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8)
  },
  trackSection: {
    type: DataTypes.STRING
  },
  km: {
    type: DataTypes.DECIMAL(10, 2)
  },
  criteria: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  overallResult: {
    type: DataTypes.ENUM('pass', 'fail', 'conditional')
  },
  findings: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  recommendations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  documents: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  nextInspectionScheduledDate: {
    type: DataTypes.DATE
  },
  nextInspectionInterval: {
    type: DataTypes.INTEGER
  },
  nextInspectionType: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'),
    defaultValue: 'scheduled'
  },
  aiAnalysis: {
    type: DataTypes.JSON
  },
  notes: {
    type: DataTypes.TEXT
  },
  isAnomalous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  anomalyDetails: {
    type: DataTypes.JSON,
    defaultValue: null
  },
  createdBy: {
    type: DataTypes.STRING
  },
  lastModifiedBy: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'inspections',
  timestamps: true
});

module.exports = Inspection;