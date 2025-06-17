const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class StormHistoryService {
    constructor() {
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Hail size mappings for common terms
        this.hailSizeTerms = {
            'pea size': 0.25,
            'pea-size': 0.25,
            'dime size': 0.75,
            'dime-size': 0.75,
            'nickel size': 0.88,
            'nickel-size': 0.88,
            'quarter size': 1.0,
            'quarter-size': 1.0,
            'half dollar': 1.25,
            'ping pong ball': 1.5,
            'ping-pong ball': 1.5,
            'golf ball': 1.75,
            'golf-ball': 1.75,
            'hen egg': 2.0,
            'tennis ball': 2.5,
            'baseball': 2.75,
            'softball': 4.0
        };
    }

    async generateStormHistoryPDF(weatherService, states, outputPath) {
        console.log(`📄 Generating 12-month storm history PDF for states: ${states.join(', ')}`);
        
        try {
            // Collect storm data for the past 12 months
            const stormData = await this.collectStormHistory(weatherService, states);
            
            // Filter and process the data
            const processedData = this.processStormData(stormData);
            
            // Generate the PDF
            const pdfPath = await this.createPDF(processedData, states, outputPath);
            
            console.log(`✅ Storm history PDF generated: ${pdfPath}`);
            return pdfPath;
        } catch (error) {
            console.error('❌ Error generating storm history PDF:', error);
            throw error;
        }
    }

    async collectStormHistory(weatherService, states) {
        const allStorms = [];
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        for (const state of states) {
            console.log(`📊 Collecting historical data for ${state}...`);
            
            try {
                // Get historical alerts for the past 12 months (8760 hours)
                const alerts = await weatherService.getRecentHistoricalAlerts(state, 8760);
                
                for (const alert of alerts) {
                    const stormInfo = this.extractStormInfo(alert, state);
                    if (stormInfo && this.meetsFilterCriteria(stormInfo)) {
                        allStorms.push(stormInfo);
                    }
                }
            } catch (error) {
                console.error(`Error collecting data for ${state}:`, error);
            }
        }
        
        return allStorms;
    }

    extractStormInfo(alert, state) {
        const props = alert.properties;
        const description = (props.description || '').toLowerCase();
        const headline = (props.headline || '').toLowerCase();
        const fullText = description + ' ' + headline;
        
        // Extract hail size
        let hailSize = 0;
        let hailSizeName = '';
        
        // Check for numeric hail sizes
        const hailRegex = /(?:hail(?: of| up to)?|size hail)\s*\(?(\d+(?:\.\d+)?)\s*in(?:ch(?:es)?)?\)?/ig;
        let match;
        while ((match = hailRegex.exec(fullText)) !== null) {
            const size = parseFloat(match[1]);
            if (size > hailSize) {
                hailSize = size;
            }
        }
        
        // Check for hail size terms
        for (const [term, size] of Object.entries(this.hailSizeTerms)) {
            if (fullText.includes(term) && size > hailSize) {
                hailSize = size;
                hailSizeName = term;
            }
        }
        
        // Extract wind speed
        let windSpeed = 0;
        const windRegex = /(?:wind gusts?(?: of)?|winds up to|wind speeds up to|gusts up to|wind speed of|sustained winds?|gusting to)\s*(\d+)\s*mph/ig;
        while ((match = windRegex.exec(fullText)) !== null) {
            const speed = parseFloat(match[1]);
            if (speed > windSpeed) {
                windSpeed = speed;
            }
        }
        
        // Determine event type and severity
        let eventType = '';
        let severity = 'Moderate';
        
        if (hailSize >= 0.75) {
            eventType = 'Hail';
            if (hailSize >= 2.0) {
                severity = 'Extreme';
            } else if (hailSize >= 1.5) {
                severity = 'Severe';
            }
        }
        
        if (windSpeed >= 70) {
            if (eventType) {
                eventType = 'Hail + Wind';
            } else {
                eventType = 'Wind';
            }
            if (windSpeed >= 90) {
                severity = 'Extreme';
            } else if (windSpeed >= 80) {
                severity = 'Severe';
            }
        }
        
        if (!eventType) {
            return null; // Doesn't meet criteria
        }
        
        // Extract county from areaDesc
        const areaDesc = props.areaDesc || '';
        const countyMatch = areaDesc.match(/([^,]+)/);
        const county = countyMatch ? countyMatch[1].trim() : areaDesc;
        
        // Get one-sentence description
        const sentences = props.description ? props.description.split('.').filter(s => s.trim()) : [];
        const shortDescription = sentences[0] ? sentences[0].trim() + '.' : '';
        
        return {
            date: new Date(props.onset || props.effective || props.sent),
            county: county,
            state: state,
            eventType: eventType,
            hailSize: hailSize,
            hailSizeName: hailSizeName,
            windSpeed: windSpeed,
            description: shortDescription,
            severity: severity,
            // For ranking
            rankScore: (hailSize * 100) + windSpeed
        };
    }

    meetsFilterCriteria(stormInfo) {
        // Include if hail >= 0.75" OR wind >= 70 mph
        return stormInfo.hailSize >= 0.75 || stormInfo.windSpeed >= 70;
    }

    processStormData(storms) {
        // Sort by date for grouping
        storms.sort((a, b) => b.date - a.date);
        
        // Group by month
        const groupedByMonth = {};
        
        for (const storm of storms) {
            const monthKey = `${storm.date.getFullYear()}-${storm.date.getMonth()}`;
            if (!groupedByMonth[monthKey]) {
                groupedByMonth[monthKey] = {
                    year: storm.date.getFullYear(),
                    month: storm.date.getMonth(),
                    storms: []
                };
            }
            groupedByMonth[monthKey].storms.push(storm);
        }
        
        // Sort storms within each month by rank score
        for (const monthData of Object.values(groupedByMonth)) {
            monthData.storms.sort((a, b) => b.rankScore - a.rankScore);
        }
        
        // Calculate totals
        const hailCount = storms.filter(s => s.eventType.includes('Hail')).length;
        const windCount = storms.filter(s => s.eventType === 'Wind').length;
        
        return {
            totalHailEvents: hailCount,
            totalWindEvents: windCount,
            monthlyData: groupedByMonth,
            allStorms: storms.sort((a, b) => b.rankScore - a.rankScore)
        };
    }

    async createPDF(processedData, states, outputPath) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'letter',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                }
            });

            const filename = outputPath || path.join(__dirname, 'temp', `storm-history-${Date.now()}.pdf`);
            
            // Ensure temp directory exists
            const tempDir = path.dirname(filename);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const stream = fs.createWriteStream(filename);
            doc.pipe(stream);

            // Title
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('12-Month Storm History Report', { align: 'center' });
            
            doc.moveDown();
            
            // States covered
            doc.fontSize(12)
               .font('Helvetica')
               .text(`States: ${states.join(', ')}`, { align: 'center' });
            
            doc.moveDown();
            
            // Summary
            doc.fontSize(14)
               .font('Helvetica-Bold')
               .fillColor('#2a5298')
               .text('Summary', { underline: true });
            
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('black')
               .text(`In the past 12 months, your area experienced ${processedData.totalHailEvents} hail events (≥ 0.75") and ${processedData.totalWindEvents} wind events (≥ 70 mph).`);
            
            doc.moveDown(2);
            
            // Monthly breakdown
            const sortedMonths = Object.values(processedData.monthlyData)
                .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
            
            for (const monthData of sortedMonths) {
                // Month header
                doc.fontSize(16)
                   .font('Helvetica-Bold')
                   .fillColor('#2a5298')
                   .text(`🗓️ ${this.monthNames[monthData.month]} ${monthData.year}`);
                
                doc.moveDown(0.5);
                
                // Storms in this month
                for (const storm of monthData.storms) {
                    // Check if we need a new page
                    if (doc.y > 650) {
                        doc.addPage();
                    }
                    
                    // Storm entry
                    doc.fontSize(11)
                       .font('Helvetica-Bold')
                       .fillColor('black')
                       .text(`${storm.date.toLocaleDateString()} - ${storm.county}, ${storm.state}`);
                    
                    // Storm details
                    doc.fontSize(10)
                       .font('Helvetica');
                    
                    let details = `Type: ${storm.eventType}`;
                    if (storm.hailSize > 0) {
                        details += ` | Hail: ${storm.hailSize}"`;
                        if (storm.hailSizeName) {
                            details += ` (${storm.hailSizeName})`;
                        }
                    }
                    if (storm.windSpeed > 0) {
                        details += ` | Wind: ${storm.windSpeed} mph`;
                    }
                    details += ` | Severity: [${storm.severity}]`;
                    
                    doc.text(details);
                    
                    // Description (if available)
                    if (storm.description) {
                        doc.fontSize(9)
                           .fillColor('#666')
                           .text(storm.description, {
                               width: 500,
                               lineGap: 2
                           });
                    }
                    
                    doc.moveDown(0.5);
                }
                
                doc.moveDown();
            }
            
            // Footer
            doc.fontSize(8)
               .fillColor('#999')
               .text(`Generated on ${new Date().toLocaleDateString()} by Storm Alert Pro`, 
                     50, 750, { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                resolve(filename);
            });

            stream.on('error', reject);
        });
    }
}

module.exports = StormHistoryService; 