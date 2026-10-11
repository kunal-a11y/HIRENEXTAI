// Prisma 6 does not automatically load .env.local. Keep this separate from
// the existing MySQL .env so database preparation cannot switch the live API.
const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env.local'), quiet: true });

const prismaPackage = require.resolve('prisma/package.json');
const prismaBin = require(prismaPackage).bin.prisma;
const result = spawnSync(process.execPath, [path.resolve(path.dirname(prismaPackage), prismaBin), ...process.argv.slice(2)], {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});
if (result.error) {
  console.error('Unable to start Prisma. Install backend dependencies first.');
  process.exit(1);
}
process.exit(result.status ?? 1);
