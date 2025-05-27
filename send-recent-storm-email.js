const Database = require('./database');
const WeatherService = require('./weatherService');
const StormAnalyzer = require('./stormAnalyzer');
const EmailService = require('./emailService');

async function sendRecentStormEmail() {
    console.log('🌩️ FINDING RECENT STORM AND SENDING EMAIL');
    console.log('==========================================\n');

    try {
        const db = new Database();
        await db.initialize();
        
        const weatherService = new WeatherService();
        const stormAnalyzer = new StormAnalyzer();
        const emailService = new EmailService();

        // Get subscribed states
        const subscribedStates = await db.getSubscribedStates();
        console.log(`📍 Checking ${subscribedStates.length} subscribed states for recent storms...\n`);

        let bestStorm = null;
        let bestState = null;
        let bestAlerts = null;

        // Check states with known activity (Alabama first since we saw alerts there)
        const priorityStates = ['Alabama', 'Texas', 'Oklahoma', 'Missouri', 'Arkansas', 'Louisiana'];
        const statesToCheck = [...priorityStates, ...subscribedStates.filter(s => !priorityStates.includes(s))];

        for (const state of statesToCheck.slice(0, 10)) { // Check first 10 states
            console.log(`⏳ Checking ${state}...`);
            
            try {
                const alerts = await weatherService.getWeatherAlerts(state);
                
                if (alerts && alerts.length > 0) {
                    console.log(`📋 Found ${alerts.length} alerts in ${state}`);
                    
                    const analysis = stormAnalyzer.analyzeStorms(alerts);
                    
                    if (analysis.worthCanvassing) {
                        console.log(`🎯 FOUND QUALIFYING STORM in ${state}!`);
                        console.log(`   Severity: ${analysis.severity}`);
                        console.log(`   Alert Count: ${alerts.length}`);
                        
                        // Use this as our best storm (first qualifying one we find)
                        bestStorm = analysis;
                        bestState = state;
                        bestAlerts = alerts;
                        break; // Use the first qualifying storm we find
                    } else {
                        console.log(`   ℹ️ Alerts found but not severe enough for ${state}`);
                    }
                } else {
                    console.log(`   ✅ No alerts in ${state}`);
                }
                
                // Small delay between states
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`❌ Error checking ${state}:`, error.message);
            }
        }

        if (bestStorm && bestState && bestAlerts) {
            console.log(`\n🌩️ SENDING EMAIL FOR STORM IN ${bestState.toUpperCase()}`);
            console.log('='.repeat(50));
            
            // Get companies for this state
            const companies = await db.getCompaniesByState(bestState);
            console.log(`📧 Found ${companies.length} companies to notify in ${bestState}`);
            
            if (companies.length > 0) {
                // Create storm event data
                const stormEvent = {
                    state: bestState,
                    alerts: bestAlerts,
                    analysis: bestStorm,
                    timestamp: new Date().toISOString()
                };

                // Log the storm event
                await db.logStormEvent(bestState, stormEvent);
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
                        
                        // Small delay between emails
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (emailError) {
                        console.error(`   ❌ Failed to send email to ${company.email}:`, emailError.message);
                    }
                }

                console.log(`\n📊 EMAIL SUMMARY:`);
                console.log(`   State: ${bestState}`);
                console.log(`   Storm Severity: ${bestStorm.severity}`);
                console.log(`   Alert Types: ${bestAlerts.map(a => a.properties.event).join(', ')}`);
                console.log(`   Emails Attempted: ${emailsAttempted}`);
                console.log(`   Emails Sent: ${emailsSent}`);
                console.log(`   Success Rate: ${((emailsSent / emailsAttempted) * 100).toFixed(1)}%`);
                
                if (emailsSent > 0) {
                    console.log(`\n🎉 SUCCESS: Sent storm alert emails for recent ${bestState} storm!`);
                } else {
                    console.log(`\n❌ FAILURE: No emails were successfully sent`);
                }

            } else {
                console.log(`⚠️ No companies found for ${bestState} - no emails to send`);
            }

        } else {
            console.log(`\n❌ NO QUALIFYING STORMS FOUND`);
            console.log(`   • Checked 10 states for recent storm activity`);
            console.log(`   • Either no alerts active, or alerts don't meet severity threshold`);
            console.log(`   • This is normal during calm weather periods`);
            console.log(`   • The system will automatically send emails when severe weather occurs`);
        }

    } catch (error) {
        console.error('❌ Critical error:', error);
    }
}

// Run the email sender
sendRecentStormEmail().catch(console.error); 