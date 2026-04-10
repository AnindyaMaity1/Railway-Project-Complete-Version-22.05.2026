# Render Deployment Guide - Railway Track QR System

## Overview
This guide will help you deploy the entire Railway Track QR System to Render with:
- **Frontend** - React app served on Render static site
- **Backend** - Node.js/Express API on Render web service
- **AI Service** - Python Flask service on Render web service
- **Database** - MongoDB Atlas (free tier)

## Prerequisites
1. GitHub account with your project repository
2. Render account (https://render.com)
3. MongoDB Atlas account (https://www.mongodb.com/cloud/atlas)
4. A new git repository with your code

## Step 1: Setup MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new project and cluster
4. Get your connection string:
   - Click "Connect" → "Connect your application"
   - Copy the MongoDB URI: `mongodb+srv://username:password@cluster.mongodb.net/railway-track?retryWrites=true&w=majority`
5. Note the connection string for later

## Step 2: Prepare Your GitHub Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit for Render deployment"

# Create repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/railway-track.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy Backend on Render

### 3.1 Create Backend Service
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `railway-track-backend`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Environment**: Node
   - **Plan**: Free (or Paid for better performance)

### 3.2 Set Environment Variables
In the Render dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=mongodb+srv://username:password@your-cluster.mongodb.net/railway-track?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-secret-key-change-this-12345
JWT_EXPIRES_IN=7d
SERVER_BASE_URL=https://railway-track-backend.onrender.com
AI_SERVICE_URL=https://railway-track-ai.onrender.com
CLIENT_URL=https://railway-track.onrender.com
CORS_ORIGIN=https://railway-track.onrender.com
NODE_ENV=production
```

### 3.3 Update Backend Code for Production
You'll need to update [server/index.js](#) to:
- Use MongoDB Atlas connection string
- Enable CORS properly
- Use Render's environment variables

## Step 4: Deploy Frontend on Render

### 4.1 Create Frontend Service
1. Go to https://dashboard.render.com
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `railway-track`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

### 4.2 Add Environment Variables
In the dashboard, set:
```
REACT_APP_API_URL=https://railway-track-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://railway-track-backend.onrender.com
```

## Step 5: Deploy AI Service on Render

### 5.1 Create AI Service
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `railway-track-ai`
   - **Root Directory**: `ai-service`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:3000 app:app`
   - **Environment**: Python 3

### 5.2 Set Environment Variables
```
FLASK_ENV=production
FLASK_DEBUG=False
```

## Step 6: Update Configuration Files

### Update server/index.js
Ensure proper CORS configuration:
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
```

### Update client/.env.production
```
REACT_APP_API_URL=https://railway-track-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://railway-track-backend.onrender.com
```

## Step 7: First Deployment Checklist

- [ ] MongoDB Atlas database created and connection string obtained
- [ ] GitHub repository created and all code pushed
- [ ] Backend service created on Render
- [ ] AI Service created on Render
- [ ] Frontend static site created on Render
- [ ] All environment variables set correctly
- [ ] Database migrations run (if needed)
- [ ] Admin user created in database
- [ ] CORS settings verified

## Step 8: Post-Deployment Steps

1. **Test the deployment**:
   - Visit `https://railway-track.onrender.com`
   - Try logging in with credentials
   - Test QR code generation
   - Check AI service integration

2. **Monitor logs**:
   - In Render dashboard, check service logs for errors
   - Fix any connection or configuration issues

3. **Database initialization**:
   - Run any database setup scripts if needed
   - Create initial admin user

## Troubleshooting

### "Cannot GET /api/..."
- Check if backend service is running
- Verify `REACT_APP_API_URL` in frontend
- Check CORS configuration in backend

### "Cannot connect to database"
- Verify MongoDB URI is correct
- Check if MongoDB Atlas IP whitelist includes Render IPs
- MongoDB Atlas: go to Security → Network Access and add "0.0.0.0/0"

### AI Service not responding
- Check if service is running
- Verify `AI_SERVICE_URL` in backend configuration
- Check AI service logs in Render dashboard

### Build failures
- Check root directory setting matches your folder structure
- Verify all dependencies listed in package.json or requirements.txt
- Review build logs in Render dashboard

## Environment Variables Summary

### Backend
- `NODE_ENV`: production
- `PORT`: 3000 (Render assigns this)
- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: Secure random string
- `JWT_EXPIRES_IN`: Token expiry (e.g., 7d)
- `CLIENT_URL`: Frontend URL
- `SERVER_BASE_URL`: Backend URL
- `AI_SERVICE_URL`: AI service URL
- `CORS_ORIGIN`: Frontend URL

### Frontend
- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_SOCKET_URL`: Backend Socket.io URL

### AI Service
- `FLASK_ENV`: production
- `FLASK_DEBUG`: False

## Security Considerations

1. **Change default credentials**: Update admin username/password
2. **Set strong JWT_SECRET**: Use a complex random string
3. **Enable MongoDB authentication**: Use strong password
4. **HTTPS only**: Render provides free SSL
5. **Rate limiting**: Already configured in backend
6. **Environment variables**: Never commit secrets to GitHub

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## Support

For issues, check:
1. Render dashboard logs
2. MongoDB Atlas logs
3. GitHub Issues in your repository
