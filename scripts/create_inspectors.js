
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const MONGO_URI = 'mongodb+srv://railway_project:Railway123@cluster0.pdpldkg.mongodb.net/?appName=Cluster0';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: false },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'inspector', 'vendor', 'operator'], default: 'operator' },
  department: { type: String },
  employeeId: { type: String },
  isActive: { type: Boolean, default: true },
  permissions: { type: [String], default: [] }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function createInspectors() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const users = [
      {
        username: 'Abhay Pal',
        email: 'abhaypalrail1@gmail.com',
        password: 'Abhay123#',
        employeeId: 'EMP-ABHAY',
        department: 'inspection'
      },
      {
        username: 'Aman Yadav',
        email: 'amanyadavrail1@gmail.com',
        password: 'Aman123',
        employeeId: 'EMP-AMAN',
        department: 'inspection'
      }
    ];

    for (const u of users) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      
      const updateData = {
        ...u,
        password: hashedPassword,
        role: 'inspector',
        permissions: ['read', 'scan', 'report'],
        isActive: true
      };

      await User.findOneAndUpdate(
        { username: u.username },
        { $set: updateData },
        { upsert: true, new: true }
      );
      console.log(`Ensured user: ${u.username} with password: ${u.password}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (err) {
    console.error('Error during user creation:', err);
    process.exit(1);
  }
}

createInspectors();
