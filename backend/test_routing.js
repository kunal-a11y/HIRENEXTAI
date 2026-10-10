const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');

// Load environment variables
let envPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '.env');
}
require('dotenv').config({ path: envPath });

const pool = require('./config/db');

async function startTestServer() {
  const app = express();

  // 1. Passport
  require('./config/passport');
  app.use(passport.initialize());

  // 2. Helmet
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // 3. CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // 4. Rate Limiters
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many login attempts' },
  });

  app.use('/api', generalLimiter);
  app.use('/api/auth', authLimiter);

  // 5. Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 6. Routes
  app.use('/api/auth', require('./routes/authRoutes'));

  // 7. Capture Express errors
  app.use((err, req, res, next) => {
    console.error('*** EXPRESS ROUTE ERROR CAUGHT ***');
    console.error(err);
    res.status(500).json({ error: 'Caught error: ' + err.message, stack: err.stack });
  });

  // 8. 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  const server = app.listen(34139, '127.0.0.1', async () => {
    console.log('Test server running on port 34139');
    
    // Send local test request
    const http = require('http');
    const data = JSON.stringify({
      name: 'Express Route Test',
      email: `exp_test_${Date.now()}@example.com`,
      password: 'password123'
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: 34139,
      path: '/api/auth/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Forwarded-Proto': 'https'
      }
    }, (res) => {
      console.log('Response Status:', res.statusCode);
      res.on('data', (d) => {
        console.log('Response Body:', d.toString());
      });
      res.on('end', () => {
        server.close(() => {
          console.log('Test server closed.');
          process.exit(0);
        });
      });
    });

    req.on('error', (e) => {
      console.error('HTTP Request Error:', e);
      server.close();
    });

    req.write(data);
    req.end();
  });
}

startTestServer().catch(err => {
  console.error('Fatal test startup error:', err);
});
