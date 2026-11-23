// Quiz maker: write multiple-choice questions, play them on one screen, save or load the quiz as a small file.
// The quiz is kept in this browser while you edit. Nothing is sent anywhere.
{
  const R = PartyRng, $ = id => document.getElementById(id), KEY = 'dilia-quiz-v1';
  const MAXQ = 100, MAXQT = 200, MAXA = 100, MAXT = 60, MAXFILE = 200000, LET = 'ABCD';
  const msg = $('msg');
  const say = (t, ms) => { msg.textContent = t; clearTimeout(say.t); if (t) say.t = setTimeout(() => { msg.textContent = ''; }, ms || 4000); };
  const cut = (s, n) => Array.from(String(s)).slice(0, n).join('');
  const blankQ = () => ({ q: '', a: ['', '', '', ''], c: 0 });
  const sample = () => ({ title: 'My quiz', qs: [{ q: 'Which planet is known as the Red Planet?', a: ['Venus', 'Mars', 'Jupiter', 'Mercury'], c: 1 }, { q: 'How many days are in a leap year?', a: ['365', '364', '366', '360'], c: 2 }] });
  // accepts only a well-formed quiz; anything else is refused with a reason
  function clean(o) {
    if (!o || typeof o !== 'object' || !Array.isArray(o.qs)) return { err: 'This file is not a Dilia quiz.' };
    if (o.qs.length < 1 || o.qs.length > MAXQ) return { err: 'A quiz needs 1 to ' + MAXQ + ' questions.' };
    const qs = [];
    for (let i = 0; i < o.qs.length; i++) {
      const x = o.qs[i];
      if (!x || typeof x.q !== 'string' || !Array.isArray(x.a) || x.a.length !== 4 || !x.a.every(t => typeof t === 'string') || !Number.isInteger(x.c) || x.c < 0 || x.c > 3) return { err: 'Question ' + (i + 1) + ' is not in the right format.' };
      qs.push({ q: cut(x.q, MAXQT), a: x.a.map(t => cut(t, MAXA)), c: x.c });
    }
    return { quiz: { title: cut(typeof o.title === 'string' ? o.title : '', MAXT), qs } };
  }
  const rd = () => { try { const r = clean(JSON.parse(localStorage.getItem(KEY) || 'null')); return r.quiz || null; } catch (e) { return null; } };
  let quiz = rd() || sample(), view = 'edit', play = null, armed = 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(quiz)); } catch (e) {} };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  function problem() {
    for (let i = 0; i < quiz.qs.length; i++) {
      const x = quiz.qs[i], n = x.a.filter(t => t.trim()).length;
      if (!x.q.trim()) return 'Question ' + (i + 1) + ' has no text.';
      if (n < 2) return 'Question ' + (i + 1) + ' needs at least 2 answers.';
      if (!x.a[x.c].trim()) return 'Question ' + (i + 1) + ': the right answer is empty. Pick a filled answer.';
    }
    return '';
  }
  function renderEdit() {
    $('qtitle').value = quiz.title; const box = $('qlist'); box.textContent = '';
    quiz.qs.forEach((x, i) => {
      const f = el('fieldset', 'pt-q'), lg = el('legend', null, 'Question ' + (i + 1));
      const t = el('textarea', 'pt-ta qq'); t.rows = 2; t.maxLength = MAXQT; t.value = x.q; t.setAttribute('aria-label', 'Question ' + (i + 1) + ' text'); t.addEventListener('input', () => { x.q = t.value; save(); });
      f.append(lg, t);
      for (let j = 0; j < 4; j++) {
        const r = el('div', 'pt-ans'), rb = document.createElement('input'); rb.type = 'radio'; rb.name = 'c' + i; rb.checked = x.c === j; rb.setAttribute('aria-label', 'Answer ' + LET[j] + ' is correct');
        rb.addEventListener('change', () => { x.c = j; save(); });
        const a = el('input', 'pt-in'); a.type = 'text'; a.maxLength = MAXA; a.value = x.a[j]; a.placeholder = 'Answer ' + LET[j]; a.setAttribute('aria-label', 'Question ' + (i + 1) + ' answer ' + LET[j]);
        a.addEventListener('input', () => { x.a[j] = a.value; save(); }); r.append(rb, a); f.append(r);
      }
      const d = el('button', 'pbtn', 'Delete question'); d.type = 'button'; d.addEventListener('click', () => { if (quiz.qs.length <= 1) { say('A quiz needs at least one question.'); return; } quiz.qs.splice(i, 1); save(); renderEdit(); });
      f.append(d); box.append(f);
    });
    $('qcount').textContent = quiz.qs.length + (quiz.qs.length === 1 ? ' question' : ' questions');
  }
  function setView(v) { view = v; $('qedit').hidden = v !== 'edit'; $('qplay').hidden = v !== 'play'; }
  function start() {
    const p = problem(); if (p) { say(p, 6000); return; }
    const idx = quiz.qs.map((_, i) => i), order = $('qshuf').checked ? R.shuffle(idx) : idx;
    play = { order, pos: 0, score: 0, answered: false, opts: [], shufA: $('qshufa').checked };
    setView('play'); question();
  }
  function question() {
    const x = quiz.qs[play.order[play.pos]], box = $('qstage'); box.textContent = ''; play.answered = false;
    let ids = [0, 1, 2, 3].filter(j => x.a[j].trim()); if (play.shufA) ids = R.shuffle(ids); play.opts = ids;
    $('qprog').textContent = 'Question ' + (play.pos + 1) + ' of ' + play.order.length + ' · Score ' + play.score;
    box.append(el('div', 'qtext', x.q));
    const ul = el('div', 'qopts'); ul.setAttribute('role', 'group'); ul.setAttribute('aria-label', 'Answers');
    ids.forEach((j, k) => {
      const b = el('button', 'pbtn qopt'); b.type = 'button'; b.dataset.j = j; const s = el('b', null, LET[k]); b.append(s, document.createTextNode(' ' + x.a[j]));
      b.addEventListener('click', () => choose(j, b)); ul.append(b);
    });
    box.append(ul); $('qshow').hidden = false; $('qnext').hidden = true; $('qfinal').hidden = true; $('qstage').hidden = false;
  }
  function reveal(chosen) {
    const x = quiz.qs[play.order[play.pos]]; play.answered = true;
    document.querySelectorAll('.qopt').forEach(b => { b.disabled = true; const j = Number(b.dataset.j); if (j === x.c) b.classList.add('right'); else if (j === chosen) b.classList.add('wrong'); });
    $('qshow').hidden = true; $('qnext').hidden = false; $('qnext').textContent = play.pos + 1 >= play.order.length ? 'See score' : 'Next question';
  }
  function choose(j) { if (play.answered) return; const x = quiz.qs[play.order[play.pos]]; if (j === x.c) { play.score++; say('Right!', 1500); } else say('Not this time.', 1500); reveal(j); $('qprog').textContent = 'Question ' + (play.pos + 1) + ' of ' + play.order.length + ' · Score ' + play.score; }
  function next() {
    play.pos++;
    if (play.pos >= play.order.length) {
      $('qstage').hidden = true; $('qshow').hidden = true; $('qnext').hidden = true; $('qfinal').hidden = false;
      $('qscore').textContent = play.score + ' / ' + play.order.length; $('qprog').textContent = 'Finished';
      $('qline').textContent = play.score === play.order.length ? 'Perfect score.' : Math.round(play.score / play.order.length * 100) + '% right.'; return;
    }
    question();
  }
  function download() {
    const p = problem(); if (p) { say(p, 6000); return; }
    const name = (quiz.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'quiz') + '.json';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(quiz, null, 1)], { type: 'application/json' })); a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); say('Saved as ' + name);
  }
  function load(file) {
    if (!file) return; if (file.size > MAXFILE) { say('That file is too big for a quiz.', 5000); return; }
    file.text().then(t => { let o; try { o = JSON.parse(t); } catch (e) { say('This file is not a quiz file.', 5000); return; } const r = clean(o); if (r.err) { say(r.err, 6000); return; } quiz = r.quiz; save(); renderEdit(); say('Quiz loaded: ' + quiz.qs.length + ' questions.'); }, () => say('Could not read the file.'));
  }

  $('qtitle').addEventListener('input', () => { quiz.title = cut($('qtitle').value, MAXT); save(); });
  $('qadd').addEventListener('click', () => { if (quiz.qs.length >= MAXQ) { say('Up to ' + MAXQ + ' questions.'); return; } quiz.qs.push(blankQ()); save(); renderEdit(); const t = document.querySelectorAll('.qq'); t[t.length - 1].focus(); });
  $('qstart').addEventListener('click', start);
  $('qshow').addEventListener('click', () => { if (!play.answered) reveal(-1); });
  $('qnext').addEventListener('click', next);
  $('qback').addEventListener('click', () => { setView('edit'); });
  $('qagain').addEventListener('click', start); $('qedit2').addEventListener('click', () => setView('edit'));
  $('qsave').addEventListener('click', download);
  $('qfile').addEventListener('change', e => { load(e.target.files[0]); e.target.value = ''; });
  $('qnew').addEventListener('click', () => {
    if (!armed) { $('qnew').textContent = 'Press again to clear the quiz'; armed = setTimeout(() => { armed = 0; $('qnew').textContent = 'New quiz'; }, 4000); return; }
    clearTimeout(armed); armed = 0; $('qnew').textContent = 'New quiz'; quiz = { title: '', qs: [blankQ()] }; save(); renderEdit();
  });
  renderEdit(); setView('edit');
  window.DiliaQuiz = { state: () => ({ quiz: JSON.parse(JSON.stringify(quiz)), view, pos: play ? play.pos : -1, score: play ? play.score : 0, answered: play ? play.answered : false }), clean };
}
