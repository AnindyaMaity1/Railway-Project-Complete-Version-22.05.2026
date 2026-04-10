# Quick Reference - Render Service Configuration

## SERVICE 1: Backend (railway-track-backend)

**Type:** Web Service  
**Root Directory:** server  
**Runtime:** Node  
**Build Command:** npm install  
**Start Command:** node index.js  

### Environment Variables:
```
NODE_ENV=production
PORT=3000
DATABASE_URL=mongodb+srv://username:password@your-cluster.mongodb.net/railway-track?retryWrites=true&w=majority
JWT_SECRET=[Generated secure random string]
JWT_EXPIRES_IN=7d
CLIENT_URL=https://railway-track.onrender.com
CORS_ORIGIN=https://railway-track.onrender.com
SERVER_BASE_URL=https://railway-track-backend.onrender.com
AI_SERVICE_URL=https://railway-track-ai.onrender.com
UPLOAD_PATH=/tmp/uploads
```

---

## SERVICE 2: Frontend (railway-track)

**Type:** Static Site  
**Root Directory:** client  
**Build Command:** npm install && npm run build  
**Publish Directory:** build  

### Environment Variables:
```
REACT_APP_API_URL=https://railway-track-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://railway-track-backend.onrender.com
```

---

## SERVICE 3: AI Service (railway-track-ai)

**Type:** Web Service  
**Root Directory:** ai-service  
**Runtime:** Python 3  
**Build Command:** pip install -r requirements.txt  
**Start Command:** gunicorn --bind 0.0.0.0:3000 app:app  

### Environment Variables:
```
FLASK_ENV=production
FLASK_DEBUG=False
```

---

## MONGODB ATLAS SETUP

1. Go to https://www.mongodb.com/cloud/atlas
2. Create cluster (Free tier available)
3. Create database user
4. Get connection string format:
   ```
   mongodb+srv://username:password@cluster-name.mongodb.net/database-name?retryWrites=true&w=majority
   ```
5. **IMPORTANT:** Security → Network Access → Add 0.0.0.0/0 to allow Render IPs

---

## GIT SETUP

```bash
# Move to your project directory
cd d:/RailWay-Track-Project\ Complete\ Version\ Final/RailWay-Track

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial Railway Track QR System commit"

# Add remote (replace with your actual GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/railway-track-qr.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## RENDERING SERVICES URLs (AFTER DEPLOYMENT)

- **Frontend:** https://railway-track.onrender.com
- **Backend API:** https://railway-track-backend.onrender.com
- **Backend Health Check:** https://railway-track-backend.onrender.com/health
- **AI Service:** https://railway-track-ai.onrender.com

---

## TESTING POST-DEPLOYMENT

1. **Check Frontend:**
   - Visit https://railway-track.onrender.com
   - Login page should load
   - Check browser console (F12) for errors

2. **Check Backend:**
   - Visit https://railway-track-backend.onrender.com/health
   - Should return: `{"status":"UP"}`
   - Check API logs in Render dashboard

3. **Check Database:**
   - Backend logs should show "Connected to MongoDB successfully"
   - If not, check DATABASE_URL and MongoDB Atlas whitelist

4. **Login Test:**
   - Default credentials: admin / admin123
   - If login fails, check backend logs
   - Verify MongoDB has data

5. **AI Service:**
   - Backend should connect to AI service
   - Check AI service logs in Render dashboard

---

## TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Build fails | Check root directory, verify package.json exists |
| Cannot connect to MongoDB | Verify connection string, check MongoDB Atlas IP whitelist |
| CORS errors | Verify CORS_ORIGIN and CLIENT_URL match your domains |
| 404 on API calls | Check REACT_APP_API_URL in frontend |
| Deployment stuck | Check Render logs, may be waiting for database |
| Free tier timeout | Upgrade to paid plan, implement keep-alive |

---

## EXAMPLE JWT_SECRET GENERATION

**Windows (PowerShell):**
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Linux/Mac:**
```bash
openssl rand -base64 32
```

---

## MONITORING & LOGS

1. Go to Render dashboard: https://dashboard.render.com
2. Click on each service
3. View "Logs" tab
4. Look for:
   - MongoDB connection success
   - Server started on correct port
   - No unhandled errors

---

## SECURITY CHECKLIST

- [ ] Generate unique, strong JWT_SECRET
- [ ] Change default admin password after first login
- [ ] Set strong MongoDB password
- [ ] Ensure HTTPS everywhere (Render provides free SSL)
- [ ] Check MongoDB Atlas IP whitelist
- [ ] Never commit .env files with secrets
- [ ] Use environment variables for all sensitive data

---

## NEED HELP?

- Render Docs: https://render.com/docs
- MongoDB Atlas Help: https://docs.atlas.mongodb.com
- Check logs in Render dashboard for specific errors
- Review RENDER_DEPLOYMENT.md for detailed instructions
