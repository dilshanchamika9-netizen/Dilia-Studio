/* Dilia Text: counters, case, clean-up, lists, find and replace, compare, lorem ipsum, extractors. All in this tab; nothing is uploaded.
   User text is only ever put on the page with textContent or value, never innerHTML. */
{
const { $, plural, toast, save, cleanName } = Kit;
const MODE = document.body.dataset.txt || 'count', PRESET = document.body.dataset.preset || '';
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const MAX = 5000000;
const debounce = (f, ms = 120) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : d; };

/* ---------- small form builders ---------- */
const ctl = {};                                   // id -> element
function field(parent, id, label, node, wide) {
  const w = el('div', 'tf' + (wide ? ' wide' : '')); const l = el('label', 'lbl', label); l.htmlFor = id; node.id = id; ctl[id] = node; w.append(l, node); parent.append(w); return node;
}
function select(parent, id, label, opts, val) {
  const s = el('select', 'dd'); opts.forEach(([v, t]) => { const o = el('option', '', t); o.value = v; s.append(o); }); s.value = val != null ? val : opts[0][0]; s.addEventListener('change', run); return field(parent, id, label, s);
}
function text(parent, id, label, val, ph) { const i = el('input'); i.type = 'text'; i.value = val || ''; i.placeholder = ph || ''; i.autocomplete = 'off'; i.spellcheck = false; i.addEventListener('input', run); return field(parent, id, label, i); }
function number(parent, id, label, val, min, max) { const i = el('input'); i.type = 'number'; i.value = val; i.min = min; i.max = max; i.addEventListener('input', run); return field(parent, id, label, i); }
function check(parent, id, label, on) {
  const w = el('label', 'check tcheck'); const i = el('input'); i.type = 'checkbox'; i.checked = !!on; i.id = id; ctl[id] = i; i.addEventListener('change', run); w.append(i, el('span', '', label)); parent.append(w); return i;
}
const val = id => ctl[id] ? (ctl[id].type === 'checkbox' ? ctl[id].checked : ctl[id].value) : '';

