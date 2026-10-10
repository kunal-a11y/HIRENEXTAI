const fs = require('fs');
const path = require('path');

function readApacheConfig() {
  console.log('=== APACHE CONFIG INSPECTOR ===\n');

  const sitesDir = '/etc/apache2/sites-enabled';
  
  if (!fs.existsSync(sitesDir)) {
    console.error('❌ Apache sites-enabled directory not found at:', sitesDir);
    return;
  }

  try {
    const files = fs.readdirSync(sitesDir);
    console.log('Found config files:', files);

    for (const file of files) {
      const filePath = path.join(sitesDir, file);
      console.log(`\n--- Reading: ${filePath} ---`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for ProxyPass, ProxyPassReverse, RewriteRule, DocumentRoot, etc.
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const cleanLine = line.trim();
        if (
          cleanLine.toLowerCase().includes('proxypass') ||
          cleanLine.toLowerCase().includes('rewrite') ||
          cleanLine.toLowerCase().includes('documentroot') ||
          cleanLine.toLowerCase().includes('virtualhost') ||
          cleanLine.toLowerCase().includes('servername') ||
          cleanLine.toLowerCase().includes('serveralias')
        ) {
          console.log(`${idx + 1}: ${cleanLine}`);
        }
      });
    }
  } catch (err) {
    console.error('❌ Error reading Apache configuration:', err.message);
  }

  console.log('\n=== INSPECTOR COMPLETE ===');
}

readApacheConfig();
