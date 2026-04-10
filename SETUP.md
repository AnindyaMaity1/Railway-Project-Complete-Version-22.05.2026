# Railway Track QR Management System - Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- Git

**Note:** SQLite is included with Node.js, so no separate database installation is required!

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd railway-track-qr-system
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all project dependencies
npm run install-all
```

### 3. Environment Setup

#### Backend (.env)
Create `server/.env` file:
```env
DATABASE_URL=sqlite:./database/railway-qr-system.sqlite
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
AI_SERVICE_URL=http://localhost:5001
UDM_API_URL=https://www.ireps.gov.in/api
TMS_API_URL=https://www.irecept.gov.in/api
```

#### AI Service (.env)
Create `ai-service/.env` file:
```env
FLASK_ENV=development
FLASK_DEBUG=True
```

### 4. Database Setup
```bash
# No database setup required! SQLite will be created automatically
# The application will create the database file and tables on first run
```

### 5. Run the Application

#### Development Mode (All Services)
```bash
npm run dev
```

#### Individual Services
```bash
# Backend only
npm run server

# Frontend only
npm run client

# AI Service only
npm run ai-service
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **AI Service**: http://localhost:5001

## Default Credentials

- **Admin**: username: `admin`, password: `admin123`
- **Inspector**: username: `inspector`, password: `inspector123`

## Features

- QR Code Generation & Laser Marking
- Mobile QR Code Scanning
- Inventory Management
- Inspection Scheduling
- Vendor Management
- AI-Powered Analytics
- Performance Reporting

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### QR Codes
- `POST /api/qr/generate` - Generate QR code
- `POST /api/qr/bulk-generate` - Bulk QR generation
- `GET /api/qr/details/:qrCode` - Get QR details

### Scanning
- `POST /api/scan/process` - Process scanned QR
- `GET /api/scan/history/:trackFittingId` - Scan history

### Inventory
- `GET /api/inventory` - Get inventory
- `GET /api/inventory/stats` - Inventory statistics
- `PUT /api/inventory/:id` - Update item

### Inspections
- `GET /api/inspections` - Get inspections
- `POST /api/inspections` - Create inspection
- `PUT /api/inspections/:id` - Update inspection

### Vendors
- `GET /api/vendors` - Get vendors
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor

### AI Services
- `POST /api/ai/analyze` - Analyze track fitting
- `POST /api/ai/batch-analyze` - Batch analysis
- `GET /api/ai/analytics` - Get analytics

### Reports
- `POST /api/reports/performance` - Performance report
- `POST /api/reports/quality` - Quality report
- `POST /api/reports/inventory` - Inventory report

## Deployment

### Production Build
```bash
# Build frontend
cd client && npm run build

# Start production server
cd server && npm start
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure the database directory exists
   - Check file permissions for database creation

2. **Port Already in Use**
   - Change ports in .env files
   - Kill existing processes

3. **AI Service Not Responding**
   - Check Python dependencies
   - Verify Flask is running on port 5001

4. **QR Scanner Not Working**
   - Ensure HTTPS in production
   - Check camera permissions

### Support

For technical support, contact the development team or refer to the project documentation.
