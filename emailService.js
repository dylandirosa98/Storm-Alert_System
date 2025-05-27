const { Resend } = require('resend');
require('dotenv').config();

class EmailService {
    constructor() {
        // Initialize Resend with the API key
        this.resend = new Resend('re_TBwVnBac_H4XwzspEqMeMgREGGPGnproW');
        this.senderEmail = 'onboarding@resend.dev';
        this.adminEmail = 'dylandirosa980@gmail.com';
    }

    async sendEmail(to, subject, html) {
        try {
            const { data, error } = await this.resend.emails.send({
                from: this.senderEmail,
                to: [to],
                subject: subject,
                html: html,
            });

            if (error) {
                console.error('Resend API error:', error);
                throw new Error(`Email sending failed: ${error.message}`);
            }

            console.log('Email sent successfully:', data);
            return true;
        } catch (error) {
            console.error('Email sending error:', error);
            throw error;
        }
    }

    async sendWelcomeEmail(email, companyName, states) {
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
            </div>
        `;

        try {
            await this.sendEmail(email, subject, htmlContent);
            console.log('Welcome email sent to:', email);
        } catch (error) {
            console.error('Error sending welcome email:', error);
            throw error;
        }
    }

    async sendAdminNotification(formData) {
        const subject = '🔔 New Company Registration';
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2a5298;">New Company Registration</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <h3>Company Details:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Company Name:</strong> ${formData.companyName}</li>
                        <li><strong>Contact Person:</strong> ${formData.contactName}</li>
                        <li><strong>Email:</strong> ${formData.email}</li>
                        <li><strong>Phone:</strong> ${formData.phone || 'Not provided'}</li>
                        <li><strong>Selected States:</strong> ${formData.states.join(', ')}</li>
                        <li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li>
                    </ul>
                </div>
            </div>
        `;

        try {
            await this.sendEmail(this.adminEmail, subject, htmlContent);
            console.log('Admin notification sent');
        } catch (error) {
            console.error('Error sending admin notification:', error);
            throw error;
        }
    }

    async sendRecentStormAlert(company, stormData, state, stormDate) {
        if (!company || !company.email) {
            throw new Error('Invalid company data');
        }

        if (!stormData) {
            throw new Error('Invalid storm data');
        }

        const worthIt = stormData.worthCanvassing ? 
            '✅ HIGH VALUE - Worth immediate canvassing!' : 
            '⚠️ MODERATE VALUE - Monitor situation';

        const details = stormData.details && stormData.details[0] ? stormData.details[0] : {
            type: 'No severe weather events',
            headline: 'Weather Monitoring Active',
            areas: 'Your service areas',
            damageEstimate: {
                potentialJobs: 0,
                avgJobValue: 0,
                totalMarketValue: 0
            }
        };

        const formattedDate = new Date(stormDate).toLocaleString();
        const subject = `📌 [SAMPLE ALERT] Recent ${stormData.severity.toUpperCase()} Storm - ${state}`;
        
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <div style="background: #fff3cd; padding: 15px; margin-bottom: 20px; border: 1px solid #ffeeba; border-radius: 8px;">
                    <p style="margin: 0; color: #856404;">
                        <strong>📌 SAMPLE ALERT:</strong> This is an example of a recent storm alert from ${state} that occurred on ${formattedDate}. 
                        You'll receive similar real-time alerts when new storms impact your service areas.
                    </p>
                </div>

                <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; border-radius: 10px;">
                    <h1>⛈️ Storm Alert for ${company.company_name}</h1>
                    <p style="font-size: 18px;">${details.type} - ${details.headline}</p>
                </div>

                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h2>${worthIt}</h2>
                    <p><strong>Severity:</strong> ${stormData.severity.toUpperCase()}<br>
                    <strong>Potential Jobs:</strong> ${details.damageEstimate.potentialJobs}<br>
                    <strong>Avg Job Value:</strong> $${details.damageEstimate.avgJobValue.toLocaleString()}<br>
                    <strong>Total Market Opportunity:</strong> $${details.damageEstimate.totalMarketValue.toLocaleString()}</p>
                </div>

                <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                    <h3>Storm Details</h3>
                    <p><strong>Type:</strong> ${details.type}<br>
                    <strong>Areas:</strong> ${details.areas}</p>
                </div>

                <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Recommended Actions</h3>
                    <ul>
                        ${stormData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;

        return await this.sendEmail(company.email, subject, htmlContent);
    }

    async sendStormAlert(company, stormData) {
        if (!company || !company.email) {
            throw new Error('Invalid company data');
        }

        if (!stormData) {
            throw new Error('Invalid storm data');
        }

        const worthIt = stormData.worthCanvassing ? 
            '✅ HIGH VALUE - Worth immediate canvassing!' : 
            '⚠️ MODERATE VALUE - Monitor situation';

        const details = stormData.details && stormData.details[0] ? stormData.details[0] : {
            type: 'No severe weather events',
            headline: 'Weather Monitoring Active',
            areas: 'Your service areas',
            damageEstimate: {
                potentialJobs: 0,
                avgJobValue: 0,
                totalMarketValue: 0
            }
        };

        const subject = `🌩️ STORM ALERT - ${stormData.severity.toUpperCase()} Weather Event - ${company.company_name}`;
        
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; border-radius: 10px;">
                    <h1>⛈️ STORM ALERT for ${company.company_name}</h1>
                    <p style="font-size: 18px;">${details.type} - ${details.headline}</p>
                    <p style="font-size: 16px;">🕒 Alert Time: ${new Date().toLocaleString()}</p>
                </div>

                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <h2>${worthIt}</h2>
                    <p><strong>Severity:</strong> ${stormData.severity.toUpperCase()}<br>
                    <strong>Potential Jobs:</strong> ${details.damageEstimate.potentialJobs}<br>
                    <strong>Avg Job Value:</strong> $${details.damageEstimate.avgJobValue.toLocaleString()}<br>
                    <strong>Total Market Opportunity:</strong> $${details.damageEstimate.totalMarketValue.toLocaleString()}</p>
                </div>

                <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                    <h3>Storm Details</h3>
                    <p><strong>Type:</strong> ${details.type}<br>
                    <strong>Areas Affected:</strong> ${details.areas}<br>
                    <strong>Damage Type:</strong> ${details.damageType || 'Multiple types possible'}</p>
                </div>

                <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Recommended Actions</h3>
                    <ul>
                        ${stormData.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; font-size: 14px; color: #666;">
                    <p><strong>Storm Alert Pro</strong> - Real-time severe weather monitoring for roofing professionals</p>
                    <p>This alert was generated automatically based on National Weather Service data and storm analysis algorithms.</p>
                </div>
            </div>
        `;

        return await this.sendEmail(company.email, subject, htmlContent);
    }
}

module.exports = EmailService;