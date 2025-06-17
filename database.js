const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Helper to promisify db.run
const run = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Error running sql: ', sql);
                console.error(err);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
};

class Database {
    constructor() {
        this.db = null;
    }

    async initialize() {
        try {
            const dbPath = path.join(__dirname, 'storm_alerts.db');
            console.log('Database path:', dbPath);

            this.db = await new Promise((resolve, reject) => {
                const dbInstance = new sqlite3.Database(dbPath, (err) => {
                    if (err) {
                        console.error('Error opening database file:', err);
                        reject(err);
                    } else {
                        console.log('Database file opened successfully. Initializing schema...');
                        resolve(dbInstance);
                    }
                });
            });

            await run(this.db, 'PRAGMA foreign_keys = ON');

            await run(this.db, `
                CREATE TABLE IF NOT EXISTS companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone TEXT,
                    contact_name TEXT NOT NULL,
                    states TEXT NOT NULL,
                    alert_preferences TEXT DEFAULT 'both',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    active BOOLEAN DEFAULT 1
                )
            `);
            console.log('Table "companies" created or verified.');

            // Add alert_preferences column if it doesn't exist
            await run(this.db, `
                PRAGMA table_info(companies)
            `).then(async () => {
                try {
                    await run(this.db, `
                        ALTER TABLE companies ADD COLUMN alert_preferences TEXT DEFAULT 'both'
                    `);
                    console.log('Added alert_preferences column to companies table.');
                } catch (err) {
                    // Column already exists, ignore error
                }
            });

            await run(this.db, `
                CREATE TABLE IF NOT EXISTS storm_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    state TEXT NOT NULL,
                    event_data TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Table "storm_events" created or verified.');

            // Create new table for detailed storm history
            await run(this.db, `
                CREATE TABLE IF NOT EXISTS storm_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_id TEXT UNIQUE NOT NULL,
                    state TEXT NOT NULL,
                    county TEXT,
                    event_type TEXT NOT NULL,
                    headline TEXT,
                    description TEXT,
                    hail_size REAL DEFAULT 0,
                    hail_size_text TEXT,
                    wind_speed REAL DEFAULT 0,
                    onset_time DATETIME,
                    expires_time DATETIME,
                    area_desc TEXT,
                    raw_data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_state (state),
                    INDEX idx_onset (onset_time),
                    INDEX idx_hail (hail_size)
                )
            `);
            console.log('Table "storm_history" created or verified.');

            // Create indexes for better query performance
            await run(this.db, `CREATE INDEX IF NOT EXISTS idx_storm_history_state_onset ON storm_history(state, onset_time)`);
            await run(this.db, `CREATE INDEX IF NOT EXISTS idx_storm_history_hail_size ON storm_history(hail_size)`);
            console.log('Storm history indexes created or verified.');

            await run(this.db, `
                CREATE TABLE IF NOT EXISTS unsubscribes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    zip_codes TEXT,
                    unsubscribe_token TEXT UNIQUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    all_alerts BOOLEAN DEFAULT FALSE
                )
            `);
            console.log('Table "unsubscribes" created or verified.');

            // Clean up duplicate emails, ensuring we keep the most recent subscription.
            await run(this.db, `
                DELETE FROM companies 
                WHERE id NOT IN (
                    SELECT MAX(id) 
                    FROM companies 
                    GROUP BY email
                )
            `);
            console.log('Duplicate emails cleaned up.');

            console.log('✅ Database schema initialized successfully.');

            // Auto-restore from backup if available, but don't let it crash startup
            try {
                await this.restoreFromBackup();
            } catch (restoreError) {
                console.log('ℹ️ No backup to restore or restore failed:', restoreError.message);
            }

        } catch (error) {
            console.error('❌ CRITICAL: Database initialization failed:', error);
            throw error; // Re-throw error to halt server startup if db fails
        }
    }

    // Backup database data to environment variable
    async createBackup() {
        try {
            const companies = await new Promise((resolve, reject) => {
                this.db.all("SELECT * FROM companies", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            const backup = {
                timestamp: new Date().toISOString(),
                companies: companies
            };

            return JSON.stringify(backup);
        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }

    // Restore database from backup
    async restoreFromBackup() {
        try {
            if (!process.env.DB_BACKUP) {
                throw new Error('No backup data found');
            }

            const backup = JSON.parse(process.env.DB_BACKUP);
            console.log(`🔄 Restoring backup from ${backup.timestamp}`);
            console.log(`📋 Restoring ${backup.companies.length} companies`);

            for (const company of backup.companies) {
                try {
                    await this.addCompany({
                        companyName: company.company_name,
                        email: company.email,
                        phone: company.phone,
                        contactName: company.contact_name,
                        states: company.states
                    });
                    console.log(`✅ Restored: ${company.email}`);
                } catch (error) {
                    if (error.message && error.message.includes('UNIQUE constraint failed')) {
                        console.log(`ℹ️ Skipped duplicate: ${company.email}`);
                    } else {
                        console.error(`❌ Failed to restore ${company.email}:`, error.message);
                    }
                }
            }

            console.log('✅ Database restore completed');
        } catch (error) {
            console.error('Restore failed:', error.message);
            throw error;
        }
    }

    async addCompany(data) {
        const result = await new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO companies (company_name, email, phone, contact_name, states, alert_preferences)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                data.companyName,
                data.email,
                data.phone,
                data.contactName,
                data.states,
                data.alertPreferences || 'both',
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
            
            stmt.finalize();
        });

        // Auto-backup after adding a company
        try {
            const backupData = await this.createBackup();
            console.log('📋 Database backup created automatically');
            // In production, you could send this to a webhook or save it somewhere
        } catch (error) {
            console.error('Auto-backup failed:', error.message);
        }

        return result;
    }

    async getSubscribedStates() {
        return new Promise((resolve, reject) => {
            this.db.all(
                "SELECT DISTINCT states FROM companies WHERE active = 1",
                (err, rows) => {
                    if (err) reject(err);
                    else {
                        const allStates = new Set();
                        rows.forEach(row => {
                            row.states.split(',').forEach(state => allStates.add(state.trim()));
                        });
                        resolve(Array.from(allStates));
                    }
                }
            );
        });
    }

    async getCompaniesByState(state) {
        return new Promise((resolve, reject) => {
            this.db.all(
                "SELECT * FROM companies WHERE active = 1 AND states LIKE ?",
                [`%${state}%`],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async logStormEvent(state, data) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO storm_events (state, event_data, severity)
                VALUES (?, ?, ?)
            `);
            
