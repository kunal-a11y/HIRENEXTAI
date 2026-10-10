const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function cleanupAndRestart() {
  console.log('=== SMART VPS CLEANUP & RESTART ===');
  
  const myPid = process.pid;
  console.log('Current script PID:', myPid);

  // 1. Update SMTP_HOST in .env and .env.production files using Node.js
  const envFiles = ['.env', '.env.production'];
  envFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('SMTP_HOST=mail.reaverhosting.in')) {
          content = content.replace(/SMTP_HOST=mail\.reaverhosting\.in/g, 'SMTP_HOST=127.0.0.1');
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`✅ Updated SMTP_HOST to 127.0.0.1 in ${file}`);
        }
      } catch (err) {
        console.error(`❌ Failed to update ${file}:`, err.message);
      }
    }
  });

  // 2. Scan /proc to find and kill only other node server.js processes
  let killedCount = 0;
  try {
    const files = fs.readdirSync('/proc');
    files.forEach(file => {
      const pid = parseInt(file, 10);
      if (!isNaN(pid) && pid !== myPid) {
        try {
          const cmdlinePath = path.join('/proc', file, 'cmdline');
          if (fs.existsSync(cmdlinePath)) {
            const cmdline = fs.readFileSync(cmdlinePath, 'utf8');
            if (cmdline.includes('node') && cmdline.includes('server.js')) {
              console.log(`Killing old server process: PID ${pid}`);
              process.kill(pid, 9); // SIGKILL
              killedCount++;
            }
          }
        } catch (e) {
          // Ignore process exits or permission issues
        }
      }
    });
  } catch (procErr) {
    console.warn('⚠️ Could not read /proc directory, falling back to basic kill:', procErr.message);
  }

  console.log(`Killed ${killedCount} other server processes.`);

  // Wait 1.5 seconds for ports to free up
  setTimeout(() => {
    console.log('Starting new server.js process...');
    
    const out = fs.openSync(path.join(__dirname, 'backend-local.out.log'), 'w');
    const err = fs.openSync(path.join(__dirname, 'backend-local.err.log'), 'w');

    const child = spawn('node', ['server.js'], {
      detached: true,
      stdio: ['ignore', out, err],
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    child.unref();

    console.log('✅ Spawned new server.js successfully in the background!');
    console.log('New Server PID:', child.pid);
    console.log('Logs will be written to backend-local.out.log and backend-local.err.log');
    console.log('=== PROCESS COMPLETE ===');
    process.exit(0);
  }, 1500);
}

cleanupAndRestart();
