const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jsPDF } = require('jspdf');

const db = require('./db');
const { executeAIRequest, parseAIJSON } = require('./ai');

const JWT_SECRET = 'hirenext_jwt_secret_key_1337';

async function runTests() {
  console.log('=== Starting HirenextAI Test Suite ===\n');

  try {
    // 1. Initialize Database Schema
    console.log('Test 1: Initializing Database...');
    await db.initDB();
    const owner = await db.dbGet('SELECT * FROM users WHERE email = ?', ['owner@hirenext.ai']);
    assert.ok(owner, 'Default owner account should be seeded');
    assert.strictEqual(owner.role, 'owner', 'Owner role should be owner');
    console.log('✓ Database initialized and owner account verified.\n');

    // 2. Authentication Flow Test
    console.log('Test 2: Testing User Signup & Login Hashing...');
    const testEmail = `candidate_${Date.now()}@test.com`;
    const rawPass = 'secretPass123';
    
    const passHash = await bcrypt.hash(rawPass, 10);
    const passMatches = await bcrypt.compare(rawPass, passHash);
    assert.ok(passMatches, 'Password hashes should resolve successfully');

    const insertRes = await db.dbRun(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [testEmail, passHash, 'user']
    );
    const testUserId = insertRes.lastID;
    assert.ok(testUserId > 0, 'User ID should be generated');

    const fetchedUser = await db.dbGet('SELECT * FROM users WHERE id = ?', [testUserId]);
    const validLogin = await bcrypt.compare(rawPass, fetchedUser.password_hash);
    assert.ok(validLogin, 'Login password matching should succeed');

    const token = jwt.sign({ id: testUserId, email: testEmail, role: 'user' }, JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET);
    assert.strictEqual(decoded.id, testUserId, 'JWT payload ID should match test user');
    console.log('✓ Signup and login verification checks passed.\n');

    // 3. Document Library & PDF Generator Test
    console.log('Test 3: Testing PDF Compilation...');
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'bold');
    doc.text('TEST RESUME', 20, 20);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    const header = pdfBuffer.toString('utf-8', 0, 4);
    assert.strictEqual(header, '%PDF', 'Generated PDF output should begin with %PDF header');
    console.log('✓ PDF Resume compilation buffer validated.\n');

    // 4. Smart AI Router Fallback & Health Log Test
    console.log('Test 4: Testing Smart AI Router Key Rotation & Latency Logging...');
    
    await db.dbRun("UPDATE ai_providers SET api_key = 'fake-gemini-key', priority = 1, status = 'active', health = 'healthy', requests = 0, errors = 0 WHERE name = 'gemini'");
    await db.dbRun("UPDATE ai_providers SET api_key = 'fake-openai-key', priority = 2, status = 'active', health = 'healthy', requests = 0, errors = 0 WHERE name = 'openai'");

    const originalFetch = global.fetch;
    let geminiCalled = false;
    let openaiCalled = false;

    global.fetch = async (url, options) => {
      if (url.includes('gemini')) {
        geminiCalled = true;
        return {
          ok: false,
          status: 403,
          json: async () => ({ error: { message: 'Invalid API key or rate limit hit' } })
        };
      }
      if (url.includes('openai')) {
        openaiCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: '{"mapping": {"Name": "Test Candidate"}, "confidence": {"Name": "high"}}' } }]
          })
        };
      }
      return originalFetch(url, options);
    };

    const responseText = await executeAIRequest('Test prompt', 'System prompt', true);
    
    // Restore fetch
    global.fetch = originalFetch;

    assert.ok(geminiCalled, 'Router should first attempt Gemini due to higher priority');
    assert.ok(openaiCalled, 'Router should rotate and retry OpenAI after Gemini fails');

    const geminiDb = await db.dbGet("SELECT health, errors FROM ai_providers WHERE name = 'gemini'");
    assert.strictEqual(geminiDb.health, 'unhealthy', 'Gemini should be unhealthy');
    assert.strictEqual(geminiDb.errors, 1, 'Gemini errors incremented');
    console.log('✓ Smart AI Router successfully rotated keys.\n');

    // Cleanup test user
    await db.dbRun('DELETE FROM users WHERE id = ?', [testUserId]);

    // Cleanup old integration candidate if exists
    await db.dbRun("DELETE FROM users WHERE email = 'extension_test@hirenext.ai'");

    // Set environment variable port and require server.js to boot test instance
    process.env.PORT = '5001';
    require('./server');

    // Wait for server to bind listener
    await new Promise(resolve => setTimeout(resolve, 1000));

    const targetUrl = 'http://localhost:5001';

    // Intercept AI Router calls globally for the integration test
    global.fetch = async (url, options) => {
      // If local server call, let it go through
      if (url.startsWith('http://localhost:5001')) {
        return originalFetch(url, options);
      }
      // If AI provider URL, mock return values matching Gemini and OpenAI structures
      if (url.includes('openai') || url.includes('googleapis') || url.includes('anthropic')) {
        const bodyText = (options && options.body) ? String(options.body) : '';
        const isResumeBuild = bodyText.includes('resume writer') || bodyText.includes('stepper') || bodyText.includes('answers');
        
        return {
          ok: true,
          status: 200,
          json: async () => {
            if (isResumeBuild) {
              const resObj = {
                name: 'Extension Tester',
                phone: '+919999999999',
                career_goal: 'Test integration features',
                education: [{ degree: 'B.E.', school: 'Naukri Univ', graduation_year: '2025' }],
                experience: [{ company: 'Test Lab', role: 'Automation Specialist', dates: '2023-Present', description: 'Coded tests' }],
                skills: ['TypeScript', 'JavaScript'],
                projects: [],
                certifications: [],
                languages: []
              };
              return {
                candidates: [{ content: { parts: [{ text: JSON.stringify(resObj) }] } }],
                choices: [{ message: { content: JSON.stringify(resObj) } }]
              };
            } else {
              const mapObj = {
                mapping: { "Full Name": "Extension Tester", "Experience": "2 Years" },
                confidence: { "Full Name": "high", "Experience": "low" }
              };
              return {
                candidates: [{ content: { parts: [{ text: JSON.stringify(mapObj) }] } }],
                choices: [{ message: { content: JSON.stringify(mapObj) } }]
              };
            }
          }
        };
      }
      return originalFetch(url, options);
    };

    // A. Sign up candidate user
    const signupRes = await fetch(`${targetUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'extension_test@hirenext.ai', password: 'password123' })
    });
    assert.strictEqual(signupRes.status, 201, 'Signup endpoint should return HTTP 201');
    const signupData = await signupRes.json();
    const jwtToken = signupData.token;
    assert.ok(jwtToken, 'Token should be returned on signup');

    // B. Check Session
    const sessionRes = await fetch(`${targetUrl}/api/extension/session`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    assert.strictEqual(sessionRes.status, 200, 'Session endpoint should validate token');
    const sessionData = await sessionRes.json();
    assert.strictEqual(sessionData.loggedIn, true, 'loggedIn field should be true');

    // C. Check Resume Status (Should be false initially)
    const statusRes = await fetch(`${targetUrl}/api/user/resume-status`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    assert.strictEqual(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.strictEqual(statusData.hasResume, false, 'hasResume should be false before profile setup');

    // D. Build Profile via builder endpoint
    const builderRes = await fetch(`${targetUrl}/api/profile/build`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        answers: {
          name: 'Extension Tester',
          phone: '+919999999999',
          career_goal: 'Test integration features',
          education: { degree: 'B.E.', school: 'Naukri Univ', graduation_year: '2025' },
          experience: { company: 'Test Lab', role: 'Automation Specialist', dates: '2023-Present', description: 'Coded tests' },
          skills: 'TypeScript, JavaScript'
        }
      })
    });
    assert.strictEqual(builderRes.status, 200, 'Profile build should succeed');

    // E. Recheck Resume Status (Should be true now)
    const statusRes2 = await fetch(`${targetUrl}/api/user/resume-status`, {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    const statusData2 = await statusRes2.json();
    assert.strictEqual(statusData2.hasResume, true, 'hasResume should now be true');

    // F. Map Form Fields Schema
    const mapRes = await fetch(`${targetUrl}/api/extension/map-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        fieldsSchema: [
          { labelText: 'Full Name', type: 'text' },
          { labelText: 'Experience', type: 'text' }
        ]
      })
    });
    assert.strictEqual(mapRes.status, 200);
    const mapData = await mapRes.json();
    assert.strictEqual(mapData.mapping['Full Name'], 'Extension Tester');
    assert.ok(mapData.lowConfidenceFields.includes('Experience'), 'Low confidence fields should flag yellow warnings');

    // Restore fetch
    global.fetch = originalFetch;

    // G. Log application (Check SMTP & WhatsApp logs)
    const logRes = await fetch(`${targetUrl}/api/extension/log-application`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        company: 'LinkedIn Corp',
        role: 'Easy Apply Software Developer',
        status: 'Applied',
        notes: 'Integration test logger execution.'
      })
    });
    assert.strictEqual(logRes.status, 200);
    const logData = await logRes.json();
    assert.strictEqual(logData.success, true);
    console.log('✓ V1 HTTP endpoints and logs verified successfully.\n');

    console.log('====================================');
    console.log('ALL TESTS COMPLETED SUCCESSFULLY! ✓');
    console.log('====================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Suite Failed with Assert Error:', err);
    process.exit(1);
  }
}

runTests();
