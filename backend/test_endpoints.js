const jwt = require('jsonwebtoken');

// 1. Set environment variables for testing
process.env.PORT = 9999;
process.env.JWT_SECRET = 'hirenextai_super_secret_2026';
process.env.ADMIN_EMAILS = 'admin@example.com';

// Keep track of executed SQL queries
const queriesExecuted = [];

// 2. Mock the DB pool
const mockPool = {
    query: async (sql, params) => {
        const cleanedSql = sql.replace(/\s+/g, ' ').trim();
        queriesExecuted.push({ sql: cleanedSql, params });

        console.log(`[SQL Mock Executed]: "${cleanedSql}"`, params || '');

        // Match queries and return mock data
        if (cleanedSql.includes('SELECT id FROM users WHERE email = ?')) {
            return [[]]; // No existing user
        }
        if (cleanedSql.includes('INSERT INTO users')) {
            return [{ insertId: 123 }];
        }
        if (cleanedSql.includes('INSERT INTO support_tickets')) {
            return [{ insertId: 456 }];
        }
        if (cleanedSql.includes('FROM users WHERE id = ?')) {
            return [[{ id: 999, email: 'admin@example.com', firstName: 'Admin', lastName: 'User', role: 'owner', isSuspended: 0, adminPermissions: null, tokenVersion: 1, ipAddress: '127.0.0.1', device: 'Desktop' }]];
        }
        if (cleanedSql.includes('SELECT COUNT(*) as count FROM users')) {
            return [[{ count: 12 }]];
        }
        if (cleanedSql.includes('FROM users WHERE role = "user"')) {
            return [[
                { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', plan: 'free', role: 'user', isSuspended: 0, lastLoginAt: new Date(), createdAt: new Date(), adminNotes: null, isVerified: 0 }
            ]];
        }
        if (cleanedSql.includes('SELECT 1')) {
            return [[{ 1: 1 }]];
        }
        return [[]];
    },
    end: async () => {
        console.log('Mock pool closed.');
    }
};

// Override the DB module cache
const dbPath = require.resolve('./config/db');
require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: mockPool
};

// 3. Import and start the server
console.log('Starting server for testing...');
require('./server');

// Helper to sign JWT for authentication
const adminToken = jwt.sign({ id: 999 }, process.env.JWT_SECRET);
const localUrl = 'http://' + 'localhost' + ':9999';

async function runTests() {
    console.log('\nRunning Endpoint Tests...');
    let success = true;

    try {
        // Test 1: POST /api/auth/register
        console.log('\nTest 1: POST /api/auth/register');
        const registerRes = await fetch(`${localUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Jane Doe',
                email: 'jane@example.com',
                password: 'password123'
            })
        });
        const registerData = await registerRes.json();
        console.log('Response status:', registerRes.status);
        console.log('Response body:', registerData);

        const registerQuery = queriesExecuted.find(q => q.sql.includes('INSERT INTO users'));
        if (registerQuery && registerRes.status === 201) {
            console.log('✅ Test 1 Passed: User saved to MySQL users table.');
        } else {
            console.log('❌ Test 1 Failed.');
            success = false;
        }

        // Test 2: POST /api/support/ticket
        console.log('\nTest 2: POST /api/support/ticket');
        const ticketRes = await fetch(`${localUrl}/api/support/ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Jane Doe',
                email: 'jane@example.com',
                subject: 'Need help',
                message: 'Hello, my browser extension is not working.',
                category: 'extension'
            })
        });
        const ticketData = await ticketRes.json();
        console.log('Response status:', ticketRes.status);
        console.log('Response body:', ticketData);

        const ticketQuery = queriesExecuted.find(q => q.sql.includes('INSERT INTO support_tickets'));
        if (ticketQuery && ticketRes.status === 200) {
            console.log('✅ Test 2 Passed: Ticket saved to support_tickets table.');
        } else {
            console.log('❌ Test 2 Failed.');
            success = false;
        }

        // Test 3: GET /api/admin/users
        console.log('\nTest 3: GET /api/admin/users');
        const usersRes = await fetch(`${localUrl}/api/admin/users`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const usersData = await usersRes.json();
        console.log('Response status:', usersRes.status);
        console.log('Response body:', usersData);

        const usersQuery = queriesExecuted.find(q => q.sql.includes('FROM users WHERE role = "user"'));
        if (usersQuery && usersRes.status === 200) {
            console.log('✅ Test 3 Passed: User lists read from users table.');
        } else {
            console.log('❌ Test 3 Failed.');
            success = false;
        }

        // Test 4: GET /api/admin/stats
        console.log('\nTest 4: GET /api/admin/stats');
        const statsRes = await fetch(`${localUrl}/api/admin/stats`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const statsData = await statsRes.json();
        console.log('Response status:', statsRes.status);
        console.log('Response body:', statsData);

        const statsQuery = queriesExecuted.find(q => q.sql.includes('SELECT COUNT(*) as count FROM users'));
        if (statsQuery && statsRes.status === 200) {
            console.log('✅ Test 4 Passed: Stats read from users table.');
        } else {
            console.log('❌ Test 4 Failed.');
            success = false;
        }

        if (success) {
            console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
            process.exit(0);
        } else {
            console.log('\n❌ SOME TESTS FAILED. ❌');
            process.exit(1);
        }
    } catch (err) {
        console.error('Test execution failed:', err);
        process.exit(1);
    }
}

// Wait 1 second for server startup
setTimeout(runTests, 1000);
