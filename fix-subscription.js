const Database = require('./database');

async function fixSubscription() {
    const db = new Database();
    await db.initialize();
    
    const email = 'dylandirosa980@gmail.com';
    
    // All 50 US states
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
    
    console.log('🔧 Updating subscription to include all 50 states...');
    console.log(`Email: ${email}`);
    console.log(`States: ${allStates.length} states`);
    
    try {
        // Update the states for the existing company
        await new Promise((resolve, reject) => {
            db.db.run(
                'UPDATE companies SET states = ? WHERE email = ?',
                [allStates.join(','), email],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
        
        console.log('✅ Successfully updated subscription to all 50 states!');
        
        // Verify the update
        const company = await db.getCompanyByEmail(email);
        if (company) {
            const stateArray = company.states.split(',');
            console.log(`\n📊 Verification: Now subscribed to ${stateArray.length} states`);
            
            if (stateArray.length === 50) {
                console.log('🎉 Perfect! All 50 states are now active');
                console.log('You will now receive storm alerts from across the entire United States');
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating subscription:', error);
    }
    
    process.exit(0);
}

fixSubscription().catch(console.error); 