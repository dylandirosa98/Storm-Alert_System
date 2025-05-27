# 🚀 Railway Deployment Guide - Storm Alert System

## 📋 Pre-Deployment Checklist

✅ **Project Files Ready:**
- `package.json` - Updated with all dependencies
- `railway.json` - Railway configuration
- `Procfile` - Process definition
- `.gitignore` - Excludes unnecessary files
- `README.md` - Project documentation

✅ **Code Optimized:**
- Removed helmet dependency
- Updated port handling for Railway
- All dependencies properly listed
- Server starts successfully locally

## 🌐 Railway Deployment Steps

### 1. **Create Railway Account**
- Go to [railway.app](https://railway.app)
- Sign up with GitHub (recommended)
- Verify your account

### 2. **Prepare Your Repository**
```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit - Storm Alert System ready for Railway"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/storm-alert-system.git
git branch -M main
git push -u origin main
```

### 3. **Deploy to Railway**
1. **Login to Railway Dashboard**
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your storm-alert-system repository**
5. **Railway will automatically detect it's a Node.js app**

### 4. **Configure Environment Variables**
In Railway dashboard:
1. Go to your project
2. Click "Variables" tab
3. Add these variables:
   ```
   NODE_ENV=production
   ```
   *(PORT is automatically set by Railway)*

### 5. **Monitor Deployment**
- Railway will automatically build and deploy
- Check the "Deployments" tab for progress
- View logs in the "Logs" tab

## 🔧 Post-Deployment Configuration

### **Get Your Railway URL**
- Railway will provide a URL like: `https://your-app-name.railway.app`
- Your storm alert system will be accessible at this URL

### **Test Your Deployment**
1. **Visit your Railway URL** - Should show the landing page
2. **Check health endpoint**: `https://your-app.railway.app/api/health`
3. **Test storm check**: `https://your-app.railway.app/api/test-storm-check`

### **Verify Cron Job is Running**
- Check Railway logs for "Running storm check..." every 5 minutes
- Monitor for any error messages

## 📊 Monitoring Your System

### **Railway Dashboard Features:**
- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: Deployment history and status
- **Variables**: Environment variable management

### **Key Logs to Monitor:**
```
✅ "Database initialized successfully"
✅ "Storm Alert System running on..."
✅ "Running storm check..." (every 5 minutes)
✅ "Email sent successfully: { id: '...' }"
```

## 🚨 Troubleshooting

### **Common Issues:**

**1. Build Failures:**
- Check package.json dependencies
- Ensure all files are committed to git
- Review Railway build logs

**2. Database Issues:**
- SQLite will be recreated on Railway
- Check database initialization in logs

**3. Email Issues:**
- Verify Resend API key is working
- Check email service logs

**4. Cron Job Not Running:**
- Check for JavaScript errors in logs
- Verify weather API connectivity

## 🎯 Success Indicators

✅ **Deployment Successful When:**
- Railway shows "Deployed" status
- Health endpoint returns 200 OK
- Landing page loads correctly
- Cron job logs appear every 5 minutes
- Test emails send successfully

## 🔄 Updating Your Deployment

```bash
# Make changes to your code
git add .
git commit -m "Update: description of changes"
git push

# Railway automatically redeploys on git push
```

## 📈 Scaling (If Needed)

Railway offers:
- **Automatic scaling** based on traffic
- **Resource monitoring** and alerts
- **Custom domains** for professional URLs
- **Team collaboration** features

## 🎉 Your Storm Alert System is Now Live 24/7!

Once deployed on Railway:
- ✅ **24/7 Operation** - No need to keep your computer on
- ✅ **Automatic Restarts** - If the app crashes, Railway restarts it
- ✅ **Professional URL** - Share with potential customers
- ✅ **Real-time Monitoring** - Track performance and usage
- ✅ **Scalable Infrastructure** - Handles increased traffic automatically

Your storm alert system will now monitor severe weather across all 50 states continuously and send real-time alerts to subscribers! 