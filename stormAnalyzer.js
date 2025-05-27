class StormAnalyzer {
    analyzeStorms(alerts) {
        console.log(`🔍 Storm Analyzer: Analyzing ${alerts.length} alerts`);
        
        const analysis = {
            severity: 'low',
            affectedAreas: [],
            estimatedDamage: {},
            recommendations: [],
            worthCanvassing: false,
            details: []
        };

        let maxSeverityScore = 0;

        alerts.forEach((alert, index) => {
            const properties = alert.properties;
            
            console.log(`\n📋 Alert ${index + 1}/${alerts.length}:`);
            console.log(`   Event Type: ${properties.event}`);
            console.log(`   Severity: ${properties.severity || 'Not specified'}`);
            console.log(`   Area: ${properties.areaDesc || 'Not specified'}`);
            
            const stormInfo = {
                type: properties.event,
                severity: properties.severity,
                areas: properties.areaDesc,
                headline: properties.headline,
                description: properties.description
            };

            let severityScore = 0;
            
            // More inclusive scoring - give points for any storm activity
            if (stormInfo.type.includes('Tornado')) {
                severityScore += 10;
                console.log(`   🌪️ Tornado detected: +10 points`);
            }
            if (stormInfo.type.includes('Hurricane')) {
                severityScore += 9;
                console.log(`   🌀 Hurricane detected: +9 points`);
            }
            if (stormInfo.type.includes('Hail')) {
                const hailSize = this.extractHailSize(stormInfo.description);
                if (hailSize >= 2) {
                    severityScore += 8;
                    console.log(`   🧊 Large hail (${hailSize}") detected: +8 points`);
                } else if (hailSize >= 1) {
                    severityScore += 6;
                    console.log(`   🧊 Hail (${hailSize}") detected: +6 points`);
                } else {
                    severityScore += 4; // Any hail gets points
                    console.log(`   🧊 Hail detected: +4 points`);
                }
            }
            if (stormInfo.type.includes('Severe Thunderstorm') || stormInfo.type.includes('Thunderstorm')) {
                severityScore += 5;
                console.log(`   ⛈️ Thunderstorm detected: +5 points`);
            }
            if (stormInfo.type.includes('Wind')) {
                severityScore += 4; // Any wind event gets points
                console.log(`   💨 Wind event detected: +4 points`);
            }
            if (stormInfo.type.includes('Flood Warning')) {
                severityScore += 6; // Flood warnings are serious
                console.log(`   🌊 Flood Warning detected: +6 points`);
            } else if (stormInfo.type.includes('Flood Watch') || stormInfo.type.includes('Flood')) {
                severityScore += 4; // Flood watches and general flood alerts
                console.log(`   🌊 Flood event detected: +4 points`);
            }
            if (stormInfo.type.includes('Warning')) {
                severityScore += 3; // Warnings are more serious than watches
                console.log(`   ⚠️ Warning (not watch) detected: +3 points`);
            }
            if (stormInfo.type.includes('Flash Flood')) {
                severityScore += 3; // Flash floods often accompany severe storms
                console.log(`   🌊 Flash Flood detected: +3 points`);
            }
            if (stormInfo.type.includes('Special Weather Statement')) {
                severityScore += 3; // Special weather statements often indicate developing severe weather
                console.log(`   📢 Special Weather Statement detected: +3 points`);
            }
            if (stormInfo.type.includes('Advisory')) {
                severityScore += 2; // Weather advisories indicate notable conditions
                console.log(`   📋 Weather Advisory detected: +2 points`);
            }
            
            const windSpeed = this.extractWindSpeed(stormInfo.description);
            if (windSpeed >= 70) {
                severityScore += 7;
                console.log(`   💨 High winds (${windSpeed} mph): +7 points`);
            } else if (windSpeed >= 58) {
                severityScore += 5;
                console.log(`   💨 Strong winds (${windSpeed} mph): +5 points`);
            } else if (windSpeed >= 40) {
                severityScore += 2;
                console.log(`   💨 Moderate winds (${windSpeed} mph): +2 points`);
            }

            console.log(`   📊 Total severity score: ${severityScore}`);
            maxSeverityScore = Math.max(maxSeverityScore, severityScore);

            const zipCodes = this.extractZipCodes(stormInfo.areas);
            
            analysis.affectedAreas.push({
                description: stormInfo.areas,
                zipCodes: zipCodes
            });

            const damageEstimate = this.estimateDamage(stormInfo, severityScore);
            console.log(`   💰 Estimated jobs: ${damageEstimate.potentialJobs}`);
            console.log(`   💰 Market value: $${damageEstimate.totalMarketValue.toLocaleString()}`);
            
            analysis.details.push({
                ...stormInfo,
                severityScore,
                windSpeed,
                hailSize: this.extractHailSize(stormInfo.description),
                damageEstimate,
                zipCodes
            });
        });

        // Set overall severity based on max score
        if (maxSeverityScore >= 8) analysis.severity = 'extreme';
        else if (maxSeverityScore >= 5) analysis.severity = 'high';
        else if (maxSeverityScore >= 3) analysis.severity = 'moderate';
        else analysis.severity = 'low';

        console.log(`\n📊 Overall Analysis:`);
        console.log(`   Max Severity Score: ${maxSeverityScore}`);
        console.log(`   Overall Severity: ${analysis.severity}`);

        // MUCH LOWER THRESHOLD - send emails for moderate severity or higher, or any storm with potential jobs
        analysis.worthCanvassing = analysis.severity === 'high' || 
                                   analysis.severity === 'extreme' ||
                                   analysis.severity === 'moderate' ||  // LOWERED THRESHOLD
                                   analysis.details.some(d => d.damageEstimate.potentialJobs >= 25) ||  // LOWERED THRESHOLD
                                   maxSeverityScore >= 3;  // NEW: Any storm with score 3+ gets sent

        console.log(`   Worth Canvassing: ${analysis.worthCanvassing}`);
        
        if (!analysis.worthCanvassing) {
            console.log(`   ❌ Alert will NOT be sent - severity too low or no damage potential`);
        } else {
            console.log(`   ✅ Alert WILL be sent to subscribers!`);
        }

        analysis.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    extractHailSize(description) {
        const hailRegex = /(\d+\.?\d*)\s*inch/i;
        const match = description.match(hailRegex);
        return match ? parseFloat(match[1]) : 0;
    }

    extractWindSpeed(description) {
        const windRegex = /(\d+)\s*mph/i;
        const match = description.match(windRegex);
        return match ? parseInt(match[1]) : 0;
    }

    extractZipCodes(areaDesc) {
        const zipRegex = /\b\d{5}\b/g;
        const matches = areaDesc.match(zipRegex);
        return matches || [];
    }

    estimateDamage(stormInfo, severityScore) {
        let potentialJobs = 0;
        let avgJobValue = 5000;
        
        if (stormInfo.type.includes('Tornado')) {
            potentialJobs = 200;
            avgJobValue = 15000;
        } else if (stormInfo.type.includes('Hurricane')) {
            potentialJobs = 500;
            avgJobValue = 12000;
        } else if (stormInfo.type.includes('Hail')) {
            const hailSize = this.extractHailSize(stormInfo.description);
            if (hailSize >= 2) {
                potentialJobs = 150;
                avgJobValue = 8000;
            } else if (hailSize >= 1) {
                potentialJobs = 75;
                avgJobValue = 6000;
            }
        } else if (severityScore >= 5) {
            potentialJobs = 50;
            avgJobValue = 5000;
        }

        return {
            potentialJobs,
            avgJobValue,
            totalMarketValue: potentialJobs * avgJobValue
        };
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.severity === 'extreme') {
            recommendations.push('IMMEDIATE ACTION: Deploy all available crews to affected areas');
            recommendations.push('Set up temporary operations center in affected region');
            recommendations.push('Partner with local contractors for overflow work');
        } else if (analysis.severity === 'high') {
            recommendations.push('Schedule canvassing teams for next 48 hours');
            recommendations.push('Prepare marketing materials highlighting storm damage');
            recommendations.push('Alert crews for increased workload');
        } else if (analysis.severity === 'moderate') {
            recommendations.push('Monitor area for additional storm development');
            recommendations.push('Send targeted email/SMS to customers in affected zip codes');
        }

        return recommendations;
    }
}

module.exports = StormAnalyzer; 