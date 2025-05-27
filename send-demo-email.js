const Database = require('./database');
const EmailService = require('./emailService');

async function sendDemoEmail() {
    console.log('📧 SENDING DEMONSTRATION STORM EMAIL');
    console.log('====================================\n');

    try {
        const db = new Database();
        await db.initialize();
        
        const emailService = new EmailService();

        // Get companies from Alabama (where we know there are subscriptions)
        const companies = await db.getCompaniesByState('Alabama');
        console.log(`📧 Found ${companies.length} companies to notify in Alabama`);
        
        if (companies.length === 0) {
            // Try Texas if no Alabama companies
            const texasCompanies = await db.getCompaniesByState('Texas');
            console.log(`📧 Found ${texasCompanies.length} companies to notify in Texas`);
            companies.push(...texasCompanies);
        }

        if (companies.length === 0) {
            console.log('❌ No companies found in database to send demo email to');
            return;
        }

        // Create a realistic storm event using our test data
        const demoStormEvent = {
            state: 'Alabama',
            severity: 'moderate',
            worthCanvassing: true,
            details: [{
                type: 'Flood Watch + Special Weather Statement',
                headline: 'Flood Watch and Thunderstorm Activity in Central Alabama',
                areas: 'Central Alabama, Birmingham Metro Area',
                damageEstimate: {
                    potentialJobs: 45,
                    avgJobValue: 8500,
                    totalMarketValue: 382500
                }
            }],
            recommendations: [
                'Monitor flood-prone areas for potential water damage',
                'Prepare equipment for roof and siding repairs from wind damage',
                'Contact local emergency services for road closure updates',
                'Begin outreach to affected neighborhoods within 24-48 hours'
            ],
            alerts: [
                {
                    properties: {
                        event: 'Flood Watch',
                        severity: 'Moderate',
                        areaDesc: 'Central Alabama',
                        headline: 'Flood Watch issued for Central Alabama',
                        description: 'Heavy rainfall expected across Central Alabama may cause flooding in low-lying areas. Residents should monitor conditions and be prepared to take action if flooding develops.',
                        effective: new Date().toISOString(),
                        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
                    }
                },
                {
                    properties: {
                        event: 'Special Weather Statement',
                        severity: 'Minor',
                        areaDesc: 'Birmingham Metro Area',
                        headline: 'Special Weather Statement for Birmingham Metro Area',
                        description: 'Strong thunderstorms developing across the Birmingham metro area. These storms may produce heavy rain, frequent lightning, and gusty winds.',
                        effective: new Date().toISOString(),
                        expires: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours from now
                    }
                }
            ],
            analysis: {
                severity: 'moderate',
                maxSeverityScore: 7,
                worthCanvassing: true,
                estimatedJobs: 45,
                alertCount: 2
            },
            timestamp: new Date().toISOString()
        };

        // Log this demo storm event
        await db.logStormEvent('Alabama', demoStormEvent);
        console.log(`📝 Logged demo storm event to database`);

        // Send emails to companies (limit to first 3 for demo)
        let emailsSent = 0;
        let emailsAttempted = 0;
        const companiesToEmail = companies.slice(0, 3); // Only send to first 3 companies for demo

        console.log(`\n📤 Sending demo emails to ${companiesToEmail.length} companies...\n`);

        for (const company of companiesToEmail) {
            try {
                emailsAttempted++;
                console.log(`📤 Sending demo email to ${company.company_name} (${company.email})...`);
                
                await emailService.sendStormAlert(company, demoStormEvent);
                emailsSent++;
                console.log(`   ✅ Email sent successfully`);
                
                // Small delay between emails
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (emailError) {
                console.error(`   ❌ Failed to send email to ${company.email}:`, emailError.message);
            }
        }

        console.log(`\n📊 DEMO EMAIL SUMMARY:`);
        console.log(`   State: Alabama`);
        console.log(`   Storm Type: Flood Watch + Special Weather Statement`);
        console.log(`   Storm Severity: ${demoStormEvent.analysis.severity}`);
        console.log(`   Alert Types: ${demoStormEvent.alerts.map(a => a.properties.event).join(', ')}`);
        console.log(`   Emails Attempted: ${emailsAttempted}`);
        console.log(`   Emails Sent: ${emailsSent}`);
        console.log(`   Success Rate: ${((emailsSent / emailsAttempted) * 100).toFixed(1)}%`);
        
        if (emailsSent > 0) {
            console.log(`\n🎉 SUCCESS: Demo storm alert emails sent!`);
            console.log(`   This demonstrates that the email system is working correctly.`);
            console.log(`   The system will now automatically send real emails when storms occur.`);
        } else {
            console.log(`\n❌ FAILURE: No demo emails were successfully sent`);
            console.log(`   Check email configuration and try again.`);
        }

    } catch (error) {
        console.error('❌ Critical error:', error);
    }
}

// Run the demo email sender
sendDemoEmail().catch(console.error); 