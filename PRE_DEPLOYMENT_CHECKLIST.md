# Pre-Deployment Checklist

Use this checklist before deploying to Render to ensure everything is set up correctly.

## Code Preparation

### Git & GitHub
- [ ] Code is committed to git repository
- [ ] Repository is created on GitHub
- [ ] All code is pushed to GitHub (main/master branch)
- [ ] Repository is PUBLIC or Render has access
- [ ] `.gitignore` includes `.env` files
- [ ] Sensitive data is NOT in version control

### Dependencies
- [ ] `npm install` works in root directory
- [ ] `cd server && npm install` works
- [ ] `cd client && npm install` works
- [ ] `pip install -r requirements.txt` works in ai-service (Python 3.9+)
- [ ] All dependency versions are specified in package.json

### Configuration Files
- [ ] `.env.example` exists with all required variables
- [ ] `server/.env.example` created with template
- [ ] `client/.env.example` created with template
- [ ] No `.env` files are committed to git

## Database Setup

### MongoDB Atlas
- [ ] MongoDB Atlas account created
- [ ] Free cluster (M0) created
- [ ] Database user created with strong password
- [ ] Connection string obtained
- [ ] Network access allows 0.0.0.0/0 (Render IPs)
- [ ] Connection string format verified:
  ```
  mongodb+srv://username:password@cluster.mongodb.net/railway-track?retryWrites=true&w=majority
  ```

## Render Account Setup

- [ ] Render account created (https://render.com)
- [ ] GitHub account connected to Render
- [ ] Render dashboard accessible

## Environment Variables Prepared

### Backend Variables
- [ ] NODE_ENV = `production`
- [ ] DATABASE_URL = MongoDB connection string (verified working)
- [ ] JWT_SECRET = Generated and saved (secure random string)
- [ ] JWT_EXPIRES_IN = `7d`
- [ ] CLIENT_URL = `https://railway-track.onrender.com` (or your domain)
- [ ] CORS_ORIGIN = `https://railway-track.onrender.com` (must match frontend)
- [ ] SERVER_BASE_URL = `https://railway-track-backend.onrender.com`
- [ ] AI_SERVICE_URL = `https://railway-track-ai.onrender.com`
- [ ] UPLOAD_PATH = `/tmp/uploads`

### Frontend Variables
- [ ] REACT_APP_API_URL = `https://railway-track-backend.onrender.com/api`
- [ ] REACT_APP_SOCKET_URL = `https://railway-track-backend.onrender.com`

### AI Service Variables
- [ ] FLASK_ENV = `production`
- [ ] FLASK_DEBUG = `False`

## Code Quality Checks

### Backend (Node.js)
- [ ] `npm run dev` works locally
- [ ] No console errors on startup
- [ ] Database connection successful
- [ ] All routes accessible on localhost:5000
- [ ] Health check endpoint works: `GET /health`

### Frontend (React)
- [ ] `npm start` works locally
- [ ] `npm run build` builds successfully
- [ ] No critical warnings in build output
- [ ] Login works with default credentials
- [ ] API calls reach backend successfully

### AI Service
- [ ] Flask app starts successfully
- [ ] Required Python packages installed
- [ ] Service responds on port 5002 locally

## Docker & Build Setup

### Dockerfiles
- [ ] `server/Dockerfile` is production-ready
- [ ] `client/Dockerfile` is production-ready
- [ ] `ai-service/Dockerfile` is production-ready
- [ ] All Dockerfiles tested locally (optional)

### Build & Start Commands
- [ ] Backend build command: `npm install`
- [ ] Backend start: `node index.js` (respects PORT env var)
- [ ] Frontend build: `npm install && npm run build`
- [ ] AI service build: `pip install -r requirements.txt`
- [ ] AI service start: `gunicorn --bind 0.0.0.0:${PORT:-3000} app:app`

## Service Configurations

### Backend Service (Web)
- [ ] Name: `railway-track-backend`
- [ ] Root Directory: `server`
- [ ] Language: Node
- [ ] All environment variables added
- [ ] Build and start commands configured

### Frontend Service (Static)
- [ ] Name: `railway-track`
- [ ] Root Directory: `client`
- [ ] Build command: `npm install && npm run build`
- [ ] Publish directory: `build`
- [ ] Environment variables added

### AI Service (Web)
- [ ] Name: `railway-track-ai`
- [ ] Root Directory: `ai-service`
- [ ] Language: Python 3
- [ ] All environment variables added
- [ ] Build and start commands configured

## Security Checklist

- [ ] JWT_SECRET is strong and random (32+ characters)
- [ ] No hardcoded secrets in code
- [ ] `.env` is in `.gitignore`
- [ ] MongoDB password is strong
- [ ] CORS is properly configured
- [ ] MongoDB Atlas IP whitelist set to 0.0.0.0/0 (for dev/prod)
- [ ] Default credentials will be changed after deployment

## Testing Before Deployment

### Local Testing
- [ ] All services can run locally: `npm run dev`
- [ ] Frontend can communicate with backend
- [ ] Backend can communicate with database
- [ ] AI service returns successful responses
- [ ] No unhandled errors in console

### Render Service Testing
After deployment, verify:
- [ ] Frontend loads without errors
- [ ] Login page visible
- [ ] API calls show in Response tab (DevTools)
- [ ] Health endpoint returns UP status
- [ ] Database shows "Connected" in logs

## Post-Deployment Tasks

- [ ] Change admin password from default
- [ ] Create additional user accounts
- [ ] Test all major features
- [ ] Monitor logs for errors
- [ ] Setup email (if needed)
- [ ] Configure backups
- [ ] Setup error tracking/monitoring (optional)

## Troubleshooting Preparation

- [ ] Know how to check Render logs
- [ ] Know how to update environment variables
- [ ] Have MongoDB Atlas credentials saved
- [ ] Have GitHub repository URL
- [ ] Understand common error messages

## Documentation

- [ ] RENDER_DEPLOYMENT.md reviewed
- [ ] RENDER_DEPLOYMENT_DETAILED.md has been read
- [ ] RENDER_QUICK_REFERENCE.md saved for reference
- [ ] Team members informed of deployment plan

---

## Quick Pre-Deployment Commands

Run these to verify everything works:

```bash
# Test backend
cd server
npm install
npm run dev
# Visit http://localhost:5000/health (should return {"status":"UP"})

# Test frontend
cd ../client
npm install
npm run build
# Should complete without major errors

# Test AI service (if needed)
cd ../ai-service
pip install -r requirements.txt
python app.py
```

---

## Questions to Answer Before Deploying

1. Is your MongoDB connection string correct and tested?
2. Is your GitHub repository public?
3. Have you generated a strong JWT_SECRET?
4. Do you have all Render environment variables prepared?
5. Have you successfully built the frontend locally?
6. Do you know your desired service names on Render?
7. Are you ready to change default credentials after deployment?

---

## Sign-Off

- **Preparer:** __________________ **Date:** __________
- **Reviewer:** __________________ **Date:** __________

All items checked: **YES [ ] NO [ ]**

If NO, please address unchecked items before proceeding with deployment.

---

**Ready to Deploy?** Proceed with RENDER_DEPLOYMENT_DETAILED.md
