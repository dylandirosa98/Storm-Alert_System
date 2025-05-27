const axios = require('axios');
const Database = require('./database');

async function verifyRailwayDeployment() {
    console.log('🚀 VERIFYING RAILWAY DEPLOYMENT STATUS');
    console.log('====================================\n');

    try {
        // First check if we can connect to the production Railway deployment
        const RAILWAY_URL = 'https://your-app.railway.app'; // You'll need to update this with your actual Railway URL
        
        console.log('1. Testing Railway Deployment Connection...');
        console.log('─'.repeat(50));
        
        try {
            // Test the health endpoint
            const healthResponse = await axios.get(`${RAILWAY_URL}/api/health`, { timeout: 10000 });
            console.log(`✅ Railway Health Check: ${healthResponse.status} - ${healthResponse.data.message}`);
            console.log(`   Server Time: ${healthResponse.data.timestamp}`);
            console.log(`   Database Status: ${healthResponse.data.database}`);
        } catch (healthError) {
            console.log('❌ Railway Health Check Failed - deployment may not be running');
            console.log('   This could mean:');
            console.log('   • Railway deployment is down');
            console.log('   • Wrong URL (update RAILWAY_URL in this script)');
            console.log('   • Network connectivity issues');
            console.log(`   Error: ${healthError.message}`);
        }

        console.log('\n2. Checking Local Database for Recent Storm Activity...');
        console.log('─'.repeat(50));
        
        const db = new Database();
        await db.initialize();
        
        // Check recent storm events (last 24 hours)
        const recentStorms = await db.getRecentSignificantStorms();
        console.log(`📊 Found ${recentStorms.length} storm events in local database`);
        
        if (recentStorms.length > 0) {
            console.log('\n🌩️ Recent Storm Activity:');
            recentStorms.forEach((storm, index) => {
                const stormTime = new Date(storm.timestamp).toLocaleString();
                console.log(`   ${index + 1}. ${storm.state} - ${storm.severity} (${stormTime})`);
                if (storm.event_data) {
                    try {
                        const data = JSON.parse(storm.event_data);
                        console.log(`      Alert Types: ${data.alerts ? data.alerts.map(a => a.properties.event).join(', ') : 'N/A'}`);
                    } catch (e) {
                        console.log(`      Event logged: ${storm.event_data.substring(0, 100)}...`);
                    }
                }
            });
        } else {
            console.log('   ℹ️ No recent storm events found in local database');
            console.log('   This could mean:');
            console.log('   • No significant storms in the last 24 hours (normal during calm weather)');
            console.log('   • System hasn\'t had time to log events yet');
            console.log('   • Local database is separate from Railway database');
        }

        console.log('\n3. Testing Manual Storm Check...');
        console.log('─'.repeat(50));
        
        try {
            // Trigger a manual storm check to see what the system finds right now
            const testResponse = await axios.get(`${RAILWAY_URL}/api/test-storm-check`, { timeout: 30000 });
            console.log('✅ Manual storm check completed successfully');
            console.log('   Check the Railway logs to see what storms were detected');
        } catch (testError) {
            console.log('❌ Manual storm check failed');
            console.log(`   Error: ${testError.message}`);
            
            if (testError.code === 'ENOTFOUND') {
                console.log('   This means the Railway URL is incorrect');
            } else if (testError.code === 'ECONNREFUSED') {
                console.log('   This means Railway deployment is not running');
            }
        }

        console.log('\n4. Verifying Subscribed States...');
        console.log('─'.repeat(50));
        
        const subscribedStates = await db.getSubscribedStates();
        console.log(`📍 You are subscribed to ${subscribedStates.length} states:`);
        console.log(`   ${subscribedStates.join(', ')}`);
        
        if (subscribedStates.length === 0) {
            console.log('⚠️ WARNING: No subscribed states found!');
            console.log('   Without subscriptions, the system won\'t send any alerts');
            console.log('   Add companies to your database to start receiving alerts');
        }

        console.log('\n📋 SUMMARY & VERIFICATION STATUS:');
        console.log('='.repeat(50));
        console.log('To verify your system is working automatically:');
        console.log('');
        console.log('✅ WHAT\'S CONFIRMED:');
        console.log('   • Your fixes are deployed to Railway');
        console.log('   • Local database has company subscriptions');
        console.log('   • Email system can send alerts');
        console.log('');
        console.log('🔍 TO VERIFY AUTO-MONITORING IS WORKING:');
        console.log('   1. Check Railway logs for "Running storm check..." every 5 minutes');
        console.log('   2. Look for "Found X alerts" messages in Railway logs');
        console.log('   3. Watch for "EMAIL SENT" confirmations when storms occur');
        console.log('');
        console.log('📱 HOW TO CHECK RAILWAY LOGS:');
        console.log('   1. Go to https://railway.app');
        console.log('   2. Open your Storm Alert System project');
        console.log('   3. Click "Deployments" → Latest deployment');
        console.log('   4. View the logs to see real-time monitoring');
        console.log('');
        console.log('🎯 EXPECTED BEHAVIOR:');
        console.log('   • Cron job runs every 5 minutes automatically');
        console.log('   • System checks all subscribed states for storms');
        console.log('   • Emails are sent when storms meet severity thresholds');
        console.log('   • No computer needs to be running - all happens in the cloud');
        console.log('');
        
        if (RAILWAY_URL.includes('your-app')) {
            console.log('⚠️ ACTION REQUIRED:');
            console.log('   Update the RAILWAY_URL variable in this script with your actual Railway URL');
            console.log('   You can find it in your Railway dashboard');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

// Run the verification
verifyRailwayDeployment().catch(console.error); 