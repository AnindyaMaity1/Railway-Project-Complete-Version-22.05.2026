const fs = require('fs');
const path = require('path');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, '../database');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('Database directory created:', dbDir);
} else {
  console.log('Database directory already exists:', dbDir);
}
