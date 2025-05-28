const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const Database = require('./database');
const WeatherService = require('./weatherService');
const EmailService = require('./emailService');
const StormAnalyzer = require('./stormAnalyzer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Initialize services
const db = new Database();
const weatherService = new WeatherService();
const emailService = new EmailService();
const stormAnalyzer = new StormAnalyzer();

// Serve landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
    try {
        const { companyName, email, phone, contactName, states } = req.body;
        
        if (!companyName || !email || !contactName || !states || states.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            const companyId = await db.addCompany({
                companyName,
                email,
                phone,
                contactName,
                states: states.join(',')
            });

            try {
                // Send welcome email to the company
                await emailService.sendWelcomeEmail(email, companyName, states);
                
                // Send notification to admin
                await emailService.sendAdminNotification({
                    companyName,
                    email,
                    phone,
                    contactName,
                    states
                });
            } catch (emailError) {
                console.error('Failed to send emails:', emailError);
                // Don't return error to client, continue with subscription
            }

            // Check for recent significant storms in their selected states
            const recentStorm = await db.getRecentSignificantStorms(states);
            
            if (recentStorm) {
                try {
                    // Get the company data we just saved
                    const company = await db.getCompanyById(companyId);
                    
                    // Parse the storm data
                    const stormData = JSON.parse(recentStorm.event_data);
                    
                    // Send the recent storm alert as a "sample"
                    await emailService.sendRecentStormAlert(company, stormData, recentStorm.state, recentStorm.created_at);
                } catch (stormEmailError) {
                    console.error('Failed to send storm alert:', stormEmailError);
                    // Don't return error to client, continue with subscription
                }
            }

            res.json({ success: true, message: 'Successfully subscribed to storm alerts' });
        } catch (dbError) {
            // Check if error is due to duplicate email
            if (dbError.message && dbError.message.includes('UNIQUE constraint failed: companies.email')) {
                return res.status(400).json({ error: 'This email is already subscribed to storm alerts' });
            }
            throw dbError;
        }
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});

// Test storm check endpoint
app.get('/api/test-storm-check', async (req, res) => {
    console.log('Manual storm check triggered...');
    const subscribedStates = await db.getSubscribedStates();
    
    for (const state of subscribedStates) {
        console.log(`Checking ${state}...`);
        const alerts = await weatherService.getComprehensiveWeatherAlerts(state);
        console.log(`Found ${alerts.length} total alerts (active + recent)`);
        
        if (alerts.length > 0) {
            const stormData = await stormAnalyzer.analyzeStorms(alerts);
            console.log('Storm severity:', stormData.severity);
            console.log('Worth canvassing:', stormData.worthCanvassing);
        }
    }
    
    res.json({ message: 'Comprehensive check complete - see server console' });
});

