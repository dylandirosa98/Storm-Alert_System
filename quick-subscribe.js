const Database = require('./database');

async function quickSubscribe() {
    const db = new Database();
    await db.initialize();
    
    const subscriptionData = {
        companyName: 'Dylan\'s Roofing Company',
        email: 'dylandirosa980@gmail.com',
        phone: '555-123-4567',
        contactName: 'Dylan',
        states: 'Florida,Texas,Oklahoma,Louisiana,Alabama,Georgia,North Carolina,South Carolina,Tennessee,Arkansas,Missouri,Kansas'
    };
    
    console.log('🚀 Resubscribing to storm alerts...');
    console.log(`Email: ${subscriptionData.email}`);
    console.log(`Company: ${subscriptionData.companyName}`);
    console.log(`States: ${subscriptionData.states}`);
    
    try {
        const companyId = await db.addCompany(subscriptionData);
        console.log('✅ Successfully subscribed!');
        console.log(`Company ID: ${companyId}`);
        console.log('You will now receive storm alerts for severe weather in your selected states.');
        
        // Verify subscription
        const company = await db.getCompanyByEmail(subscriptionData.email);
        if (company) {
            console.log('\n📋 Subscription confirmed:');
            console.log(`   Company: ${company.company_name}`);
            console.log(`   States: ${company.states}`);
            console.log(`   Active: ${company.active ? 'Yes' : 'No'}`);
        }
        
    } catch (error) {
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            console.log('ℹ️ You are already subscribed!');
        } else {
            console.error('❌ Error subscribing:', error);
        }
    }
    
    process.exit(0);
}

quickSubscribe(); 