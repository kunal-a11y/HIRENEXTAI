const pool = require('../backend/config/db');

async function migrate() {
    console.log('Starting database schema migration...');
    try {
        const columns = [
            { name: 'phone', type: 'VARCHAR(15) DEFAULT NULL' },
            { name: 'linkedinUrl', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'indeedUrl', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'naukriUrl', type: 'VARCHAR(255) DEFAULT NULL' },
            { name: 'githubUrl', type: 'VARCHAR(255) DEFAULT NULL' }
        ];

        for (const col of columns) {
            try {
                // Check if column exists
                const [rows] = await pool.query(
                    `SHOW COLUMNS FROM users LIKE ?`,
                    [col.name]
                );

                if (rows.length === 0) {
                    console.log(`Adding column "${col.name}" to users table...`);
                    await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`✅ Column "${col.name}" added successfully.`);
                } else {
                    console.log(`Column "${col.name}" already exists, skipping.`);
                }
            } catch (err) {
                console.error(`Error processing column "${col.name}":`, err.message);
            }
        }
        console.log('Migration finished successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

migrate();