/* ---------- counting ---------- */
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const graphemes = s => { if (!seg) return Array.from(s).length; let n = 0; for (const _ of seg.segment(s)) n++; return n; };
const WORD = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
const wordsOf = s => s.match(WORD) || [];
const COMMON = new Set('a about above after again all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its just me more most my no nor not of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your'.split(' '));
function syl(w) {                                  // English estimate
  w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, ''); const m = w.match(/[aeiouy]{1,2}/g); return Math.max(1, m ? m.length : 1);
}
function analyse(t) {
  const words = wordsOf(t), W = words.length, chars = graphemes(t), noSp = graphemes(t.replace(/\s+/g, ''));
  const sentences = t.split(/(?<=[.!?…]+["'”’)\]]*)\s+|\n{2,}/).filter(s => /[\p{L}\p{N}]/u.test(s)).length;
  const paragraphs = t.split(/\n\s*\n/).filter(s => /[^\s]/.test(s)).length;
  const lines = t ? t.split(/\r?\n/).length : 0;
  const lower = words.map(w => w.toLowerCase()), uniq = new Set(lower).size;
  const letters = words.reduce((a, w) => a + w.replace(/[^\p{L}\p{N}]/gu, '').length, 0);
  const syls = words.reduce((a, w) => a + syl(w), 0);
  const S = Math.max(1, sentences), reading = Math.round(W / 200 * 60), speaking = Math.round(W / 130 * 60);
  const flesch = W ? 206.835 - 1.015 * (W / S) - 84.6 * (syls / W) : 0, grade = W ? 0.39 * (W / S) + 11.8 * (syls / W) - 15.59 : 0;
  return { words, W, chars, noSp, sentences, paragraphs, lines, uniq, avg: W ? letters / W : 0, syls, reading, speaking, flesch, grade, lower };
}
const dur = s => s < 1 ? '0 sec' : s < 60 ? s + ' sec' : Math.floor(s / 60) + ' min ' + (s % 60 ? s % 60 + ' sec' : '');
function topWords(lower, n, skipCommon) {
  const m = new Map(); lower.forEach(w => { if (skipCommon && (COMMON.has(w) || w.length < 2)) return; m.set(w, (m.get(w) || 0) + 1); });
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}
function topPhrases(lower, size, n, skipCommon) {
  const m = new Map(); for (let i = 0; i + size <= lower.length; i++) { const p = lower.slice(i, i + size); if (skipCommon && (COMMON.has(p[0]) || COMMON.has(p[size - 1]))) continue; const k = p.join(' '); m.set(k, (m.get(k) || 0) + 1); }
  return [...m].filter(x => x[1] > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}
const LIMITS = [['x', 'X post', 280], ['ig', 'Instagram caption', 2200], ['li', 'LinkedIn post', 3000], ['tt', 'TikTok caption', 2200], ['ytt', 'YouTube title', 100], ['ytd', 'YouTube description', 5000], ['fb', 'Facebook post', 63206], ['sms', 'SMS (one message, plain text)', 160], ['gt', 'Google title (shown)', 60], ['gd', 'Google description (shown)', 155]];

/* ---------- case conversion ---------- */
const SMALL = new Set('a an and as at but by for if in nor of on or per the to up via vs'.split(' '));
const caps = w => w.charAt(0).toUpperCase() + w.slice(1);
function wordsForCode(t) { return t.replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2').replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(w => w.toLowerCase()); }
const CASES = {
  upper: t => t.toUpperCase(), lower: t => t.toLowerCase(),
  sentence: t => t.toLowerCase().replace(/(^\s*|[.!?…]["'”’)\]]*\s+|\n\s*)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\bi\b(?=['’]|\s|$|[.,!?])/g, 'I'),
  title: t => { const lo = t.toLowerCase(); const parts = lo.split(/(\s+)/); const idx = parts.map((p, i) => /\S/.test(p) ? i : -1).filter(i => i >= 0); const first = idx[0], last = idx[idx.length - 1];
    return parts.map((p, i) => { if (!/\S/.test(p)) return p; if (i !== first && i !== last && SMALL.has(p.replace(/[^\p{L}]/gu, ''))) return p; return p.replace(/(^|[-–—/(["“'‘])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()); }).join(''); },
  capital: t => t.toLowerCase().replace(/(^|[\s\-–—/(["“])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
  alt: t => { let k = 0; return Array.from(t.toLowerCase()).map(c => /\p{L}/u.test(c) ? (k++ % 2 ? c.toUpperCase() : c) : c).join(''); },
  invert: t => Array.from(t).map(c => c === c.toUpperCase() && c !== c.toLowerCase() ? c.toLowerCase() : c.toUpperCase()).join(''),
  camel: t => t.split(/\r?\n/).map(l => { const w = wordsForCode(l); return w.map((x, i) => i ? caps(x) : x).join(''); }).join('\n'),
  pascal: t => t.split(/\r?\n/).map(l => wordsForCode(l).map(caps).join('')).join('\n'),
  snake: t => t.split(/\r?\n/).map(l => wordsForCode(l).join('_')).join('\n'),
  kebab: t => t.split(/\r?\n/).map(l => wordsForCode(l).join('-')).join('\n'),
  constant: t => t.split(/\r?\n/).map(l => wordsForCode(l).join('_').toUpperCase()).join('\n')
};
const CASE_LABELS = [['upper', 'UPPERCASE'], ['lower', 'lowercase'], ['sentence', 'Sentence case'], ['title', 'Title Case'], ['capital', 'Capitalise Each Word'], ['alt', 'aLtErNaTiNg'], ['invert', 'iNVERSE case'], ['camel', 'camelCase'], ['pascal', 'PascalCase'], ['snake', 'snake_case'], ['kebab', 'kebab-case'], ['constant', 'CONSTANT_CASE']];

/* ---------- clean-up ---------- */
function clean(t, o) {
  if (o.invisible) t = t.replace(/[​-‍⁠﻿­]/g, '');
  if (o.quotes) t = t.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...');
  if (o.accents) t = t.normalize('NFD').replace(/\p{M}+/gu, '').normalize('NFC');
  if (o.special) t = t.replace(/[^\p{L}\p{N}\s]/gu, '');
  if (o.emoji) t = t.replace(/\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}‍]/gu, '');
  if (o.tabs) t = t.replace(/\t/g, ' '.repeat(Math.max(1, Math.min(16, o.tabn | 0 || 4))));
  if (o.nbsp) t = t.replace(/[  -   　]/g, ' ');
  let lines = t.split(/\r?\n/);
  if (o.trim) lines = lines.map(l => l.trim());
  if (o.spaces) lines = lines.map(l => l.replace(/[ \t]{2,}/g, ' '));
  if (o.empty) lines = lines.filter(l => l.trim() !== '');
  else if (o.blanks) { const out = []; lines.forEach(l => { if (l.trim() === '' && out.length && out[out.length - 1].trim() === '') return; out.push(l); }); lines = out; }
  t = lines.join('\n');
  if (o.breaks) t = o.keepParas ? t.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ')).join('\n\n') : t.replace(/\s*\n\s*/g, ' ');
  if (o.slug) t = t.split(/\n/).map(l => l.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).join('\n');
  if (o.rev) t = Array.from(t).reverse().join('');
  return t;
}

/* ---------- lists ---------- */
const collator = new Intl.Collator(undefined, { sensitivity: 'base' }), natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
function shuffle(a) { const r = new Uint32Array(a.length); crypto.getRandomValues(r); for (let i = a.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function listOps(t, o) {
  let L = t.split(/\r?\n/);
  if (o.trim) L = L.map(l => l.trim());
  if (o.empty) L = L.filter(l => l !== '');
  if (o.dedupe) { const seen = new Set(), keyOf = l => o.dcase ? l : l.toLowerCase(); if (o.keep === 'last') { const out = []; for (let i = L.length - 1; i >= 0; i--) { const k = keyOf(L[i]); if (!seen.has(k)) { seen.add(k); out.push(L[i]); } } L = out.reverse(); } else L = L.filter(l => { const k = keyOf(l); if (seen.has(k)) return false; seen.add(k); return true; }); }
  const numKey = l => { const m = l.match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : NaN; };
  const ord = o.order;
  if (ord === 'az') L.sort((a, b) => collator.compare(a, b)); else if (ord === 'za') L.sort((a, b) => collator.compare(b, a));
  else if (ord === 'nat') L.sort((a, b) => natural.compare(a, b));
  else if (ord === 'n19' || ord === 'n91') { L.sort((a, b) => { const x = numKey(a), y = numKey(b); if (isNaN(x) && isNaN(y)) return 0; if (isNaN(x)) return 1; if (isNaN(y)) return -1; return ord === 'n19' ? x - y : y - x; }); }
  else if (ord === 'short') L.sort((a, b) => a.length - b.length || collator.compare(a, b)); else if (ord === 'long') L.sort((a, b) => b.length - a.length || collator.compare(a, b));
  else if (ord === 'rev') L.reverse(); else if (ord === 'shuf') shuffle(L);
  if (o.pre || o.suf) L = L.map(l => (o.pre || '') + l + (o.suf || ''));
  if (o.numbers) { const s = Math.trunc(o.start) || 1, sep = o.sep == null ? '. ' : o.sep, pad = o.pad ? String(s + L.length - 1).length : 0; L = L.map((l, i) => String(s + i).padStart(pad, '0') + sep + l); }
  return L.join('\n');
}

/* ---------- find and replace ---------- */
function makeRe(find, o) {
  let src = o.regex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (o.word) src = '(?<![\\p{L}\\p{N}_])(?:' + src + ')(?![\\p{L}\\p{N}_])';
  return new RegExp(src, 'gu' + (o.matchCase ? '' : 'i') + (o.multi ? 'm' : ''));
}
function replaceAll(t, o) {
  if (!o.find) return { out: t, n: 0 };
  const re = makeRe(o.find, o); let n = 0;
  for (const _ of t.matchAll(re)) { n++; if (n > 1000000) break; }
  const rep = o.regex ? o.rep : o.rep.replace(/\$/g, '$$$$');
  return { out: t.replace(re, rep), n };
}

/* ---------- diff ---------- */
function diffSeq(a, b) {                           // returns [{t:'=',v},{t:'-',v},{t:'+',v}] or null when too large
  let s = 0; while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let ea = a.length, eb = b.length; while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
  const A = a.slice(s, ea), B = b.slice(s, eb), n = A.length, m = B.length;
  if (n * m > 9000000) return null;
  const w = m + 1, dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i * w + j] = A[i] === B[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
  const out = []; a.slice(0, s).forEach(v => out.push({ t: '=', v }));
  let i = 0, j = 0; while (i < n && j < m) { if (A[i] === B[j]) { out.push({ t: '=', v: A[i] }); i++; j++; } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) out.push({ t: '-', v: A[i++] }); else out.push({ t: '+', v: B[j++] }); }
  while (i < n) out.push({ t: '-', v: A[i++] }); while (j < m) out.push({ t: '+', v: B[j++] });
  a.slice(ea).forEach(v => out.push({ t: '=', v })); return out;
}

/* ---------- lorem ipsum ---------- */
const LW = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus vivamus elementum semper nisi aenean vulputate eleifend tellus integer posuere erat a ante venenatis dapibus nunc porta mauris blandit aliquet'.split(' ');
const rnd = n => { const r = new Uint32Array(1); crypto.getRandomValues(r); return r[0] % n; };
function sentence(startClassic) {
  const n = 6 + rnd(9), w = []; for (let i = 0; i < n; i++) w.push(LW[rnd(LW.length)]);
  if (w.length > 9) w[5 + rnd(w.length - 7)] += ','; if (startClassic) w.splice(0, 5, 'lorem', 'ipsum', 'dolor', 'sit', 'amet');
  const s = w.join(' ').replace(/,\s*,/g, ','); return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}
function lorem(kind, count, classic) {
  count = Math.max(1, Math.min(kind === 'words' ? 5000 : kind === 'sent' ? 500 : 100, count | 0 || 1));
  if (kind === 'words') { const w = []; for (let i = 0; i < count; i++) w.push(LW[rnd(LW.length)]); if (classic && count >= 5) w.splice(0, 5, 'lorem', 'ipsum', 'dolor', 'sit', 'amet'); const s = w.join(' '); return s.charAt(0).toUpperCase() + s.slice(1) + '.'; }
  if (kind === 'sent') return Array.from({ length: count }, (_, i) => sentence(classic && i === 0)).join(' ');
  return Array.from({ length: count }, (_, p) => Array.from({ length: 3 + rnd(4) }, (_, s) => sentence(classic && p === 0 && s === 0)).join(' ')).join('\n\n');
}

/* ---------- extractors ---------- */
const EX = {
  emails: t => t.match(/[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}.\-]+\.\p{L}{2,}/gu) || [],
  urls: t => (t.match(/\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi) || []).map(u => u.replace(/[.,;:!?)\]}'"”’]+$/, '')),
  numbers: t => t.match(/-?\d+(?:[.,]\d+)*/g) || [],
  hashtags: t => t.match(/(?<![\p{L}\p{N}_&])#[\p{L}\p{N}_]+/gu) || [],
  phones: t => (t.match(/(?<![\d])\+?\d[\d\s().\-]{6,}\d/g) || []).map(s => s.trim())
};

/* ---------- output panel ---------- */
const OUT = $('#tOut'), IN = $('#tIn'), IN2 = $('#tIn2');
let outText = '';
function copyText(s) { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(s); return new Promise((ok, no) => { const a = el('textarea'); a.value = s; a.style.cssText = 'position:fixed;opacity:0'; document.body.append(a); a.select(); try { document.execCommand('copy') ? ok() : no(); } catch (e) { no(e); } a.remove(); }); }
function resultBox(label, rows) {
  OUT.textContent = '';
  const box = el('div', 'tres'), ta = el('textarea'); ta.id = 'tRes'; ta.readOnly = true; ta.value = outText; ta.setAttribute('aria-label', label || 'Result'); ta.spellcheck = false;
  const bar = el('div', 'tact');
  const mk = (txt, id, cls) => { const b = el('button', 'btn ' + (cls || 'ghost') + ' sm', txt); b.type = 'button'; b.id = id; bar.append(b); return b; };
  mk('Copy result', 'tCopy', 'go').onclick = () => copyText(outText).then(() => toast('Copied.'), () => toast('Copy was blocked by the browser. Select the text and copy it yourself.', true));
  mk('Download TXT', 'tDl').onclick = () => { const u = URL.createObjectURL(new Blob([outText], { type: 'text/plain;charset=utf-8' })); save(u, cleanName(($('#outName') || {}).value, 'text', 'txt')); setTimeout(() => URL.revokeObjectURL(u), 4000); };
  mk('Use result as input', 'tUse').onclick = () => { IN.value = outText; run(); };
  box.append(el('p', 'tstat', rows || ''), ta, bar); OUT.append(box); box.firstChild.id = 'tStat';
  if (!outText) ['tCopy', 'tDl', 'tUse'].forEach(i => { $('#' + i).disabled = true; });
}
const stat = (a, b, hint) => { const d = el('div', 'tst'); d.append(el('b', '', a), el('span', '', b)); if (hint) d.title = hint; return d; };

/* ---------- per-mode setup ---------- */
const optsBox = $('#tOpts');
function build() {
  if (MODE === 'count') {
    const row = el('div', 'tgrid'); optsBox.append(row);
    check(row, 'skipCommon', 'Ignore common words in the top lists', true);
    const w = el('div', 'tf'); const lb = el('label', 'lbl', 'Limit meter'); lb.htmlFor = 'limit'; w.append(lb); const s = el('select', 'dd'); s.id = 'limit'; ctl.limit = s; [['', 'No limit meter']].concat(LIMITS.map(l => [l[0], l[1] + ' (' + l[2].toLocaleString('en') + ')'])).forEach(([v, t]) => { const o = el('option', '', t); o.value = v; s.append(o); }); s.addEventListener('change', run); w.append(s); row.append(w);
    s.value = PRESET === 'limit' ? 'x' : '';
  } else if (MODE === 'case') {
    const row = el('div', 'tgrid wide'); optsBox.append(row);
    const g = el('div', 'tcases'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Choose a case');
    CASE_LABELS.forEach(([k, t]) => { const b = el('button', 'tcase', t); b.type = 'button'; b.dataset.k = k; b.setAttribute('aria-pressed', 'false'); b.onclick = () => { caseKey = k; run(); }; g.append(b); }); row.append(g);
  } else if (MODE === 'clean') {
    const row = el('div', 'tgrid'); optsBox.append(row); const p = PRESET;
    check(row, 'spaces', 'Remove extra spaces', p === 'spaces' || p === ''); check(row, 'trim', 'Trim each line', p === 'spaces' || p === '');
    check(row, 'empty', 'Remove empty lines', p === 'empty'); check(row, 'blanks', 'Keep at most one empty line', false);
    check(row, 'breaks', 'Remove line breaks (join lines)', p === 'breaks'); check(row, 'keepParas', 'Keep paragraphs apart when joining', false);
    check(row, 'tabs', 'Turn tabs into spaces', false); number(row, 'tabn', 'Spaces per tab', 4, 1, 16);
    check(row, 'nbsp', 'Turn odd spaces (non-breaking, wide) into normal spaces', false); check(row, 'invisible', 'Remove invisible characters', false);
    check(row, 'quotes', 'Smart quotes and dashes to plain', false); check(row, 'accents', 'Remove accents (é to e)', p === 'accents');
    check(row, 'special', 'Remove everything except letters, numbers and spaces', false); check(row, 'emoji', 'Remove emoji', false);
    check(row, 'slug', 'Make each line a URL slug', p === 'slug'); check(row, 'rev', 'Reverse the text', p === 'rev');
  } else if (MODE === 'list') {
    const row = el('div', 'tgrid'); optsBox.append(row); const p = PRESET;
    select(row, 'order', 'Order', [['keep', 'Keep order'], ['az', 'A to Z'], ['za', 'Z to A'], ['nat', 'Natural (item 2 before item 10)'], ['n19', 'By number, low to high'], ['n91', 'By number, high to low'], ['short', 'Shortest first'], ['long', 'Longest first'], ['rev', 'Reverse the list'], ['shuf', 'Shuffle']], p === 'sort' ? 'az' : p === 'shuffle' ? 'shuf' : 'keep');
    check(row, 'trim', 'Trim each line', true); check(row, 'empty', 'Remove empty lines', true);
    check(row, 'dedupe', 'Remove duplicate lines', p === 'dedupe'); check(row, 'dcase', 'Duplicates are case sensitive', false); select(row, 'keep', 'Keep which duplicate', [['first', 'The first'], ['last', 'The last']], 'first');
    text(row, 'pre', 'Add before each line', '', p === 'prefix' ? 'for example "- "' : ''); text(row, 'suf', 'Add after each line', '', '');
    check(row, 'numbers', 'Number the lines', p === 'numbers'); number(row, 'start', 'Start at', 1, -999999, 999999); text(row, 'sep', 'After the number', '. ', ''); check(row, 'pad', 'Pad with zeros (001, 002)', false);
  } else if (MODE === 'find') {
    const row = el('div', 'tgrid'); optsBox.append(row);
    text(row, 'find', 'Find', '', ''); text(row, 'rep', 'Replace with', '', '');
    check(row, 'matchCase', 'Match case', false); check(row, 'word', 'Whole words only', false); check(row, 'regex', 'Use a pattern (regular expression)', false); check(row, 'multi', 'Pattern: ^ and $ match each line', false);
    row.append(el('p', 'tip wide', 'Your text is not changed until you press "Use result as input". With patterns on, $1 in the replacement means the first bracketed group.'));
  } else if (MODE === 'lorem') {
    const row = el('div', 'tgrid'); optsBox.append(row);
    select(row, 'kind', 'Make', [['para', 'Paragraphs'], ['sent', 'Sentences'], ['words', 'Words']], 'para'); number(row, 'count', 'How many', 3, 1, 5000); check(row, 'classic', 'Start with "Lorem ipsum dolor sit amet"', true);
    const b = el('button', 'btn ghost sm', 'Make new text'); b.type = 'button'; b.onclick = run; row.append(b);
  } else if (MODE === 'extract') {
    const row = el('div', 'tgrid'); optsBox.append(row);
    select(row, 'what', 'Find', [['emails', 'Email addresses'], ['urls', 'Web links'], ['numbers', 'Numbers'], ['hashtags', 'Hashtags'], ['phones', 'Phone-like numbers']], ({ emails: 'emails', urls: 'urls', numbers: 'numbers', hashtags: 'hashtags' })[PRESET] || 'emails');
    check(row, 'uniq', 'Only once each', true); check(row, 'sorted', 'Sort A to Z', false);
  }
}
let caseKey = ({ upper: 'upper', lower: 'lower', title: 'title', sentence: 'sentence', camel: 'camel', snake: 'snake' })[PRESET] || 'upper';

/* ---------- running ---------- */
function over(t) { if (t.length > MAX) { OUT.textContent = ''; OUT.append(el('p', 'tnote bad', 'This text is over 5 million characters. Split it into smaller parts.')); return true; } return false; }
function run() {
  const t = IN ? IN.value : '';
  if (MODE === 'diff') return runDiff();
  if (IN && over(t)) return;
  if (MODE === 'count') return runCount(t);
  if (MODE === 'lorem') { outText = lorem(val('kind'), num(val('count'), 3), val('classic')); return resultBox('Lorem ipsum', plural(wordsOf(outText).length, 'word') + ' made.'); }
  if (MODE === 'case') { document.querySelectorAll('.tcase').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === caseKey ? 'true' : 'false')); outText = t ? CASES[caseKey](t) : ''; return resultBox('Converted text', t ? plural(graphemes(outText), 'character') : 'Type or paste text on the left.'); }
  if (MODE === 'clean') { const o = {}; ['spaces', 'trim', 'empty', 'blanks', 'breaks', 'keepParas', 'tabs', 'nbsp', 'invisible', 'quotes', 'accents', 'special', 'emoji', 'slug', 'rev'].forEach(k => { o[k] = val(k); }); o.tabn = num(val('tabn'), 4); outText = t ? clean(t, o) : ''; return resultBox('Cleaned text', t ? `Before ${plural(graphemes(t), 'character')}, after ${plural(graphemes(outText), 'character')}.` : 'Type or paste text on the left.'); }
  if (MODE === 'list') { const o = { order: val('order'), trim: val('trim'), empty: val('empty'), dedupe: val('dedupe'), dcase: val('dcase'), keep: val('keep'), pre: val('pre'), suf: val('suf'), numbers: val('numbers'), start: num(val('start'), 1), sep: val('sep'), pad: val('pad') }; outText = t ? listOps(t, o) : ''; const a = t ? t.split(/\r?\n/).length : 0, b = outText ? outText.split('\n').length : 0; return resultBox('List', t ? `${plural(a, 'line')} in, ${plural(b, 'line')} out${a > b ? ` (${a - b} removed)` : ''}.` : 'Paste one item per line on the left.'); }
  if (MODE === 'find') { const f = val('find'); const o = { find: f, rep: val('rep'), matchCase: val('matchCase'), word: val('word'), regex: val('regex'), multi: val('multi') }; let r; try { r = replaceAll(t, o); } catch (e) { outText = ''; resultBox('Result', ''); $('#tStat').textContent = 'That pattern is not valid: ' + e.message; $('#tStat').className = 'tstat bad'; return; } outText = f ? r.out : ''; return resultBox('Result', !f ? 'Type what to find.' : r.n ? `${plural(r.n, 'match', 'matches').replace('matchs', 'matches')} replaced.` : 'Nothing matched.'); }
  if (MODE === 'extract') { let arr = EX[val('what')](t); const total = arr.length; if (val('uniq')) arr = [...new Set(arr)]; if (val('sorted')) arr = arr.slice().sort((a, b) => collator.compare(a, b)); outText = arr.join('\n'); return resultBox('Found', t ? `${total} found${val('uniq') && total !== arr.length ? `, ${arr.length} different` : ''}.` : 'Paste text on the left.'); }
}
function runCount(t) {
  const a = analyse(t); OUT.textContent = '';
  const grid = el('div', 'tstats'); grid.append(stat(a.W.toLocaleString('en'), 'Words'), stat(a.chars.toLocaleString('en'), 'Characters'), stat(a.noSp.toLocaleString('en'), 'Characters without spaces'), stat(a.sentences.toLocaleString('en'), 'Sentences'), stat(a.paragraphs.toLocaleString('en'), 'Paragraphs'), stat(a.lines.toLocaleString('en'), 'Lines'), stat(a.uniq.toLocaleString('en'), 'Different words'), stat(a.avg.toFixed(1), 'Average word length'), stat(a.syls.toLocaleString('en'), 'Syllables (English estimate)'));
  const times = el('div', 'tstats two'); times.append(stat(dur(a.reading), 'Reading time', 'About 200 words per minute'), stat(dur(a.speaking), 'Speaking time', 'About 130 words per minute'));
  OUT.append(grid, times);
  const lim = val('limit'); if (lim) { const L = LIMITS.find(x => x[0] === lim), used = lim === 'sms' ? (/[^\u0000-\u007f]/.test(t) ? graphemes(t) : a.chars) : a.chars, left = L[2] - used; const m = el('div', 'tmeter' + (left < 0 ? ' over' : ''));
    const bar = el('div', 'bar'), fill = el('i'); fill.style.width = Math.min(100, used / L[2] * 100) + '%'; bar.append(fill); m.append(el('p', '', `${L[1]}: ${used.toLocaleString('en')} of ${L[2].toLocaleString('en')}. ` + (left >= 0 ? `${left.toLocaleString('en')} left.` : `${(-left).toLocaleString('en')} over.`)), bar);
    if (lim === 'sms' && /[^\u0000-\u007f]/.test(t)) m.append(el('p', 'tip', 'Your text has characters outside plain English letters, so one SMS may hold only 70 characters.'));
    m.append(el('p', 'tip', 'Typical limits. Platforms change them, and apps can differ. Checked 20 November 2026.')); OUT.append(m); }
  if (a.W) {
    const rd = el('div', 'tread'); const lvl = a.flesch >= 90 ? 'Very easy' : a.flesch >= 70 ? 'Easy' : a.flesch >= 60 ? 'Plain English' : a.flesch >= 50 ? 'Fairly hard' : a.flesch >= 30 ? 'Hard' : 'Very hard';
    rd.append(el('h3', '', 'Readability (English)'), el('p', '', `Flesch reading ease ${Math.round(a.flesch)} (${lvl}). Reading grade about ${Math.max(0, a.grade).toFixed(1)}.`), el('p', 'tip', 'These are estimates from word, sentence and syllable counts. They only suit English text.')); OUT.append(rd);
    const tw = el('div', 'ttop'); tw.append(el('h3', '', 'Most used words'));
    const sc = val('skipCommon'), list = topWords(a.lower, 10, sc); if (list.length) { const ol = el('ol'); list.forEach(([w, c]) => { const li = el('li'); li.append(el('span', '', w), el('b', '', c + ' (' + (c / a.W * 100).toFixed(1) + '%)')); ol.append(li); }); tw.append(ol); } else tw.append(el('p', 'tip', 'Nothing to list yet.'));
    OUT.append(tw);
    const ph = [...topPhrases(a.lower, 2, 5, sc), ...topPhrases(a.lower, 3, 5, sc)].sort((x, y) => y[1] - x[1]).slice(0, 8);
    if (ph.length) { const pw = el('div', 'ttop'); pw.append(el('h3', '', 'Repeated phrases')); const ol = el('ol'); ph.forEach(([w, c]) => { const li = el('li'); li.append(el('span', '', w), el('b', '', c + 'x')); ol.append(li); }); pw.append(ol); OUT.append(pw); }
  }
  OUT.append(el('p', 'tip tnote', 'A word is a run of letters or numbers; hyphens and apostrophes inside a word do not split it. Counts can differ by a few from other programs. Chinese, Japanese and Thai text is counted by characters only.'));
}
function runDiff() {
  const a = IN.value, b = IN2.value; OUT.textContent = '';
  if (a.length > MAX || b.length > MAX) { OUT.append(el('p', 'tnote bad', 'One of the texts is over 5 million characters. Compare smaller parts.')); return; }
  if (!a && !b) { OUT.append(el('p', 'tstat', 'Paste the original on the left and the changed text on the right.')); return; }
  const mode = val('dmode'), ic = val('dcase'), iw = val('dspace');
  const norm = s => { if (ic) s = s.toLowerCase(); if (iw) s = s.replace(/[ \t]+/g, ' ').trim(); return s; };
  const split = s => mode === 'line' ? s.split(/\r?\n/) : mode === 'word' ? s.split(/(\s+)/).filter(x => x !== '') : Array.from(s);
  const A = split(a), B = split(b); const nA = A.map(norm), nB = B.map(norm);
  const d = diffSeq(nA, nB); if (!d) { OUT.append(el('p', 'tnote bad', 'These texts are too different and too long to compare in this mode. Try "By line" or compare smaller parts.')); return; }
  let ia = 0, ib = 0; const ops = d.map(x => { if (x.t === '=') { const r = { t: '=', v: B[ib] }; ia++; ib++; return r; } if (x.t === '-') return { t: '-', v: A[ia++] }; return { t: '+', v: B[ib++] }; });
  const add = ops.filter(o => o.t === '+').length, del = ops.filter(o => o.t === '-').length;
  const box = el('div', 'tdiff'); const sm = el('p', 'tstat', add || del ? `${plural(add, mode === 'line' ? 'line' : mode === 'word' ? 'word or space' : 'character')} added, ${plural(del, mode === 'line' ? 'line' : mode === 'word' ? 'word or space' : 'character')} removed.` : 'The texts match' + (ic || iw ? ' with your ignore settings.' : '.')); sm.id = 'tStat';
  const out = el('div', 'dview'); out.setAttribute('role', 'region'); out.setAttribute('aria-label', 'Differences');
  if (mode === 'line') ops.forEach(o => { const r = el('div', 'dl ' + (o.t === '+' ? 'add' : o.t === '-' ? 'del' : 'same')); r.append(el('span', 'gut', o.t === '=' ? ' ' : o.t), el('span', 'txt', o.v === '' ? ' ' : o.v)); out.append(r); });
  else { const pre = el('div', 'dinline'); ops.forEach(o => { if (o.t === '=') pre.append(document.createTextNode(o.v)); else { const s = el(o.t === '+' ? 'ins' : 'del', '', o.v); pre.append(s); } }); out.append(pre); }
  const bar = el('div', 'tact'); const cp = el('button', 'btn ghost sm', 'Copy differences'); cp.type = 'button'; cp.id = 'tCopy';
  const textDiff = mode === 'line' ? ops.filter(o => o.t !== '=').map(o => o.t + ' ' + o.v).join('\n') : ops.map(o => o.t === '=' ? o.v : o.t === '+' ? '[+' + o.v + '+]' : '[-' + o.v + '-]').join('');
  cp.onclick = () => copyText(textDiff).then(() => toast('Copied.'), () => toast('Copy was blocked by the browser.', true)); bar.append(cp);
  box.append(sm, out, bar); OUT.append(box);
}

/* ---------- reading files into the counter ---------- */
const loadJs = src => new Promise((ok, no) => { const s = el('script'); s.src = DROOT + src; s.onload = ok; s.onerror = no; document.head.append(s); });
async function fileText(f) {
  if (f.size > 60 * 1048576) throw new Error('That file is over 60 MB.');
  const n = f.name.toLowerCase();
  if (/\.(txt|md|csv|log|json|html?|xml|rtf)$/.test(n) || /^text\//.test(f.type)) return f.text();
  if (n.endsWith('.docx')) return docxText(new Uint8Array(await f.arrayBuffer()));
  if (n.endsWith('.pdf')) { await loadJs('assets/vendor/pdfjs/pdf.js'); const pdf = await pdfjsLib.getDocument({ isEvalSupported: false, data: new Uint8Array(await f.arrayBuffer()) }).promise; const out = []; for (let i = 1; i <= pdf.numPages; i++) { const p = await (await pdf.getPage(i)).getTextContent(); let line = ''; p.items.forEach(it => { line += it.str; if (it.hasEOL) line += '\n'; else line += ' '; }); out.push(line.replace(/[ ]+\n/g, '\n').trim()); } return out.join('\n\n'); }
  throw new Error('Use a TXT, DOCX or PDF file.');
}
async function docxText(u) {
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength); let e = u.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('That does not look like a Word file.');
  const cnt = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true), hit = null;
  for (let i = 0; i < cnt; i++) { const m = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true), name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl)); if (name === 'word/document.xml') { hit = { m, cs, off }; break; } p += 46 + nl + xl + cl; }
  if (!hit) throw new Error('No text found in that Word file.');
  const lo = hit.off, nl = dv.getUint16(lo + 26, true), xl = dv.getUint16(lo + 28, true), data = u.subarray(lo + 30 + nl + xl, lo + 30 + nl + xl + hit.cs);
  let xml; if (hit.m === 0) xml = new TextDecoder().decode(data); else if (hit.m === 8) {
    const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(data).catch(() => {}); w.close().catch(() => {});
    const rd = ds.readable.getReader(), parts = []; let n = 0;              // cap the inflated size: a tiny file can expand to gigabytes
    for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length; if (n > 80 * 1048576) { rd.cancel(); throw new Error('That Word file holds too much text to open here.'); } parts.push(value); }
    xml = new TextDecoder().decode(await new Blob(parts).arrayBuffer());
  } else throw new Error('Unsupported Word file.');
  return xml.replace(/<w:tab\/>/g, '\t').replace(/<w:(?:br|cr)\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------- wiring ---------- */
build();
const SAMPLE = { count: 'The quick brown fox jumps over the lazy dog. It was a bright, cold day in April, and the clocks were striking thirteen. Short words help. Long, winding sentences with many clauses, however well meant, can tire a reader before the point arrives.', list: 'banana\nApple\ncherry\napple\nBanana\n\ndate', clean: '  Hello   world!  \n\n\nThis    text has   extra spaces.  \n', find: 'The cat sat on the mat. The cat is happy.', case: 'the quick brown fox jumps over the lazy dog', extract: 'Write to ann@example.com or visit https://dilia.example/tools. Call +971 4 123 4567 #free #tools' };
if (IN) IN.addEventListener('input', debounce(run));
if (IN2) IN2.addEventListener('input', debounce(run));
if (MODE === 'diff') { const row = $('#tOpts'); const g = el('div', 'tgrid'); row.append(g); select(g, 'dmode', 'Compare', [['line', 'By line'], ['word', 'By word'], ['char', 'By character']], 'line'); check(g, 'dcase', 'Ignore capital letters', false); check(g, 'dspace', 'Ignore extra spaces', false); }
const b = id => $(id);
b('#tClear') && b('#tClear').addEventListener('click', () => { if (IN) IN.value = ''; if (IN2) IN2.value = ''; run(); (IN || {}).focus && IN.focus(); });
b('#tPaste') && b('#tPaste').addEventListener('click', async () => { try { const v = await navigator.clipboard.readText(); if (IN) { IN.value = v; run(); } } catch (e) { toast('The browser did not allow pasting. Press Ctrl+V in the box instead.', true); IN.focus(); } });
b('#tSample') && b('#tSample').addEventListener('click', () => { IN.value = SAMPLE[MODE] || SAMPLE.count; if (IN2) IN2.value = 'The quick brown fox jumped over the lazy dogs.'; if (MODE === 'find') { ctl.find.value = 'cat'; ctl.rep.value = 'dog'; } run(); });
const pick = b('#tFile');
if (pick) pick.addEventListener('change', async () => { const f = pick.files[0]; pick.value = ''; if (!f) return; try { toast('Reading ' + f.name + '...'); IN.value = (await fileText(f)).slice(0, MAX + 1); run(); } catch (e) { toast(e.message || 'That file could not be read.', true); } });
if (IN) { document.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); }); document.addEventListener('drop', async e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (!f || !pick) return; e.preventDefault(); try { IN.value = (await fileText(f)).slice(0, MAX + 1); run(); } catch (x) { toast(x.message, true); } }); }
run();
}
