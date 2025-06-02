const https = require('https');
const http = require('http');

// Common Railway URL patterns - update with your actual URL
const POSSIBLE_URLS = [
    process.env.RAILWAY_APP_URL,
    'https://storm-alert-system-production.up.railway.app',
    'https://storm-alert-system-production-7dba.up.railway.app',
    'https://storm-alert-system.up.railway.app',
    'https://web-production-7dba.up.railway.app'
].filter(Boolean);

async function fetchBackupData(url) {
    return new Promise((resolve, reject) => {
        const fullUrl = new URL('/api/migrate-database', url);
        const client = fullUrl.protocol === 'https:' ? https : http;
        
        const req = client.get(fullUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.status === 'error') {
                        reject(new Error(`API Error: ${response.message}`));
                        return;
                    }
                    if (response.backup) {
                        resolve(JSON.stringify(response.backup));
                    } else {
                        reject(new Error('No backup data found in response'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function tryMultipleUrls() {
    for (const url of POSSIBLE_URLS) {
        try {
            console.log(`📡 Trying: ${url}/api/migrate-database`);
            const backupData = await fetchBackupData(url);
            return { url, backupData };
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
        }
    }
    throw new Error('No working URL found');
}

async function main() {
    try {
        console.log('🔄 Fetching current database backup...');
        console.log('🔍 Searching for your Railway app...\n');
        
        const { url, backupData } = await tryMultipleUrls();
        
        console.log(`\n✅ Connected to: ${url}`);
        console.log('✅ Backup data retrieved successfully!');
        console.log('\n📋 COPY THIS BACKUP DATA:');
        console.log('=' .repeat(80));
        console.log(backupData);
        console.log('=' .repeat(80));
        
        console.log('\n🚀 NEXT STEPS FOR RAILWAY DEPLOYMENT:');
        console.log('1. Copy the backup data above');
        console.log('2. Go to Railway dashboard → Your project → Variables');
        console.log('3. Update the DB_BACKUP environment variable with the copied data');
        console.log('4. Deploy your changes');
        console.log('\n💡 The system will automatically restore your subscribers on startup!');
        
    } catch (error) {
        console.error('\n❌ Could not fetch backup data from any URL');
        console.log('\n🔧 MANUAL BACKUP PROCESS:');
        console.log('1. Find your Railway app URL in the Railway dashboard');
        console.log('2. Visit: [YOUR_APP_URL]/api/migrate-database');
        console.log('3. Copy the backup data from that page');
        console.log('4. Update DB_BACKUP environment variable in Railway');
        console.log('5. Deploy your changes');
        
        console.log('\n🔧 OR UPDATE THE SCRIPT:');
        console.log('Add your correct Railway URL to the POSSIBLE_URLS array in this script');
    }
}

if (require.main === module) {
    main();
}

module.exports = { fetchBackupData, tryMultipleUrls };
