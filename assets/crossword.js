/* Dilia crossword: our own clue bank and a generator. cwNew(count, rnd) places words crossing each other; no stray two-letter runs appear
   (every across/down run of 2+ letters in the grid is a placed word). */
(function (root) {
  const BANK = "planet|World that circles a star\nriver|Water flowing to the sea\nbridge|It carries a road over water\ngarden|Place where flowers and vegetables grow\nwindow|Glass opening in a wall\ncandle|Wax stick with a wick\nladder|Rungs for climbing\nmarket|Place to buy and sell goods\nisland|Land surrounded by water\nforest|Large area covered in trees\ndesert|Dry land with little rain\nvalley|Low land between hills\nharbor|Sheltered place for ships\nanchor|Heavy hook that holds a ship still\nengine|Machine that turns fuel into motion\nrocket|Vehicle that travels to space\ncamera|Device that takes photographs\nguitar|Six-stringed instrument\nviolin|Small string instrument played with a bow\npiano|Instrument with black and white keys\ndrum|Percussion instrument you beat\norange|Citrus fruit and a colour\nbanana|Long yellow fruit\ncherry|Small red fruit with a stone\nlemon|Sour yellow citrus fruit\ntomato|Red fruit often mistaken for a vegetable\npotato|Starchy tuber\ncarrot|Orange root vegetable\nbread|Baked food made from flour\ncheese|Dairy food made from milk curds\nbutter|Spread churned from cream\nhoney|Sweet food made by bees\ncoffee|Dark drink made from roasted beans\ntea|Hot drink made from leaves\nwater|Clear liquid we drink\nwinter|Coldest season\nsummer|Hottest season\nautumn|Season when leaves fall\nspring|Season when flowers bloom\nmonday|First working day of the week\nfriday|Day before the weekend\nsunday|Day many people rest\nmorning|Start of the day\nevening|Time between afternoon and night\nyellow|Colour of a lemon\npurple|Colour mixed from red and blue\nsilver|Shiny grey metal\ncopper|Reddish metal used in wires\niron|Metal that rusts\ngold|Precious yellow metal\ndiamond|Hardest natural gem\npearl|Gem formed inside an oyster\nocean|Huge body of salt water\nbeach|Sandy shore\nwave|Moving ridge of water\nstorm|Violent weather with wind and rain\nthunder|Loud sound after lightning\ncloud|White or grey shape in the sky\nrainbow|Colourful arc after rain\nsunrise|Daily start of daylight\nmoon|Earth's natural satellite\ncomet|Icy body with a glowing tail\ntiger|Large striped cat\nlion|Big cat with a mane\nzebra|Striped African animal\ncamel|Desert animal with humps\nrabbit|Long-eared hopper\nturtle|Reptile with a shell\ndolphin|Clever sea mammal\nwhale|Largest animal in the sea\neagle|Bird of prey with sharp eyes\nparrot|Colourful bird that can mimic speech\nspider|Eight-legged web spinner\nbutterfly|Insect with colourful wings\nteacher|Person who helps you learn\ndoctor|Person who treats the sick\nfarmer|Person who grows crops\npilot|Person who flies a plane\nartist|Person who paints or draws\nbaker|Person who makes bread\nsinger|Person who performs songs\ndriver|Person who steers a vehicle\nlibrary|Place to borrow books\nschool|Place where children learn\nhospital|Place where the sick are treated\nmuseum|Building that displays old objects\nstation|Place where trains stop\nairport|Place where planes take off\ncastle|Large fortified building\ntower|Tall narrow building\npencil|Writing tool with lead\neraser|Rubs out pencil marks\nruler|Straight edge for measuring\npaper|Thin sheet made from wood pulp\nbook|Pages bound between covers\nstory|Tale with a beginning and an end\npoem|Verse written in lines\nletter|Message sent in an envelope\nnumber|Used for counting\nclock|Shows the time\nmirror|Shows your reflection\npillow|Soft support for your head\nblanket|Warm bed cover\nkitchen|Room where food is cooked\nbedroom|Room for sleeping\nbasket|Woven container with a handle\nbottle|Container with a narrow neck\nbutton|Small disc that fastens a shirt\njacket|Short coat\nshoes|Worn on your feet\numbrella|Keeps off the rain\nbicycle|Two-wheeled pedal vehicle\ntrain|Vehicle that runs on rails\nship|Large vessel at sea\ntruck|Heavy vehicle for carrying goods\nmagnet|Attracts iron\nbattery|Stores electric charge\ncircuit|Closed path for electric current\npuzzle|Game that tests your thinking\nchess|Board game with kings and queens\ncards|Deck used for many games\nmusic|Organised sound\ndance|Move to a rhythm\nsmile|Happy expression\nlaugh|Sound of amusement\nfriend|Someone you like and trust\nfamily|Parents, children and relatives\nneighbor|Person who lives next door\nlanguage|System of words for speaking\nhistory|Study of the past\nscience|Study of the natural world\nenergy|Capacity to do work\ngravity|Force that pulls things down\noxygen|Gas we breathe\ncarbon|Element found in all living things".split('\n').map(l => { const i = l.indexOf('|'); return { w: l.slice(0, i), c: l.slice(i + 1) }; });
  const N = 17;
  function tryPlace(g, o, w, r, c, dr, dc) {
    let cross = 0; const L = w.length, er = r + dr * L, ec = c + dc * L, br = r - dr, bc = c - dc;
    if (r < 0 || c < 0 || r + dr * (L - 1) >= N || c + dc * (L - 1) >= N) return -1;
    if (br >= 0 && bc >= 0 && g[br][bc]) return -1; if (er < N && ec < N && g[er][ec]) return -1;
    for (let i = 0; i < L; i++) {
      const rr = r + dr * i, cc = c + dc * i, cell = g[rr][cc];
      if (cell) { if (cell !== w[i] || o[rr][cc].includes(dr ? 'v' : 'h')) return -1; cross++; continue; }
      const a = rr + dc, b = cc + dr, a2 = rr - dc, b2 = cc - dr; // neighbours at the sides
      if (a < N && b < N && g[a][b]) return -1; if (a2 >= 0 && b2 >= 0 && g[a2][b2]) return -1;
    }
    return cross;
  }
  function cwNew(count, rnd) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const pool = BANK.slice(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
      pool.sort((a, b) => (b.w.length >= 5 ? 1 : 0) - (a.w.length >= 5 ? 1 : 0));
      const g = Array.from({ length: N }, () => Array(N).fill('')), o = Array.from({ length: N }, () => Array(N).fill('')), placed = [];
      const mark = (r, c, dr, dc, L) => { for (let i = 0; i < L; i++) o[r + dr * i][c + dc * i] += dr ? 'v' : 'h'; };
      const first = pool.shift(), r0 = Math.floor(N / 2), c0 = Math.floor((N - first.w.length) / 2);
      for (let i = 0; i < first.w.length; i++) g[r0][c0 + i] = first.w[i]; mark(r0, c0, 0, 1, first.w.length); placed.push({ w: first.w, c: first.c, r: r0, col: c0, dr: 0, dc: 1 });
      const tried = new Set();
      for (let pass = 0; pass < 3 && placed.length < count; pass++) for (const e of pool) {
        if (placed.length >= count) break; if (tried.has(e.w)) continue;
        let best = [], bc = 0;
        for (const p of placed) for (let i = 0; i < p.w.length; i++) for (let j = 0; j < e.w.length; j++) {
          if (p.w[i] !== e.w[j]) continue; const dr = p.dc, dc = p.dr; // perpendicular
          const r = p.r + p.dr * i - dr * j, c = p.col + p.dc * i - dc * j, x = tryPlace(g, o, e.w, r, c, dr, dc);
          if (x >= 1) { if (x > bc) { bc = x; best = []; } if (x === bc) best.push({ r, c, dr, dc }); }
        }
        if (!best.length) continue; tried.add(e.w); const b = best[Math.floor(rnd() * best.length)]; mark(b.r, b.c, b.dr, b.dc, e.w.length);
        for (let i = 0; i < e.w.length; i++) g[b.r + b.dr * i][b.c + b.dc * i] = e.w[i]; placed.push({ w: e.w, c: e.c, r: b.r, col: b.c, dr: b.dr, dc: b.dc });
      }
      if (placed.length < count) continue;
      let r1 = N, r2 = -1, c1 = N, c2 = -1; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c]) { r1 = Math.min(r1, r); r2 = Math.max(r2, r); c1 = Math.min(c1, c); c2 = Math.max(c2, c); }
      const h = r2 - r1 + 1, w = c2 - c1 + 1; if (h > 13 || w > 13) continue;
      const grid = []; for (let r = r1; r <= r2; r++) grid.push(g[r].slice(c1, c2 + 1));
      const words = placed.map(p => ({ w: p.w, c: p.c, r: p.r - r1, col: p.col - c1, dir: p.dr ? 'down' : 'across' }));
      // number cells in reading order
      const num = {}; let k = 0; const starts = new Set(words.map(x => x.r + ',' + x.col));
      for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (starts.has(r + ',' + c)) num[r + ',' + c] = ++k;
      words.forEach(x => { x.n = num[x.r + ',' + x.col]; });
      words.sort((a, b) => a.n - b.n || (a.dir === 'across' ? -1 : 1));
      return { h, w, grid, words };
    }
    throw new Error('no crossword');
  }
  // every run of 2+ letters in the grid must be a placed word, and every placed word must read correctly
  function cwCheck(p) {
    const runs = [], get = (r, c) => (r >= 0 && c >= 0 && r < p.h && c < p.w ? p.grid[r][c] : '');
    for (let r = 0; r < p.h; r++) { let s = ''; for (let c = 0; c <= p.w; c++) { const ch = get(r, c); if (ch) s += ch; else { if (s.length > 1) runs.push(s); s = ''; } } }
    for (let c = 0; c < p.w; c++) { let s = ''; for (let r = 0; r <= p.h; r++) { const ch = get(r, c); if (ch) s += ch; else { if (s.length > 1) runs.push(s); s = ''; } } }
    const ws = p.words.map(x => x.w).sort(), rs = runs.sort();
    if (ws.join() !== rs.join()) return false;
    return p.words.every(x => { for (let i = 0; i < x.w.length; i++) { const ch = x.dir === 'across' ? get(x.r, x.col + i) : get(x.r + i, x.col); if (ch !== x.w[i]) return false; } return true; });
  }
  root.DiliaCross = { BANK, cwNew, cwCheck };
})(typeof window !== 'undefined' ? window : globalThis);