            stmt.run(
                state,
                JSON.stringify(data),
                data.severity,
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
            
            stmt.finalize();
        });
    }

    async getRecentSignificantStorms(states, daysBack = 30) {
        return new Promise((resolve, reject) => {
            const stateList = states.map(s => `'${s}'`).join(',');
            const query = `
                SELECT * FROM storm_events 
                WHERE state IN (${stateList})
                AND severity IN ('high', 'extreme')
                AND created_at >= datetime('now', '-${daysBack} days')
                ORDER BY created_at DESC
                LIMIT 1
            `;
            
            this.db.get(query, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getCompanyById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT * FROM companies WHERE id = ?",
                [id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async getCompanyByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT * FROM companies WHERE email = ?",
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    async addUnsubscribe(email, token) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO unsubscribes (email, unsubscribe_token, all_alerts, created_at) 
                VALUES (?, ?, ?, datetime('now'))
            `);
            
            stmt.run(email, token, true, function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
            
            stmt.finalize();
        });
    }

    async deleteCompany(email) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare("DELETE FROM companies WHERE email = ?");
            
            stmt.run(email, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
            
            stmt.finalize();
        });
    }

    async isUnsubscribed(email) {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT * FROM unsubscribes WHERE email = ? AND all_alerts = 1",
                [email],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(!!row);
                }
            );
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        this.db = null;
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Store storm alert in history
    async storeStormAlert(alertData) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT OR IGNORE INTO storm_history (
                    alert_id, state, county, event_type, headline, description,
                    hail_size, hail_size_text, wind_speed, onset_time, expires_time,
                    area_desc, raw_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                alertData.alertId,
                alertData.state,
                alertData.county,
                alertData.eventType,
                alertData.headline,
                alertData.description,
                alertData.hailSize || 0,
                alertData.hailSizeText,
                alertData.windSpeed || 0,
                alertData.onsetTime,
                alertData.expiresTime,
                alertData.areaDesc,
                JSON.stringify(alertData.rawData),
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            // Alert already stored, this is fine
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
            
            stmt.finalize();
        });
    }

    // Get storm history for specific states and time period
    async getStormHistory(states, startDate, endDate, minHailSize = 0.75) {
        return new Promise((resolve, reject) => {
            const stateList = states.map(() => '?').join(',');
            const query = `
                SELECT * FROM storm_history 
                WHERE state IN (${stateList})
                AND onset_time >= ?
                AND onset_time <= ?
                AND hail_size >= ?
                ORDER BY onset_time DESC
            `;
            
            const params = [...states, startDate, endDate, minHailSize];
            
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Get storm statistics for a state
    async getStormStatistics(state, months = 12) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(CASE WHEN hail_size >= 0.75 THEN 1 END) as hail_events,
                    COUNT(CASE WHEN wind_speed >= 70 THEN 1 END) as wind_events,
                    MAX(hail_size) as max_hail_size,
                    MAX(wind_speed) as max_wind_speed,
                    MIN(onset_time) as earliest_event,
                    MAX(onset_time) as latest_event
                FROM storm_history 
                WHERE state = ?
                AND onset_time >= datetime('now', '-${months} months')
            `;
            
            this.db.get(query, [state], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
}

module.exports = Database; 