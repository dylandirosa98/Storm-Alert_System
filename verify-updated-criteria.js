const StormAnalyzer = require('./stormAnalyzer');

console.log('🔍 VERIFYING UPDATED STORM CRITERIA');
console.log('=' .repeat(50));

const stormAnalyzer = new StormAnalyzer();

// Test cases to verify the new criteria
const testAlerts = [
    {
        properties: {
            event: 'Tornado Warning',
            description: 'A tornado warning has been issued. Winds up to 80 mph possible.',
            headline: 'Tornado Warning',
            areaDesc: 'Dallas County, TX',
            severity: 'Extreme'
        }
    },
    {
        properties: {
            event: 'Severe Thunderstorm Warning',
            description: 'Hail up to 1.0 inches in diameter and winds up to 60 mph are possible.',
            headline: 'Severe Thunderstorm Warning',
            areaDesc: 'Harris County, TX',
            severity: 'Severe'
        }
    },
    {
        properties: {
            event: 'Severe Thunderstorm Warning',
            description: 'Hail up to 0.75 inches in diameter and winds up to 55 mph are possible.',
            headline: 'Severe Thunderstorm Warning',
            areaDesc: 'Cook County, IL',
            severity: 'Severe'
        }
    },
    {
        properties: {
            event: 'High Wind Warning',
            description: 'Sustained winds of 65 mph with gusts up to 80 mph are expected.',
            headline: 'High Wind Warning',
            areaDesc: 'Miami-Dade County, FL',
            severity: 'Severe'
        }
    },
    {
        properties: {
            event: 'Hurricane Warning',
            description: 'Hurricane conditions expected with winds over 100 mph.',
            headline: 'Hurricane Warning',
            areaDesc: 'Broward County, FL',
            severity: 'Extreme'
        }
    }
];

console.log('\\n📋 TESTING CRITERIA:');
console.log('   • Hail ≥ 1.0 inch ✅');
console.log('   • Wind ≥ 58 mph ✅');
console.log('   • Hurricane events ✅');
console.log('   • Tornado warnings EXCLUDED ❌\\n');

testAlerts.forEach((alert, index) => {
    console.log(`\\n🧪 TEST ${index + 1}: ${alert.properties.event}`);
    console.log(`📍 Area: ${alert.properties.areaDesc}`);
    console.log(`📝 Description: ${alert.properties.description}`);
    
    const results = stormAnalyzer.analyzeStorms([alert], 'Test State');
    
    if (results.length > 0) {
        console.log(`✅ RESULT: Alert QUALIFIES for notification`);
        console.log(`   Worth canvassing: ${results[0].worthCanvassing}`);
        console.log(`   Severity score: ${results[0].details[0].severityScore}`);
        console.log(`   Market value: $${results[0].details[0].damageEstimate.totalMarketValue.toLocaleString()}`);
    } else {
        console.log(`❌ RESULT: Alert FILTERED OUT (does not meet criteria)`);
    }
});

console.log('\\n🎯 VERIFICATION COMPLETE');
console.log('\\nExpected Results:');
console.log('   Test 1 (Tornado Warning): ❌ Should be filtered out');
console.log('   Test 2 (1.0" hail + 60mph): ✅ Should qualify');
console.log('   Test 3 (0.75" hail + 55mph): ❌ Should be filtered out');
console.log('   Test 4 (65mph winds): ✅ Should qualify');
console.log('   Test 5 (Hurricane): ✅ Should qualify'); 