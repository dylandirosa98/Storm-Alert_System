class StormAnalyzer {
    analyzeStorms(alerts, state) {
        console.log(`\n🔍 Storm Analyzer: Enriching ${alerts.length} pre-qualified alerts.`);
        
        const results = [];

        for (const alert of alerts) {
            const { event, headline = '', description = '', areaDesc = '', severity = '', effective, expires } = alert.properties;

            console.log(`\n🌩️ Processing Alert:`);
            console.log(`   Type: ${event}`);
            console.log(`   Area: ${areaDesc}`);

            // Extract UGC codes from the alert
            const ugcCodes = alert.properties.geocode?.UGC || [];

            // Values are already pre-qualified by WeatherService, but we re-parse for email content
            const hailSizeMatch = description.match(/([0-9.]+)\s?(inch|inches)/i);
            const hailSize = hailSizeMatch ? parseFloat(hailSizeMatch[1]) : 0;

            let windSpeed = 0;
            const hazardWindMatch = description.match(/HAZARD[.\\s]*?([0-9]+)\\s*mph\\s*wind/i);
            const generalWindMatch = description.match(/(?:wind gusts?|sustained winds?|winds?)\\s*(?:up to|gusting to|of)?\\s*([0-9]+)\\s*mph/i);
            
            if (hazardWindMatch) {
                windSpeed = parseFloat(hazardWindMatch[1]);
            } else if (generalWindMatch) {
                windSpeed = parseFloat(generalWindMatch[1]);
            }

            // Trust the pre-qualification and log the values found
            console.log(`   🧊 Hail Found: ${hailSize}"`);
            console.log(`   💨 Wind Found: ${windSpeed} mph`);

            const isHurricane = /hurricane|tropical storm/i.test(event);
            const isHailRelevant = hailSize >= 1.0;
            const isWindRelevant = windSpeed >= 58;

            // Since alerts are pre-qualified, we assume it's worth canvassing
            const worthCanvassing = true;

            const potentialJobs = isHurricane ? 300 : isHailRelevant ? 100 : 50; // Default to 50 if wind-only
            const avgJobValue = isHurricane ? 12000 : isHailRelevant ? 9000 : 7000;
            const totalMarketValue = potentialJobs * avgJobValue;

            console.log(`   💰 Market Opportunity:`);
            console.log(`      • Estimated Jobs: ${potentialJobs}`);
            console.log(`      • Total Market: $${totalMarketValue.toLocaleString()}`);

            results.push({
                severity: severity.toLowerCase(),
                state: state,
                affectedAreas: [{
                    description: areaDesc,
                    ugcCodes: ugcCodes
                }],
                worthCanvassing,
                details: [{
                    type: event,
                    severity,
                    areas: areaDesc,
                    headline,
                    description,
                    effective,
                    expires,
                    severityScore: (isHurricane ? 9 : isHailRelevant ? 8 : 7),
                    windSpeed,
                    hailSize,
                    damageEstimate: {
                        potentialJobs,
                        avgJobValue,
                        totalMarketValue
                    },
                    ugcCodes: ugcCodes
                }],
                recommendations: this.generateRecommendations({ isHailRelevant, isWindRelevant, isHurricane })
            });
        }

        if (results.length > 0) {
            console.log(`\n📊 Analysis Complete: ${results.length} alerts enriched and ready for notification.`);
        }

        return results;
    }

    generateRecommendations({ isHailRelevant, isWindRelevant, isHurricane }) {
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