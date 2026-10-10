const fs = require('fs');
const path = require('path');
const pool = require('../backend/config/db');

async function seed() {
    if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DESTRUCTIVE_DEMO_SEED !== 'true' || process.env.DB_NAME !== 'hirenextai_local') {
        throw new Error('Demo seeding is restricted to the explicitly opted-in local development database.');
    }
    console.log('Starting database seeding...');
    try {
        // Drop existing tables in reverse dependency order
        const dropQueries = [
            'DROP TABLE IF EXISTS files',
            'DROP TABLE IF EXISTS applications',
            'DROP TABLE IF EXISTS messages',
            'DROP TABLE IF EXISTS chats',
            'DROP TABLE IF EXISTS support_tickets',
            'DROP TABLE IF EXISTS connected_accounts',
            'DROP TABLE IF EXISTS user_profiles',
            'DROP TABLE IF EXISTS interviews',
            'DROP TABLE IF EXISTS plans',
            'DROP TABLE IF EXISTS jobs',
            'DROP TABLE IF EXISTS tickets',
            'DROP TABLE IF EXISTS users'
        ];

        console.log('Dropping existing tables...');
        for (const query of dropQueries) {
            try {
                await pool.query(query);
            } catch (err) {
                console.warn(`Warning dropping table: ${err.message}`);
            }
        }

        // Read and execute schema.sql
        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split queries by semicolon and execute them (ignoring empty statements)
        const queries = schemaSql
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        console.log('Creating tables...');
        for (const query of queries) {
            await pool.query(query);
        }

        console.log('Inserting seed data...');

        // 1. Seed Users (password: 'password123' bcrypt hash)
        const samplePasswordHash = '$2b$10$tJ08dYgLghw6q/s/a3x2euUqF4v06M.Zp2rFkR4kEqQ9gM1yIq1Qy';
        
        const [userResult] = await pool.query(
            `INSERT INTO users (firstName, lastName, email, passwordHash, plan, role, isVerified, lastLoginAt)
             VALUES 
             ('Kunal', 'Sharma', 'kunal@example.com', ?, 'pro', 'admin', 1, NOW()),
             ('Vanshika', 'Purohit', 'vanshika@example.com', ?, 'pro', 'user', 1, NOW()),
             ('Demo', 'User', 'demo@hirenextai.com', ?, 'free', 'user', 0, NULL)`,
            [samplePasswordHash, samplePasswordHash, samplePasswordHash]
        );
        
        const firstUserId = userResult.insertId;

        // 2. Seed Support Tickets
        await pool.query(
            `INSERT INTO support_tickets (name, email, subject, message, category, status, repliedAt)
             VALUES 
             ('Kunal Sharma', 'kunal@example.com', 'Login issue', 'I cannot log in to my account.', 'auth', 'open', NULL),
             ('Vanshika Purohit', 'vanshika@example.com', 'Billing Ingestion Issues', 'I paid for pro but showing free.', 'billing', 'resolved', NOW()),
             ('Demo User', 'demo@hirenextai.com', 'General inquiry', 'Is the browser extension free?', 'general', 'open', NULL)`
        );

        // 3. Seed Chats
        const [chatResult] = await pool.query(
            `INSERT INTO chats (userId, title, pinned, archived)
             VALUES 
             (?, 'Resume optimization', 1, 0),
             (?, 'Job Match helper', 0, 0)`,
            [firstUserId, firstUserId]
        );
        const chatId = chatResult.insertId;

        // 4. Seed Messages
        await pool.query(
            `INSERT INTO messages (chatId, role, content)
             VALUES 
             (?, 'user', 'Can you review my resume?'),
             (?, 'ai', 'Sure! Please paste your resume content or upload a PDF/text file.'),
             (?, 'user', 'Here is my text: Experienced Frontend Dev...'),
             (?, 'ai', 'Great. I suggest adding metrics to your projects.')`,
            [chatId, chatId, chatId, chatId]
        );

        // 5. Seed Applications
        await pool.query(
            `INSERT INTO applications (userId, jobTitle, company, location, salary, status, matchScore)
             VALUES 
             (?, 'Frontend Developer', 'TechCorp', 'Remote', '120k USD', 'Interview Scheduled', 85),
             (?, 'Full Stack Engineer', 'StartupInc', 'San Francisco', '140k USD', 'Pending', 75)`,
            [firstUserId, firstUserId]
        );

        // 6. Seed Files
        await pool.query(
            `INSERT INTO files (userId, type, title, content, jobId)
             VALUES 
             (?, 'resume', 'My_Resume.txt', 'Experienced frontend developer with React/Node/MySQL skills.', NULL),
             (?, 'cover_letter', 'Cover_Letter_TechCorp.txt', 'Dear Hiring Manager, I am writing to apply...', 1)`,
            [firstUserId, firstUserId]
        );

        console.log('Database seeded successfully!');
    } catch (err) {
        console.error('Error seeding database:', err);
    } finally {
        await pool.end();
        console.log('Database connection pool closed.');
    }
}

seed();
