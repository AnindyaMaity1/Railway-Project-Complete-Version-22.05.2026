# Deployment Troubleshooting Guide

This guide helps you diagnose and fix common deployment issues on Render.

## Table of Contents
1. [Build & Deployment Issues](#build--deployment-issues)
2. [Frontend Issues](#frontend-issues)
3. [Backend Issues](#backend-issues)
4. [Database Issues](#database-issues)
5. [Service Communication Issues](#service-communication-issues)
6. [Environment & Configuration Issues](#environment--configuration-issues)

---

## Build & Deployment Issues

### Problem: Build Fails with "Module not found"

**Error Message:** `Cannot find module 'xyz'`

**Solution:**
1. Verify all dependencies are in `package.json` or `requirements.txt`
2. Check for typos in import statements
3. Ensure you're installing dependencies:
   - Backend build command: `npm install`
   - Frontend build command: `npm install && npm run build`
   - AI service: `pip install -r requirements.txt` added to requirements.txt
4. Run `npm install` locally to verify no errors
5. Redeploy after fixing

### Problem: "Build Script Failed" / "Start Command Failed"

**Error Message:** Build hangs or returns non-zero exit code

**Solution:**
1. Check if build/start command is correct:
   - Backend: `npm install` then `node index.js`
   - Frontend: `npm install && npm run build` with publish dir `build`
   - AI Service: `pip install -r requirements.txt` then `gunicorn --bind 0.0.0.0:${PORT:-3000} app:app`
2. Run commands locally to verify they work
3. Check for any syntax errors in code
4. Look at full build logs in Render dashboard

### Problem: Service Keeps Restarting (Crash Loop)

**Indicator:** Service shows "Restarting" in Render dashboard

**Solution:**
1. Check Render logs for error message
2. Ensure PORT environment variable is used:
   - Node: `process.env.PORT || 5000`
   - Python: `${PORT:-3000}` in gunicorn command
3. Verify all environment variables are set correctly
4. If on free tier, upgrade to paid tier
5. Check if database connection is failing (see Database Issues section)

---

## Frontend Issues

### Problem: Blank Page / 404 Not Found

**Symptoms:** 
- Visit https://railway-track.onrender.com → blank page or 404
- Browser console shows no errors

**Solution:**
1. Verify static site configuration:
   - Root Directory: `client`
   - Publish Directory: `build`
   - Build Command: `npm install && npm run build`
2. Check that `build/` folder is created locally:
   ```bash
   cd client
   npm install
   npm run build
   ```
3. Verify `build/index.html` exists locally
4. Redeploy after verifying locally

### Problem: API Calls Return 404 / Network Error

**Symptoms:**
- Login page loads
- Click login → network error in console
- Console shows "Failed to fetch"

**Causes:**
- Wrong API URL in frontend environment variables
- Backend not running
- CORS issues

**Solutions:**

1. **Verify REACT_APP_API_URL:**
   ```
   Should be: https://railway-track-backend.onrender.com/api
   NOT: http://localhost:5000/api
   NOT: https://railway-track-backend.onrender.com (missing /api)
   ```

2. **Check backend health:**
   - Visit https://railway-track-backend.onrender.com/health
   - Should return: `{"status":"UP"}`
   - If 404, backend isn't running

3. **Check browser console for errors:**
   - Open DevTools (F12)
   - Go to Network tab
   - Try login, see what request fails
   - Check Response tab for actual error

4. **Verify frontend environment variables:**
   - In Render dashboard → Frontend service → Environment
   - Confirm REACT_APP_API_URL and REACT_APP_SOCKET_URL are set

### Problem: CORS Error in Browser Console

**Error Message:** `Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy`

**Solution:**
1. Check backend CORS_ORIGIN environment variable:
   ```
   CORS_ORIGIN=https://railway-track.onrender.com
   ```
2. Ensure it matches frontend URL exactly
3. If frontend URL changed, update CORS_ORIGIN and redeploy backend
4. Verify cors middleware in server/index.js is configured

### Problem: "Cannot read properties of undefined" in Console

**Cause:** Frontend trying to access backend data that returns error

**Solution:**
1. Check API response in Network tab (DevTools → Network tab → click request → Response)
2. Look for error message from backend
3. Fix backend issue (see Backend Issues section)

---

## Backend Issues

### Problem: Application Starts but Cannot Connect to Database

**Error Message:** `MongoDB connection error` or `ECONNREFUSED`

**Console Logs:** Service shows "Server is running" but "MongoDB connection failed"

**Solutions:**

1. **Verify DATABASE_URL:**
   - Go to backend environment variables in Render
   - Confirm DATABASE_URL is set correctly
   - Format should be: `mongodb+srv://user:password@cluster.mongodb.net/database?retryWrites=true&w=majority`

2. **Test connection locally:**
   ```bash
   # Create test.js
   const mongoose = require('mongoose');
   mongoose.connect(process.env.DATABASE_URL).then(() => {
     console.log('Connected!');
     process.exit(0);
   }).catch(err => {
     console.log('Error:', err.message);
     process.exit(1);
   });
   
   # Run with:
   DATABASE_URL="your-url" node test.js
   ```

3. **Check MongoDB Atlas:**
   - Login to MongoDB Atlas
   - Go to Network Access
   - Verify 0.0.0.0/0 is whitelisted (allows all IPs)
   - If not, click Add IP Address → Allow Anywhere

4. **Check credentials in DATABASE_URL:**
   - Username and password must match MongoDB Atlas user
   - Check for special characters (encode them)
   - Example: if password is `pass@word`, in URL use `pass%40word`

5. **Verify database connection parameters:**
   ```
   - retryWrites=true
   - w=majority
   - Correct database name
   ```

### Problem: Health Check Endpoint Returns 404

**Visiting:** https://railway-track-backend.onrender.com/health → 404

**Cause:** Backend service isn't running

**Solutions:**
1. Check Render logs for startup errors
2. Verify PORT is set in environment variables (should be auto-assigned)
3. Verify node version is compatible (16+ recommended)
4. Check if service has been deployed at least once
5. Check for syntax errors in server/index.js

### Problem: API Routes Return 404

**Error:** `GET /api/auth/login` returns 404

**Cause:**
- Routes not mounted correctly
- Wrong root directory
- Base path issue

**Solutions:**
1. Verify root directory in Render is `server`
2. Check server/index.js has all route definitions:
   ```javascript
   app.use('/api/auth', require('./routes/auth'));
   app.use('/api/qr', require('./routes/qr'));
   // ... all other routes
   ```
3. Verify route files exist in server/routes/
4. Check for typos in route paths

### Problem: 500 Internal Server Error

**Error Message:** Response = `{"message":"Something went wrong"}`

**Solutions:**
1. Check Render logs (Logs tab) for detailed error
2. Set `NODE_ENV=production` in environment variables
3. Look for:
   - Database query errors
   - Undefined variables
   - Missing dependencies
   - Syntax errors
4. Test locally with same environment variables:
   ```bash
   NODE_ENV=production DATABASE_URL="..." npm run dev
   ```

### Problem: Authentication Token Not Working

**Symptoms:** Login works but subsequent requests return 401 Unauthorized

**Solutions:**
1. Verify JWT_SECRET is set in backend environment variables
2. Ensure same JWT_SECRET across deployments (don't regenerate)
3. Check frontend sends Authorization header:
   ```
   Authorization: Bearer <token>
   ```
4. Verify JWT_EXPIRES_IN is reasonable value (e.g., `7d`)

---

## Database Issues

### Problem: "Cannot Connect" Despite Correct Connection String

**Solutions:**

1. **Restart MongoDB Atlas cluster:**
   - Go to MongoDB Atlas
   - Click on cluster
   - Click "Restart" button

2. **Check IP Whitelist:**
   - Go to MongoDB Atlas → Security → Network Access
   - Click Edit on the whitelist entry
   - Must be `0.0.0.0/0` (allows all IPs)
   - If not, add 0.0.0.0/0

3. **Verify database user exists:**
   - Go to Database Access
   - Confirm `railwayuser` (or your username) is listed
   - Confirm password is correct

4. **Test connection string format:**
   ```
   mongodb+srv://railwayuser:PASSWORD@cluster-name.xxxxx.mongodb.net/railway-track?retryWrites=true&w=majority
   ```
   - Replace PASSWORD with actual password
   - If password has special chars, URL encode them

### Problem: Database Appears Empty (No Collections)

**Cause:** First deployment hasn't created data yet

**Solution:**
1. Collections are created on first use
2. Try logging in or creating data
3. If collections don't appear after use:
   - Check MongoDB Atlas database on Web for actual data
   - Run database migration scripts if provided

### Problem: "Unauthorized" When Checking MongoDB

**Cause:** Wrong credentials

**Solutions:**
1. Verify username matches
2. Verify password is correct (case-sensitive)
3. If password forgotten, create new user in MongoDB Atlas:
   - Security → Database Access → Add New Database User

---

## Service Communication Issues

### Problem: AI Service Not Responding

**Error in Backend Logs:** `Cannot reach AI service` or timeout

**Solutions:**
1. Verify AI_SERVICE_URL in backend environment variables:
   ```
   AI_SERVICE_URL=https://railway-track-ai.onrender.com
   (NOT: http://localhost:5002)
   ```

2. Check AI service is running:
   - Visit https://railway-track-ai.onrender.com/health (if endpoint exists)
   - Check Render logs for AI service

3. Verify AI service has correct environment variables:
   ```
   FLASK_ENV=production
   FLASK_DEBUG=False
   ```

4. Check Python version compatibility (3.8+)

### Problem: Frontend Cannot Reach Backend

**Error:** Network timeout or "Connection refused"

**Solutions:**
1. Verify REACT_APP_API_URL in frontend environment:
   ```
   REACT_APP_API_URL=https://railway-track-backend.onrender.com/api
   ```

2. Backend must be deployed and running
3. Check backend logs for errors
4. Verify backend health: https://railway-track-backend.onrender.com/health

### Problem: Socket.io Connection Fails

**Symptoms:** Real-time features don't work, console shows Socket.io errors

**Solutions:**
1. Verify REACT_APP_SOCKET_URL in frontend:
   ```
   REACT_APP_SOCKET_URL=https://railway-track-backend.onrender.com
   ```

2. Verify backend Socket.io configuration in server/index.js:
   ```javascript
   const io = new Server(server, {
     cors: {
       origin: process.env.CLIENT_URL,
       methods: ["GET", "POST"]
     }
   });
   ```

3. Check CORS settings match CLIENT_URL in backend

---

## Environment & Configuration Issues

### Problem: Environment Variables Not Taking Effect

**Symptom:** Changed variable in Render, but service still uses old value

**Solution:**
1. **Redeploy after changing env vars:**
   - Go to service
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or wait for automatic redeploy

2. **Clear browser cache:**
   - Refresh frontend (Ctrl+Shift+R)
   - Clear LocalStorage if needed

### Problem: "PORT" Not Recognized

**Error:** `Error: listen EADDRINUSE :::5000` or similar

**Solution:**
1. Server code must use PORT from environment:
   ```javascript
   const PORT = process.env.PORT || 5000;
   ```

2. Render sets PORT automatically, don't override it

### Problem: "Cannot Find Build Directory"

**Symptom:** Frontend deployment fails, "build directory not found"

**Solution:**
1. Verify build command creates `build/` folder:
   ```bash
   cd client
   npm install
   npm run build
   ls build/  # Should show index.html
   ```

2. Verify Publish Directory is exactly: `build`
3. Verify Root Directory is: `client`

### Problem: Wrong Environment Variable Format

**Symptoms:** Service starts but wrong config, errors about missing vars

**Common Mistakes:**
- ❌ DATABASE_URL with spaces before/after
- ❌ CORS_ORIGIN with http instead of https
- ❌ AI_SERVICE_URL with port 5002 instead of /
- ❌ API_URL without /api suffix
- ✅ Correctly formatted with proper protocol and path

---

## Quick Diagnostic Checklist

When something doesn't work:

1. [ ] Check Render dashboard logs (most important!)
2. [ ] Verify all environment variables are set
3. [ ] Confirm MongoDB connection works
4. [ ] Test each service URL in browser:
   - Frontend: https://railway-track.onrender.com
   - Backend health: https://railway-track-backend.onrender.com/health
   - AI service: Logs in Render dashboard
5. [ ] Check browser console (F12) for frontend errors
6. [ ] Verify GitHub repository has latest code
7. [ ] Look for typos in URLs and variable names

---

## Getting Help

If issue persists:

1. **Check logs:** Render dashboard → Service → Logs tab (most detailed)
2. **Verify locally:** Does it work when running `npm run dev`?
3. **Check configuration:** Are all env vars set correctly?
4. **Review error message:** Google the specific error message
5. **Check documentation:** 
   - RENDER_DEPLOYMENT.md
   - Render docs: https://render.com/docs
   - MongoDB Atlas docs: https://docs.atlas.mongodb.com

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | Cannot connect to database | Check DATABASE_URL, MongoDB IP whitelist |
| `MongoServerError: connect ECONNREFUSED` | MongoDB not responding | Restart MongoDB cluster, check connection |
| `UnauthorizedError` | Wrong JWT secret | Verify JWT_SECRET matches across services |
| `CORS error` | Frontend origin not allowed | Update CORS_ORIGIN, redeploy backend |
| `404 Not Found` | Route doesn't exist | Check route is defined and mounted |
| `EADDRINUSE` | Port already in use | Render assigns PORT, don't hardcode it |
| `Module not found` | Dependency missing | Add to package.json or requirements.txt |
| `SyntaxError` | Code has errors | Fix syntax, redeploy |

---

**Still stuck?** Check Render's official documentation or create an issue on GitHub!
