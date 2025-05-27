const WeatherService = require('./weatherService');

async function inspectCurrentAlerts() {
    console.log('🔍 INSPECTING CURRENT ALERTS TO DEBUG FILTERING');
    console.log('=================================================\n');
    
    const weatherService = new WeatherService();
    
    // Test a few states that showed activity
    const testStates = ['Alabama', 'California', 'Missouri'];
    
    for (const state of testStates) {
        console.log(`\n🌍 DETAILED INSPECTION: ${state}`);
        console.log('='.repeat(50));
        
        try {
            // Let's manually check a few zones for this state
            const offices = weatherService.stateOfficeMapping[state] || {};
            
            for (const office in offices) {
                const zones = offices[office].zones || [];
                
                // Just check first 3 zones to see what we find
                for (let i = 0; i < Math.min(3, zones.length); i++) {
                    const zone = zones[i];
                    const zoneId = `${weatherService.stateAbbreviations[state]}Z${zone.toString().padStart(3, '0')}`;
                    
                    try {
                        console.log(`\n📡 Fetching raw data for zone: ${zoneId}`);
                        
                        const axios = require('axios');
                        const response = await axios.get(`${weatherService.baseUrl}/alerts/active/zone/${zoneId}`, {
                            headers: {
                                'User-Agent': weatherService.userAgent,
                                'Accept': 'application/geo+json'
                            },
                            timeout: 10000
                        });
                        
                        if (response.data && response.data.features) {
                            const alerts = response.data.features;
                            console.log(`📋 Raw alerts found: ${alerts.length}`);
                            
                            if (alerts.length > 0) {
                                alerts.forEach((alert, index) => {
                                    const props = alert.properties;
                                    console.log(`\n🚨 Alert ${index + 1}:`);
                                    console.log(`   Event: ${props.event}`);
                                    console.log(`   Severity: ${props.severity || 'Not specified'}`);
                                    console.log(`   Urgency: ${props.urgency || 'Not specified'}`);
                                    console.log(`   Certainty: ${props.certainty || 'Not specified'}`);
                                    console.log(`   Area: ${props.areaDesc || 'Not specified'}`);
                                    console.log(`   Headline: ${props.headline ? props.headline.substring(0, 100) + '...' : 'Not specified'}`);
                                    console.log(`   Description: ${props.description ? props.description.substring(0, 200) + '...' : 'Not specified'}`);
                                    
                                    // Test our filtering logic
                                    const event = props.event;
                                    const severity = props.severity;
                                    const description = props.description || '';
                                    const headline = props.headline || '';
                                    
                                    const isSevereEvent = (
                                        event.includes('Tornado') ||
                                        event.includes('Thunderstorm') ||
                                        event.includes('Storm') ||
                                        event.includes('Hail') ||
                                        event.includes('Wind') ||
                                        event.includes('Hurricane') ||
                                        event.includes('Tropical') ||
                                        event.includes('Flash Flood') ||
                                        event.includes('Warning') ||
                                        description.toLowerCase().includes('hail') ||
                                        description.toLowerCase().includes('wind') ||
                                        description.toLowerCase().includes('storm') ||
                                        description.toLowerCase().includes('tornado') ||
                                        headline.toLowerCase().includes('storm') ||
                                        headline.toLowerCase().includes('wind') ||
                                        headline.toLowerCase().includes('hail')
                                    );
                                    
                                    const stateAbbrev = weatherService.stateAbbreviations[state];
                                    const isCorrectState = props.areaDesc.includes(stateAbbrev) || 
                                                         props.areaDesc.includes(state) ||
                                                         zoneId.startsWith(stateAbbrev);
                                    
                                    console.log(`\n   🔍 FILTER TEST:`);
                                    console.log(`      Is Severe Event: ${isSevereEvent}`);
                                    console.log(`      Is Correct State: ${isCorrectState}`);
                                    console.log(`      WOULD PASS FILTER: ${isSevereEvent && isCorrectState}`);
                                    
                                    if (!isSevereEvent) {
                                        console.log(`      ❌ REJECTED: Not considered severe event type`);
                                    }
                                    if (!isCorrectState) {
                                        console.log(`      ❌ REJECTED: State mismatch (Expected: ${state}/${stateAbbrev}, Got: ${props.areaDesc})`);
                                    }
                                    if (isSevereEvent && isCorrectState) {
                                        console.log(`      ✅ ACCEPTED: This alert should pass filtering!`);
                                    }
                                });
                            }
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                    } catch (error) {
                        console.log(`❌ Error fetching ${zoneId}: ${error.message}`);
                    }
                }
                
                break; // Just test first office for now
            }
            
        } catch (error) {
            console.error(`❌ Error inspecting ${state}:`, error.message);
        }
    }
}

// Run the inspection
inspectCurrentAlerts().catch(console.error); 