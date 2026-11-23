/* Dilia Play: fair random picks for the party tools (wheel, picker, team maker, dice, coin, numbers).
   Uses the browser's secure random source and rejection sampling, so every value has exactly the same chance. */
(function (root) {
  const cr = (root.crypto && root.crypto.getRandomValues) ? root.crypto : require('node:crypto').webcrypto;
  // whole number from 0 to n-1, n between 1 and 2^32
  function int(n) {
    if (!Number.isInteger(n) || n < 1 || n > 4294967296) throw new RangeError('n must be a whole number from 1 to 2^32');
    if (n === 1) return 0;
    const lim = 4294967296 - (4294967296 % n), a = new Uint32Array(1);
    do { cr.getRandomValues(a); } while (a[0] >= lim);
    return a[0] % n;
  }
  // whole number from lo to hi, both included
  function between(lo, hi) { return lo + int(hi - lo + 1); }
  // new array in random order (Fisher-Yates)
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = int(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // k different items from the list
  function sample(list, k) { return shuffle(list).slice(0, Math.max(0, Math.min(k, list.length))); }
  // split a list into teams of near-equal size (sizes differ by at most 1), in random order
  function teams(list, count) {
    const n = Math.max(1, Math.min(count, list.length || 1)), s = shuffle(list), out = Array.from({ length: n }, () => []);
    s.forEach((x, i) => out[i % n].push(x));
    return out;
  }
  const api = { int, between, shuffle, sample, teams };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PartyRng = api;
})(typeof window !== 'undefined' ? window : globalThis);
