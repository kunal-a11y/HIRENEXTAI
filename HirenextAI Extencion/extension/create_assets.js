const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1x1 pixel PNG representation in base64
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64Png, 'base64');

fs.writeFileSync(path.join(assetsDir, 'icon16.png'), buffer);
fs.writeFileSync(path.join(assetsDir, 'icon48.png'), buffer);
fs.writeFileSync(path.join(assetsDir, 'icon128.png'), buffer);

console.log('Extension icon assets generated successfully.');
