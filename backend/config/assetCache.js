const path = require('node:path');
function setAssetCacheHeaders(res, filePath) {
  // Only Vite content-hashed assets can be cached across deployments.
  const fingerprinted = /\.[a-z0-9]+$/i.test(filePath) && /-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i.test(path.basename(filePath));
  res.setHeader('Cache-Control', fingerprinted
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=0, must-revalidate');
}
module.exports = { setAssetCacheHeaders };
