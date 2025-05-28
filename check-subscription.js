const Database = require('./database');

async function checkSubscription() {
    const db = new Database();
    await db.initialize();
    
    const email = 'dylandirosa980@gmail.com';
    
    console.log('🔍 Checking subscription status...');
    console.log(`Email: ${email}`);
    
    try {
        const company = await db.getCompanyByEmail(email);
        
        if (company) {
            console.log('✅ SUBSCRIBED!');
            console.log(`Company: ${company.company_name}`);
            console.log(`Contact: ${company.contact_name}`);
            console.log(`States: ${company.states}`);
            console.log(`Active: ${company.active ? 'Yes' : 'No'}`);
            console.log(`Subscribed: ${company.created_at}`);
            
            // Check if unsubscribed
            const isUnsubscribed = await db.isUnsubscribed(email);
            console.log(`Unsubscribed: ${isUnsubscribed ? 'Yes' : 'No'}`);
            
            if (isUnsubscribed) {
                console.log('❌ You are unsubscribed - this is why you\'re not getting emails!');
            } else {
                console.log('✅ You should be receiving emails for storms in your subscribed states');
            }
        } else {
            console.log('❌ NOT SUBSCRIBED');
            console.log('You need to subscribe first to receive storm alerts');
        }
        
    } catch (error) {
        console.error('Error checking subscription:', error);
    }
    
    process.exit(0);
}

checkSubscription(); 