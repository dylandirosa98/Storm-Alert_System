# Database Backup & Restore System

## Current Status: Semi-Automated ⚠️

Your Storm Alert System has a **semi-automated** backup system. Here's what happens:

### What's Automated ✅
- **Automatic backup creation** when companies are added to the database
- **Automatic restore** on startup when `DB_BACKUP` environment variable is set
- **Migration endpoint** available at `/api/migrate-database` showing current backup data

### What's Manual ❌  
- Updating backup data before Railway deployments
- Setting the `DB_BACKUP` environment variable with new data

## Quick Backup Process

### Option 1: Use the Automation Script (Fastest)
1. **Find your Railway URL** in your Railway dashboard
2. **Update the script**: Edit `pre-deploy-backup.js` and add your correct Railway URL to the `POSSIBLE_URLS` array
3. **Run the script**: `node pre-deploy-backup.js`
4. **Copy the backup data** from the output
5. **Update Railway**: Go to Railway → Variables → Update `DB_BACKUP` with the copied data
6. **Deploy** your changes

### Option 2: Manual Process
1. **Visit**: `[YOUR_RAILWAY_URL]/api/migrate-database`
2. **Copy** the backup JSON data from the page
3. **Update Railway**: Go to Railway → Variables → Update `DB_BACKUP` with the copied data  
4. **Deploy** your changes

## How It Works

```
🏠 Local Database (subscribers) 
     ↓ (automatic backup on add)
📦 Backup JSON 
     ↓ (manual copy to Railway)
☁️ Railway Environment Variable (DB_BACKUP)
     ↓ (automatic restore on startup)
🏠 Restored Database (subscribers preserved)
```

## Files Involved

- `database.js` - Contains backup/restore logic
- `server.js` - Migration endpoint (`/api/migrate-database`)
- `pre-deploy-backup.js` - Automation script (needs your Railway URL)

## Next Steps for Full Automation

To make this 100% automated, we'd need to:
1. Use Railway's API to automatically update environment variables
2. Add Railway CLI integration
3. Create a pre-deploy hook

For now, the semi-automated process takes about 30 seconds before each deployment. 