// Initialize database
function initializeDatabase() {
    // Create companies table
    db.run(`CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        contact_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        states TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create unsubscribes table
    db.run(`CREATE TABLE IF NOT EXISTS unsubscribes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        zip_codes TEXT,
        unsubscribe_token TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        all_alerts BOOLEAN DEFAULT FALSE
    )`);

    console.log('Database initialized successfully');
}

// Unsubscribe endpoint
app.get('/unsubscribe', (req, res) => {
    const { token, email } = req.query;
    
    if (!token || !email) {
        return res.status(400).send(`
            <html>
                <head><title>Invalid Unsubscribe Link</title></head>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                    <h2 style="color: #e74c3c;">Invalid Unsubscribe Link</h2>
                    <p>The unsubscribe link is invalid or expired.</p>
                </body>
            </html>
        `);
    }

    // For now, we'll do a simple unsubscribe from all alerts
    // In a production system, you'd validate the token more securely
    db.run(
        `INSERT OR REPLACE INTO unsubscribes (email, all_alerts, unsubscribe_token) VALUES (?, ?, ?)`,
        [email, true, token],
        function(err) {
            if (err) {
                console.error('Error processing unsubscribe:', err);
                return res.status(500).send(`
                    <html>
                        <head><title>Unsubscribe Error</title></head>
                        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                            <h2 style="color: #e74c3c;">Error Processing Unsubscribe</h2>
                            <p>There was an error processing your unsubscribe request. Please try again later.</p>
                        </body>
                    </html>
                `);
            }

            console.log(`✅ User unsubscribed: ${email}`);
            res.send(`
                <html>
                    <head><title>Successfully Unsubscribed</title></head>
                    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
                        <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
                            <h2 style="color: #155724; margin: 0;">✅ Successfully Unsubscribed</h2>
                        </div>
                        <p>You have been successfully unsubscribed from storm alerts.</p>
                        <p>Email: <strong>${email}</strong></p>
                        <p style="color: #6c757d; font-size: 14px; margin-top: 30px;">
                            If you change your mind, you can always resubscribe by visiting our registration page.
                        </p>
                    </body>
                </html>
            `);
        }
    );
});

// Function to check if user is unsubscribed
function isUnsubscribed(email, callback) {
    db.get(
        `SELECT * FROM unsubscribes WHERE email = ? AND all_alerts = 1`,
        [email],
        (err, row) => {
            if (err) {
                console.error('Error checking unsubscribe status:', err);
                callback(false); // Default to not unsubscribed on error
            } else {
                callback(!!row); // Return true if row exists
            }
        }
    );
}

// Modified storm checking function to filter unsubscribed users
async function checkForStormsAndAlert() {
    console.log('\n🔍 Starting comprehensive storm check...');
    
    // Get all subscribed states
    db.all('SELECT DISTINCT states FROM companies', async (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return;
        }

        const subscribedStates = new Set();
        rows.forEach(row => {
            const states = JSON.parse(row.states);
            states.forEach(state => subscribedStates.add(state));
        });

        console.log(`📊 Checking ${subscribedStates.size} subscribed states for storms...`);

        for (const state of subscribedStates) {
            try {
                console.log(`\n🌩️ Checking ${state} for comprehensive weather alerts...`);
                
                // Use comprehensive weather alerts (active + historical)
                const alerts = await weatherService.getComprehensiveWeatherAlerts(state);
                console.log(`📋 Found ${alerts.length} total alerts (active + recent historical) for ${state}`);

                if (alerts.length > 0) {
                    const stormAnalysis = stormAnalyzer.analyzeStorms(alerts);
                    
                    if (stormAnalysis.length > 0) {
                        console.log(`⚡ ${stormAnalysis.length} qualifying storm events found in ${state}!`);
                        
                        // Get companies subscribed to this state
                        db.all(
                            'SELECT * FROM companies WHERE states LIKE ?',
                            [`%"${state}"%`],
                            async (err, companies) => {
                                if (err) {
                                    console.error('Error fetching companies:', err);
                                    return;
                                }

                                if (companies.length === 0) {
                                    console.log(`📭 No companies subscribed to ${state}`);
                                    return;
                                }

                                console.log(`📧 Found ${companies.length} companies subscribed to ${state}`);

                                // Filter out unsubscribed users
                                const activeCompanies = [];
                                let processedCount = 0;

                                for (const company of companies) {
                                    isUnsubscribed(company.email, (unsubscribed) => {
                                        processedCount++;
                                        
                                        if (!unsubscribed) {
                                            activeCompanies.push(company);
                                        } else {
                                            console.log(`🚫 Skipping unsubscribed user: ${company.email}`);
                                        }

                                        // When all companies are processed, send alerts
                                        if (processedCount === companies.length) {
                                            if (activeCompanies.length > 0) {
                                                console.log(`📤 Sending alerts to ${activeCompanies.length} active subscribers`);
                                                
                                                // Send alerts to each qualifying storm
                                                for (const storm of stormAnalysis) {
                                                    emailService.sendStormAlert(storm, activeCompanies)
                                                        .then(result => {
                                                            console.log(`✅ Storm alert batch completed: ${result.successCount} sent, ${result.errorCount} failed`);
                                                        })
                                                        .catch(error => {
                                                            console.error('❌ Error sending storm alerts:', error);
                                                        });
                                                }
                                            } else {
                                                console.log(`📭 No active subscribers for ${state} (all unsubscribed)`);
                                            }
                                        }
                                    });
                                }
                            }
                        );
                    } else {
                        console.log(`📊 No qualifying storms found in ${state} (filtered out by roofing criteria)`);
                    }
                } else {
                    console.log(`☀️ No alerts found for ${state}`);
                }
            } catch (error) {
                console.error(`❌ Error checking storms for ${state}:`, error);
            }
        }
    });
}

// Start server function
async function startServer() {
    try {
        // Initialize database first
        await db.initialize();
        console.log('Database initialized successfully');

        // Start the server
        app.listen(PORT, () => {
            console.log(`Storm Alert System running on http://localhost:${PORT}`);
        });

        // Set up cron job
        cron.schedule('0 */2 * * *', async () => {
            const startTime = new Date();
            console.log(`\n🕐 ========== STORM CHECK STARTED: ${startTime.toLocaleString()} ==========`);
            
            try {
                // Initialize database if needed
                if (!db.isInitialized) {
                    console.log('📊 Initializing database...');
                    await db.initialize();
                }
                
                const subscribedStates = await db.getSubscribedStates();
                console.log(`📍 Checking ${subscribedStates.length} subscribed states: ${subscribedStates.join(', ')}`);
                
                let totalAlertsFound = 0;
                let totalEmailsSent = 0;
                let statesWithAlerts = [];
                
                for (const state of subscribedStates) {
                    console.log(`\n🌍 Checking ${state} for weather alerts...`);
                    
                    try {
                        const alerts = await weatherService.getComprehensiveWeatherAlerts(state);
                        console.log(`📋 Found ${alerts ? alerts.length : 0} total alerts in ${state} (active + recent)`);
                        
                        if (alerts && alerts.length > 0) {
                            totalAlertsFound += alerts.length;
                            statesWithAlerts.push(`${state} (${alerts.length})`);
                            
                            console.log(`🔍 Analyzing storms in ${state}...`);
                            const stormData = await stormAnalyzer.analyzeStorms(alerts);
                            
                            if (stormData.worthCanvassing) {
                                console.log(`🚨 SEVERE WEATHER DETECTED in ${state}! Sending alerts...`);
                                
                                const companies = await db.getCompaniesByState(state);
                                console.log(`📧 Found ${companies.length} companies subscribed to ${state}`);
                                
                                for (const company of companies) {
                                    try {
                                        console.log(`📤 Sending alert to ${company.companyName} (${company.email})`);
                                        await emailService.sendStormAlert(company, stormData);
                                        totalEmailsSent++;
                                        console.log(`✅ Email sent successfully to ${company.companyName}`);
                                    } catch (emailError) {
                                        console.error(`❌ Failed to send email to ${company.companyName}:`, emailError.message);
                                    }
                                }
                                
                                // Log the storm event
                                try {
                                    await db.logStormEvent(state, stormData);
                                    console.log(`📝 Storm event logged for ${state}`);
                                } catch (logError) {
                                    console.error(`❌ Failed to log storm event for ${state}:`, logError.message);
                                }
                            } else {
                                console.log(`ℹ️ Alerts found in ${state} but not severe enough for email notifications`);
                            }
                        } else {
                            console.log(`✅ No alerts in ${state} - all clear`);
                        }
                    } catch (stateError) {
                        console.error(`❌ Error checking ${state}:`, stateError.message);
                        if (stateError.response) {
                            console.error(`   Response status: ${stateError.response.status}`);
                            console.error(`   Response data:`, stateError.response.data);
                        }
                    }
                    
                    // Small delay between states to be respectful to the API
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
                const endTime = new Date();
                const duration = Math.round((endTime - startTime) / 1000);
                
                console.log(`\n📊 ========== STORM CHECK COMPLETE ==========`);
                console.log(`⏱️ Duration: ${duration} seconds`);
                console.log(`📍 States checked: ${subscribedStates.length}`);
                console.log(`⚡ Total alerts found: ${totalAlertsFound}`);
                console.log(`📧 Emails sent: ${totalEmailsSent}`);
                console.log(`🌩️ States with alerts: ${statesWithAlerts.length > 0 ? statesWithAlerts.join(', ') : 'None'}`);
                console.log(`🕐 Next check at: ${new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString()}`);
                console.log(`================================================\n`);
                
            } catch (error) {
                console.error('❌ CRITICAL ERROR in storm check:', error);
                console.error('Stack trace:', error.stack);
                
                // Try to notify admin of the error
                try {
                    // You could add admin notification here if needed
                    console.log('🔄 Storm check will retry in 2 hours...');
                } catch (notifyError) {
                    console.error('Failed to notify admin of error:', notifyError.message);
                }
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer(); 