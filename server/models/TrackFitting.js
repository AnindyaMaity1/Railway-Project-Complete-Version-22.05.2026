const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TrackFitting = sequelize.define('TrackFitting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  qrCode: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  itemType: {
    type: DataTypes.ENUM('elastic_rail_clip', 'rail_pad', 'liner', 'sleeper'),
    allowNull: false
  },
  itemSubType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  serialNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  batchNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lotNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'vendors',
      key: 'id'
    }
  },
  vendorName: {
    type: DataTypes.STRING
  },
  vendorCode: {
    type: DataTypes.STRING
  },
  manufacturingDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  manufacturingLocation: {
    type: DataTypes.STRING
  },
  machineId: {
    type: DataTypes.STRING
  },
  operatorId: {
    type: DataTypes.STRING
  },
  material: {
    type: DataTypes.STRING,
    defaultValue: 'Steel'
  },
  dimensionsLength: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  dimensionsWidth: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  dimensionsHeight: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  dimensionsUnit: {
    type: DataTypes.STRING,
    defaultValue: 'mm'
  },
  weight: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  grade: {
    type: DataTypes.STRING,
    defaultValue: 'Standard'
  },
  standard: {
    type: DataTypes.STRING,
    defaultValue: 'IS'
  },
  initialInspectionPassed: {
    type: DataTypes.BOOLEAN
  },
  initialInspectionDate: {
    type: DataTypes.DATE
  },
  initialInspectorId: {
    type: DataTypes.STRING
  },
  initialInspectionNotes: {
    type: DataTypes.TEXT
  },
  finalInspectionPassed: {
    type: DataTypes.BOOLEAN
  },
  finalInspectionDate: {
    type: DataTypes.DATE
  },
  finalInspectorId: {
    type: DataTypes.STRING
  },
  finalInspectionNotes: {
    type: DataTypes.TEXT
  },
  qualityGrade: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D'),
    defaultValue: 'A'
  },
  supplyDate: {
    type: DataTypes.DATE
  },
  supplyLocation: {
    type: DataTypes.STRING
  },
  supplyQuantity: {
    type: DataTypes.INTEGER
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2)
  },
  totalValue: {
    type: DataTypes.DECIMAL(12, 2)
  },
  purchaseOrder: {
    type: DataTypes.STRING
  },
  warrantyStartDate: {
    type: DataTypes.DATE
  },
  warrantyEndDate: {
    type: DataTypes.DATE
  },
  warrantyDuration: {
    type: DataTypes.INTEGER,
    defaultValue: 12
  },
  warrantyTerms: {
    type: DataTypes.TEXT
  },
  installationDate: {
    type: DataTypes.DATE
  },
  installationLocation: {
    type: DataTypes.STRING
  },
  trackSection: {
    type: DataTypes.STRING
  },
  installationId: {
    type: DataTypes.STRING
  },
  installerId: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('manufactured', 'inspected', 'supplied', 'installed', 'in_service', 'maintenance', 'replaced', 'scrapped'),
    defaultValue: 'manufactured'
  },
  currentLocation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8)
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8)
  },
  trackSectionKm: {
    type: DataTypes.DECIMAL(10, 2)
  },
  inspections: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  maintenance: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  serviceLife: {
    type: DataTypes.INTEGER
  },
  failureDate: {
    type: DataTypes.DATE
  },
  failureReason: {
    type: DataTypes.TEXT
  },
  replacementDate: {
    type: DataTypes.DATE
  },
  createdBy: {
    type: DataTypes.STRING
  },
  lastModifiedBy: {
    type: DataTypes.STRING
  },
  // New fields for station information
  fromStation: {
    type: DataTypes.STRING,
    allowNull: true // Can be null if not provided
  },
  toStation: {
    type: DataTypes.STRING,
    allowNull: true // Can be null if not provided
  },
  fromStationLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  fromStationLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  toStationLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true
  },
  toStationLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'track_fittings',
  timestamps: true
});

module.exports = TrackFitting;