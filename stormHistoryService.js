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

    async generateStormHistoryPDF(weatherService, states, outputPath, database = null) {
        console.log(`Generating 12-month hail history PDF for states: ${states.join(', ')}`);
        
        try {
            // Collect storm data for the past 12 months
            const stormData = await this.collectStormHistory(weatherService, states, database);
            
            // Filter and process the data (hail only)
            const processedData = this.processStormData(stormData);
            
            // Generate the PDF
            const pdfPath = await this.createPDF(processedData, states, outputPath);
            
            console.log(`Hail history PDF generated: ${pdfPath}`);
            return pdfPath;
        } catch (error) {
            console.error('Error generating hail history PDF:', error);
            throw error;
        }
    }

    async collectStormHistory(weatherService, states, database) {
        const allStorms = [];
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const now = new Date();
        
        console.log(`📊 Collecting storm history from database first...`);
        
        // First, try to get data from our database
        if (database) {
            try {
                const dbStorms = await database.getStormHistory(
                    states,
                    twelveMonthsAgo.toISOString(),
                    now.toISOString(),
                    0.75 // minimum hail size
                );
                
                console.log(`💾 Found ${dbStorms.length} storms in database`);
                
                // Convert database records to our format
                for (const dbStorm of dbStorms) {
                    allStorms.push({
                        date: new Date(dbStorm.onset_time),
                        county: dbStorm.county,
                        state: dbStorm.state,
                        eventType: 'Hail',
                        hailSize: dbStorm.hail_size,
                        hailSizeName: dbStorm.hail_size_text,
                        description: dbStorm.description,
                        severity: dbStorm.hail_size >= 2.0 ? 'Extreme' : 
                                 dbStorm.hail_size >= 1.5 ? 'Severe' : 'Moderate',
                        rankScore: dbStorm.hail_size * 100
                    });
                }
            } catch (dbError) {
                console.error('Error fetching from database:', dbError);
            }
        }
        
        // If we have less than expected data, also check the API
        if (allStorms.length < 5) { // Arbitrary threshold
            console.log(`⚠️ Limited database data (${allStorms.length} events). Checking API for recent data...`);
            
            for (const state of states) {
                console.log(`Collecting recent hail data from API for ${state}...`);
                
                try {
                    // Only check recent data from API (last 30 days)
                    const alerts = await weatherService.getRecentHistoricalAlerts(state, 720);
                    console.log(`Found ${alerts.length} recent alerts for ${state}`);
                    
                    for (const alert of alerts) {
                        const stormInfo = this.extractStormInfo(alert, state);
                        if (stormInfo && this.meetsFilterCriteria(stormInfo)) {
                            // Check if we already have this storm from database
                            const isDuplicate = allStorms.some(s => 
                                Math.abs(s.date.getTime() - stormInfo.date.getTime()) < 3600000 && // Within 1 hour
                                s.state === stormInfo.state
                            );
                            if (!isDuplicate) {
                                allStorms.push(stormInfo);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error collecting API data for ${state}:`, error);
                }
            }
        }
        
        console.log(`Total hail events found: ${allStorms.length}`);
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
        
        // Only include if it has hail >= 0.75"
        if (hailSize < 0.75) {
            return null;
        }
        
        // Determine severity based on hail size only
        let severity = 'Moderate';
        if (hailSize >= 2.0) {
            severity = 'Extreme';
        } else if (hailSize >= 1.5) {
            severity = 'Severe';
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
            eventType: 'Hail',
            hailSize: hailSize,
            hailSizeName: hailSizeName,
            description: shortDescription,
            severity: severity,
            // For ranking
            rankScore: hailSize * 100
        };
    }

    meetsFilterCriteria(stormInfo) {
        // Only include hail >= 0.75"
        return stormInfo.hailSize >= 0.75;
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
        
        // Calculate totals (hail only)
        const hailCount = storms.length;
        
        return {
            totalHailEvents: hailCount,
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
                },
                autoFirstPage: false
            });

            const filename = outputPath || path.join(__dirname, 'temp', `storm-history-${Date.now()}.pdf`);
            
            // Ensure temp directory exists
            const tempDir = path.dirname(filename);
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const stream = fs.createWriteStream(filename);
            doc.pipe(stream);

            // Add first page
            doc.addPage();

            // Title
            doc.fontSize(24)
               .font('Helvetica-Bold')
               .text('12-Month Hail History Report', { align: 'center' });
            
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
               .text(`In the past 12 months, your area experienced ${processedData.totalHailEvents} hail events (0.75" or larger).`);
            
            doc.moveDown(2);
            
            // Monthly breakdown
            const sortedMonths = Object.values(processedData.monthlyData)
                .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
            
            let currentPage = 1;
            
            for (const monthData of sortedMonths) {
                // Check if we need a new page for the month header
                if (doc.y > 650) {
                    doc.addPage();
                    currentPage++;
                }
                
                // Month header
                doc.fontSize(16)
                   .font('Helvetica-Bold')
                   .fillColor('#2a5298')
                   .text(`${this.monthNames[monthData.month]} ${monthData.year}`);
                
                doc.moveDown(0.5);
                
                // Storms in this month
                for (const storm of monthData.storms) {
                    // Check if we need a new page
                    if (doc.y > 650) {
                        doc.addPage();
                        currentPage++;
                    }
                    
                    // Storm entry
                    doc.fontSize(11)
                       .font('Helvetica-Bold')
                       .fillColor('black')
                       .text(`${storm.date.toLocaleDateString()} - ${storm.county}, ${storm.state}`);
                    
                    // Storm details
                    doc.fontSize(10)
                       .font('Helvetica');
                    
                    let details = `Hail Size: ${storm.hailSize}"`;
                    if (storm.hailSizeName) {
                        details += ` (${storm.hailSizeName})`;
                    }
                    details += ` | Severity: ${storm.severity}`;
                    
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
            
            // Footer on last page
            if (doc.y > 700) {
                doc.addPage();
            }
            
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