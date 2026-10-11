const test = require('node:test');
const assert = require('node:assert/strict');
const { setAssetCacheHeaders } = require('../config/assetCache');
const { ensurePerformanceIndexes, indexes } = require('../config/performanceIndexes');
test('only fingerprinted assets receive immutable caching', () => {
  for (const [file, immutable] of [['/assets/index-Ab123_xyz.js', true], ['/logo.svg', false], ['/index.html', false]]) {
    let header;
    setAssetCacheHeaders({ setHeader: (_, value) => { header = value; } }, file);
    assert.equal(header.includes('immutable'), immutable);
  }
});
test('indexes are additive and repeated setup does not duplicate them', async () => {
  const saved = new Map(); let created = 0;
  const pool = { async query(sql) {
    const table = sql.match(/(?:FROM|ON) `([^`]+)`/)[1];
    if (sql.startsWith('SHOW')) return [saved.get(table) || []];
    created++;
    const entry = indexes.find(item => item[0] === table && sql.includes('`' + item[1] + '`'));
    saved.set(table, [...(saved.get(table) || []), ...entry[2].map((column, i) => ({ Key_name: entry[1], Seq_in_index: i + 1, Column_name: column }))]);
    return [[]];
  } };
  await ensurePerformanceIndexes(pool);
  await ensurePerformanceIndexes(pool);
  assert.equal(created, indexes.length);
});
