const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { connectMongo } = require('./config/mongo');
const { initAutomation } = require('./utils/automation');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware to attach io object to request
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Enhanced CORS configuration for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected with socket id:', socket.id);

  socket.emit('message', { text: 'Welcome to the Railway QR System!' });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Database connection - MongoDB only
async function initDatabases() {
  try {
    await connectMongo();
    console.log('MongoDB connected successfully');
    
    // Initialize automation jobs (Email alerts, missed inspections)
    initAutomation();
  } catch (err) {
    console.error('MongoDB connection failed:', err);
  }
}

initDatabases();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/qr', require('./routes/qr'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/carbon', require('./routes/carbon'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/decision-copilot', require('./routes/decisionCopilot'));

// Public routes (no authentication required)
app.use('/public', require('./routes/public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, io };
