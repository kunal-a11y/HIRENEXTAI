const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const net = require('net');

async function runDiagnostics() {
  console.log('=== HIRENEXTAI VPS DIAGNOSTICS ===\n');

  // 1. Check current directory
  console.log('Current directory:', process.cwd());

  // 2. Load .env or .env.production
  let envPath = path.join(__dirname, '.env.production');
  if (!fs.existsSync(envPath)) {
    envPath = path.join(__dirname, '.env');
  }
  console.log('Using Env File:', envPath);
  
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('DB Host from env:', process.env.DB_HOST);
    console.log('DB User from env:', process.env.DB_USER);
    console.log('DB Port from env:', process.env.DB_PORT);
    console.log('DB Name from env:', process.env.DB_NAME);
    console.log('PORT from env:', process.env.PORT);
    console.log('NODE_PORT from env:', process.env.NODE_PORT);
  } else {
    console.error('❌ Env file not found!');
  }

  // 3. Test MySQL Connection from VPS
  console.log('\n--- Testing MySQL Connection from VPS ---');
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || process.env.DB_PASS,
    });
    console.log('✅ MySQL connection SUCCESSFUL!');
    const [rows] = await conn.query('SELECT COUNT(*) as count FROM users');
    console.log('Total users in database:', rows[0].count);
    await conn.end();
  } catch (err) {
    console.error('❌ MySQL connection FAILED:', err.message);
    console.error(err);
  }

  // 4. Check authController.js query alignment
  console.log('\n--- Checking authController.js Query Code ---');
  const controllerPath = path.join(__dirname, 'controllers', 'authController.js');
  if (fs.existsSync(controllerPath)) {
    const content = fs.readFileSync(controllerPath, 'utf8');
    const insertQueryIndex = content.indexOf('INSERT INTO users');
    if (insertQueryIndex !== -1) {
      console.log('Found INSERT query in authController.js:');
      const snippet = content.substring(insertQueryIndex, insertQueryIndex + 300);
      console.log(snippet);
    } else {
      console.warn('⚠️ Could not find INSERT INTO users query in authController.js');
    }
  } else {
    console.error('❌ authController.js not found at:', controllerPath);
  }

  // 5. Check active ports
  console.log('\n--- Checking Port Availability ---');
  const portsToCheck = [34138, 5000];
  for (const port of portsToCheck) {
    await new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} is: IN USE (A server is running on it)`);
        } else {
          console.log(`Port ${port} error:`, err.message);
        }
        resolve();
      });
      server.once('listening', () => {
        console.log(`Port ${port} is: FREE (No server is running on it)`);
        server.close();
        resolve();
      });
      server.listen(port, '127.0.0.1');
    });
  }

  console.log('\n=== DIAGNOSTICS COMPLETE ===');
}

runDiagnostics();
