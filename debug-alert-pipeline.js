const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');
const Database = require('./database');

async function debugAlertPipeline() {
    console.log('🔍 DEBUG: Testing Alert Pipeline with New Changes');
    console.log('================================================\n');
    
    const weatherService = new WeatherService();
    const stormAnalyzer = new StormAnalyzer();
    const db = new Database();
    
    try {
        // Initialize database
        await db.initialize();
        
        // Test states with known weather activity - use full state names
        const testStates = ['Texas', 'Oklahoma', 'Kansas', 'Nebraska', 'Florida', 'Louisiana', 'Arkansas', 'Mississippi', 'Alabama', 'Georgia'];
        
        console.log(`Testing ${testStates.length} states for weather alerts...\n`);
        
        let totalAlerts = 0;
        let severeCandidates = 0;
        
        for (const state of testStates) {
            console.log(`\n🌍 Testing ${state}:`);
            console.log('─'.repeat(30));
            
            try {
                const alerts = await weatherService.getWeatherAlerts(state);
                console.log(`📋 Raw alerts found: ${alerts ? alerts.length : 0}`);
                
                if (alerts && alerts.length > 0) {
                    totalAlerts += alerts.length;
                    
                    // Show first few alerts for debugging
                    console.log('\n📄 Sample alerts:');
                    alerts.slice(0, 3).forEach((alert, index) => {
                        console.log(`  ${index + 1}. ${alert.event} - ${alert.severity} - ${alert.areaDesc}`);
                    });
                    
                    // Test storm analysis
                    console.log('\n🔍 Running storm analysis...');
                    const stormData = await stormAnalyzer.analyzeStorms(alerts);
                    
                    console.log(`📊 Analysis Results:`);
                    console.log(`   Worth Canvassing: ${stormData.worthCanvassing}`);
                    console.log(`   Max Severity: ${stormData.maxSeverity}`);
                    console.log(`   Estimated Jobs: ${stormData.estimatedJobs}`);
                    console.log(`   Alert Count: ${stormData.alertCount}`);
                    
                    if (stormData.worthCanvassing) {
                        severeCandidates++;
                        console.log('🚨 This would trigger email alerts!');
                    } else {
                        console.log('ℹ️ Not severe enough for email alerts');
                    }
                } else {
                    console.log('✅ No alerts found - all clear');
                }
                
            } catch (error) {
                console.error(`❌ Error testing ${state}:`, error.message);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n📊 SUMMARY:');
        console.log('='.repeat(40));
        console.log(`States tested: ${testStates.length}`);
        console.log(`Total alerts found: ${totalAlerts}`);
        console.log(`States with severe weather: ${severeCandidates}`);
        console.log(`Alert detection rate: ${((totalAlerts / testStates.length) * 100).toFixed(1)}%`);
        
        if (totalAlerts === 0) {
            console.log('\n⚠️ No alerts found in any state. This could mean:');
            console.log('   1. Weather is calm (good!)');
            console.log('   2. API filtering is too strict');
            console.log('   3. API connection issues');
        }
        
        if (severeCandidates === 0 && totalAlerts > 0) {
            console.log('\n⚠️ Alerts found but none severe enough. Consider:');
            console.log('   1. Lowering severity thresholds');
            console.log('   2. Adjusting event type filters');
        }
        
    } catch (error) {
        console.error('❌ Critical error in debug pipeline:', error);
    }
}

// Run the debug
debugAlertPipeline().catch(console.error); 