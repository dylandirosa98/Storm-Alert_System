const Database = require('./database');

async function seedRailwayDatabase() {
    console.log('🌱 SEEDING RAILWAY DATABASE');
    console.log('==========================\n');

    try {
        const db = new Database();
        await db.initialize();
        
        console.log('📊 Adding your company subscription...');
        
        // Add your company with all 50 states
        const allStates = [
            'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 
            'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 
            'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 
            'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 
            'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 
            'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 
            'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 
            'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
            'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 
            'West Virginia', 'Wisconsin', 'Wyoming'
        ];

        const companyData = {
            company_name: 'Dylan DiRosa',
            email: 'dylandirosa980@gmail.com',
            phone: '555-0123',
            states: allStates.join(','),
            active: 1
        };

        const companyId = await db.addCompany(companyData);
        console.log(`✅ Added company: ${companyData.company_name}`);
        console.log(`   Email: ${companyData.email}`);
        console.log(`   States: All 50 states`);
        console.log(`   Company ID: ${companyId}`);

        // Verify the subscription
        const subscribedStates = await db.getSubscribedStates();
        console.log(`\n📍 Verification: ${subscribedStates.length} states now subscribed`);
        
        if (subscribedStates.length === 50) {
            console.log('🎉 SUCCESS: Database seeded correctly!');
            console.log('   Your Railway deployment will now monitor all 50 states');
            console.log('   Next cron job (in ~5 minutes) should show:');
            console.log('   "📍 Checking 50 subscribed states"');
        } else {
            console.log('⚠️ Warning: Expected 50 states, got', subscribedStates.length);
        }

        console.log('\n🚀 NEXT STEPS:');
        console.log('1. Wait for next cron job (every 5 minutes)');
        console.log('2. Check Railway logs for "Checking 50 subscribed states"');
        console.log('3. System will now send real storm alerts!');

    } catch (error) {
        console.error('❌ Error seeding database:', error.message);
    }
}

// Run the seeder
seedRailwayDatabase().catch(console.error); 