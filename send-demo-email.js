const EmailService = require('./emailService');
const StormAnalyzer = require('./stormAnalyzer');

async function sendDemoEmail() {
    console.log('🌩️ Sending demonstration storm email with professional template...');
    
    const emailService = new EmailService();
    const stormAnalyzer = new StormAnalyzer();
    
    // Create realistic demo storm event data
    const demoStormEvent = {
        state: 'Alabama',
        severity: 'high',
        worthCanvassing: true,
        details: [{
            type: 'Severe Thunderstorm Warning with Large Hail',
            severity: 'Severe',
            areas: 'Birmingham, Hoover, Vestavia Hills, Mountain Brook, Homewood AL',
            headline: 'Severe Thunderstorm Warning with Large Hail and Damaging Winds',
            description: 'A severe thunderstorm capable of producing hail up to 1.75 inches in diameter and winds up to 70 mph is moving through the Birmingham metropolitan area. Expect significant roof damage to vehicles and property.',
            severityScore: 8,
            windSpeed: 70,
            hailSize: 1.75,
            damageEstimate: {
                potentialJobs: 150,
                avgJobValue: 9000,
                totalMarketValue: 1350000
            },
            zipCodes: ['35203', '35205', '35209', '35213', '35216', '35223', '35226', '35242', '35244', '35266']
        }],
        recommendations: [
            'Deploy canvassing teams to affected zip codes',
            'Prepare for emergency tarping and restoration demand',
            'Expect strong approval rate for hail claims',
            'Document hail size with photos and measurements',
            'Focus on metal surfaces and soft metals for damage evidence',
            'Inspect for wind uplift and gutter damage',
            'Check for missing shingles and flashing',
            'Document wind speed from weather reports'
        ],
        analysis: {
            timestamp: new Date().toISOString()
        }
    };

    // Demo company data
    const demoCompanies = [{
        name: 'Demo Roofing Company',
        email: 'dylandirosa980@gmail.com',
        company_name: 'Demo Roofing Company'
    }];

    try {
        console.log('\n📧 Testing professional storm alert email...');
        
        // Test the new professional email template
        const result = await emailService.sendStormAlert(demoStormEvent, demoCompanies);
        
        console.log('\n✅ Demo email sent successfully!');
        console.log(`📊 Email Statistics:`);
        console.log(`   • Emails sent: ${result.successCount}`);
        console.log(`   • Emails failed: ${result.errorCount}`);
        console.log(`   • Market value: $${emailService.formatCurrency(result.marketData.totalValue)}`);
        console.log(`   • Estimated jobs: ${result.marketData.jobCount}`);
        console.log(`   • Avg job value: $${result.marketData.avgJobValue.toLocaleString()}`);
        
        console.log('\n🎯 Features Demonstrated:');
        console.log('   ✅ Professional HTML email template');
        console.log('   ✅ Dynamic variable replacement');
        console.log('   ✅ Market opportunity calculations');
        console.log('   ✅ Severity scoring and text generation');
        console.log('   ✅ Unsubscribe link generation');
        console.log('   ✅ Responsive design for mobile devices');
        console.log('   ✅ Storm-specific recommendations');
        console.log('   ✅ Professional branding and styling');
        
        console.log('\n📱 Check your email to see the professional storm alert!');
        
    } catch (error) {
        console.error('❌ Failed to send demo email:', error.message);
        console.error('💡 Make sure your email credentials are configured in environment variables:');
        console.error('   EMAIL_USER=your-gmail@gmail.com');
        console.error('   EMAIL_PASS=your-app-password');
    }
}

// Test additional email service features
async function testEmailFeatures() {
    console.log('\n🧪 Testing additional email service features...');
    
    const emailService = new EmailService();
    
    // Test severity text generation
    console.log('\n📊 Severity Text Tests:');
    for (let score = 1; score <= 10; score++) {
        const severityText = emailService.getSeverityText(score);
        console.log(`   Score ${score}: ${severityText}`);
    }
    
    // Test currency formatting
    console.log('\n💰 Currency Formatting Tests:');
    const testValues = [500, 1500, 15000, 150000, 1500000, 15000000];
    testValues.forEach(value => {
        const formatted = emailService.formatCurrency(value);
        console.log(`   $${value.toLocaleString()} → $${formatted}`);
    });
    
    // Test unsubscribe URL generation
    console.log('\n🔗 Unsubscribe URL Test:');
    const testEmail = 'test@example.com';
    const testZipCodes = ['35203', '35205', '35209'];
    const unsubscribeUrl = emailService.generateUnsubscribeUrl(testEmail, testZipCodes);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Zip Codes: ${testZipCodes.join(', ')}`);
    console.log(`   Unsubscribe URL: ${unsubscribeUrl}`);
    
    // Test market opportunity calculation
    console.log('\n📈 Market Opportunity Calculation Test:');
    const testStormData = {
        severityScore: 8,
        zipCodes: ['35203', '35205', '35209', '35213', '35216'],
        hailSize: 1.5,
        windSpeed: 65,
        stormType: 'Severe Thunderstorm with Large Hail',
        potentialJobs: 120,
        avgJobValue: 8500
    };
    
    const marketData = emailService.calculateMarketOpportunity(testStormData);
    console.log(`   Input: ${testStormData.zipCodes.length} zip codes, severity ${testStormData.severityScore}`);
    console.log(`   Output: ${marketData.jobCount} jobs, $${marketData.avgJobValue.toLocaleString()} avg, $${emailService.formatCurrency(marketData.totalValue)} total`);
}

// Run the demo
async function runDemo() {
    console.log('🚀 Starting Professional Storm Alert Email Demo\n');
    
    await testEmailFeatures();
    await sendDemoEmail();
    
    console.log('\n🎉 Demo completed! Check the server logs and your email inbox.');
}

runDemo().catch(console.error); 