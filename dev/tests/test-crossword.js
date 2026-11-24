const fs = require('fs'); eval(fs.readFileSync(__dirname + '/../../assets/crossword.js', 'utf8'));
const X = globalThis.DiliaCross; let bad = 0, n = 0; const t = (c, m) => { n++; if (!c) { bad++; console.log('FAIL', m); } };
let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
t(X.BANK.length > 120 && X.BANK.every(e => /^[a-z]{3,9}$/.test(e.w) && e.c.length > 5), 'bank entries valid'); t(new Set(X.BANK.map(e => e.w)).size === X.BANK.length, 'bank words unique');
for (const cnt of [6, 9, 12]) for (let i = 0; i < 40; i++) { const p = X.cwNew(cnt, rnd); t(p.words.length === cnt, 'word count ' + cnt); t(X.cwCheck(p), 'grid has only the placed words ' + cnt); t(p.words.every(w => w.n >= 1), 'numbered'); }
console.log(bad ? 'FAILS ' + bad : 'CROSSWORD OK', n); process.exit(bad ? 1 : 0);
