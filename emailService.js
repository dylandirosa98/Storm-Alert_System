const { Resend } = require('resend');
const crypto = require('crypto');
require('dotenv').config();

class EmailService {
    constructor() {
        // Initialize Resend with the API key
        this.resend = new Resend('re_TBwVnBac_H4XwzspEqMeMgREGGPGnproW');
        this.senderEmail = 'onboarding@resend.dev';
        this.senderName = 'Storm Alert System';
        this.adminEmail = 'dylandirosa980@gmail.com';
    }

    async sendEmail(to, subject, htmlContent) {
        try {
            console.log('Sending email via Resend to:', to);
            console.log('From:', this.senderEmail);
            
            const { data, error } = await this.resend.emails.send({
                from: `${this.senderName} <${this.senderEmail}>`,
                to: [to],
                subject: subject,
                html: htmlContent,
                tags: [{ name: 'category', value: 'storm_alert' }],
                headers: {
                    'X-Entity-Ref-ID': new Date().getTime().toString(),
                    'List-Unsubscribe': '<mailto:unsubscribe@stormalertsystem.com>',
                    'Precedence': 'bulk'
                },
                text: 'This is a storm alert notification. Please enable HTML to view the full content.'
            });

            if (error) {
                console.error('Resend API error:', error);
                throw new Error(`Email sending failed: ${error.message}`);
            }

            console.log('Resend API response:', data);
            console.log(`✅ Email sent successfully to ${to}`);
            console.log('Email ID:', data.id);
            return data;
        } catch (error) {
            console.error(`❌ Failed to send email to ${to}:`, error);
            throw error;
        }
    }

