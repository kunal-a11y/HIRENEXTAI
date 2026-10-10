const path = require('path');
const fs = require('fs');

// Load environment variables
let envPath = path.join(__dirname, '.env.production');
if (!fs.existsSync(envPath)) {
  envPath = path.join(__dirname, '.env');
}
require('dotenv').config({ path: envPath });

const authController = require('./controllers/authController');

async function runTest() {
  const req = {
    body: {
      name: 'VPS Test User',
      email: `vps_test_${Date.now()}@example.com`,
      password: 'password123'
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('Response Status:', this.statusCode);
      console.log('Response Body:', data);
    }
  };

  console.log('Running authController.signup test...');
  try {
    await authController.signup(req, res);
  } catch (err) {
    console.error('Fatal handler error caught in test script:');
    console.error(err);
  }
}

runTest();
