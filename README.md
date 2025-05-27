# 🌩️ Storm Alert System

Real-time severe weather monitoring and alert system for roofing companies. Automatically detects storms across all 50 US states and sends email alerts to subscribed companies.

## 🚀 Features

- **Real-time Weather Monitoring**: Checks all 50 states every 5 minutes
- **Intelligent Storm Analysis**: Filters for storms worth canvassing
- **Automated Email Alerts**: Professional storm notifications via Resend API
- **State-based Subscriptions**: Companies only get alerts for their service areas
- **Professional Landing Page**: Easy company registration
- **24/7 Operation**: Runs continuously on Railway cloud platform

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Email Service**: Resend API
- **Weather Data**: National Weather Service API
- **Deployment**: Railway
- **Automation**: Node-cron

## 📧 Email Configuration

The system uses Resend API for reliable email delivery:
- **Sender**: onboarding@resend.dev
- **API Key**: Configured in environment variables
- **Email Types**: Storm alerts, welcome emails, admin notifications

## 🌍 Weather Coverage

Monitors severe weather across all 50 US states including:
- Tornado Warnings
- Severe Thunderstorm Warnings
- Hurricane Warnings
- High Wind Warnings
- Hail Storms

## 🔄 How It Works

1. **Cron Job**: Runs every 5 minutes
2. **Weather Check**: Queries NWS API for all subscribed states
3. **Storm Analysis**: Evaluates damage potential and canvassing value
4. **Email Alerts**: Sends notifications to relevant subscribers
5. **Database Logging**: Records all storm events

## 🚀 Railway Deployment

This application is configured for Railway deployment with:
- Automatic builds via Nixpacks
- Environment variable configuration
- Restart policies for reliability
- Health check endpoints

### Environment Variables Needed:
- `PORT`: Automatically set by Railway
- `NODE_ENV`: Set to "production"

## 📊 API Endpoints

- `GET /`: Landing page for company registration
- `POST /api/subscribe`: Company subscription endpoint
- `GET /api/health`: Health check for monitoring
- `GET /api/test-storm-check`: Manual storm check trigger

## 🎯 Target Users

Roofing companies looking for:
- Storm damage opportunities
- Real-time severe weather alerts
- Geographic targeting by state
- Professional email notifications

## 📈 System Status

- **Weather API**: National Weather Service (weather.gov)
- **Email Delivery**: Resend API
- **Uptime**: 24/7 via Railway hosting
- **Coverage**: All 50 US states
- **Update Frequency**: Every 5 minutes

## 🔧 Local Development

```bash
npm install
npm start
```

## 📝 License

MIT License - Built by Dylan DiRosa 