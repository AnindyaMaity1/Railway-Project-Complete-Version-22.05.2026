# Getting Started - Deploy to Render in 30 Minutes

This is the **simplest guide** for deploying your Railway Track QR System. Follow these exact steps.

---

## Step 0: What You Need

Before you start, have ready:
- A GitHub account (create one at https://github.com)
- A Render account (create one at https://render.com)
- A MongoDB Atlas account (create one at https://www.mongodb.com/cloud/atlas)

Total account creation time: ~5 minutes

---

## Step 1: Setup MongoDB Atlas (5 minutes)

### 1.1 Create Account
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Sign Up"
3. Enter email, password, and accept terms
4. Click "Create Account"

### 1.2 Create Cluster
1. Click "Create a New Project" (if prompted)
2. Click "Create Cluster"
3. Select "FREE" tier (M0, free forever)
4. Choose closest location to you
5. Click "Create Cluster"
6. Wait 2-3 minutes for cluster to create

### 1.3 Create Database User
1. Click "Database Access" in left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. **Username:** `railwayuser`
5. **Password:** Make this strong! (e.g., `MySecure123!Pass`)
6. Click "Add User"

### 1.4 Get Connection String
1. Click "Database" in left sidebar
2. Click "Connect" on your cluster
3. Click "Connect your application"
4. Select "Node.js" version "4.0 or later"
5. **Copy the connection string** (looks like: `mongodb+srv://railwayuser:PASSWORD@...`)
6. **Replace `<password>` with your actual password**
7. **Change database name** from default to `railway-track`:
   - Find: `?retryWrites=true`
   - Change to: `/railway-track?retryWrites=true`

**Example final URL:**
```
mongodb+srv://railwayuser:MySecure123!Pass@railway-cluster.xxxxx.mongodb.net/railway-track?retryWrites=true&w=majority
```

**Save this URL** - you'll need it later!

### 1.5 Allow All IPs
1. Click "Network Access" in left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere"
4. Click "Confirm"

**Done with MongoDB!** ✅

---

## Step 2: Push Code to GitHub (5 minutes)

### 2.1 Create GitHub Repository
1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** railway-track-qr
   - **Description:** Railway Track QR System
   - **Visibility:** Public
3. Click "Create repository"

### 2.2 Push Your Code
Open PowerShell and run these commands in your project folder:

```powershell
# Navigate to your project
cd "d:\RailWay-Track-Project Complete Version Final\RailWay-Track"

# Initialize git
git init

# Add your files
git add .

# Create a commit
git commit -m "Initial commit"

# Add your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/railway-track-qr.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

**Expected output:** Files upload to GitHub

**Verify:** Visit `https://github.com/YOUR_USERNAME/railway-track-qr` - you should see your code!

**Done with GitHub!** ✅

---

## Step 3: Deploy Backend (5 minutes)

### 3.1 Create Backend Service
1. Go to https://dashboard.render.com
2. Sign up with GitHub (easiest!)
3. Click "New +" button
4. Click "Web Service"
5. Select "railway-track-qr" repository
6. Click "Connect"

### 3.2 Configure Service
Fill in these fields exactly:

| Field | Value |
|-------|-------|
| Name | `railway-track-backend` |
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `node index.js` |
| Plan | Free |

Click "Create Web Service"

**Wait for deployment** (1-2 minutes) ⏳

### 3.3 Add Environment Variables
1. After deployed, click "Environment" tab
2. Click "Add Environment Variable"
3. Add these variables one by one:

```
NODE_ENV = production
DATABASE_URL = [Your MongoDB connection string from Step 1]
JWT_SECRET = [Generate using: python -c "import secrets; print(secrets.token_urlsafe(32))"]
CLIENT_URL = https://railway-track.onrender.com
CORS_ORIGIN = https://railway-track.onrender.com
SERVER_BASE_URL = https://railway-track-backend.onrender.com
AI_SERVICE_URL = https://railway-track-ai.onrender.com
```

**How to generate JWT_SECRET:**
- Open PowerShell
- Run: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Copy the output (something like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

4. Click "Save" after adding variables
5. Service will auto-redeploy

**Wait for redeployment** (check logs) ⏳

### 3.4 Get Backend URL
When done, you'll see:
```
https://railway-track-backend.onrender.com
```

**Save this URL!** You'll need it for frontend.

**Test it:** Visit `https://railway-track-backend.onrender.com/health`
- Should show: `{"status":"UP"}`

**If not UP:** Check logs in Render dashboard

**Done with Backend!** ✅

---

## Step 4: Deploy AI Service (3 minutes)

### 4.1 Create AI Service
1. Click "New +" button
2. Click "Web Service"
3. Select "railway-track-qr" repository again
4. Configure:

| Field | Value |
|-------|-------|
| Name | `railway-track-ai` |
| Root Directory | `ai-service` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn --bind 0.0.0.0:3000 app:app` |
| Environment | Python 3 |
| Plan | Free |

Click "Create Web Service"

### 4.2 Add Environment Variables
1. Click "Environment" tab
2. Add:
   ```
   FLASK_ENV = production
   FLASK_DEBUG = False
   ```
3. Save

**Wait for deployment** ⏳

**Done with AI Service!** ✅

---

## Step 5: Deploy Frontend (5 minutes)

### 5.1 Create Frontend Service
1. Click "New +" button
2. Click "Static Site" (NOT Web Service!)
3. Select "railway-track-qr" repository
4. Configure:

| Field | Value |
|-------|-------|
| Name | `railway-track` |
| Root Directory | `client` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `build` |

Click "Create Static Site"

**Wait for build** (2-3 minutes) ⏳

### 5.2 Add Environment Variables
1. Click "Environment" tab
2. Add:
   ```
   REACT_APP_API_URL = https://railway-track-backend.onrender.com/api
   REACT_APP_SOCKET_URL = https://railway-track-backend.onrender.com
   ```
3. Save

**Service will redeploy** ⏳

### 5.3 Get Frontend URL
When done, you'll see:
```
https://railway-track.onrender.com
```

**Share this URL with users!**

**Done with Frontend!** ✅

---

## Step 6: Test Your Application (5 minutes)

### 6.1 Visit Your App
Open browser and go to:
```
https://railway-track.onrender.com
```

You should see the login page! 🎉

### 6.2 Login
Use these credentials:
- **Username:** admin
- **Password:** admin123

### 6.3 Test Features
Try:
- [ ] View dashboard
- [ ] View inventory
- [ ] Create QR code
- [ ] Check reports

### 6.4 Fix Issues
If something doesn't work:
1. Open Developer Tools (F12)
2. Check Console tab for red errors
3. Check Network tab for failed requests
4. Go to Render dashboard and check service logs

---

## Congratulations! 🎉

Your application is **live online!**

### Share Your App
- **Frontend URL:** https://railway-track.onrender.com
- **Anyone can now access it**
- **Just share the URL**

---

## What Now?

### First Priority
**Change admin password!**
1. Login
2. Go to account settings
3. Change password from `admin123` to something secure

### Optional
- Create user accounts
- Upload inventory data
- Test QR code scanning

---

## If Something Goes Wrong

### Common Issues

**"Login page appears but login fails"**
→ Wait 2-3 minutes, backend might still be starting

**"Cannot connect to database"**
→ Check MongoDB connection string in backend environment vars

**"Blank page or 404"**
→ Frontend might still be building, wait a minute and refresh

**More detailed troubleshooting?**
→ See TROUBLESHOOTING.md in project folder

---

## Quick Reference

| Component | URL | Status |
|-----------|-----|--------|
| Your App | https://railway-track.onrender.com | Visit this! |
| Backend | https://railway-track-backend.onrender.com | Check logs |
| Health Check | https://railway-track-backend.onrender.com/health | Should say UP |

---

## Need Detailed Help?

Read these files in your project:
1. **RENDER_DEPLOYMENT_DETAILED.md** - More thorough guide
2. **TROUBLESHOOTING.md** - Fix common issues
3. **PRE_DEPLOYMENT_CHECKLIST.md** - Verify configuration

---

## You Did It! 🚀

**Timeline Summary:**
- Step 1 (MongoDB): ~5 min
- Step 2 (GitHub): ~5 min
- Step 3 (Backend): ~5 min
- Step 4 (AI): ~3 min
- Step 5 (Frontend): ~5 min
- Step 6 (Test): ~5 min

**Total: ~28 minutes**

---

## Questions?

Most issues are covered in TROUBLESHOOTING.md

Good luck! Your Railway Track QR System is now online! 🎉
