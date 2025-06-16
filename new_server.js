const express = require('express');
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const WeatherService = require('./weatherService');
const EmailService = require('./emailService');
const StormAnalyzer = require('./stormAnalyzer');
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
let db, weatherService, emailService, stormAnalyzer;

// Initialize database and services
async function initializeServices() {
    try {
        console.log('🔧 ===== INITIALIZING SERVICES =====');
        console.log('💾 Step 1: Initializing database...');
        
        // Lazy-load Database here to avoid crashing if sqlite3 binding is missing during cold start
        const Database = require('./database');
        
        // Create a fresh database instance
        db = new Database();
        console.log('✅ Database instance created');
        
        await db.initialize();
        console.log('✅ Database connection initialized successfully');
        
        console.log('🔧 Step 2: Initializing other services...');
        console.log('🌤️ Creating WeatherService...');
        weatherService = new WeatherService();
        console.log('✅ WeatherService created');
        
        console.log('📧 Creating EmailService...');
        emailService = new EmailService();
        console.log('✅ EmailService created');
        
        console.log('🌪️ Creating StormAnalyzer...');
        stormAnalyzer = new StormAnalyzer();
        console.log('✅ StormAnalyzer created');
        
        console.log('🎉 ===== ALL SERVICES INITIALIZED SUCCESSFULLY =====');
        return true;
    } catch (error) {
        console.error('🚨 ===== SERVICE INITIALIZATION FAILED =====');
        console.error('❌ Failed to initialize services:', error);
        console.error('📚 Stack trace:', error.stack);
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

// Webhook endpoint to receive form submissions from pythonwebsolutions.com
app.post('/api/submit-form', async (req, res) => {
