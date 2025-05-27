const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');

async function checkCurrentStorms() {
    const weatherService = new WeatherService();
    const stormAnalyzer = new StormAnalyzer();
    
    // Check these states that commonly have weather alerts
    const statesToCheck = [
        'Texas', 'Oklahoma', 'Kansas', 'Florida', 'Louisiana', 
        'Alabama', 'Georgia', 'Missouri', 'Arkansas', 'Tennessee',
        'California', 'Colorado', 'Iowa', 'Illinois', 'Ohio'
    ];
    
    console.log('🔍 Checking for REAL current storms...\n');
    
    let totalAlerts = 0;
    let significantStorms = [];
    
    for (const state of statesToCheck) {
        const alerts = await weatherService.getWeatherAlerts(state);
        
        if (alerts.length > 0) {
            console.log(`\n⛈️  ${state}: Found ${alerts.length} weather alerts`);
            totalAlerts += alerts.length;
            
            const stormData = await stormAnalyzer.analyzeStorms(alerts);
            
            if (stormData.worthCanvassing) {
                significantStorms.push({
                    state,
                    severity: stormData.severity,
                    details: stormData.details[0]
                });
                
                console.log(`   ⚠️  SIGNIFICANT STORM - ${stormData.severity.toUpperCase()}`);
                console.log(`   Type: ${stormData.details[0].type}`);
                console.log(`   Worth Canvassing: YES`);
                console.log(`   Potential Jobs: ${stormData.details[0].damageEstimate.potentialJobs}`);
            }
        }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`Total alerts found: ${totalAlerts}`);
    console.log(`Significant storms (worth alerting): ${significantStorms.length}`);
    
    if (significantStorms.length > 0) {
        console.log('\n🚨 These storms would trigger email alerts:');
        significantStorms.forEach(storm => {
            console.log(`- ${storm.state}: ${storm.severity} severity - ${storm.details.type}`);
        });
    }
    
    process.exit(0);
}

checkCurrentStorms(); 