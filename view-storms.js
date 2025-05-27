const Database = require('./database');
const db = new Database();

async function viewStorms() {
    await db.initialize();
    
    db.db.all(
        "SELECT * FROM storm_events ORDER BY created_at DESC LIMIT 10",
        (err, rows) => {
            if (err) {
                console.error(err);
                return;
            }
            
            console.log(`\n📊 Found ${rows.length} storm events:\n`);
            
            rows.forEach(row => {
                const data = JSON.parse(row.event_data);
                console.log(`State: ${row.state}`);
                console.log(`Severity: ${row.severity}`);
                console.log(`Date: ${row.created_at}`);
                console.log(`Worth Canvassing: ${data.worthCanvassing}`);
                console.log('---');
            });
            
            process.exit(0);
        }
    );
}

viewStorms(); 