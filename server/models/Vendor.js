const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vendor = sequelize.define('Vendor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vendorCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contactPersonName: {
    type: DataTypes.STRING
  },
  contactPersonDesignation: {
    type: DataTypes.STRING
  },
  contactPersonEmail: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  contactPersonPhone: {
    type: DataTypes.STRING
  },
  addressStreet: {
    type: DataTypes.STRING
  },
  addressCity: {
    type: DataTypes.STRING
  },
  addressState: {
    type: DataTypes.STRING
  },
  addressPincode: {
    type: DataTypes.STRING
  },
  addressCountry: {
    type: DataTypes.STRING,
    defaultValue: 'India'
  },
  contactEmail: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  contactPhone: {
    type: DataTypes.STRING
  },
  contactWebsite: {
    type: DataTypes.STRING
  },
  contactFax: {
    type: DataTypes.STRING
  },
  gstNumber: {
    type: DataTypes.STRING
  },
  panNumber: {
    type: DataTypes.STRING
  },
  registrationNumber: {
    type: DataTypes.STRING
  },
  incorporationDate: {
    type: DataTypes.DATE
  },
  businessType: {
    type: DataTypes.ENUM('manufacturer', 'supplier', 'contractor', 'service_provider'),
    defaultValue: 'manufacturer'
  },
  certifications: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  qualityRating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 3.0,
    validate: {
      min: 1,
      max: 5
    }
  },
  totalSupplies: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  onTimeDelivery: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  qualityComplaints: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  averageRating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 0
  },
  specializations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'blacklisted'),
    defaultValue: 'active'
  },
  bankAccountNumber: {
    type: DataTypes.STRING
  },
  bankName: {
    type: DataTypes.STRING
  },
  bankIfscCode: {
    type: DataTypes.STRING
  },
  bankBranch: {
    type: DataTypes.STRING
  },
  documents: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT
  },
  createdBy: {
    type: DataTypes.STRING
  },
  lastModifiedBy: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'vendors'
});

module.exports = Vendor;