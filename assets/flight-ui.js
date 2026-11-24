// Flight time and jet lag: local departure + flight length -> local arrival, with an optional connection, a two-clock timeline and a jet-lag plan.
{
  const CM = CalcMath, C = DiliaCities, $ = id => document.getElementById(id), esc = LifeKit.esc;
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], pad = n => String(n).padStart(2, '0');
  const city = n => C.find(c => c[0] === n);
  const show = (z, ms) => { const p = CM.parts(z, ms); return { p, t: pad(p.h) + ':' + pad(p.mi), d: WD[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] + ' ' + p.d + ' ' + MON[p.m - 1] }; };
  const dur = m => Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + pad(m % 60) + 'm' : '');
  const num = (id, max) => { const v = $(id).value.trim(); if (v === '') return 0; const n = Number(v); if (!Number.isInteger(n) || n < 0 || n > max) throw new Error('Flight length: whole hours 0 to ' + 30 + ' and minutes 0 to 59.'); return n; };
  const dayDiff = (a, b) => Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 864e5);
  function fail(m) { $('lcres').innerHTML = `<div class="k">CHECK YOUR INPUT</div><p class="lcbad">${esc(m)}</p>`; $('lcviz').innerHTML = ''; $('fljet').innerHTML = ''; }
  function run() {
    try {
      const A = city($('flfrom').value), Z = city($('flto').value), H = $('fllay').checked ? city($('flhub').value) : null;
      const w = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec($('flwhen').value); if (!w) return fail('Pick the departure date and time.');
      const dep = CM.wallToUtc(A[1], +w[1], +w[2], +w[3], +w[4], +w[5]); if (dep.error) return fail(dep.error);
      const m1 = num('flh', 30) * 60 + num('flm', 59); if (!m1) return fail('Enter how long the flight is.');
      let arr = dep.ms + m1 * 60000, legs = [{ from: A, to: H || Z, a: dep.ms, b: arr }], lay = 0;
      if (H) {
        const w2 = /^(\d{2}):(\d{2})$/.exec($('flnext').value); if (!w2) return fail('Pick the time the connecting flight leaves.');
        const hp = CM.parts(H[1], arr); let nx = CM.wallToUtc(H[1], hp.y, hp.m, hp.d, +w2[1], +w2[2]); if (nx.error) return fail(nx.error);
        if (nx.ms < arr) { const t = CM.addDate({ y: hp.y, m: hp.m, d: hp.d }, 0, 0, 1).date; nx = CM.wallToUtc(H[1], t.y, t.m, t.d, +w2[1], +w2[2]); if (nx.error) return fail(nx.error); }
        lay = (nx.ms - arr) / 60000; const m2 = num('flh2', 30) * 60 + num('flm2', 59); if (!m2) return fail('Enter how long the second flight is.');
        legs.push({ from: H, to: Z, a: nx.ms, b: nx.ms + m2 * 60000 }); arr = nx.ms + m2 * 60000;
      }
      const d0 = show(A[1], dep.ms), d1 = show(Z[1], arr), shift = (CM.offsetMin(Z[1], arr) - CM.offsetMin(A[1], dep.ms)) / 60, dd = dayDiff(d0.p, d1.p), air = legs.reduce((s, l) => s + (l.b - l.a) / 60000, 0), total = (arr - dep.ms) / 60000;
      $('lcres').innerHTML = `<div class="k">YOU ARRIVE IN ${esc(Z[0].toUpperCase())}</div><div class="n">${d1.t}${dd ? ` <small class="fld">${dd > 0 ? '+' : ''}${dd} ${Math.abs(dd) === 1 ? 'day' : 'days'}</small>` : ''}</div><div class="d">${esc(d1.d)} ${d1.p.y}, local time · left ${esc(A[0])} ${esc(d0.d)} at ${d0.t}</div>
        <div class="lstats"><div><small>IN THE AIR</small><b class="c">${dur(air)}</b></div><div><small>DOOR TO DOOR</small><b>${dur(total)}</b></div><div><small>CLOCKS MOVE</small><b class="h">${shift === 0 ? 'No change' : (shift > 0 ? '+' : '−') + dur(Math.abs(shift) * 60)}</b></div>${H ? `<div><small>LAYOVER IN ${esc(H[0].toUpperCase())}</small><b class="g">${dur(lay)}</b></div>` : ''}</div>
        ${H ? `<p class="lcnote">${lay < 60 ? 'Very tight connection: under an hour.' : lay < 120 ? 'Tight connection: allow for walking and security.' : lay < 360 ? 'Comfortable connection.' : 'Long layover: there may be time to leave the airport, if your visa and airline allow it. Leave 2 to 3 hours to get back through security.'}</p>` : ''}`;
      // timeline: two (or three) clocks on one time axis
      const t0 = dep.ms - 2 * 3600e3, t1 = arr + 2 * 3600e3, span = t1 - t0, pos = ms => ((ms - t0) / span * 100).toFixed(3) + '%';
      const strip = c => { let s = ''; const step = span > 30 * 3600e3 ? 6 : span > 14 * 3600e3 ? 3 : 1; for (let ms = Math.ceil(t0 / 3600e3) * 3600e3; ms <= t1; ms += 3600e3) { const p = CM.parts(c[1], ms); if (p.mi === 0 && p.h % step === 0) s += `<span class="fh${p.h === 0 ? ' mid' : ''}" style="left:${pos(ms)}"><em>${p.h === 0 ? WD[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] : pad(p.h)}</em></span>`; } for (let ms = Math.floor(t0 / 3600e3) * 3600e3; ms < t1; ms += 3600e3) { const p = CM.parts(c[1], ms); const night = p.h < 6 || p.h >= 21; if (night) s += `<i class="fn" style="left:${pos(Math.max(ms, t0))};width:${((Math.min(ms + 3600e3, t1) - Math.max(ms, t0)) / span * 100).toFixed(3)}%"></i>`; } return `<div class="frow"><b>${esc(c[0])}</b><div class="fstrip">${s}</div></div>`; };
      const cs = [A].concat(H ? [H] : [], [Z]);
      $('lcviz').innerHTML = `<div class="flt">${cs.map(strip).join('')}<div class="fbars">${legs.map(l => `<i class="fb" style="left:${pos(l.a)};width:${((l.b - l.a) / span * 100).toFixed(3)}%"><span>${esc(l.from[0])} → ${esc(l.to[0])}</span></i>`).join('')}</div></div><div class="lkey"><span><i style="background:linear-gradient(90deg,#29c6ff,#ff2d95)"></i>In the air</span><span><i style="background:#141b38;border:1px solid #ffffff33"></i>Night (21:00 to 06:00 local)</span></div>`;
      // jet lag
      const a = Math.abs(shift), east = shift > 0;
      $('fljet').innerHTML = a < 3 ? `<h3>Little or no jet lag</h3><p>The clocks move ${a ? dur(a * 60) : 'not at all'}. Most people barely notice a change under three hours.</p>` : `<h3>Jet-lag plan: clocks move ${dur(a * 60)} ${east ? 'forward (flying east)' : 'back (flying west)'}</h3>
        <ol class="fjp"><li><b>3 days before</b>Go to bed and get up about one hour ${east ? 'earlier' : 'later'} each day, as far as you comfortably can.</li><li><b>On the plane</b>Set your watch to ${esc(Z[0])} time. Sleep if it is night there (${d1.t} on arrival), stay awake if it is day.</li><li><b>First days there</b>${east ? 'Get bright light in the morning and avoid bright light late in the evening.' : 'Get bright light in the late afternoon and evening, and keep mornings dim.'} Eat meals at local times.</li><li><b>How long</b>Many people take roughly a day for each hour of difference to feel normal; flying east usually feels harder. That would be about ${Math.round(a)} ${Math.round(a) === 1 ? 'day' : 'days'} here.</li></ol><p class="lnote">General guidance only, not medical advice. Ask a doctor about sleep aids or if you have a health condition.</p>`;
    } catch (e) { fail(e.message); }
  }
  const opt = sel => C.map(c => `<option value="${esc(c[0])}"${c[0] === sel ? ' selected' : ''}>${esc(c[0])} · ${esc(LifeKit.cname(c[2]))}</option>`).join('');
  $('flfrom').innerHTML = opt('Dubai'); $('flto').innerHTML = opt('London'); $('flhub').innerHTML = opt('Doha');
  const p = CM.parts('Asia/Dubai', Date.now() + 864e5); $('flwhen').value = CM.iso({ y: p.y, m: p.m, d: p.d }) + 'T08:30';
  $('fllay').addEventListener('change', () => { $('fllegs').hidden = !$('fllay').checked; run(); });
  document.querySelectorAll('[data-fl] input, [data-fl] select').forEach(i => { i.addEventListener('input', run); i.addEventListener('change', run); });
  $('flswap').addEventListener('click', () => { const a = $('flfrom').value; $('flfrom').value = $('flto').value; $('flto').value = a; run(); });
  run();
  window.DiliaFlight = { run };
}
