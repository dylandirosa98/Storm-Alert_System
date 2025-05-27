const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    initialize() {
        return new Promise((resolve, reject) => {
            try {
                this.db = new sqlite3.Database(path.join(__dirname, 'storm_alerts.db'), (err) => {
                    if (err) {
                        console.error('Error opening database:', err);
                        reject(err);
                        return;
                    }

                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON');

                    // Create tables in sequence
                    this.db.serialize(() => {
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
                        });

                        // Remove duplicate emails, keeping only the most recent entry
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
                                reject(err);
                                return;
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
                            resolve();
                        });
                    });
                });
            } catch (error) {
                console.error('Database initialization error:', error);
                reject(error);
            }
        });
    }

    async addCompany(data) {
        return new Promise((resolve, reject) => {
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
}

module.exports = Database; 