    generateUnsubscribeToken(email, zipCodes) {
        const data = `${email}:${JSON.stringify(zipCodes)}:${Date.now()}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    generateUnsubscribeUrl(email, zipCodes) {
        const token = this.generateUnsubscribeToken(email, zipCodes);
        const baseUrl = process.env.BASE_URL || 'https://storm-alert-system-production.up.railway.app';
        return `${baseUrl}/unsubscribe?token=${token}&email=${encodeURIComponent(email)}`;
    }

    getSeverityText(severityScore) {
        if (severityScore >= 9) return 'EXTREME IMPACT';
        if (severityScore >= 8) return 'HIGH IMPACT';
        if (severityScore >= 6) return 'MODERATE IMPACT';
        if (severityScore >= 4) return 'LOW-MODERATE';
        return 'LOW IMPACT';
    }

    formatCurrency(value) {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)} Million`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
        }
        return value.toLocaleString();
    }

    calculateMarketOpportunity(stormData) {
        const severityMultiplier = {
            1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5,
            6: 0.7, 7: 0.8, 8: 0.9, 9: 1.0, 10: 1.2
        };

        // Get the first storm detail
        const detail = stormData.details[0];
        if (!detail) {
            return {
                jobCount: 0,
                avgJobValue: 0,
                totalValue: 0
            };
        }

        // Base estimates per zip code (average residential properties)
        const avgPropertiesPerZip = 5000;
        const totalProperties = detail.zipCodes.length * avgPropertiesPerZip;
        
        let damageRate = severityMultiplier[detail.severityScore] || 0.5;
        
        // Adjust for specific storm types
        if (detail.hailSize >= 1.0) damageRate *= 1.5;
        if (detail.windSpeed >= 70) damageRate *= 1.3;
        if (detail.type.toLowerCase().includes('tornado')) damageRate *= 2.0;
        if (detail.type.toLowerCase().includes('hurricane')) damageRate *= 1.8;

        const potentialJobs = Math.min(Math.round(totalProperties * damageRate), detail.damageEstimate?.potentialJobs || 500);
        const avgJobValue = detail.damageEstimate?.avgJobValue || 8000;
        const totalValue = potentialJobs * avgJobValue;

        return {
            jobCount: potentialJobs,
            avgJobValue: avgJobValue,
            totalValue: totalValue
        };
    }

    extractCitiesFromAreas(areaDesc) {
        // Extract city names from area description
        const cities = [];
        const cityMatches = areaDesc.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
        if (cityMatches) {
            cities.push(...cityMatches.slice(0, 3)); // Limit to first 3 cities
        }
        return cities.length > 0 ? cities : ['Affected Area'];
    }

    getStormAlertTemplate() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Storm Alert - {city} Area</title>
    <style>
        /* Professional Email Styling */
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .email-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .alert-badge {
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 20px;
            padding: 5px 15px;
            display: inline-block;
            margin-top: 10px;
            font-weight: 600;
        }
        .content {
            padding: 30px;
        }
        .storm-details {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin-bottom: 25px;
            border-radius: 0 5px 5px 0;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h3 {
            color: #2c3e50;
            margin: 0 0 15px 0;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .detail-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            border-left: 3px solid #007bff;
        }
        .detail-label {
            font-weight: 600;
            color: #495057;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .detail-value {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
        }
        .market-highlight {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 5px;
            padding: 20px;
            text-align: center;
        }
        .market-value {
            font-size: 32px;
            font-weight: 800;
            color: #28a745;
            margin: 10px 0;
        }
        .actions-list {
            background: #e3f2fd;
            border-radius: 5px;
            padding: 20px;
        }
        .actions-list ul {
            margin: 0;
            padding-left: 20px;
        }
        .actions-list li {
            margin-bottom: 8px;
            font-weight: 500;
        }
        .urgency-banner {
            background: #dc3545;
            color: white;
            text-align: center;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            font-weight: 600;
        }
        .footer {
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 14px;
        }
        .footer a {
            color: #3498db;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .unsubscribe {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #495057;
            font-size: 12px;
            color: #adb5bd;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .details-grid {
                grid-template-columns: 1fr;
            }
            .market-value {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>⛈️ STORM ALERT DETECTED</h1>
            <div class="alert-badge">SEVERITY: {severity_score}/10 - {severity_text}</div>
        </div>
        
        <div class="content">
            <div class="storm-details">
                <h3>🎯 IMMEDIATE ROOFING OPPORTUNITY</h3>
                <p>A significant storm event has been identified in your service area with high potential for roof damage and insurance claims.</p>
            </div>

            <div class="section">
                <h3>📊 Storm Details</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Storm Type</div>
                        <div class="detail-value">{storm_type}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Hail Size</div>
                        <div class="detail-value">{hail_size} inches</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Wind Speed</div>
                        <div class="detail-value">{wind_speed} mph</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Severity Score</div>
                        <div class="detail-value">{severity_score}/10</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>📍 Affected Areas</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Cities</div>
                        <div class="detail-value">{affected_cities}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Zip Codes</div>
                        <div class="detail-value">{zip_codes}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>💰 Market Opportunity</h3>
                <div class="market-highlight">
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 15px;">Total Market Value</div>
                    <div class="market-value">{market_value}</div>
                    <div style="display: flex; justify-content: space-around; margin-top: 15px;">
                        <div>
                            <div style="font-weight: 600; color: #495057;">Potential Jobs</div>
                            <div style="font-size: 20px; font-weight: 700; color: #007bff;">{potential_jobs}</div>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #495057;">Avg Job Value</div>
                            <div style="font-size: 20px; font-weight: 700; color: #007bff;">{avg_job_value}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>🎯 Recommended Actions</h3>
                <div class="actions-list">
                    <ul>
                        {recommendations_list}
                    </ul>
                </div>
            </div>

            <div class="urgency-banner">
                ⏰ TIMING IS CRITICAL - Storm damage creates a narrow window of opportunity
            </div>

            <p style="color: #6c757d; font-style: italic; text-align: center; margin-top: 20px;">
                Weather conditions are expected to clear within 6-12 hours, making it safe for assessments and canvassing.
                <br>This alert was generated automatically based on real-time weather data and market analysis.
            </p>
        </div>

        <div class="footer">
            <div>
                <strong>Powered by Python Web Solutions</strong><br>
                <a href="https://pythonwebsolutions.com">https://pythonwebsolutions.com</a>
            </div>
            <div class="unsubscribe">
                Don't want to receive alerts for these areas? 
                <a href="{unsubscribe_url}">Click here to unsubscribe</a>
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    async sendStormAlert(stormData, companies) {
        console.log(`\n📧 Preparing to send professional storm alerts to ${companies.length} companies`);
        
        const template = this.getStormAlertTemplate();
        const marketData = this.calculateMarketOpportunity(stormData);
        const severityText = this.getSeverityText(stormData.details[0].severityScore);
        
        // Extract data from storm details
        const detail = stormData.details[0];
        const cities = this.extractCitiesFromAreas(detail.areas);
        const primaryCity = cities[0] || 'Affected Area';
        
        // Format recommendations as HTML list items
        const recommendationsList = stormData.recommendations
            .map(rec => `<li>${rec}</li>`)
            .join('');

        let successCount = 0;
        let errorCount = 0;

        for (const company of companies) {
            try {
                const unsubscribeUrl = this.generateUnsubscribeUrl(company.email, detail.zipCodes);
                
                const emailHtml = template
                    .replace(/{city}/g, primaryCity)
                    .replace(/{severity_score}/g, detail.severityScore)
                    .replace(/{severity_text}/g, severityText)
                    .replace(/{storm_type}/g, detail.type)
                    .replace(/{hail_size}/g, detail.hailSize > 0 ? detail.hailSize.toFixed(1) : 'N/A')
                    .replace(/{wind_speed}/g, detail.windSpeed > 0 ? detail.windSpeed : 'N/A')
                    .replace(/{affected_cities}/g, cities.join(', '))
                    .replace(/{zip_codes}/g, detail.zipCodes.slice(0, 10).join(', ') + (detail.zipCodes.length > 10 ? '...' : ''))
                    .replace(/{market_value}/g, this.formatCurrency(marketData.totalValue))
                    .replace(/{potential_jobs}/g, marketData.jobCount.toLocaleString())
                    .replace(/{avg_job_value}/g, marketData.avgJobValue.toLocaleString())
                    .replace(/{recommendations_list}/g, recommendationsList)
                    .replace(/{unsubscribe_url}/g, unsubscribeUrl);

                const subject = `⛈️ STORM ALERT: ${detail.type} - ${primaryCity} Area (Severity ${detail.severityScore}/10)`;

                await this.sendEmail(company.email, subject, emailHtml);
                successCount++;
                
                console.log(`✅ Professional storm alert sent to ${company.name || company.company_name} (${company.email})`);
                
            } catch (error) {
                errorCount++;
                console.error(`❌ Failed to send alert to ${company.name || company.company_name} (${company.email}):`, error.message);
            }
        }

        console.log(`\n📊 Storm Alert Summary:`);
        console.log(`   ✅ Successfully sent: ${successCount} emails`);
        console.log(`   ❌ Failed to send: ${errorCount} emails`);
        console.log(`   💰 Total market value: $${this.formatCurrency(marketData.totalValue)}`);
        console.log(`   🏠 Estimated jobs: ${marketData.jobCount}`);

        return { successCount, errorCount, marketData };
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
}

module.exports = EmailService;