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
                pass: process.env.RESEND_API_KEY
            }
        });
        this.fromAddress = 'info@pythonwebsolutions.com';
        this.unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET || 'your-default-secret';
    }

    generateUnsubscribeLink(email) {
        const token = crypto.createHmac('sha256', this.unsubscribeSecret)
                            .update(email)
                            .digest('hex');
        const url = process.env.RAILWAY_STATIC_URL || 'https://web-production-bb99.up.railway.app';
        return `${url}/api/unsubscribe?token=${token}&email=${encodeURIComponent(email)}`;
    }

    async sendConsolidatedHailAlert(companies, state, hailData) {
        const { maxHail, affectedAreas, alertDetails } = hailData;
        const uniqueAreas = [...new Set(affectedAreas)].join(', ');
        const subject = `New Hail Alert in ${state} - Up to ${maxHail}" Hail Reported`;

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
                <h1>New Hail Alert for ${state}</h1>
                <h2>Max Hail Size: ${maxHail} inches</h2>
                <p><strong>Affected Areas:</strong> ${uniqueAreas}</p>
                <p>Our system has detected severe weather with significant hail in your subscribed service area. This is a prime opportunity for storm-related roofing inspections.</p>
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
                console.error(`❌ Failed to send consolidated hail alert to ${company.email}:`, error.message);
            }
        }
        console.log(`Consolidated hail alert processing complete for ${companies.length} subscribers for ${state}.`);
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
    
    async sendWelcomeEmail(email, companyName, states) {
        // Subscribe to newsletter first - This is now handled in the main /api/subscribe route
        // await this.subscribeToNewsletter(email);

        const subject = 'Welcome to Storm Alert Pro';
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2a5298;">Welcome ${companyName}!</h1>
                <p>You're now receiving storm alerts for: <strong>${states.join(', ')}</strong></p>
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
                <p style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px;">
                    <strong>🎉 Bonus:</strong> You've also been subscribed to the Python Web Solutions newsletter for additional web development tips and insights!
                </p>
            </div>
        `;

        try {
            await this.transporter.sendMail({
                from: this.fromAddress,
                to: email,
                subject: subject,
                html: htmlContent,
                headers: { 'X-Entity-ID': 'your-entity-id' }
            });
            console.log('Welcome email sent to:', email);
        } catch (error) {
            console.error('Error sending welcome email:', error);
            throw error;
        }
    }

    async sendAdminNotification(data) {
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