class StormAnalyzer {
    analyzeStorms(alerts, state) {
        console.log(`\n🔍 Storm Analyzer: Enriching ${alerts.length} pre-qualified alerts for ${state}.`);
        
        const results = [];

        for (const alert of alerts) {
            const { event, headline = '', description = '', areaDesc = '', severity = '', effective, expires } = alert.properties;

            const ugcCodes = alert.properties.geocode?.UGC || [];

            // Extract hail size - use the same comprehensive approach as weatherService
            let hailSize = 0;
            const fullText = description + " " + headline;
            let potentialHailSizes = [];
            
            // Check for max hail size parameter
            const maxHailRegex = /\* max hail size\.*(\d+(?:\.\d+)?)\s*in/ig;
            let match;
            while ((match = maxHailRegex.exec(description)) !== null) {
                potentialHailSizes.push(parseFloat(match[1]));
            }
            
            // Check for general hail mentions
            const generalHailRegex = /(?:hail(?: of| up to)?|size hail)\s*\(?(\d+(?:\.\d+)?)\s*in(?:ch(?:es)?)?\)?/ig;
            while ((match = generalHailRegex.exec(fullText)) !== null) {
                potentialHailSizes.push(parseFloat(match[1]));
            }
            
            if (potentialHailSizes.length > 0) {
                hailSize = Math.max(...potentialHailSizes);
            }

            // Extract wind speed - use the same comprehensive approach as weatherService
            let windSpeed = 0;
            let potentialWindSpeeds = [];
            
            // Check for max wind gust parameter
            const maxWindRegex = /\* max wind gust\.*(\d+)\s*mph/ig;
            while ((match = maxWindRegex.exec(description)) !== null) {
                potentialWindSpeeds.push(parseFloat(match[1]));
            }
            
            // Check for specific wind phrases
            const specificWindRegex = /(?:wind gusts?(?: of)?|winds up to|wind speeds up to|gusts up to|wind speed of|sustained winds?|gusting to)\s*(\d+)\s*mph/ig;
            while ((match = specificWindRegex.exec(fullText)) !== null) {
                potentialWindSpeeds.push(parseFloat(match[1]));
            }
            
            // Check for HAZARD wind mentions
            const hazardWindRegex = /HAZARD[.\s]*?(\d+)\s*mph\s*wind/ig;
            while ((match = hazardWindRegex.exec(description)) !== null) {
                potentialWindSpeeds.push(parseFloat(match[1]));
            }
            
            // For wind-related events, also check general mph mentions
            if (event.toLowerCase().includes("wind") || event.toLowerCase().includes("thunderstorm") || 
                event.toLowerCase().includes("hurricane") || event.toLowerCase().includes("tornado") || 
                event.toLowerCase().includes("tropical storm")) {
                const broaderWindRegex = /(\d+)\s*mph/ig;
                while ((match = broaderWindRegex.exec(fullText)) !== null) {
                    const speed = parseFloat(match[1]);
                    // Only add if it's a reasonable wind speed (not a distance or other measurement)
                    if (speed >= 20 && speed <= 200) {
                        potentialWindSpeeds.push(speed);
                    }
                }
            }
            
            if (potentialWindSpeeds.length > 0) {
                windSpeed = Math.max(...potentialWindSpeeds);
            }

            console.log(`\n🌩️ Processing Alert: ${event} in ${areaDesc}`);
            console.log(`   🧊 Hail Found: ${hailSize}" (from ${potentialHailSizes.length} values: [${potentialHailSizes.join(', ')}])`);
            console.log(`   💨 Wind Found: ${windSpeed} mph (from ${potentialWindSpeeds.length} values: [${potentialWindSpeeds.join(', ')}])`);

            const isHurricane = /hurricane|tropical storm/i.test(event);
            const isHailRelevant = hailSize >= 1.0;
            const isWindRelevant = windSpeed >= 58;
            
            // The alert must have either significant wind or hail to be processed further.
            if (!isHailRelevant && !isWindRelevant && !isHurricane) {
                console.log(`   ❌ Alert does not meet final criteria after parsing. Skipping.`);
                continue;
            }

            results.push({
                isHail: isHailRelevant,
                isWind: isWindRelevant,
                isHurricane: isHurricane,
                hailSize: hailSize,
                windSpeed: windSpeed,
                areaDesc: areaDesc,
                ugcCodes: ugcCodes,
                headline: headline,
                event: event,
                description: description,
                effective: effective,
                expires: expires,
            });
        }

        if (results.length > 0) {
            console.log(`\n📊 Analysis Complete: ${results.length} alerts for ${state} processed and structured.`);
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