const { sequelize } = require('../config/database');
const User = require('./User');
const Vendor = require('./Vendor');
const TrackFitting = require('./TrackFitting');
const Inspection = require('./Inspection');

// Define associations
TrackFitting.belongsTo(Vendor, { 
  foreignKey: 'vendorId', 
  as: 'vendor' 
});

Vendor.hasMany(TrackFitting, { 
  foreignKey: 'vendorId', 
  as: 'trackFittings' 
});

Inspection.belongsTo(TrackFitting, { 
  foreignKey: 'trackFittingId', 
  as: 'trackFitting' 
});

TrackFitting.hasMany(Inspection, { 
  foreignKey: 'trackFittingId', 
  as: 'trackFittingInspections' 
});

// Create default users
const createDefaultUsers = async () => {
  try {
    // Force reset users by deleting and recreating
    await User.destroy({ where: { username: 'admin' } });
    await User.destroy({ where: { username: 'inspector' } });
    
    await User.create({
      username: 'admin',
      email: 'admin@railway-qr.com',
      password: 'admin123#',
      role: 'admin',
      department: 'production',
      employeeId: 'ADMIN001',
      permissions: ['read', 'write', 'delete', 'approve', 'scan', 'report']
    });
    console.log('Default admin user created');

    await User.create({
      username: 'inspector',
      email: 'inspector@railway-qr.com',
      password: 'inspector123#',
      role: 'inspector',
      department: 'inspection',
      employeeId: 'INSP001',
      permissions: ['read', 'scan', 'report']
    });
    console.log('Default inspector user created');
  } catch (error) {
    console.error('Error creating default users:', error);
  }
};

// Create default vendors
const createDefaultVendors = async () => {
  try {
    const vendor1 = await Vendor.findOne({ where: { companyName: 'Railway Components Ltd.' } });
    if (!vendor1) {
      await Vendor.create({
        vendorCode: 'RC001',
        companyName: 'Railway Components Ltd.',
        contactEmail: 'info@railwaycomponents.com',
        contactPhone: '+91-9876543210',
        address: '123 Railway Street, Mumbai, Maharashtra',
        qualityRating: 4.5,
        certifications: ['ISO 9001', 'IRIS'],
        isActive: true
      });
      console.log('Default vendor 1 created');
    }

    const vendor2 = await Vendor.findOne({ where: { companyName: 'Track Solutions Inc.' } });
    if (!vendor2) {
      await Vendor.create({
        vendorCode: 'TS002',
        companyName: 'Track Solutions Inc.',
        contactEmail: 'contact@tracksolutions.com',
        contactPhone: '+91-9876543211',
        address: '456 Track Avenue, Delhi, NCR',
        qualityRating: 4.2,
        certifications: ['ISO 9001'],
        isActive: true
      });
      console.log('Default vendor 2 created');
    }
  } catch (error) {
    console.error('Error creating default vendors:', error);
  }
};

// Sync database
// NOTE: Changed to avoid forcing recreation and automatic seeding of sample/static data.
// This preserves existing SQLite data and prevents inserting default vendors/users.
const syncDatabase = async () => {
  try {
    // Use alter to apply minimal schema changes without dropping tables
    await sequelize.sync({ alter: true });
    console.log('Database tables synchronized successfully (no force).');

    // Do NOT create default users or vendors automatically.
    // If you need to seed data, run dedicated seed scripts explicitly.
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};


module.exports = {
  sequelize,
  User,
  Vendor,
  TrackFitting,
  Inspection,
  syncDatabase
};
