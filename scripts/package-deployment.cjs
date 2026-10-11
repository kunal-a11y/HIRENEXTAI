const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// CI artifacts need the compiled UI and API dependencies, not the UI toolchain.
// Keep local development installs intact.
if (process.env.CI !== 'true') process.exit(0);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'frontend', 'dist', 'index.html');
if (!fs.existsSync(dist)) throw new Error('Build the frontend before packaging');
execFileSync(process.execPath, [process.env.npm_execpath, '--prefix',
  path.join(root, 'backend'), 'prune', '--omit=dev', '--ignore-scripts'],
{ stdio: 'inherit' });
const frontendDependencies = path.resolve(root, 'frontend', 'node_modules');
if (path.relative(root, frontendDependencies) !== path.join('frontend', 'node_modules')) {
  throw new Error('Unexpected dependency directory');
}
fs.rmSync(frontendDependencies, { recursive: true, force: true });
console.log('Deployment packaged: compiled frontend and production API dependencies.');
