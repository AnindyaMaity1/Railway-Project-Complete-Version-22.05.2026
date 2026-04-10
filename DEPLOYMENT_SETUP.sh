#!/bin/bash

# Railway Track QR System - Render Deployment Setup Script
# This script helps you prepare your project for Render deployment

echo "========================================="
echo "Railway Track QR System - Render Setup"
echo "========================================="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git is not initialized in this directory"
    echo "Please run: git init"
    exit 1
fi

echo "✅ Git repository detected"
echo ""

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "Creating .gitignore..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
.venv/
__pycache__/
*.egg-info/

# Environment variables
.env
.env.local
.env.*.local

# Database
*.sqlite
*.sqlite3
database/

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build files
client/build/
dist/

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Uploads
uploads/
EOF
    echo "✅ .gitignore created"
fi

echo ""
echo "========================================="
echo "Pre-Deployment Checklist:"
echo "========================================="
echo ""
echo "Before deploying to Render, ensure:"
echo ""
echo "1. Repository Setup:"
echo "   [ ] Push code to GitHub"
echo "   [ ] Repository is public (or Render has access)"
echo ""
echo "2. Database Setup:"
echo "   [ ] Create MongoDB Atlas account (free tier)"
echo "   [ ] Create a cluster and database"
echo "   [ ] Get MongoDB connection string"
echo "   [ ] Set IP whitelist to 0.0.0.0/0 in MongoDB Atlas"
echo ""
echo "3. Environment Variables:"
echo "   [ ] Copy server/.env.example to server/.env.production"
echo "   [ ] Update DATABASE_URL with your MongoDB URI"
echo "   [ ] Generate strong JWT_SECRET (e.g., using 'openssl rand -base64 32')"
echo "   [ ] Update URLs to match your Render domains"
echo ""
echo "4. Code Verification:"
echo "   [ ] Test locally: npm run dev"
echo "   [ ] Login works correctly"
echo "   [ ] Database connection successful"
echo "   [ ] No console errors"
echo ""
echo "5. Render Setup:"
echo "   [ ] Create Render account"
echo "   [ ] Connect GitHub repository"
echo "   [ ] Create 3 services: backend, frontend, ai-service"
echo ""

echo ""
echo "========================================="
echo "Useful Commands:"
echo "========================================="
echo ""
echo "Generate secure JWT_SECRET:"
echo "  Linux/Mac: openssl rand -base64 32"
echo "  Windows: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
echo ""
echo "Test MongoDB connection locally:"
echo "  npm run server"
echo ""
echo "Build frontend locally:"
echo "  cd client && npm run build"
echo ""
echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo "1. Read RENDER_DEPLOYMENT.md for detailed instructions"
echo "2. Set up MongoDB Atlas"
echo "3. Push code to GitHub"
echo "4. Deploy services on Render.com"
echo "5. Configure environment variables"
echo "6. Test the deployed application"
echo ""
