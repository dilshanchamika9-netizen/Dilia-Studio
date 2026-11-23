// Play hub: today's dailies with your progress, streak and week. Read from this browser only.
{
  const G = DiliaPlayGen, P = DiliaPlay, $ = id => document.getElementById(id), KEY = P.today();
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const no = G.dayNo(KEY), n = [7, 5, 5, 6, 6, 6, 7][G.weekday(KEY)];
  $('hno').textContent = 'Today · #' + no + ' · ' + P.niceDate(KEY);
  $('n-path').textContent = 'Daily path #' + no + ' · ' + n + ' × ' + n;
  $('n-sudoku').textContent = 'Daily sudoku #' + no;
  const saved = (g) => { try { return !!localStorage.getItem('dilia-play-save:' + g + ':' + KEY); } catch (e) { return false; } };

  const sp = $('s-path'), r = P.result('path', KEY);
  sp.append(r ? el('span', 'chip ok', '✓ Solved in ' + P.fmt(r.t)) : saved('path') ? el('span', 'chip on', 'Continue') : el('span', 'chip', 'Play now'));
  const ss = $('s-sudoku');
  ['easy', 'medium', 'hard'].forEach(l => {
    const x = P.result('sudoku-' + l, KEY), name = l[0].toUpperCase() + l.slice(1);
    ss.append(x ? el('span', 'chip ok', '✓ ' + name + ' ' + P.fmt(x.t)) : saved('sudoku-' + l) ? el('span', 'chip on', name + ': continue') : el('span', 'chip', name));
  });

  const s = P.streak(), best = P.bestStreak();
  $('hstreak').textContent = s + (s === 1 ? ' day' : ' days');
  $('hstreak2').textContent = s ? 'Best ever: ' + best + (best === 1 ? ' day' : ' days') + '. Solve one daily a day to keep it.' : 'Solve any daily to start a streak.';
  const wk = $('hweek');
  P.week().forEach((d, i, a) => {
    const [y, m, dd] = d.key.split('-').map(Number), s = el('span');
    const dot = el('i', (d.done ? 'd' : '') + (i === a.length - 1 ? ' t' : '')); dot.setAttribute('aria-label', d.key + (d.done ? ' solved' : ''));
    s.append(dot, document.createTextNode(new Date(y, m - 1, dd).toLocaleDateString('en-GB', { weekday: 'narrow' }))); wk.append(s);
  });
  const bits = [['Path', 'path'], ['Easy', 'sudoku-easy'], ['Medium', 'sudoku-medium'], ['Hard', 'sudoku-hard']].map(([k, g]) => { const st = P.stats(g); return st.best ? k + ' ' + P.fmt(st.best) : ''; }).filter(Boolean);
  if (bits.length) $('hbest').textContent = bits.join(' · ');
  const top = P.levelTop('path');
  $('n-levels').textContent = 'Level ' + top + ' · ' + G.levelSize(top) + ' × ' + G.levelSize(top);
  $('s-levels').append(el('span', top > 1 ? 'chip on' : 'chip', top > 1 ? 'Continue: level ' + top : 'Start level 1'));
  const mr = P.result('merge', KEY);
  $('n-merge').textContent = 'Daily merge #' + no;
  $('s-merge').append(mr ? el('span', 'chip ok', '✓ ' + mr.s + ' points') : saved('merge') ? el('span', 'chip on', 'Continue') : el('span', 'chip', 'Play now'));
  let mbest = 0; try { const d = JSON.parse(localStorage.getItem('dilia-play-v1') || '{}').days || {}; for (const k in d) if (d[k].merge && d[k].merge.s > mbest) mbest = d[k].merge.s; } catch (e) {}
  if (mbest) { bits.push('Merge ' + mbest + ' points'); $('hbest').textContent = bits.join(' · '); }
}
