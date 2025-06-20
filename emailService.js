const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fetch = require('node-fetch');
require('dotenv').config();

class EmailService {
    constructor() {
        if (!process.env.RESEND_API_KEY) {
            console.error('FATAL ERROR: RESEND_API_KEY environment variable is not set.');
            throw new Error('FATAL ERROR: RESEND_API_KEY environment variable is not set.');
        }
        
        this.transporter = nodemailer.createTransport({
            host: 'smtp.resend.com',
            secure: true,
            port: 465,
            auth: {
                user: 'resend',
                pass: process.env.RAILWAY_API_KEY || process.env.RESEND_API_KEY
            }
        });
        this.fromAddress = '"Storm Alert Pro" <info@pythonwebsolutions.com>';
        this.unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET || 'your-default-secret';
        this.baseUrl = process.env.RAILWAY_STATIC_URL || 'https://web-production-bb99.up.railway.app';
    }

    generateUnsubscribeLink(email) {
        const token = crypto.createHmac('sha256', this.unsubscribeSecret)
                            .update(email)
                            .digest('hex');
        return `${this.baseUrl}/api/unsubscribe?token=${token}&email=${encodeURIComponent(email)}`;
    }

    async sendConsolidatedHailAlert(companies, state, hailData) {
        const { maxHail, affectedAreas, alertDetails } = hailData;
        const uniqueAreas = [...new Set(affectedAreas)].join(', ');
        
        // Determine the highest tier from all alerts
        let maxTier = 1;
        let tierDescription = '';
        let urgencyLevel = '';
        let actionRecommendation = '';
        
        // Find the highest tier among all alerts
        for (const alert of alertDetails) {
            if (alert.hailTier > maxTier) {
                maxTier = alert.hailTier;
            }
        }
        
        // Set tier-specific messaging
        if (maxTier === 3) {
            tierDescription = 'SEVERE HAIL ALERT';
            urgencyLevel = '🚨 URGENT - CATASTROPHIC DAMAGE EXPECTED';
            actionRecommendation = 'IMMEDIATE ACTION REQUIRED: Deploy all available crews. This is a major damage event with near 100% claim approval expected.';
        } else if (maxTier === 2) {
            tierDescription = 'MODERATE HAIL ALERT';
            urgencyLevel = '⚠️ SIGNIFICANT - WIDESPREAD DAMAGE LIKELY';
            actionRecommendation = 'RECOMMENDED ACTION: Prepare crews for deployment. Good opportunity for inspections with high claim potential.';
        } else {
            tierDescription = 'MINOR HAIL ALERT';
            urgencyLevel = '📢 ADVISORY - POTENTIAL DAMAGE POSSIBLE';
            actionRecommendation = 'SUGGESTED ACTION: Monitor situation and prepare for possible inspections. Some damage claims may be approved.';
        }
        
        // Create subject based on tier
        const subject = maxHail > 0 
            ? `${tierDescription} - ${state} - Up to ${maxHail}" Hail Reported`
            : `${tierDescription} - ${state} - Hail Activity Detected`;

        const bccList = companies.map(c => c.email).join(',');

        // Group alerts by tier for better organization
        const tierGroups = {
            3: alertDetails.filter(d => d.hailTier === 3),
            2: alertDetails.filter(d => d.hailTier === 2),
            1: alertDetails.filter(d => d.hailTier === 1)
        };

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: ${maxTier === 3 ? '#d32f2f' : maxTier === 2 ? '#f57c00' : '#388e3c'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .urgency { background: ${maxTier === 3 ? '#ffebee' : maxTier === 2 ? '#fff3e0' : '#e8f5e9'}; padding: 15px; margin: 10px 0; border-radius: 8px; font-weight: bold; }
                    .content { background: #f5f5f5; padding: 20px; }
                    .tier-section { margin: 20px 0; padding: 15px; background: white; border-radius: 8px; }
                    .tier-3 { border-left: 5px solid #d32f2f; }
                    .tier-2 { border-left: 5px solid #f57c00; }
                    .tier-1 { border-left: 5px solid #388e3c; }
                    .action-box { background: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 8px; border: 2px solid #1976d2; }
                    .unsubscribe { color: #666; font-size: 12px; text-align: center; margin-top: 20px; }
                    ul { margin: 10px 0; padding-left: 20px; }
                    .hail-size { font-weight: bold; color: ${maxTier === 3 ? '#d32f2f' : maxTier === 2 ? '#f57c00' : '#388e3c'}; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${tierDescription}</h1>
                        <h2>${state}</h2>
                    </div>
                    
                    <div class="urgency">${urgencyLevel}</div>
                    
                    <div class="content">
                        ${maxHail > 0 ? `<h2>Maximum Hail Size Detected: <span class="hail-size">${maxHail} inches</span></h2>` : '<h2>Hail Activity Detected</h2>'}
                        <p><strong>Affected Areas:</strong> ${uniqueAreas}</p>
                        
                        <div class="action-box">
                            <strong>${actionRecommendation}</strong>
                        </div>
                        
                        ${tierGroups[3].length > 0 ? `
                        <div class="tier-section tier-3">
                            <h3>🚨 SEVERE HAIL (≥1.75" / Golf Ball+)</h3>
                            <ul>
                                ${tierGroups[3].map(d => `
                                    <li>
                                        <strong>${d.event}:</strong> ${d.headline}
                                        ${d.hailSize > 0 ? `<br><span class="hail-size">Hail Size: ${d.hailSize}"</span>` : ''}
                                        <br><small>Active: ${new Date(d.effective).toLocaleString()} - ${new Date(d.expires).toLocaleString()}</small>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        ${tierGroups[2].length > 0 ? `
                        <div class="tier-section tier-2">
                            <h3>⚠️ MODERATE HAIL (1.0" - 1.74" / Quarter to Golf Ball)</h3>
                            <ul>
                                ${tierGroups[2].map(d => `
                                    <li>
                                        <strong>${d.event}:</strong> ${d.headline}
                                        ${d.hailSize > 0 ? `<br><span class="hail-size">Hail Size: ${d.hailSize}"</span>` : ''}
                                        <br><small>Active: ${new Date(d.effective).toLocaleString()} - ${new Date(d.expires).toLocaleString()}</small>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        ${tierGroups[1].length > 0 ? `
                        <div class="tier-section tier-1">
                            <h3>📢 MINOR HAIL (<1.0" / Smaller than Quarter)</h3>
                            <ul>
                                ${tierGroups[1].map(d => `
                                    <li>
                                        <strong>${d.event}:</strong> ${d.headline}
                                        ${d.hailSize > 0 ? `<br><span class="hail-size">Hail Size: ${d.hailSize}"</span>` : ''}
                                        <br><small>Active: ${new Date(d.effective).toLocaleString()} - ${new Date(d.expires).toLocaleString()}</small>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        <h3>Why This Matters:</h3>
                        <ul>
                            ${maxTier === 3 ? '<li>Golf ball+ sized hail causes severe roof damage with extremely high claim approval rates</li>' : ''}
                            ${maxTier >= 2 ? '<li>Quarter+ sized hail typically results in insurance claims for roof damage</li>' : ''}
                            <li>Even small hail can cause damage to older or compromised roofing systems</li>
                            <li>Early response gives you competitive advantage in the market</li>
                        </ul>
                    </div>
                    
                    <div class="unsubscribe">
                        <a href="UNSUBSCRIBE_LINK_PLACEHOLDER">Unsubscribe from alerts</a>
                    </div>
                </div>
            </body>
            </html>
        `;

        for (const company of companies) {
            try {
                const unsubscribeLink = this.generateUnsubscribeLink(company.email);
                const personalizedHtml = html.replace('UNSUBSCRIBE_LINK_PLACEHOLDER', unsubscribeLink);
                
                await this.transporter.sendMail({
                    from: this.fromAddress,
                    to: company.email,
                    subject: subject,
                    html: personalizedHtml,
                    headers: { 'X-Entity-ID': 'your-entity-id' }
                });
            } catch (error) {
                console.error(`❌ Failed to send consolidated hail alert to ${company.email}:`, error.message);
            }
        }
        console.log(`Consolidated hail alert (Tier ${maxTier}) processing complete for ${companies.length} subscribers for ${state}.`);
    }

    async sendConsolidatedWindAlert(companies, state, windData) {
        const { maxWind, affectedAreas, alertDetails } = windData;
        const uniqueAreas = [...new Set(affectedAreas)].join(', ');
        const subject = `New Wind Alert in ${state} - Up to ${maxWind}mph Winds Reported`;
        
        const bccList = companies.map(c => c.email).join(',');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    /* styles omitted for brevity */
                </style>
            </head>
            <body>
                <h1>New Wind Alert for ${state}</h1>
                <h2>Max Wind Speed: ${maxWind} mph</h2>
                <p><strong>Affected Areas:</strong> ${uniqueAreas}</p>
                <p>Our system has detected severe weather with high winds in your subscribed service area. This is a prime opportunity for storm-related roofing inspections.</p>
                <h3>Alert Details:</h3>
                <ul>
                    ${alertDetails.map(d => `<li><strong>${d.event}:</strong> ${d.headline} (Effective: ${new Date(d.effective).toLocaleString()} - Expires: ${new Date(d.expires).toLocaleString()})</li>`).join('')}
                </ul>
                <a href="UNSUBSCRIBE_LINK_PLACEHOLDER" class="unsubscribe">Unsubscribe</a>
            </body>
            </html>
        `;
        
        for (const company of companies) {
            try {
                const unsubscribeLink = this.generateUnsubscribeLink(company.email);
                const personalizedHtml = html.replace('UNSUBSCRIBE_LINK_PLACEHOLDER', unsubscribeLink);
                
                await this.transporter.sendMail({
                    from: this.fromAddress,
                    to: company.email,
                    subject: subject,
                    html: personalizedHtml,
                    headers: { 'X-Entity-ID': 'your-entity-id' }
                });
            } catch (error) {
                console.error(`❌ Failed to send consolidated wind alert to ${company.email}:`, error.message);
            }
        }
        
        console.log(`Consolidated wind alert processing complete for ${companies.length} subscribers for ${state}.`);
    }
    
    async sendWelcomeEmail(email, companyName, states, alertPreferences = 'both', stormHistoryPdfPath = null, includeStormHistory = false) {
        // Subscribe to newsletter first - This is now handled in the main /api/subscribe route
        // await this.subscribeToNewsletter(email);

        const alertTypeText = alertPreferences === 'both' ? 'hail and wind' : 
                             alertPreferences === 'hail' ? 'hail' : 'wind';

        const subject = 'Welcome to Storm Alert Pro';
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2a5298;">Welcome ${companyName}!</h1>
                <p>You're now receiving <strong>${alertTypeText}</strong> storm alerts for: <strong>${states.join(', ')}</strong></p>
                <p>When severe weather impacts your service areas, you'll receive:</p>
                <ul>
                    <li>Immediate storm notifications</li>
                    <li>Affected zip codes and areas</li>
                    <li>Damage severity analysis</li>
                    <li>ROI projections for canvassing</li>
                </ul>
                <p style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <strong>📧 Check your inbox!</strong> We're sending you a recent storm alert example from your selected states so you can see exactly what you'll receive when storms hit your areas.
                </p>
                ${stormHistoryPdfPath ? `
                <p style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                    <strong>📄 Hail History Report:</strong> We've attached a 12-month hail history report for your selected areas, showing all hail events ≥0.75" in diameter.
                </p>
                ` : states.length > 5 && includeStormHistory ? `
                <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px;">
                    <strong>⚠️ PDF Not Generated:</strong> You selected more than 5 states. To ensure complete data coverage, PDF generation is limited to 5 states or fewer.
                </p>
                ` : ''}
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px;">
                    <strong>🎉 Bonus:</strong> You've also been subscribed to the Python Web Solutions newsletter for additional web development tips and insights!
                </p>
            </div>
        `;

        try {
            const mailOptions = {
                from: this.fromAddress,
                to: email,
                subject: subject,
                html: htmlContent,
                headers: { 'X-Entity-ID': 'your-entity-id' }
            };

            // Attach PDF if provided
            if (stormHistoryPdfPath) {
                const fs = require('fs');
                const path = require('path');
                
                mailOptions.attachments = [{
                    filename: `storm-history-${states.join('-')}.pdf`,
                    path: stormHistoryPdfPath,
                    contentType: 'application/pdf'
                }];
            }

            await this.transporter.sendMail(mailOptions);
            console.log('Welcome email sent to:', email);
            if (stormHistoryPdfPath) {
                console.log('Storm history PDF attached');
            }
        } catch (error) {
            console.error('Error sending welcome email:', error);
            throw error;
        }
    }

    async sendAdminNotification(data) {
        const alertTypeText = data.alertPreferences === 'both' ? 'Both Hail & Wind' : 
                             data.alertPreferences === 'hail' ? 'Hail Only' : 'Wind Only';
        
        const subject = '🔔 New Company Registration';
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2a5298;">New Company Registration</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <h3>Company Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Company Name:</strong> ${data.companyName}</li>
                        <li><strong>Contact Person:</strong> ${data.contactName}</li>
                        <li><strong>Email:</strong> ${data.email}</li>
                        <li><strong>Phone:</strong> ${data.phone || 'Not provided'}</li>
                        <li><strong>Alert Preferences:</strong> ${alertTypeText}</li>
                        <li><strong>Storm History PDF:</strong> ${data.includeStormHistory ? '✅ Requested' : '❌ Not requested'}</li>
                        <li><strong>Selected States:</strong> ${data.states.join(', ')}</li>
                        <li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li>
                    </ul>
                </div>
            </div>
        `;

        try {
            await this.transporter.sendMail({
                from: this.fromAddress,
                to: 'dylandirosa980@gmail.com',
                subject: subject,
                html: htmlContent,
                headers: { 'X-Entity-ID': 'your-entity-id' }
            });
            console.log('Admin notification sent');
        } catch (error) {
            console.error('Error sending admin notification:', error);
            throw error;
        }
    }

    async subscribeToNewsletter(email) {
        try {
            // Get the beehiiv API key from environment variables
            const beehiivApiKey = process.env.BEEHIIV_API_KEY;
            
            if (!beehiivApiKey) {
                throw new Error('BEEHIIV_API_KEY environment variable is not set');
            }

            // First, we need to get the publication ID from the beehiiv API
            // Since we don't have the publication ID, let's try to get it from the publications endpoint
            const publicationsResponse = await fetch('https://api.beehiiv.com/v2/publications', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${beehiivApiKey}`,
                    'Accept': 'application/json'
                }
            });

            if (!publicationsResponse.ok) {
                throw new Error(`Failed to get publications: ${publicationsResponse.status} ${publicationsResponse.statusText}`);
            }

            const publicationsData = await publicationsResponse.json();
            console.log('Publications data:', publicationsData);
            
            // Get the first publication ID (or the Python Web Solutions publication)
            const publication = publicationsData.data && publicationsData.data.length > 0 ? publicationsData.data[0] : null;
            
            if (!publication || !publication.id) {
                throw new Error('No publication found for this API key');
            }

            const publicationId = publication.id;
            console.log(`Using publication ID: ${publicationId} for ${publication.name || 'Unknown Publication'}`);

            // Now subscribe the user to the newsletter
            const subscriptionResponse = await fetch(`https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${beehiivApiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    reactivate_existing: false,
                    send_welcome_email: true,
                    utm_source: 'storm_alert_system',
                    utm_medium: 'automatic_subscription',
                    referring_site: 'storm-alert-system'
                })
            });

            if (!subscriptionResponse.ok) {
                const errorData = await subscriptionResponse.json();
                throw new Error(`Failed to subscribe to newsletter: ${errorData.message || 'Unknown error'}`);
            }

            console.log('Successfully subscribed to newsletter:', email);
        } catch (error) {
            console.error('Error subscribing to newsletter:', error);
            // Don't re-throw, so email sending can continue
        }
    }

    async sendRecentStormAlert(company, stormData, state, createdAt) {
        const subject = `Recent Storm Alert for ${state}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2a5298;">Recent Storm In Your Area</h1>
                <p>As a new subscriber, here is an example of a recent significant storm that occurred in <strong>${state}</strong> on <strong>${new Date(createdAt).toLocaleDateString()}</strong>.</p>
                
                <h3>Storm Details:</h3>
                <p><strong>Event:</strong> ${stormData.event}</p>
                <p><strong>Description:</strong> ${stormData.description}</p>
                <p><strong>Areas Affected:</strong> ${stormData.areaDesc}</p>
            </div>
        `;

        try {
            await this.transporter.sendMail({
                from: this.fromAddress,
                to: company.email,
                subject: subject,
                html: htmlContent,
                headers: { 'X-Entity-ID': 'your-entity-id' }
            });
            console.log(`Sent recent storm alert to ${company.email}`);
        } catch (error) {
            console.error('Error sending recent storm alert:', error);
            // Don't rethrow, as this is a non-critical email
        }
    }
}

module.exports = EmailService;