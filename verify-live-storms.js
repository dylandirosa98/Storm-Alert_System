const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');
const Database = require('./database');
const EmailService = require('./emailService');

async function verifyLiveStorms() {
    const weatherService = new WeatherService();
    const stormAnalyzer = new StormAnalyzer();
    const db = new Database();
    const emailService = new EmailService();
    
    await db.initialize();
    
    console.log('🔍 Checking ALL 50 states for current storms...\n');
    console.log('Current time:', new Date().toLocaleString());
    console.log('This is exactly what your cron job does every 5 minutes.\n');
    
    const subscribedStates = await db.getSubscribedStates();
    console.log(`You are subscribed to ${subscribedStates.length} states\n`);
    
    let totalAlerts = 0;
    let statesWithAlerts = [];
    let emailsToSend = [];
    
    for (const state of subscribedStates) {
        process.stdout.write(`Checking ${state}...`);
        const alerts = await weatherService.getWeatherAlerts(state);
        
        if (alerts.length > 0) {
            console.log(` ⛈️  ${alerts.length} alerts found!`);
            totalAlerts += alerts.length;
            
            const stormData = await stormAnalyzer.analyzeStorms(alerts);
            
            if (stormData.worthCanvassing) {
                console.log(`   🚨 HIGH VALUE STORM - Would send email!`);
                console.log(`   Severity: ${stormData.severity}`);
                console.log(`   Type: ${stormData.details[0].type}`);
                
                statesWithAlerts.push({
                    state,
                    severity: stormData.severity,
                    type: stormData.details[0].type
                });
                
                const companies = await db.getCompaniesByState(state);
                emailsToSend.push({ companies: companies.length, state });
            }
        } else {
            console.log(' ✓ No alerts');
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Total active alerts across USA: ${totalAlerts}`);
    console.log(`States with significant storms: ${statesWithAlerts.length}`);
    console.log(`Emails that would be sent: ${emailsToSend.reduce((sum, e) => sum + e.companies, 0)}`);
    
    if (statesWithAlerts.length > 0) {
        console.log('\n🚨 ACTIVE STORMS THAT WOULD TRIGGER EMAILS:');
        statesWithAlerts.forEach(s => {
            console.log(`- ${s.state}: ${s.severity.toUpperCase()} - ${s.type}`);
        });
        
        console.log('\n💡 Your cron job would send alerts for these storms!');
    } else {
        console.log('\n⚠️  No significant storms found at this exact moment.');
        console.log('This is unusual with 50 states. Checking if NWS API is working...');
        
        // Test the API directly
        const axios = require('axios');
        try {
            const response = await axios.get('https://api.weather.gov/alerts/active?status=actual&message_type=alert');
            console.log(`\nNWS API Status: ✅ Working (${response.data.features.length} total alerts nationwide)`);
            console.log('The issue might be missing NWS office codes for some states.');
        } catch (error) {
            console.log('\nNWS API Status: ❌ Error - the API might be down');
        }
    }
    
    process.exit(0);
}

verifyLiveStorms(); 