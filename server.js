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
        const alerts = await weatherService.getWeatherAlerts(state);
        console.log(`Found ${alerts.length} alerts`);
        
        if (alerts.length > 0) {
            const stormData = await stormAnalyzer.analyzeStorms(alerts);
            console.log('Storm severity:', stormData.severity);
            console.log('Worth canvassing:', stormData.worthCanvassing);
        }
    }
    
    res.json({ message: 'Check complete - see server console' });
});

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
        cron.schedule('*/5 * * * *', async () => {
            console.log('Running storm check...');
            try {
                const subscribedStates = await db.getSubscribedStates();
                
                for (const state of subscribedStates) {
                    const alerts = await weatherService.getWeatherAlerts(state);
                    
                    if (alerts && alerts.length > 0) {
                        const stormData = await stormAnalyzer.analyzeStorms(alerts);
                        const companies = await db.getCompaniesByState(state);
                        
                        for (const company of companies) {
                            await emailService.sendStormAlert(company, stormData);
                        }
                        
                        await db.logStormEvent(state, stormData);
                    }
                }
            } catch (error) {
                console.error('Storm check error:', error);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer(); 