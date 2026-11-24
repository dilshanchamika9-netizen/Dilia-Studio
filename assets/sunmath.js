if (typeof window === "undefined") globalThis.window = globalThis;
// Where the sun is. Low-precision solar position (about 0.01 degree), enough for a day/night map and sunrise times to the minute.
var SunMath = window.SunMath = (() => {
  const R = Math.PI / 180, jd = ms => ms / 86400000 + 2440587.5, norm = (a, n) => ((a % n) + n) % n;
  // {dec, lon}: declination (deg) and the longitude where the sun is straight overhead (deg, -180..180)
  function pos(ms) {
    const n = jd(ms) - 2451545.0, L = norm(280.460 + 0.9856474 * n, 360), g = norm(357.528 + 0.9856003 * n, 360) * R;
    const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * R, eps = (23.439 - 0.0000004 * n) * R;
    const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / R, dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / R;
    const gmst = norm(280.46061837 + 360.98564736629 * n, 360);
    return { dec, lon: norm(ra - gmst + 180, 360) - 180 };
  }
  // sun height above the horizon (deg) at a place, from a sun position p
  const altP = (p, lat, lon) => Math.asin(Math.sin(lat * R) * Math.sin(p.dec * R) + Math.cos(lat * R) * Math.cos(p.dec * R) * Math.cos((lon - p.lon) * R)) / R;
  const altitude = (ms, lat, lon) => altP(pos(ms), lat, lon);
  // sunrise and sunset (ms) between t0 and t0+dur, sun centre at -0.833 deg (refraction and disc). Missing when the sun never crosses.
  function events(t0, dur, lat, lon) {
    const H = -0.833, step = 5 * 60000, out = { rise: null, set: null }; let a = altitude(t0, lat, lon) - H;
    for (let t = t0; t < t0 + dur; t += step) {
      const b = altitude(t + step, lat, lon) - H;
      if ((a < 0) !== (b < 0)) { let lo = t, hi = t + step; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2, v = altitude(m, lat, lon) - H; if ((v < 0) === (a < 0)) lo = m; else hi = m; } const x = (lo + hi) / 2; if (a < 0 && out.rise == null) out.rise = x; else if (a >= 0 && out.set == null) out.set = x; }
      a = b;
    }
    return out;
  }
  return { pos, altitude, altP, events };
})();
if (typeof module !== "undefined") module.exports = SunMath;
