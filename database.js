const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.isPostgreSQL = false;
    }

    initialize() {
        return new Promise((resolve, reject) => {
            try {
                // Check if PostgreSQL is available (Railway provides DATABASE_URL)
                if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
                    console.log('🐘 Using PostgreSQL database in production');
                    this.initializePostgreSQL(resolve, reject);
                } else {
                    console.log('📁 Using SQLite database');
                    this.initializeSQLite(resolve, reject);
                }
            } catch (error) {
                console.error('Database initialization error:', error);
                reject(error);
            }
        });
    }

    initializePostgreSQL(resolve, reject) {
        const { Pool } = require('pg');
        
        this.db = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.isPostgreSQL = true;
        console.log('Database type: PostgreSQL');
        console.log('Database URL available:', !!process.env.DATABASE_URL);
        
        // Test connection and create tables
        this.createPostgreSQLTables()
            .then(() => {
                console.log('✅ PostgreSQL database initialized successfully');
                resolve();
            })
            .catch(reject);
    }

    async createPostgreSQLTables() {
        const client = await this.db.connect();
        
        try {
            // Companies table
            await client.query(`
                CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY,
                    company_name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone TEXT,
                    contact_name TEXT NOT NULL,
                    states TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    active BOOLEAN DEFAULT true
                )
            `);
            
            // Storm events table
            await client.query(`
                CREATE TABLE IF NOT EXISTS storm_events (
                    id SERIAL PRIMARY KEY,
                    state TEXT NOT NULL,
                    event_data TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Unsubscribes table
            await client.query(`
                CREATE TABLE IF NOT EXISTS unsubscribes (
                    id SERIAL PRIMARY KEY,
                    email TEXT NOT NULL,
                    zip_codes TEXT,
                    unsubscribe_token TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    all_alerts BOOLEAN DEFAULT FALSE
                )
            `);
            
            console.log('PostgreSQL tables created/verified');
        } finally {
            client.release();
        }
    }

    initializeSQLite(resolve, reject) {
        // Use local SQLite database for development
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
                            resolve();
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
                            resolve();
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
                            resolve();
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
    }

    async addCompany(data) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query(
                    'INSERT INTO companies (company_name, email, phone, contact_name, states) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    [data.companyName, data.email, data.phone, data.contactName, data.states]
                );
                return result.rows[0].id;
            } finally {
                client.release();
            }
        } else {
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
    }

    async getSubscribedStates() {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query('SELECT DISTINCT states FROM companies WHERE active = true');
                const allStates = new Set();
                result.rows.forEach(row => {
                    row.states.split(',').forEach(state => allStates.add(state.trim()));
                });
                return Array.from(allStates);
            } finally {
                client.release();
            }
        } else {
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
    }

    async getCompaniesByState(state) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query(
                    'SELECT * FROM companies WHERE active = true AND states LIKE $1',
                    [`%${state}%`]
                );
                return result.rows;
            } finally {
                client.release();
            }
        } else {
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
    }

    async logStormEvent(state, data) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query(
                    'INSERT INTO storm_events (state, event_data, severity) VALUES ($1, $2, $3) RETURNING id',
                    [state, JSON.stringify(data), data.severity]
                );
                return result.rows[0].id;
            } finally {
                client.release();
            }
        } else {
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
    }

    async getRecentSignificantStorms(states, daysBack = 30) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const placeholders = states.map((_, i) => `$${i + 1}`).join(',');
                const query = `
                    SELECT * FROM storm_events 
                    WHERE state = ANY($1)
                    AND severity IN ('high', 'extreme')
                    AND created_at >= NOW() - INTERVAL '${daysBack} days'
                    ORDER BY created_at DESC
                    LIMIT 1
                `;
                const result = await client.query(query, [states]);
                return result.rows[0] || null;
            } finally {
                client.release();
            }
        } else {
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
    }

    async getCompanyById(id) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query('SELECT * FROM companies WHERE id = $1', [id]);
                return result.rows[0] || null;
            } finally {
                client.release();
            }
        } else {
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

    async getCompanyByEmail(email) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query('SELECT * FROM companies WHERE email = $1', [email]);
                return result.rows[0] || null;
            } finally {
                client.release();
            }
        } else {
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
    }

    async addUnsubscribe(email, token) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query(
                    'INSERT INTO unsubscribes (email, unsubscribe_token, all_alerts, created_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (unsubscribe_token) DO UPDATE SET email = $1, all_alerts = $3, created_at = NOW() RETURNING id',
                    [email, token, true]
                );
                return result.rows[0].id;
            } finally {
                client.release();
            }
        } else {
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
    }

    async deleteCompany(email) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query('DELETE FROM companies WHERE email = $1', [email]);
                return result.rowCount;
            } finally {
                client.release();
            }
        } else {
            return new Promise((resolve, reject) => {
                const stmt = this.db.prepare("DELETE FROM companies WHERE email = ?");
                
                stmt.run(email, function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
                
                stmt.finalize();
            });
        }
    }

    async isUnsubscribed(email) {
        if (this.isPostgreSQL) {
            const client = await this.db.connect();
            try {
                const result = await client.query(
                    'SELECT * FROM unsubscribes WHERE email = $1 AND all_alerts = true',
                    [email]
                );
                return result.rows.length > 0;
            } finally {
                client.release();
            }
        } else {
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
    }

    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                if (this.isPostgreSQL) {
                    this.db.end(() => {
                        console.log('PostgreSQL connection pool closed');
                        this.db = null;
                        resolve();
                    });
                } else {
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
                }
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database; 