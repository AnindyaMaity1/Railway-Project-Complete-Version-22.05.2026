/*
  Danger: this will delete all documents in the `vendors` collection in MongoDB.
  Usage: from `server` folder run `node scripts/clear-vendors.js`
  This is provided so you can remove any static/sample vendor data.
*/

const { connectMongo } = require('../config/mongo');
const { Vendor } = require('../models_mongo');

async function run() {
  try {
    await connectMongo();
    console.warn('About to delete all documents from vendors collection');
    const res = await Vendor.deleteMany({});
    console.log('Deleted vendor count:', res.deletedCount);
    process.exit(0);
  } catch (err) {
    console.error('Failed to clear vendors:', err);
    process.exit(1);
  }
}

run();
