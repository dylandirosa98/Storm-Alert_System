const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
    }

    initialize() {
        return new Promise((resolve, reject) => {
            try {
                // Use SQLite with a persistent approach
                const dbPath = path.join(__dirname, 'storm_alerts.db');
                
                console.log('Database path:', dbPath);
                console.log('Environment:', process.env.NODE_ENV);
                
                this.db = new sqlite3.Database(dbPath, (err) => {
                    if (err) {
                        console.error('Error opening database:', err);
                        reject(err);
                        return;
                    }

                    console.log('Database file opened successfully');

                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON', (err) => {
                        if (err) {
                            console.error('Error enabling foreign keys:', err);
                            reject(err);
                            return;
                        }

                        // Create tables in sequence
                        this.db.serialize(() => {
                            let tablesCreated = 0;
                            const totalTables = 3;

                            // Companies table with UNIQUE email constraint
                            this.db.run(`
                                CREATE TABLE IF NOT EXISTS companies (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    company_name TEXT NOT NULL,
                                    email TEXT NOT NULL UNIQUE,
                                    phone TEXT,
                                    contact_name TEXT NOT NULL,
                                    states TEXT NOT NULL,
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    active BOOLEAN DEFAULT 1
                                )
                            `, (err) => {
                                if (err) {
                                    console.error('Error creating companies table:', err);
                                    reject(err);
                                    return;
                                }
                                console.log('Companies table created/verified');
                                tablesCreated++;
                                
                                if (tablesCreated === totalTables) {
                                    console.log('All database tables initialized successfully');
                                    // Auto-restore from backup if available
                                    this.restoreFromBackup().then(() => {
                                        resolve();
                                    }).catch((restoreError) => {
                                        console.log('No backup to restore or restore failed:', restoreError.message);
                                        resolve(); // Continue even if restore fails
                                    });
                                }
                            });

                            // Storm events table
                            this.db.run(`
                                CREATE TABLE IF NOT EXISTS storm_events (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    state TEXT NOT NULL,
                                    event_data TEXT NOT NULL,
                                    severity TEXT NOT NULL,
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                )
                            `, (err) => {
                                if (err) {
                                    console.error('Error creating storm_events table:', err);
                                    reject(err);
                                    return;
                                }
                                console.log('Storm events table created/verified');
                                tablesCreated++;
                                
                                if (tablesCreated === totalTables) {
                                    console.log('All database tables initialized successfully');
                                    // Auto-restore from backup if available
                                    this.restoreFromBackup().then(() => {
                                        resolve();
                                    }).catch((restoreError) => {
                                        console.log('No backup to restore or restore failed:', restoreError.message);
                                        resolve(); // Continue even if restore fails
                                    });
                                }
                            });

                            // Unsubscribes table
                            this.db.run(`
                                CREATE TABLE IF NOT EXISTS unsubscribes (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    email TEXT NOT NULL,
                                    zip_codes TEXT,
                                    unsubscribe_token TEXT UNIQUE,
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    all_alerts BOOLEAN DEFAULT FALSE
                                )
                            `, (err) => {
                                if (err) {
                                    console.error('Error creating unsubscribes table:', err);
                                    reject(err);
                                    return;
                                }
                                console.log('Unsubscribes table created/verified');
                                tablesCreated++;
                                
                                if (tablesCreated === totalTables) {
                                    console.log('All database tables initialized successfully');
                                    // Auto-restore from backup if available
                                    this.restoreFromBackup().then(() => {
                                        resolve();
                                    }).catch((restoreError) => {
                                        console.log('No backup to restore or restore failed:', restoreError.message);
                                        resolve(); // Continue even if restore fails
                                    });
                                }
                            });

                            // Remove duplicate emails after tables are created
                            this.db.run(`
                                DELETE FROM companies 
                                WHERE id NOT IN (
                                    SELECT MAX(id) 
                                    FROM companies 
                                    GROUP BY email
                                )
                            `, (err) => {
                                if (err) {
                                    console.error('Error removing duplicate emails:', err);
                                    // Don't reject here, just log the error
                                } else {
                                    console.log('Duplicate emails cleaned up');
                                }
                            });
                        });
                    });
                });
            } catch (error) {
                console.error('Database initialization error:', error);
                reject(error);
            }
        });
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
                INSERT INTO companies (company_name, email, phone, contact_name, states)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                data.companyName,
                data.email,
                data.phone,
                data.contactName,
                data.states,
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
}

module.exports = Database; 