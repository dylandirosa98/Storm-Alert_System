const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const WeatherService = require('./weatherService');
const EmailService = require('./emailService');
const StormAnalyzer = require('./stormAnalyzer');
const StormHistoryService = require('./stormHistoryService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
            'https://web-production-bb99.up.railway.app'
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

// Serve static files from the public directory
app.use(express.static('public'));

// Initialize services
let db;
let weatherService;
let emailService;
let stormAnalyzer;
let stormHistoryService;

// Initialize database and services
async function initializeServices() {
    console.log('🔧 Initializing services...');
    
    try {
        // Initialize database
        console.log('💾 Initializing database...');
        const Database = require('./database');
        db = new Database();
        await db.initialize();
        console.log('✅ Database initialized');
        
        // Initialize weather service
        console.log('🌤️ Initializing weather service...');
        weatherService = new WeatherService();
        console.log('✅ Weather service initialized');
        
        // Initialize email service
        console.log('📧 Initializing email service...');
        emailService = new EmailService();
        console.log('✅ Email service initialized');
        
        // Initialize storm analyzer
        console.log('🔍 Initializing storm analyzer...');
        stormAnalyzer = new StormAnalyzer();
        console.log('✅ Storm analyzer initialized');
        
        // Initialize storm history service
        console.log('📄 Initializing storm history service...');
        stormHistoryService = new StormHistoryService();
        console.log('✅ Storm history service initialized');
        
        console.log('✅ All services initialized successfully');
    } catch (error) {
        console.error('❌ Service initialization failed:', error);
        throw error;
    }
}

// Serve landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
    try {
        const { companyName, email, phone, contactName, states, alertPreferences, includeStormHistory } = req.body;
        
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
                states: states.join(','),
                alertPreferences: alertPreferences || 'both'
            });

            // Generate storm history PDF if requested
            let stormHistoryPdfPath = null;
            if (includeStormHistory) {
                // Check if user selected more than 5 states
                if (states.length > 5) {
                    console.log('⚠️ User selected more than 5 states for PDF, skipping PDF generation');
                    // We'll handle this in the email to explain why no PDF was attached
                } else {
                    try {
                        console.log('📄 User requested storm history PDF, generating...');
                        stormHistoryPdfPath = await stormHistoryService.generateStormHistoryPDF(
                            weatherService,
                            states,
                            null, // Will use default path
                            db    // Pass database for historical data
                        );
                        console.log('✅ Storm history PDF generated successfully');
                    } catch (pdfError) {
                        console.error('❌ Failed to generate storm history PDF:', pdfError);
                        // Continue without PDF
                    }
                }
            }

            try {
                // Send welcome email to the company (with PDF if generated)
                await emailService.sendWelcomeEmail(
                    email, 
                    companyName, 
                    states, 
                    alertPreferences || 'both',
                    stormHistoryPdfPath,
                    includeStormHistory
                );
                
                // Send notification to admin
                await emailService.sendAdminNotification({
                    companyName,
                    email,
                    phone,
                    contactName,
                    states,
                    alertPreferences: alertPreferences || 'both',
                    includeStormHistory: includeStormHistory
                });
            } catch (emailError) {
                console.error('Failed to send emails:', emailError);
                // Don't return error to client, continue with subscription
            }

            // Clean up PDF file after sending
            if (stormHistoryPdfPath) {
                try {
                    const fs = require('fs');
                    fs.unlinkSync(stormHistoryPdfPath);
                    console.log('🧹 Cleaned up temporary PDF file');
                } catch (cleanupError) {
                    console.error('Failed to clean up PDF:', cleanupError);
                }
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

// Simple health check for Railway
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Health check
app.get('/api/health', (req, res) => {
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

// Test endpoint to check storm detection across all states
app.get('/api/test-storm-detection', async (req, res) => {
    try {
        if (!weatherService || !stormAnalyzer || !db) {
            return res.status(503).json({ error: 'Services not initialized' });
        }

        const results = {};
        const subscribedStates = await db.getSubscribedStates();
        
        for (const state of subscribedStates) {
            console.log(`\n🔍 Testing ${state}...`);
            
            try {
                const alerts = await weatherService.getComprehensiveWeatherAlerts(state);
                const stormDataArray = await stormAnalyzer.analyzeStorms(alerts, state);
                const companies = await db.getCompaniesByState(state);
                
                results[state] = {
                    totalAlerts: alerts.length,
                    qualifyingStorms: stormDataArray.length,
                    subscribedCompanies: companies.length,
                    storms: stormDataArray.map(s => ({
                        event: s.event,
                        hailSize: s.hailSize,
                        windSpeed: s.windSpeed,
                        area: s.areaDesc
                    }))
                };
            } catch (error) {
                results[state] = { error: error.message };
            }
        }
        
        // Summary
        const summary = {
            totalStates: subscribedStates.length,
            statesWithStorms: Object.keys(results).filter(s => results[s].qualifyingStorms > 0).length,
            totalQualifyingStorms: Object.values(results).reduce((sum, r) => sum + (r.qualifyingStorms || 0), 0)
        };
        
        res.json({ summary, results });
    } catch (error) {
        console.error('Test detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Database migration endpoint
app.get('/api/migrate-database', async (req, res) => {
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

// Test email endpoint
app.post('/api/send-test-email', async (req, res) => {
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

// Unsubscribe endpoint - make sure it matches the URL exactly
app.get('/api/unsubscribe', async (req, res) => {
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
                        
                        // Store each storm alert in the database for historical tracking
                        for (const storm of stormAnalysis) {
                            try {
                                // Extract alert ID from the storm data
                                const alertId = storm.id || `${state}-${storm.event}-${new Date(storm.onset || storm.effective).getTime()}`;
                                
                                await db.storeStormAlert({
                                    alertId: alertId,
                                    state: state,
                                    county: storm.areaDesc || '',
                                    eventType: storm.event || 'Unknown',
                                    headline: storm.headline || '',
                                    description: storm.description || '',
                                    hailSize: storm.hailSize || 0,
                                    hailSizeText: storm.hailSizeName || '',
                                    windSpeed: storm.windSpeed || 0,
                                    onsetTime: storm.onset || storm.effective,
                                    expiresTime: storm.expires || storm.ends,
                                    areaDesc: storm.areaDesc || '',
                                    rawData: storm
                                });
                                
                                console.log(`💾 Stored storm alert in history: ${alertId}`);
                            } catch (storeError) {
                                console.error(`❌ Error storing storm alert:`, storeError.message);
                            }
                        }
                        
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
        console.log('🚀 ===== STARTING STORM ALERT SYSTEM =====');
        console.log('📊 Environment:', process.env.NODE_ENV || 'development');
        console.log('🔌 Port:', PORT);
        console.log('🌐 Railway URL:', process.env.RAILWAY_PUBLIC_DOMAIN || 'not set');
        console.log('📧 Resend API Key:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
        console.log('💾 DB Backup:', process.env.DB_BACKUP ? 'SET' : 'NOT SET');
        
        console.log('🔧 Creating Express server...');
        
        // Start the server FIRST so it can respond to health checks
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('✅ HTTP SERVER STARTED SUCCESSFULLY');
            console.log(`🌍 Server listening on port ${PORT}`);
            console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('🩺 Health check available at /health');
            
            console.log('🔄 Starting background service initialization...');
            
            // Initialize services AFTER server is running
            initializeServices().then(() => {
                console.log('🎉 ALL SERVICES INITIALIZED SUCCESSFULLY');
                
                // Set up cron job only after everything is ready
                if (process.env.NODE_ENV === 'production') {
                    console.log('⏰ Setting up production cron job...');
                    
                    // Set up regular cron job for every 2 hours
                    cron.schedule('0 */2 * * *', async () => {
                        await runStormCheck();
                    });
                    
                    console.log('✅ Cron job scheduled for every 2 hours');
                } else {
                    console.log('🛠️ Development mode - cron job disabled');
                }
            }).catch((error) => {
                console.error('❌ SERVICE INITIALIZATION FAILED:', error);
                console.error('📚 Stack trace:', error.stack);
                // Don't exit - server can still respond to basic requests
                console.log('⚠️ Server will continue running with limited functionality');
            });
        });

        console.log('🔧 Setting up server error handlers...');

        // Handle server errors before they crash the process
        server.on('error', (error) => {
            console.error('🚨 SERVER ERROR OCCURRED:', error);
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use.`);
                process.exit(1);
            } else {
                console.error('❌ Unhandled server error:', error);
                process.exit(1);
            }
        });

        console.log('🔧 Setting up process error handlers...');

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('🚨 UNCAUGHT EXCEPTION:', error);
            console.error('📚 Stack:', error.stack);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
            process.exit(1);
        });

        console.log('✅ Server startup configuration complete');

    } catch (error) {
        console.error('🚨 CRITICAL: Failed to start server:', error);
        console.error('📚 Stack trace:', error.stack);
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
        
        for (const state of subscribedStates) {
            console.log(`\n🌍 Checking ${state} for weather alerts...`);
            
            try {
                const alerts = await weatherService.getComprehensiveWeatherAlerts(state);
                console.log(`📋 Found ${alerts ? alerts.length : 0} total alerts in ${state} (active + recent)`);
                
                if (!alerts || alerts.length === 0) {
                    console.log(`✅ No alerts in ${state} - all clear`);
                    continue;
                }

                console.log(`🔍 Analyzing storms in ${state}...`);
                const stormDataArray = await stormAnalyzer.analyzeStorms(alerts, state);
                
                if (!stormDataArray || stormDataArray.length === 0) {
                    console.log(`ℹ️ Alerts found in ${state} but did not meet final analysis criteria.`);
                    continue;
                }

                console.log(`✅ Found ${stormDataArray.length} storms that meet the criteria for ${state}.`);
                
                // Store each storm in the database for historical tracking
                for (const storm of stormDataArray) {
                    try {
                        const alertId = storm.id || `${state}-${storm.event}-${new Date(storm.onset || storm.effective).getTime()}`;
                        
                        await db.storeStormAlert({
                            alertId: alertId,
                            state: state,
                            county: storm.areaDesc || '',
                            eventType: storm.event || 'Unknown',
                            headline: storm.headline || '',
                            description: storm.description || '',
                            hailSize: storm.hailSize || 0,
                            hailSizeText: storm.hailSizeName || '',
                            windSpeed: storm.windSpeed || 0,
                            onsetTime: storm.onset || storm.effective,
                            expiresTime: storm.expires || storm.ends,
                            areaDesc: storm.areaDesc || '',
                            rawData: storm
                        });
                        
                        console.log(`💾 Stored storm alert in history: ${alertId}`);
                    } catch (storeError) {
                        console.error(`❌ Error storing storm alert:`, storeError.message);
                    }
                }
                
                const companies = await db.getCompaniesByState(state);
                
                if (companies.length === 0) {
                    console.log(`📭 No companies subscribed to ${state}. No alerts will be sent.`);
                    continue;
                }
                
                console.log(`📧 Found ${companies.length} companies subscribed to ${state}. Preparing to send alerts.`);
                console.log(`   Subscribed companies: ${companies.map(c => c.company_name).join(', ')}`);
                
                // --- CONSOLIDATION LOGIC ---
                const hailAlerts = { maxHail: 0, affectedAreas: [], alertDetails: [] };
                const windAlerts = { maxWind: 0, affectedAreas: [], alertDetails: [] };

                for (const storm of stormDataArray) {
                    if (storm.isHail) {
                        hailAlerts.maxHail = Math.max(hailAlerts.maxHail, storm.hailSize);
                        hailAlerts.affectedAreas.push(storm.areaDesc);
                        hailAlerts.alertDetails.push(storm);
                    }
                    if (storm.isWind || storm.isHurricane) {
                        windAlerts.maxWind = Math.max(windAlerts.maxWind, storm.windSpeed);
                        windAlerts.affectedAreas.push(storm.areaDesc);
                        windAlerts.alertDetails.push(storm);
                    }
                }

                // --- SEND CONSOLIDATED EMAILS ---
                if (hailAlerts.alertDetails.length > 0) {
                    // Filter companies that want hail alerts
                    const hailCompanies = companies.filter(c => 
                        !c.alert_preferences || c.alert_preferences === 'both' || c.alert_preferences === 'hail'
                    );
                    
                    if (hailCompanies.length > 0) {
                        console.log(`\n🧊 Calling email service for HAIL alert in ${state} to ${hailCompanies.length} companies...`);
                        await emailService.sendConsolidatedHailAlert(hailCompanies, state, hailAlerts);
                    } else {
                        console.log(`\n🧊 Hail alert found but no companies subscribed to hail alerts in ${state}`);
                    }
                }

                if (windAlerts.alertDetails.length > 0) {
                    // Filter companies that want wind alerts
                    const windCompanies = companies.filter(c => 
                        !c.alert_preferences || c.alert_preferences === 'both' || c.alert_preferences === 'wind'
                    );
                    
                    if (windCompanies.length > 0) {
                        console.log(`\n💨 Calling email service for WIND alert in ${state} to ${windCompanies.length} companies...`);
                        await emailService.sendConsolidatedWindAlert(windCompanies, state, windAlerts);
                    } else {
                        console.log(`\n💨 Wind alert found but no companies subscribed to wind alerts in ${state}`);
                    }
                }

            } catch (stateError) {
                console.error(`❌ Error checking ${state}:`, stateError.message);
            }
            
            // Small delay between states to be respectful to the API
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR in storm check:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Start the server
startServer(); 