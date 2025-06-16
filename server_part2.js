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
                    console.log(`\n🧊 Calling email service for HAIL alert in ${state} to ${companies.length} companies...`);
                    await emailService.sendConsolidatedHailAlert(companies, state, hailAlerts);
                }

                if (windAlerts.alertDetails.length > 0) {
                    console.log(`\n💨 Calling email service for WIND alert in ${state} to ${companies.length} companies...`);
                    await emailService.sendConsolidatedWindAlert(companies, state, windAlerts);
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