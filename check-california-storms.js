const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');
const Database = require('./database');

async function checkCaliforniaStorms() {
    console.log('🔍 CHECKING CALIFORNIA STORM ACTIVITY');
    console.log('=' .repeat(50));
    console.log('Looking for qualifying storms that meet criteria:');
    console.log('• Hail ≥ 1.0 inch');
    console.log('• Wind ≥ 58 mph');
    console.log('• Hurricanes (any)');
    console.log('• Tornado warnings EXCLUDED\n');

    try {
        const weatherService = new WeatherService();
        const stormAnalyzer = new StormAnalyzer();
        const db = new Database();
        await db.initialize();

        // Check both current and historical (last 24 hours)
        console.log('📡 Fetching comprehensive weather data for California...');
        const alerts = await weatherService.getComprehensiveWeatherAlerts('California');
        
        console.log(`\n📊 Total alerts found: ${alerts.length}`);
        
        if (alerts.length > 0) {
            console.log('\n🌩️ Analyzing each alert:');
            console.log('-'.repeat(50));
            
            // Show details of each alert
            alerts.forEach((alert, index) => {
                const props = alert.properties;
                console.log(`\nAlert ${index + 1}:`);
                console.log(`Type: ${props.event}`);
                console.log(`Severity: ${props.severity}`);
                console.log(`Areas: ${props.areaDesc}`);
                console.log(`Description preview: ${props.description.substring(0, 200)}...`);
                
                // Extract wind and hail info
                const windMatch = props.description.match(/winds? (?:up to |gusting to )?(\d+)\s*(?:mph|MPH)/i);
                const hailMatch = props.description.match(/hail\s+(?:up to\s+)?(\d+(?:\.\d+)?)\s*inch/i);
                
                if (windMatch) console.log(`💨 Wind speed found: ${windMatch[1]} mph`);
                if (hailMatch) console.log(`🧊 Hail size found: ${hailMatch[1]} inches`);
            });
            
            console.log('\n\n🔍 Running storm analyzer...');
            const analysis = await stormAnalyzer.analyzeStorms(alerts, 'California');
            
            console.log(`\n📊 ANALYSIS RESULTS:`);
            console.log(`Qualifying storms found: ${analysis.length}`);
            
            if (analysis.length > 0) {
                console.log('\n⚠️ QUALIFYING STORMS DETECTED:');
                analysis.forEach(storm => {
                    console.log('\n' + '='.repeat(50));
                    console.log(`Type: ${storm.type}`);
                    console.log(`Severity Score: ${storm.severityScore}/10`);
                    console.log(`Hail Size: ${storm.hailSize} inches`);
                    console.log(`Wind Speed: ${storm.windSpeed} mph`);
                    console.log(`Areas: ${storm.areas}`);
                    console.log('='.repeat(50));
                });
                
                // Check if California has subscribers
                const companies = await db.getCompaniesByState('California');
                console.log(`\n📧 California has ${companies.length} subscribers`);
                
                if (companies.length > 0) {
                    console.log('⚠️ ALERT: Qualifying storms found but check if email was sent!');
                }
            }
        }
        
        // Also check the last 24 hours of historical data
        console.log('\n\n📅 Checking last 24 hours of historical data...');
        const historicalAlerts = await weatherService.getRecentHistoricalAlerts('California', 24);
        console.log(`Found ${historicalAlerts.length} historical alerts in the last 24 hours`);
        
        await db.close();
        
    } catch (error) {
        console.error('Error checking California storms:', error);
    }
}

checkCaliforniaStorms().catch(console.error); 