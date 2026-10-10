const getRealIp = (req) => {
  // Express resolves forwarded headers only through the configured trusted proxy.
  const ip = req.ip || req.socket?.remoteAddress || '';

  // Normalize IPv6 localhost or local IPv4 loops
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1 (Development)';
  }
  
  return ip;
};

const getOSFromUA = (uaString) => {
  if (!uaString) return 'Unknown OS';
  const ua = uaString.toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('macintosh') || ua.includes('mac os')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  return 'Other';
};

const getBrowserFromUA = (uaString) => {
  if (!uaString) return 'Unknown Browser';
  const ua = uaString.toLowerCase();
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';
  if (ua.includes('chrome') && !ua.includes('chromium')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edge') || ua.includes('edg/')) return 'Edge';
  if (ua.includes('msie') || ua.includes('trident/')) return 'Internet Explorer';
  return 'Other';
};

const getDeviceFromUA = (uaString) => {
  if (!uaString) return 'Desktop';
  const ua = uaString.toLowerCase();
  if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobi'))) {
    return 'Tablet';
  }
  if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('android')) {
    return 'Mobile';
  }
  return 'Desktop';
};

const getGeoLocation = async (ip) => {
  if (!ip || ip.includes('127.0.0.1') || ip === 'Local Development Machine' || ip.startsWith('127.0.0.1')) {
    return { country: 'Local Development', city: 'Local Development' };
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (res.ok) {
      const data = await res.json();
      return {
        country: data.country_name || 'Unknown Country',
        city: data.city || 'Unknown City'
      };
    }
  } catch (e) {
    // silently fail
  }
  return { country: 'Unknown Country', city: 'Unknown City' };
};

module.exports = {
  getRealIp,
  getOSFromUA,
  getBrowserFromUA,
  getDeviceFromUA,
  getGeoLocation
};

