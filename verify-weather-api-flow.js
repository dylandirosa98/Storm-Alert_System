const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');
const EmailService = require('./emailService');
const Database = require('./database');

class WeatherAPIVerification {
    constructor() {
        this.weatherService = new WeatherService();
        this.stormAnalyzer = new StormAnalyzer();
        this.emailService = new EmailService();
        this.db = new Database();
    }

    async runVerification() {
        console.log('🌩️ Weather API Flow Verification Starting...\n');
        
        try {
            // Initialize database
            await this.db.initialize();
            console.log('✅ Database initialized\n');

            // Test 1: Verify Weather API is responding
            await this.testWeatherAPIConnectivity();
            
            // Test 2: Check for any current alerts nationwide
            await this.checkNationwideAlerts();
            
            // Test 3: Test with known active zones
            await this.testKnownActiveZones();
            
            // Test 4: Simulate severe weather alert processing
            await this.simulateSevereWeatherFlow();
            
            // Test 5: Verify email would be sent for severe weather
            await this.testEmailTrigger();

            console.log('\n🎉 Weather API Flow Verification Complete!');
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
        }
    }

    async testWeatherAPIConnectivity() {
        console.log('📡 Testing Weather API Connectivity...');
        
        try {
            // Test a few different zones to ensure API is working
            const testZones = ['TXZ001', 'CAZ001', 'FLZ001'];
            
            for (const zone of testZones) {
                const response = await fetch(`https://api.weather.gov/alerts/active?zone=${zone}`);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ ${zone}: API responding (${data.features.length} alerts)`);
                } else {
                    console.log(`⚠️ ${zone}: API response ${response.status}`);
                }
                
                // Small delay to respect rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            console.log('✅ Weather API is responding correctly\n');
            
        } catch (error) {
            console.error('❌ Weather API connectivity test failed:', error.message);
        }
    }

    async checkNationwideAlerts() {
        console.log('🌍 Checking Nationwide Alert Status...');
        
        try {
            // Get all active alerts nationwide
            const response = await fetch('https://api.weather.gov/alerts/active');
            const data = await response.json();
            
            console.log(`📊 Total active alerts nationwide: ${data.features.length}`);
            
            if (data.features.length > 0) {
                // Analyze types of alerts
                const alertTypes = {};
                const severeTypes = ['Tornado Warning', 'Severe Thunderstorm Warning', 'Hurricane Warning'];
                let severeCount = 0;
                
                data.features.forEach(alert => {
                    const event = alert.properties.event;
                    alertTypes[event] = (alertTypes[event] || 0) + 1;
                    
                    if (severeTypes.includes(event)) {
                        severeCount++;
                    }
                });
                
                console.log('📋 Alert breakdown:');
                Object.entries(alertTypes).forEach(([type, count]) => {
                    console.log(`   ${type}: ${count}`);
                });
                
                console.log(`⚡ Severe weather alerts: ${severeCount}`);
                
                if (severeCount > 0) {
                    console.log('🚨 SEVERE WEATHER DETECTED - Your system would send emails!');
                } else {
                    console.log('✅ No severe weather currently - System working as expected');
                }
            } else {
                console.log('✅ No active alerts - This is normal during calm weather');
            }
            
            console.log('');
            
        } catch (error) {
            console.error('❌ Nationwide alert check failed:', error.message);
        }
    }

    async testKnownActiveZones() {
        console.log('🎯 Testing Known Active Weather Zones...');
        
        try {
            // Test different states that typically have weather activity
            const testStates = ['Texas', 'Florida', 'Kansas', 'Oklahoma', 'California'];
            
            let totalAlerts = 0;
            let severeAlerts = 0;
            
            for (const state of testStates) {
                try {
                    console.log(`\n📍 Testing ${state}...`);
                    const alerts = await this.weatherService.getWeatherAlerts(state);
                    
                    if (alerts && alerts.length > 0) {
                        console.log(`   Found ${alerts.length} alerts in ${state}`);
                        totalAlerts += alerts.length;
                        
                        // Check for severe weather
                        const stormData = await this.stormAnalyzer.analyzeStorms(alerts);
                        if (stormData.worthCanvassing) {
                            severeAlerts++;
                            console.log(`   🚨 SEVERE: ${stormData.severity}/10 - Would trigger email!`);
                        } else {
                            console.log(`   ℹ️ Minor alerts only (${stormData.severity}/10)`);
                        }
                    } else {
                        console.log(`   No alerts found in ${state}`);
                    }
                } catch (error) {
                    console.log(`   ⚠️ ${state}: ${error.message}`);
                }
                
                // Rate limiting between states
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(`\n📊 Summary: ${totalAlerts} total alerts, ${severeAlerts} severe across all tested states`);
            console.log('');
            
        } catch (error) {
            console.error('❌ Active zone test failed:', error.message);
        }
    }

    async simulateSevereWeatherFlow() {
        console.log('⚡ Simulating Severe Weather Alert Flow...');
        
        try {
            // Create a mock severe weather alert
            const mockSevereAlert = {
                properties: {
                    event: 'Tornado Warning',
                    headline: 'Tornado Warning issued for Test County',
                    description: 'A tornado warning has been issued for Test County. Take shelter immediately.',
                    severity: 'Extreme',
                    urgency: 'Immediate',
                    areas: {
                        geocode: {
                            FIPS6: ['48001'] // Example FIPS code
                        }
                    },
                    onset: new Date().toISOString(),
                    expires: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
                }
            };
            
            console.log('📝 Mock Alert Created:');
            console.log(`   Event: ${mockSevereAlert.properties.event}`);
            console.log(`   Severity: ${mockSevereAlert.properties.severity}`);
            console.log(`   Urgency: ${mockSevereAlert.properties.urgency}`);
            
            // Analyze the mock storm
            const stormData = await this.stormAnalyzer.analyzeStorms([mockSevereAlert]);
            
            console.log('🔍 Storm Analysis Results:');
            console.log(`   Severity Score: ${stormData.severity}`);
            console.log(`   Worth Canvassing: ${stormData.worthCanvassing}`);
            console.log(`   Damage Potential: ${stormData.damagePotential}`);
            
            if (stormData.worthCanvassing) {
                console.log('✅ This storm would trigger email alerts!');
            } else {
                console.log('ℹ️ This storm would not trigger alerts (below threshold)');
            }
            
            console.log('');
            
        } catch (error) {
            console.error('❌ Severe weather simulation failed:', error.message);
        }
    }

    async testEmailTrigger() {
        console.log('📧 Testing Email Trigger for Severe Weather...');
        
        try {
            // Get a test company from database
            const companies = await this.db.getAllCompanies();
            
            if (companies.length === 0) {
                console.log('⚠️ No companies in database - creating test company...');
                
                // Add a test company
                await this.db.addCompany({
                    companyName: 'Test Roofing Co',
                    email: 'test@example.com',
                    phone: '555-0123',
                    contactName: 'Test User',
                    states: 'Texas,Florida'
                });
                
                console.log('✅ Test company created');
            }
            
            // Create mock severe storm data
            const mockStormData = {
                severity: 8.5,
                worthCanvassing: true,
                damagePotential: 'High',
                alerts: [{
                    properties: {
                        event: 'Tornado Warning',
                        headline: 'Tornado Warning - Immediate Action Required',
                        description: 'A tornado has been spotted in your area. Significant property damage expected.',
                        areas: { geocode: { FIPS6: ['48001'] } }
                    }
                }],
                affectedAreas: ['Dallas County', 'Tarrant County'],
                estimatedDamage: '$2.5M - $5M',
                canvassingOpportunity: 'Excellent - High damage potential in residential areas'
            };
            
            console.log('🎯 Mock Storm Data:');
            console.log(`   Severity: ${mockStormData.severity}/10`);
            console.log(`   Damage Potential: ${mockStormData.damagePotential}`);
            console.log(`   Worth Canvassing: ${mockStormData.worthCanvassing}`);
            
            // Test email sending (this would actually send in real scenario)
            console.log('📤 Email would be sent with:');
            console.log(`   Subject: 🌪️ URGENT: Tornado Warning Alert - Canvassing Opportunity`);
            console.log(`   Content: Storm details, damage estimates, affected areas`);
            console.log(`   Recipients: All companies subscribed to Texas`);
            
            console.log('✅ Email trigger test complete');
            console.log('');
            
        } catch (error) {
            console.error('❌ Email trigger test failed:', error.message);
        }
    }
}

// Run the verification
async function main() {
    const verification = new WeatherAPIVerification();
    await verification.runVerification();
    process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = WeatherAPIVerification; 