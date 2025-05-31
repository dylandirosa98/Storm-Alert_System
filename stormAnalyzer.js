class StormAnalyzer {
    analyzeStorms(alerts, state) {
        console.log(`\n🔍 Storm Analyzer: Processing ${alerts.length} alerts for roofing damage potential`);
        console.log(`📋 Criteria:`);
        console.log(`   • Hail ≥ 1.0 inch`);
        console.log(`   • Wind ≥ 58 mph`);
        console.log(`   • Any Hurricane event`);
        console.log(`   • Tornado warnings excluded (do not trigger alerts)\n`);

        const results = [];

        for (const alert of alerts) {
            const { event, headline = '', description = '', areaDesc = '', severity = '' } = alert.properties;

            console.log(`\n🌩️ Analyzing Alert:`);
            console.log(`   Type: ${event}`);
            console.log(`   Area: ${areaDesc}`);

            // Extract zip codes from the alert
            const zipCodes = alert.properties.geocode?.SAME || 
                           alert.properties.geocode?.UGC || 
                           this.extractZipCodesFromDescription(description) || 
                           [];

            const hailSizeMatch = description.match(/([0-9.]+)\s?(inch|inches)/i);
            const hailSize = hailSizeMatch ? parseFloat(hailSizeMatch[1]) : 0;

            const windSpeedMatch = description.match(/([0-9.]+)\s?mph/i);
            const windSpeed = windSpeedMatch ? parseFloat(windSpeedMatch[1]) : 0;

            const isHailRelevant = hailSize >= 1.0;
            const isWindRelevant = windSpeed >= 58;
            const isTornado = /tornado/i.test(event) || /tornado/i.test(headline);
            const isHurricane = /hurricane|tropical storm/i.test(event);

            // Log detection results
            if (hailSize > 0) console.log(`   🧊 Hail Size: ${hailSize}" ${isHailRelevant ? '✅' : '❌'}`);
            if (windSpeed > 0) console.log(`   💨 Wind Speed: ${windSpeed} mph ${isWindRelevant ? '✅' : '❌'}`);
            if (isTornado) console.log(`   🌪️ Tornado Event Detected (excluded from alerts) ⚠️`);
            if (isHurricane) console.log(`   🌀 Hurricane Event Detected ✅`);

            // FIRST: Check if this is a tornado warning/watch - if so, exclude it completely
            if (isTornado) {
                console.log(`   ⚠️ Alert filtered out - Tornado warnings do not trigger alerts`);
                continue;
            }

            // THEN: Check other criteria for non-tornado events
            const worthCanvassing = isHailRelevant || isWindRelevant || isHurricane;

            if (!worthCanvassing) {
                console.log(`   ❌ Alert filtered out - Does not meet roofing damage criteria`);
                continue;
            }

            console.log(`   ✅ Alert qualifies for roofing damage notification!`);

            // Calculate market opportunity (removed tornado calculations)
            const potentialJobs = isHurricane ? 300 :
                                isHailRelevant ? 100 :
                                isWindRelevant ? 50 : 0;

            const avgJobValue = isHurricane ? 12000 :
                              isHailRelevant ? 9000 :
                              isWindRelevant ? 7000 : 0;

            const totalMarketValue = potentialJobs * avgJobValue;

            console.log(`   💰 Market Opportunity:`);
            console.log(`      • Estimated Jobs: ${potentialJobs}`);
            console.log(`      • Avg Job Value: $${avgJobValue.toLocaleString()}`);
            console.log(`      • Total Market: $${totalMarketValue.toLocaleString()}`);

            results.push({
                severity: severity.toLowerCase(),
                state: state, // Include the state in the storm data
                affectedAreas: [{
                    description: areaDesc,
                    zipCodes: zipCodes
                }],
                worthCanvassing,
                details: [{
                    type: event,
                    severity,
                    areas: areaDesc,
                    headline,
                    description,
                    severityScore: (isHurricane ? 9 : isHailRelevant ? 8 : 7),
                    windSpeed,
                    hailSize,
                    damageEstimate: {
                        potentialJobs,
                        avgJobValue,
                        totalMarketValue
                    },
                    zipCodes: zipCodes
                }],
                recommendations: this.generateRecommendations({ isTornado: false, isHailRelevant, isWindRelevant, isHurricane })
            });
        }

        if (results.length === 0) {
            console.log(`\n📊 Analysis Complete: No alerts met roofing damage criteria`);
        } else {
            console.log(`\n📊 Analysis Complete: ${results.length} qualifying alerts found`);
        }

        return results;
    }

    extractZipCodesFromDescription(description) {
        // Extract zip codes from the description text
        const zipCodeMatches = description.match(/\b\d{5}\b/g);
        return zipCodeMatches || [];
    }

    generateRecommendations({ isTornado, isHailRelevant, isWindRelevant, isHurricane }) {
        const recs = [];

        recs.push('Deploy canvassing teams to affected zip codes');
        
        if (isHurricane) {
            recs.push('Prepare for emergency tarping and restoration demand');
            recs.push('Contact insurance adjusters for immediate inspections');
            recs.push('Mobilize emergency response teams');
        }
        
        if (isHailRelevant) {
            recs.push('Expect strong approval rate for hail claims');
            recs.push('Document hail size with photos and measurements');
            recs.push('Focus on metal surfaces and soft metals for damage evidence');
        }
        
        if (isWindRelevant) {
            recs.push('Inspect for wind uplift and gutter damage');
            recs.push('Check for missing shingles and flashing');
            recs.push('Document wind speed from weather reports');
        }

        return recs;
    }
}

module.exports = StormAnalyzer; 