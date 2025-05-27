class StormAnalyzer {
    analyzeStorms(alerts) {
        const analysis = {
            severity: 'low',
            affectedAreas: [],
            estimatedDamage: {},
            recommendations: [],
            worthCanvassing: false,
            details: []
        };

        alerts.forEach(alert => {
            const properties = alert.properties;
            
            const stormInfo = {
                type: properties.event,
                severity: properties.severity,
                areas: properties.areaDesc,
                headline: properties.headline,
                description: properties.description
            };

            let severityScore = 0;
            
            if (stormInfo.type.includes('Tornado')) severityScore += 10;
            if (stormInfo.type.includes('Hurricane')) severityScore += 9;
            if (stormInfo.type.includes('Hail')) {
                const hailSize = this.extractHailSize(stormInfo.description);
                if (hailSize >= 2) severityScore += 8;
                else if (hailSize >= 1) severityScore += 6;
                else severityScore += 4;
            }
            if (stormInfo.type.includes('Severe Thunderstorm')) severityScore += 5;
            
            const windSpeed = this.extractWindSpeed(stormInfo.description);
            if (windSpeed >= 70) severityScore += 7;
            else if (windSpeed >= 58) severityScore += 5;

            if (severityScore >= 8) analysis.severity = 'extreme';
            else if (severityScore >= 6) analysis.severity = 'high';
            else if (severityScore >= 4) analysis.severity = 'moderate';

            const zipCodes = this.extractZipCodes(stormInfo.areas);
            
            analysis.affectedAreas.push({
                description: stormInfo.areas,
                zipCodes: zipCodes
            });

            const damageEstimate = this.estimateDamage(stormInfo, severityScore);
            
            analysis.details.push({
                ...stormInfo,
                severityScore,
                windSpeed,
                hailSize: this.extractHailSize(stormInfo.description),
                damageEstimate,
                zipCodes
            });
        });

        analysis.worthCanvassing = analysis.severity === 'high' || 
                                   analysis.severity === 'extreme' ||
                                   analysis.details.some(d => d.damageEstimate.potentialJobs >= 50);

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