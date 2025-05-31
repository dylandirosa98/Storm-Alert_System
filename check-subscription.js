const Database = require('./database');

async function checkSubscription() {
    const db = new Database();
    await db.initialize();
    
    const email = 'dylandirosa980@gmail.com';
    console.log('🔍 Checking subscription status for:', email);
    console.log('='.repeat(50));
    
    // Check if company exists
    const company = await db.getCompanyByEmail(email);
    if (company) {
        console.log('✅ Company found in database:');
        console.log(`   Name: ${company.company_name}`);
        console.log(`   Email: ${company.email}`);
        console.log(`   States: ${company.states}`);
        console.log(`   Active: ${company.active ? 'Yes' : 'No'}`);
        console.log(`   Created: ${company.created_at}`);
    } else {
        console.log('❌ No company found for this email');
    }
    
    // Check if unsubscribed
    const isUnsubscribed = await db.isUnsubscribed(email);
    console.log(`\n📧 Unsubscribed: ${isUnsubscribed ? 'Yes' : 'No'}`);
    
    // Check recent storm events that should have triggered emails
    console.log('\n🌩️ Recent storm events in database:');
    const recentStorms = await new Promise((resolve, reject) => {
        db.db.all(`
            SELECT * FROM storm_events 
            WHERE created_at > datetime('now', '-2 days')
            ORDER BY created_at DESC 
            LIMIT 10
        `, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
    
    if (recentStorms.length > 0) {
        recentStorms.forEach((storm, index) => {
            const data = JSON.parse(storm.event_data);
            console.log(`   ${index + 1}. ${storm.state} - ${storm.severity} - Worth canvassing: ${data.worthCanvassing}`);
            console.log(`      Time: ${storm.created_at}`);
        });
    } else {
        console.log('   No storm events in last 2 days');
    }
    
    process.exit(0);
}

checkSubscription().catch(console.error); 