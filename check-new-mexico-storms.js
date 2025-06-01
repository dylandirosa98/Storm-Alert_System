const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');

async function checkNewMexicoStorms() {
    console.log('🔍 CHECKING NEW MEXICO SEVERE THUNDERSTORM WARNINGS');
    console.log('=' .repeat(60));
    console.log('Found multiple Severe Thunderstorm Warnings that were filtered out\n');

    try {
        const weatherService = new WeatherService();
        const stormAnalyzer = new StormAnalyzer();

        // Get historical alerts from the last 48 hours
        console.log('📡 Fetching historical alerts from the last 48 hours...');
        const historicalAlerts = await weatherService.getRecentHistoricalAlerts('New Mexico', 48);
        
        // Filter for severe thunderstorm warnings
        const severeStorms = historicalAlerts.filter(alert => 
            alert.properties.event.includes('Severe Thunderstorm Warning')
        );
        
        console.log(`\n📊 Found ${severeStorms.length} Severe Thunderstorm Warnings`);
        
        if (severeStorms.length > 0) {
            console.log('\n🌩️ Analyzing why these were filtered out:');
            console.log('-'.repeat(60));
            
            severeStorms.forEach((storm, index) => {
                const props = storm.properties;
                console.log(`\n⚡ Storm ${index + 1}:`);
                console.log(`Time: ${new Date(props.onset).toLocaleString()}`);
                console.log(`Areas: ${props.areaDesc}`);
                console.log(`\nDescription length: ${props.description.length} characters`);
                console.log(`Description preview: ${props.description.substring(0, 300)}...`);
                
                // Try to extract wind/hail
                const hazardWindMatch = props.description.match(/HAZARD[.\s]*?([0-9]+)\s*mph\s*wind/i);
                const generalWindMatch = props.description.match(/(?:wind gusts?|sustained winds?|winds?)\s*(?:up to|gusting to|of)?\s*([0-9]+)\s*mph/i);
                const hailMatch = props.description.match(/([0-9.]+)\s?(inch|inches)/i);
                
                console.log(`\n🔍 Extraction results:`);
                console.log(`HAZARD wind regex: ${hazardWindMatch ? hazardWindMatch[1] + ' mph' : 'NO MATCH'}`);
                console.log(`General wind regex: ${generalWindMatch ? generalWindMatch[1] + ' mph' : 'NO MATCH'}`);
                console.log(`Hail regex: ${hailMatch ? hailMatch[1] + ' inches' : 'NO MATCH'}`);
                
                if (!hazardWindMatch && !generalWindMatch && !hailMatch) {
                    console.log(`\n⚠️ NO DATA EXTRACTED - This is why it was filtered out!`);
                    console.log(`But this is a SEVERE THUNDERSTORM WARNING which means it MUST have:`);
                    console.log(`- Wind gusts ≥ 58 mph, OR`);
                    console.log(`- Hail ≥ 1 inch`);
                }
                
                console.log('\n' + '-'.repeat(60));
            });
        }
        
    } catch (error) {
        console.error('Error checking New Mexico storms:', error);
    }
}

checkNewMexicoStorms().catch(console.error); 