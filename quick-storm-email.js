const Database = require('./database');
const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');
const EmailService = require('./emailService');

async function quickStormEmail() {
    console.log('🌩️ QUICK STORM EMAIL SENDER');
    console.log('============================\n');

    try {
        const db = new Database();
        await db.initialize();
        
        const weatherService = new WeatherService();
        const stormAnalyzer = new StormAnalyzer();
        const emailService = new EmailService();

        // Check just a few high-activity states
        const statesToCheck = ['Alabama', 'Texas', 'Oklahoma', 'Missouri', 'Arkansas'];
        
        console.log(`📍 Checking ${statesToCheck.length} high-activity states for storms...\n`);

        for (const state of statesToCheck) {
            console.log(`⏳ Checking ${state}...`);
            
            try {
                const alerts = await weatherService.getWeatherAlerts(state);
                
                if (alerts && alerts.length > 0) {
                    console.log(`📋 Found ${alerts.length} alerts in ${state}`);
                    
                    const analysis = stormAnalyzer.analyzeStorms(alerts);
                    
                    console.log(`   Analysis: Severity=${analysis.severity}, Worth Canvassing=${analysis.worthCanvassing}`);
                    
                    if (analysis.worthCanvassing) {
                        console.log(`🎯 FOUND QUALIFYING STORM in ${state}!`);
                        
                        // Get companies for this state
                        const companies = await db.getCompaniesByState(state);
                        console.log(`📧 Found ${companies.length} companies to notify in ${state}`);
                        
                        if (companies.length > 0) {
                            // Create storm event data
                            const stormEvent = {
                                state: state,
                                alerts: alerts,
                                analysis: analysis,
                                timestamp: new Date().toISOString()
                            };

                            // Log the storm event
                            await db.logStormEvent(state, stormEvent);
                            console.log(`📝 Logged storm event to database`);

                            // Send emails to all companies in this state
                            let emailsSent = 0;
                            let emailsAttempted = 0;

                            for (const company of companies) {
                                try {
                                    emailsAttempted++;
                                    console.log(`📤 Sending email to ${company.company_name} (${company.email})...`);
                                    
                                    await emailService.sendStormAlert(company, stormEvent);
                                    emailsSent++;
                                    console.log(`   ✅ Email sent successfully`);
                                    
                                } catch (emailError) {
                                    console.error(`   ❌ Failed to send email to ${company.email}:`, emailError.message);
                                }
                            }

                            console.log(`\n📊 EMAIL SUMMARY FOR ${state}:`);
                            console.log(`   Storm Severity: ${analysis.severity}`);
                            console.log(`   Alert Types: ${alerts.map(a => a.properties.event).join(', ')}`);
                            console.log(`   Emails Attempted: ${emailsAttempted}`);
                            console.log(`   Emails Sent: ${emailsSent}`);
                            
                            if (emailsSent > 0) {
                                console.log(`\n🎉 SUCCESS: Sent storm alert emails for ${state} storm!`);
                                return; // Exit after sending first successful batch
                            }

                        } else {
                            console.log(`⚠️ No companies found for ${state} - no emails to send`);
                        }
                    } else {
                        console.log(`   ℹ️ Alerts found but not severe enough (score too low)`);
                    }
                } else {
                    console.log(`   ✅ No alerts in ${state}`);
                }
                
            } catch (error) {
                console.error(`❌ Error checking ${state}:`, error.message);
            }
        }

        console.log(`\n❌ NO QUALIFYING STORMS FOUND in checked states`);
        console.log(`   • This is normal during calm weather periods`);
        console.log(`   • The system will automatically send emails when severe weather occurs`);

    } catch (error) {
        console.error('❌ Critical error:', error);
    }
}

// Run the quick email sender
quickStormEmail().catch(console.error); 