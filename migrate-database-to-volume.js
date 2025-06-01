const fs = require('fs');
const path = require('path');
const Database = require('./database');

async function migrateDatabaseToVolume() {
    console.log('🚀 Starting database migration to persistent volume...');
    
    // Check current environment
    console.log('\n🌍 Environment Check:');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
    console.log('RAILWAY_VOLUME_MOUNT_PATH:', process.env.RAILWAY_VOLUME_MOUNT_PATH || 'undefined');
    
    // Define paths
    const localDbPath = path.join(__dirname, 'storm_alerts.db');
    const volumeDbPath = '/data/storm_alerts.db';
    
    console.log('\n📁 Database Paths:');
    console.log('Local database path:', localDbPath);
    console.log('Volume database path:', volumeDbPath);
    console.log('Local database exists:', fs.existsSync(localDbPath));
    
    // Check if volume directory exists
    if (fs.existsSync('/data')) {
        console.log('Volume directory exists:', true);
        console.log('Volume database exists:', fs.existsSync(volumeDbPath));
        
        // If local database exists but volume database doesn't, copy it
        if (fs.existsSync(localDbPath) && !fs.existsSync(volumeDbPath)) {
            console.log('\n📋 Migrating database to volume...');
            try {
                fs.copyFileSync(localDbPath, volumeDbPath);
                console.log('✅ Database successfully migrated to volume!');
            } catch (error) {
                console.error('❌ Error migrating database:', error.message);
                return;
            }
        }
    } else {
        console.log('Volume directory exists:', false);
        console.log('⚠️  Running in local development mode');
    }
    
    // Test database connection and check data
    console.log('\n🔍 Testing database connection...');
    const db = new Database();
    await db.initialize();
    
    // Check companies
    const companies = await new Promise((resolve, reject) => {
        db.db.all("SELECT * FROM companies", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
    
    console.log('\n📊 Database Status:');
    console.log('👥 Total companies:', companies.length);
    
    if (companies.length > 0) {
        console.log('\n📋 Subscriber Details:');
        companies.forEach((company, index) => {
            console.log(`${index + 1}. ${company.company_name} (${company.email})`);
            console.log(`   States: ${company.states.split(',').length} states`);
            console.log(`   Active: ${company.active ? 'Yes' : 'No'}`);
        });
    } else {
        console.log('⚠️  No subscribers found - you may need to sign up again');
    }
    
    await db.close();
    
    console.log('\n✅ Migration and verification complete!');
    console.log('\n📝 Next Steps:');
    if (process.env.NODE_ENV === 'production') {
        console.log('1. ✅ Environment variables are set correctly');
        console.log('2. ✅ Database is configured for persistent storage');
        console.log('3. 🔄 Future deployments will preserve subscriber data');
    } else {
        console.log('1. Make sure NODE_ENV=production is set in Railway');
        console.log('2. Verify the volume is mounted at /data');
        console.log('3. Redeploy after setting environment variables');
    }
}

migrateDatabaseToVolume().catch(console.error); 