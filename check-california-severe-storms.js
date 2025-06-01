const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');

async function checkCaliforniaSevereStorms() {
    console.log('🔍 CHECKING CALIFORNIA SEVERE THUNDERSTORM WARNINGS');
    console.log('=' .repeat(60));
    console.log('Found 3 Severe Thunderstorm Warnings on May 31, 2025\n');

    try {
        const weatherService = new WeatherService();
        const stormAnalyzer = new StormAnalyzer();

        // Get historical alerts from the last 48 hours to catch yesterday's storms
        console.log('📡 Fetching historical alerts from the last 48 hours...');
        const historicalAlerts = await weatherService.getRecentHistoricalAlerts('California', 48);
        
        // Filter for severe thunderstorm warnings
        const severeStorms = historicalAlerts.filter(alert => 
            alert.properties.event.includes('Severe Thunderstorm Warning')
        );
        
        console.log(`\n📊 Found ${severeStorms.length} Severe Thunderstorm Warnings`);
        
        if (severeStorms.length > 0) {
            console.log('\n🌩️ Detailed analysis of each Severe Thunderstorm Warning:');
            console.log('-'.repeat(60));
            
            severeStorms.forEach((storm, index) => {
                const props = storm.properties;
                console.log(`\n⚡ Storm ${index + 1}:`);
                console.log(`Time: ${new Date(props.onset).toLocaleString()}`);
                console.log(`Areas: ${props.areaDesc}`);
                console.log(`\nFull Description:`);
                console.log(props.description);
                console.log('\n' + '-'.repeat(60));
            });
            
            // Run through storm analyzer
            console.log('\n\n🔍 Running storm analyzer on Severe Thunderstorm Warnings...');
            const analysis = await stormAnalyzer.analyzeStorms(severeStorms, 'California');
            
            console.log(`\n📊 STORM ANALYZER RESULTS:`);
            console.log(`Qualifying storms: ${analysis.length}`);
            
            if (analysis.length > 0) {
                console.log('\n⚠️ ALERT: QUALIFYING STORMS DETECTED!');
                console.log('These storms met the criteria (≥58 mph winds or ≥1.0" hail)');
                analysis.forEach(storm => {
                    console.log('\n' + '='.repeat(60));
                    console.log(`Type: ${storm.type}`);
                    console.log(`Severity Score: ${storm.severityScore}/10`);
                    console.log(`Hail Size: ${storm.hailSize} inches`);
                    console.log(`Wind Speed: ${storm.windSpeed} mph`);
                    console.log(`Areas: ${storm.areas}`);
                    console.log('='.repeat(60));
                });
            } else {
                console.log('\n✅ None of the Severe Thunderstorm Warnings met the criteria.');
            }
        }
        
    } catch (error) {
        console.error('Error checking California severe storms:', error);
    }
}

checkCaliforniaSevereStorms().catch(console.error); 