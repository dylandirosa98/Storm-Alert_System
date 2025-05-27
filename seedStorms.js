const Database = require('./database');
const db = new Database();

async function seedStormData() {
    await db.initialize();
    
    // Sample storm data for different states
    const sampleStorms = [
        {
            state: 'Texas',
            severity: 'high',
            data: {
                severity: 'high',
                affectedAreas: [{
                    description: 'North Dallas, Richardson, Plano, Frisco, McKinney, Allen, Garland',
                    zipCodes: ['75001', '75002', '75013', '75023', '75024', '75025', '75026', '75034', '75035']
                }],
                worthCanvassing: true,
                details: [{
                    type: 'Severe Thunderstorm with Large Hail',
                    severity: 'Severe',
                    areas: 'North Dallas, Richardson, Plano, Frisco, McKinney',
                    headline: 'Large Hail and Damaging Winds',
                    description: 'Golf ball sized hail (1.75 inches) and winds up to 70 mph',
                    severityScore: 8,
                    windSpeed: 70,
                    hailSize: 1.75,
                    damageEstimate: {
                        potentialJobs: 150,
                        avgJobValue: 8000,
                        totalMarketValue: 1200000
                    },
                    zipCodes: ['75001', '75002', '75013', '75023', '75024', '75025', '75026', '75034', '75035']
                }],
                recommendations: [
                    'IMMEDIATE ACTION: Deploy all available crews to affected areas',
                    'Set up temporary operations center in Plano/Frisco area',
                    'Focus on hail damage inspections - high claim approval rate expected',
                    'Partner with local contractors for overflow work'
                ]
            }
        },
        {
            state: 'Florida',
            severity: 'extreme',
            data: {
                severity: 'extreme',
                affectedAreas: [{
                    description: 'Orlando, Kissimmee, Winter Park, Altamonte Springs',
                    zipCodes: ['32801', '32803', '32804', '32805', '32806', '32807', '32808', '32809']
                }],
                worthCanvassing: true,
                details: [{
                    type: 'Tornado Warning',
                    severity: 'Extreme',
                    areas: 'Orlando Metro Area',
                    headline: 'Confirmed Tornado Touchdown',
                    description: 'EF2 tornado with winds up to 120 mph caused significant damage',
                    severityScore: 10,
                    windSpeed: 120,
                    hailSize: 0,
                    damageEstimate: {
                        potentialJobs: 300,
                        avgJobValue: 15000,
                        totalMarketValue: 4500000
                    },
                    zipCodes: ['32801', '32803', '32804', '32805', '32806', '32807', '32808', '32809']
                }],
                recommendations: [
                    'IMMEDIATE ACTION: Deploy all available crews to affected areas',
                    'Set up temporary operations center in affected region',
                    'Partner with local contractors for overflow work',
                    'Prepare for high volume of emergency tarping requests'
                ]
            }
        },
        {
            state: 'Oklahoma',
            severity: 'high',
            data: {
                severity: 'high',
                affectedAreas: [{
                    description: 'Norman, Moore, South Oklahoma City',
                    zipCodes: ['73019', '73026', '73069', '73070', '73071', '73072', '73160', '73165']
                }],
                worthCanvassing: true,
                details: [{
                    type: 'Severe Thunderstorm with Giant Hail',
                    severity: 'Severe',
                    areas: 'Norman, Moore, South OKC',
                    headline: 'Baseball Sized Hail Reported',
                    description: 'Baseball sized hail (2.75 inches) causing catastrophic damage',
                    severityScore: 9,
                    windSpeed: 65,
                    hailSize: 2.75,
                    damageEstimate: {
                        potentialJobs: 250,
                        avgJobValue: 10000,
                        totalMarketValue: 2500000
                    },
                    zipCodes: ['73019', '73026', '73069', '73070', '73071', '73072', '73160', '73165']
                }],
                recommendations: [
                    'IMMEDIATE ACTION: Deploy all available crews to affected areas',
                    'Focus on hail damage inspections - near 100% claim approval expected',
                    'Order additional materials - extreme shortage expected',
                    'Schedule crews for 7-day operations to handle volume'
                ]
            }
        },
        {
            state: 'Kansas',
            severity: 'moderate',
            data: {
                severity: 'moderate',
                affectedAreas: [{
                    description: 'Wichita East, Andover, Derby',
                    zipCodes: ['67037', '67055', '67206', '67207', '67218', '67220', '67226', '67230']
                }],
                worthCanvassing: true,
                details: [{
                    type: 'Severe Thunderstorm Warning',
                    severity: 'Moderate',
                    areas: 'Wichita Metro East',
                    headline: 'Quarter Sized Hail and Strong Winds',
                    description: 'Quarter sized hail (1 inch) with winds up to 60 mph',
                    severityScore: 5,
                    windSpeed: 60,
                    hailSize: 1.0,
                    damageEstimate: {
                        potentialJobs: 75,
                        avgJobValue: 6000,
                        totalMarketValue: 450000
                    },
                    zipCodes: ['67037', '67055', '67206', '67207', '67218', '67220', '67226', '67230']
                }],
                recommendations: [
                    'Schedule canvassing teams for next 48 hours',
                    'Prepare marketing materials highlighting storm damage',
                    'Alert crews for increased workload'
                ]
            }
        }
    ];

    console.log('Seeding storm data...');
    
    for (const storm of sampleStorms) {
        try {
            await db.logStormEvent(storm.state, storm.data);
            console.log(`Added ${storm.severity} storm for ${storm.state}`);
        } catch (error) {
            console.error(`Error adding storm for ${storm.state}:`, error);
        }
    }
    
    console.log('Storm data seeding complete!');
    process.exit(0);
}

seedStormData(); 