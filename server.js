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
const BASE_PATH = '/storm-alert-agent'; // Add base path

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true);
        
        // List of allowed origins
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5000',
            'https://web-production-bb99.up.railway.app',
            'https://storm-alert-system-production.up.railway.app',
            'https://pythonwebsolutions.com',
            'http://pythonwebsolutions.com'
            // Add your frontend domain here when you deploy it
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from the public directory under the base path
app.use(BASE_PATH, express.static('public'));

// Initialize services
let db, weatherService, emailService, stormAnalyzer;

// Initialize database and services
async function initializeServices() {
    try {
        console.log('🔧 Initializing database...');
        
        // Create a fresh database instance
        db = new Database();
        await db.initialize();
        console.log('✅ Database connection initialized successfully');
        
        // Verify database is working by testing a simple query
        try {
            const testStates = await db.getSubscribedStates();
            console.log(`✅ Database verification successful - found ${testStates.length} subscribed states`);
        } catch (verifyError) {
            console.error('❌ Database verification failed:', verifyError);
            throw new Error('Database initialization verification failed');
        }
        
        console.log('🔧 Initializing other services...');
        weatherService = new WeatherService();
        emailService = new EmailService();
        stormAnalyzer = new StormAnalyzer();
        
        console.log('✅ All services initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Update route paths to include BASE_PATH
app.get(BASE_PATH + '/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Update API routes to include BASE_PATH
app.post(BASE_PATH + '/api/subscribe', async (req, res) => {
    try {
        const { companyName, email, phone, contactName, states } = req.body;
        
        if (!companyName || !email || !contactName || !states || states.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            // Subscribe to newsletter first
            try {
                await emailService.subscribeToNewsletter(email);
                console.log('✅ Newsletter subscription successful');
            } catch (newsletterError) {
                console.error('❌ Newsletter subscription failed:', newsletterError);
                // Continue with main subscription even if newsletter fails
            }

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

app.get(BASE_PATH + '/api/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
            database: db ? 'initialized' : 'not initialized',
            weatherService: weatherService ? 'initialized' : 'not initialized',
            emailService: emailService ? 'initialized' : 'not initialized',
            stormAnalyzer: stormAnalyzer ? 'initialized' : 'not initialized'
        },
        environment: process.env.NODE_ENV || 'development',
        port: PORT
    };
    
    res.json(healthStatus);
});

app.get(BASE_PATH + '/api/migrate-database', async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        console.log('🚀 Starting database migration and backup check...');
        
        // Check current environment
        const envCheck = {
            NODE_ENV: process.env.NODE_ENV || 'undefined',
            DB_BACKUP: process.env.DB_BACKUP ? 'Available' : 'Not set'
        };
        
        console.log('🌍 Environment Check:', envCheck);
        
        // Check database contents
        let dbContents;
        try {
            const companies = await new Promise((resolve, reject) => {
                db.db.all("SELECT * FROM companies", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            dbContents = {
                totalCompanies: companies.length,
                companies: companies.map(c => ({
                    name: c.company_name,
                    email: c.email,
                    stateCount: c.states.split(',').length,
                    active: c.active
                }))
            };
        } catch (error) {
            dbContents = { error: `Failed to read database: ${error.message}` };
        }

        // Create a fresh backup
        let backupData = null;
        try {
            backupData = await db.createBackup();
            console.log('📋 Fresh backup created');
        } catch (error) {
            console.error('Failed to create backup:', error.message);
        }
        
        const result = {
            status: 'Database migration check complete',
            environment: envCheck,
            database: dbContents,
            backup: backupData ? 'Created successfully' : 'Failed to create',
            timestamp: new Date(),
            instructions: {
                message: 'To preserve data across deployments, copy the backup data below and set it as DB_BACKUP environment variable in Railway',
                backupData: backupData
            }
        };
        
        console.log('✅ Migration check complete');
        res.json(result);
        
    } catch (error) {
        console.error('❌ Migration endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get(BASE_PATH + '/api/test-storm-check', async (req, res) => {
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

app.post(BASE_PATH + '/api/send-test-email', async (req, res) => {
    try {
        const testStormData = {
            severity: 'HIGH',
            worthCanvassing: true,
            details: [{
                type: 'Severe Thunderstorm',
                severityScore: 8,
                hailSize: 1.5,
                windSpeed: 65,
                areas: 'Dallas-Fort Worth Metroplex',
                zipCodes: ['75001', '75002', '75003'],
                damageEstimate: {
                    potentialJobs: 150,
                    avgJobValue: 9000,
                    totalMarketValue: 1350000
                }
            }],
            recommendations: [
                '🚨 Deploy assessment teams immediately',
                '📸 Document all visible damage',
                '📱 Contact insurance adjusters',
                '🏠 Prepare emergency repair materials'
            ]
        };

        const testCompany = {
            company_name: req.body.companyName || 'Test Roofing Company',
            email: req.body.email || 'dylandirosa980@gmail.com',
            states: ['TX', 'FL']
        };

        console.log('Sending test email to:', testCompany.email);
        const result = await emailService.sendStormAlert(testStormData, [testCompany]);
        res.json({ success: true, message: 'Test email sent successfully', result });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ error: 'Failed to send test email', details: error.message });
    }
});

app.get(BASE_PATH + '/api/unsubscribe', async (req, res) => {
    const { token, email } = req.query;
    
    console.log('Unsubscribe request received:', { token: token ? 'present' : 'missing', email });
    
    if (!token || !email) {
        console.log('Missing token or email in unsubscribe request');
        return res.status(400).send(`
            <html>
                <head>
                    <title>Invalid Unsubscribe Link</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 50px auto;
                            padding: 20px;
                            text-align: center;
                            line-height: 1.6;
                        }
                        .error-container {
                            background: #fee;
                            border: 1px solid #fcc;
                            border-radius: 8px;
                            padding: 20px;
                            margin-bottom: 20px;
                        }
                        h2 { color: #e74c3c; }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <h2>❌ Invalid Unsubscribe Link</h2>
                        <p>The unsubscribe link appears to be invalid or expired.</p>
                    </div>
                    <p>If you continue to receive unwanted emails, please contact support.</p>
                </body>
            </html>
        `);
    }

    try {
        console.log('Checking if email exists in companies table:', email);
        
        // First check if the email exists in the companies table
        const company = await db.getCompanyByEmail(email);

        if (!company) {
            console.log('Email not found in companies table:', email);
            return res.status(404).send(`
                <html>
                    <head>
                        <title>Email Not Found</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                max-width: 600px;
                                margin: 50px auto;
                                padding: 20px;
                                text-align: center;
                                line-height: 1.6;
                            }
                            .warning-container {
                                background: #fff3cd;
                                border: 1px solid #ffeeba;
                                border-radius: 8px;
                                padding: 20px;
                                margin-bottom: 20px;
                            }
                            h2 { color: #856404; }
                        </style>
                    </head>
                    <body>
                        <div class="warning-container">
                            <h2>⚠️ Email Not Found</h2>
                            <p>The email address ${email} is not registered in our system.</p>
                        </div>
                        <p>If you believe this is an error, please contact support.</p>
                    </body>
                </html>
            `);
        }

        console.log('Adding unsubscribe record for:', email);
        
        // Insert or update the unsubscribe record
        await db.addUnsubscribe(email, token);
        console.log('Unsubscribe record inserted successfully');

        console.log('Deleting company record for:', email);
        
        // Delete the company record
        const deletedRows = await db.deleteCompany(email);
        console.log('Company record deleted successfully, rows affected:', deletedRows);

        console.log(`✅ User unsubscribed successfully: ${email}`);
        
        res.send(`
            <html>
                <head>
                    <title>Successfully Unsubscribed</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 50px auto;
                            padding: 20px;
                            text-align: center;
                            line-height: 1.6;
                        }
                        .success-container {
                            background: #d4edda;
                            border: 1px solid #c3e6cb;
                            border-radius: 8px;
                            padding: 20px;
                            margin-bottom: 20px;
                        }
                        h2 { color: #155724; }
                        .email { 
                            background: #f8f9fa;
                            padding: 10px;
                            border-radius: 4px;
                            display: inline-block;
                            margin: 10px 0;
                        }
                        .resubscribe-note {
                            color: #6c757d;
                            font-size: 14px;
                            margin-top: 30px;
                            padding: 15px;
                            background: #f8f9fa;
                            border-radius: 8px;
                        }
                    </style>
                </head>
                <body>
                    <div class="success-container">
                        <h2>✅ Successfully Unsubscribed</h2>
                        <p>You have been successfully unsubscribed from storm alerts.</p>
                    </div>
                    <p>Email: <span class="email"><strong>${email}</strong></span></p>
                    <div class="resubscribe-note">
                        <p>If you change your mind, you can always resubscribe by visiting our registration page.</p>
                        <p>We're sorry to see you go!</p>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error processing unsubscribe:', error);
        console.error('Error stack:', error.stack);
        res.status(500).send(`
            <html>
                <head>
                    <title>Unsubscribe Error</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            max-width: 600px;
                            margin: 50px auto;
                            padding: 20px;
                            text-align: center;
                            line-height: 1.6;
                        }
                        .error-container {
                            background: #fee;
                            border: 1px solid #fcc;
                            border-radius: 8px;
                            padding: 20px;
                            margin-bottom: 20px;
                        }
                        h2 { color: #e74c3c; }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <h2>❌ Error Processing Unsubscribe</h2>
                        <p>There was an error processing your unsubscribe request.</p>
                        <p><small>Error: ${error.message}</small></p>
                    </div>
                    <p>Please try again later or contact support if the problem persists.</p>
                </body>
            </html>
        `);
    }
});

// Function to check if user is unsubscribed
async function isUnsubscribed(email) {
    try {
        return await db.isUnsubscribed(email);
    } catch (error) {
        console.error('Error checking unsubscribe status:', error);
        return false;
    }
}

// Modified storm checking function to filter unsubscribed users
async function checkForStormsAndAlert() {
    console.log('\n🔍 Starting comprehensive storm check...');
    
    try {
        // Get all subscribed states using the Database class method
        const subscribedStates = await db.getSubscribedStates();
        console.log(`📊 Checking ${subscribedStates.length} subscribed states for storms...`);

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
                        
                        // Get companies subscribed to this state using Database class method
                        const companies = await db.getCompaniesByState(state);

                        if (companies.length === 0) {
                            console.log(`📭 No companies subscribed to ${state}`);
                            continue;
                        }

                        console.log(`📧 Found ${companies.length} companies subscribed to ${state}`);

                        // Filter out unsubscribed users
                        const activeCompanies = [];

                        for (const company of companies) {
                            try {
                                const unsubscribed = await db.isUnsubscribed(company.email);
                                
                                if (!unsubscribed) {
                                    activeCompanies.push(company);
                                } else {
                                    console.log(`🚫 Skipping unsubscribed user: ${company.email}`);
                                }
                            } catch (error) {
                                console.error(`❌ Error checking unsubscribe status for ${company.email}:`, error);
                                // Include the company if we can't check status (fail safe)
                                activeCompanies.push(company);
                            }
                        }

                        if (activeCompanies.length > 0) {
                            console.log(`📤 Sending alerts to ${activeCompanies.length} active subscribers`);
                            
                            // Send alerts to each qualifying storm
                            for (const storm of stormAnalysis) {
                                try {
                                    const result = await emailService.sendStormAlert(storm, activeCompanies);
                                    console.log(`✅ Storm alert batch completed: ${result.successCount} sent, ${result.errorCount} failed`);
                                } catch (error) {
                                    console.error('❌ Error sending storm alerts:', error);
                                }
                            }
                        } else {
                            console.log(`📭 No active subscribers for ${state} (all unsubscribed)`);
                        }
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
    } catch (error) {
        console.error('❌ Error getting subscribed states:', error);
    }
}

// Start server function
async function startServer() {
    try {
        console.log('Starting Storm Alert System...');
        console.log('Environment:', process.env.NODE_ENV || 'development');
        console.log('Port:', PORT);
        
        // Initialize all services first
        await initializeServices();

        // Start the server with proper error handling
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Storm Alert System running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Handle server errors before they crash the process
        server.on('error', (error) => {
            console.error('Server error occurred:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use.`);
                console.log('Attempting to kill existing process and restart...');
                
                // Try to start on a different port
                const alternatePort = parseInt(PORT) + Math.floor(Math.random() * 1000) + 1;
                console.log(`Trying alternate port: ${alternatePort}`);
                
                const alternateServer = app.listen(alternatePort, '0.0.0.0', () => {
                    console.log(`Storm Alert System running on alternate port ${alternatePort}`);
                });
                
                alternateServer.on('error', (altError) => {
                    console.error('Alternate server also failed:', altError);
                    process.exit(1);
                });
            } else {
                console.error('Unhandled server error:', error);
                process.exit(1);
            }
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            console.error('Stack:', error.stack);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        // Set up cron job only in production
        if (process.env.NODE_ENV === 'production') {
            console.log('Setting up production cron job...');
            
            // Run an immediate storm check after deployment
            console.log('🚀 Running immediate post-deployment storm check...');
            setTimeout(async () => {
                await runStormCheck();
                console.log('✅ Post-deployment storm check completed');
            }, 5000); // Wait 5 seconds for server to fully start
            
            // Set up regular cron job for every 2 hours
            cron.schedule('0 */2 * * *', async () => {
                await runStormCheck();
            });
            
            console.log('✅ Cron job scheduled for every 2 hours');
        } else {
            console.log('Development mode - cron job disabled');
        }

    } catch (error) {
        console.error('Failed to start server:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Separate function for storm checking
async function runStormCheck() {
    const startTime = new Date();
    console.log(`\n🕐 ========== STORM CHECK STARTED: ${startTime.toLocaleString()} ==========`);
    
    try {
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
                    const stormDataArray = await stormAnalyzer.analyzeStorms(alerts, state);
                    
                    if (stormDataArray && stormDataArray.length > 0) {
                        console.log(`🚨 SEVERE WEATHER DETECTED in ${state}! Found ${stormDataArray.length} qualifying storms. Sending alerts...`);
                        
                        const companies = await db.getCompaniesByState(state);
                        console.log(`📧 Found ${companies.length} companies subscribed to ${state}`);
                        
                        // Filter out unsubscribed users
                        const activeCompanies = [];
                        for (const company of companies) {
                            try {
                                const unsubscribed = await db.isUnsubscribed(company.email);
                                if (!unsubscribed) {
                                    activeCompanies.push(company);
                                } else {
                                    console.log(`🚫 Skipping unsubscribed user: ${company.email}`);
                                }
                            } catch (error) {
                                console.error(`❌ Error checking unsubscribe status for ${company.email}:`, error);
                                // Include the company if we can't check status (fail safe)
                                activeCompanies.push(company);
                            }
                        }
                        
                        if (activeCompanies.length > 0) {
                            console.log(`📤 Sending alerts to ${activeCompanies.length} active subscribers`);
                            
                            // Send each storm alert
                            for (const stormData of stormDataArray) {
                                try {
                                    console.log(`📧 Sending storm alert for ${stormData.details[0].type} in ${stormData.affectedAreas[0].description}`);
                                    const result = await emailService.sendStormAlert(stormData, activeCompanies);
                                    totalEmailsSent += activeCompanies.length;
                                    console.log(`✅ Storm alert sent successfully to ${activeCompanies.length} companies`);
                                } catch (emailError) {
                                    console.error(`❌ Failed to send storm alert:`, emailError.message);
                                }
                            }
                            
                            // Log the storm events
                            for (const stormData of stormDataArray) {
                                try {
                                    await db.logStormEvent(state, stormData);
                                    console.log(`📝 Storm event logged for ${state}`);
                                } catch (logError) {
                                    console.error(`❌ Failed to log storm event for ${state}:`, logError.message);
                                }
                            }
                        } else {
                            console.log(`📭 No active subscribers for ${state} (all unsubscribed)`);
                        }
                    } else {
                        console.log(`ℹ️ Alerts found in ${state} but not severe enough for email notifications`);
                    }
                } else {
                    console.log(`✅ No alerts in ${state} - all clear`);
                }
            } catch (stateError) {
                console.error(`❌ Error checking ${state}:`, stateError.message);
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
    }
}

// Start the server
startServer(); 