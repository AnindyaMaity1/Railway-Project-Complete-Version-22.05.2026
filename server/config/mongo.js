const mongoose = require('mongoose');
require('dotenv').config();

// Support both DATABASE_URL (for Render) and MONGO_URI (for fallback)
const MONGO_URI = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb+srv://railway_project:Railway123@cluster0.pdpldkg.mongodb.net/?appName=Cluster0';

const connectMongo = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    });
    console.log('Connected to MongoDB successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
};

module.exports = { connectMongo, mongoose };
