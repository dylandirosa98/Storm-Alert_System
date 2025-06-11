class StormAnalyzer {
    analyzeStorms(alerts, state) {
        console.log(`\n🔍 Storm Analyzer: Enriching ${alerts.length} pre-qualified alerts for ${state}.`);
        
        const results = [];

        for (const alert of alerts) {
            const { event, headline = '', description = '', areaDesc = '', severity = '', effective, expires } = alert.properties;

            const ugcCodes = alert.properties.geocode?.UGC || [];

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
            
            // If it's a severe thunderstorm warning with no parsed values, set a default
            // to ensure it's processed, as it's inherently severe.
            if (event.includes('Severe Thunderstorm Warning') && windSpeed < 58 && hailSize < 1.0) {
                 console.log(`   ⚠️ Severe Thunderstorm Warning with low parsed values. Setting default wind to 58mph.`);
                 windSpeed = 58;
            }

            console.log(`\n🌩️ Processing Alert: ${event} in ${areaDesc}`);
            console.log(`   🧊 Hail Found: ${hailSize}" | 💨 Wind Found: ${windSpeed} mph`);

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