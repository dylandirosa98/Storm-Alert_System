const Database = require('./database');
const path = require('path');
const fs = require('fs');

async function verifyDatabasePersistence() {
    console.log('🔍 Verifying database persistence...');
    
    // Check both possible database paths
    const localPath = path.join(__dirname, 'storm_alerts.db');
    const productionPath = '/data/storm_alerts.db';
    
    console.log('\n📁 Checking database locations:');
    console.log('Local path:', localPath);
    console.log('Local database exists:', fs.existsSync(localPath));
    console.log('Production path:', productionPath);
    console.log('Production database exists:', fs.existsSync(productionPath));
    
    // Initialize database
    const db = new Database();
    await db.initialize();
    
    // Check companies table
    const companies = await new Promise((resolve, reject) => {
        db.db.all("SELECT * FROM companies", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
    
    console.log('\n📊 Database Contents:');
    console.log('👥 Number of companies:', companies.length);
    if (companies.length > 0) {
        console.log('\n📋 Company Details:');
        companies.forEach(company => {
            console.log(`\nCompany: ${company.company_name}`);
            console.log(`Email: ${company.email}`);
            console.log(`States: ${company.states}`);
            console.log(`Active: ${company.active ? 'Yes' : 'No'}`);
        });
    }
    
    // Check environment
    console.log('\n🌍 Environment:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('RAILWAY_VOLUME_MOUNT_PATH:', process.env.RAILWAY_VOLUME_MOUNT_PATH);
    
    await db.close();
}

verifyDatabasePersistence().catch(console.error); 