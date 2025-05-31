const Database = require('./database');

async function checkStates() {
    const db = new Database();
    await db.initialize();
    
    const email = 'dylandirosa980@gmail.com';
    const company = await db.getCompanyByEmail(email);
    
    if (company) {
        console.log('🔍 Full states string from database:');
        console.log(company.states);
        console.log('\n📊 Analysis:');
        
        const stateArray = company.states.split(',').map(s => s.trim());
        console.log(`Number of states: ${stateArray.length}`);
        
        console.log('\n📋 States list:');
        stateArray.forEach((state, index) => {
            console.log(`${index + 1}. ${state}`);
        });
        
        if (stateArray.length < 50) {
            console.log('\n❌ PROBLEM: You should have 50 states but only have', stateArray.length);
            console.log('This explains why you\'re not getting alerts from other states!');
        } else {
            console.log('\n✅ All 50 states are properly subscribed');
        }
    } else {
        console.log('❌ No company found');
    }
    
    process.exit(0);
}

checkStates().catch(console.error); 