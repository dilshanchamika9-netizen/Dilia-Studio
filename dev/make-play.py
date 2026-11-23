"""Builds the Play area: /play/ (hub), /daily-path/, /daily-sudoku/. Shell (sprite, header, footer) comes from /life/index.html.
Run from make-pages.py (before the menu pass) or alone: python3 dev/make-play.py"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / 'life' / 'index.html').read_text()
SPRITE = re.search(r'<svg class="sprite".*?</svg>\n', src, re.S).group(0)
HEADER = re.search(r'<header class="nav">.*?</header>\n', src, re.S).group(0).replace('<span class="l">Life</span>', '<span class="l">Play</span>').replace('aria-label="Dilia home"', 'aria-label="Dilia Play home"', 1)

def shell(title, desc, body, scripts, robots='', mode=''):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{robots}<meta name="theme-color" content="#0b1220">
<link rel="icon" href="../assets/mark.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/site.css">
<link rel="stylesheet" href="../assets/palette.css">
<link rel="stylesheet" href="../assets/play.css">
</head>
<body class="stage area-play"{(' data-mode="' + mode + '"') if mode else ''}>
{SPRITE}
{HEADER}
<main>
{body}
</main>

<footer class="foot">
  <div class="wrap">
    <div>
      <a class="brand" href="../" aria-label="Dilia home"><svg><use href="#mark"/></svg><span class="wm"><span class="w">Dilia</span></span></a>
      <p>Free tools and games that run on your own device. No sign-up, no ads.</p>
    </div>
    <div><h4>Play</h4><ul><li><a href="../daily-path/">Daily path</a></li><li><a href="../daily-sudoku/">Daily sudoku</a></li><li><a href="../path-puzzle/">Path puzzle levels</a></li><li><a href="../play/">All games</a></li></ul></div>
    <div><h4>Dilia</h4><ul><li><a href="../tools.html">Tools</a></li><li><a href="../life/">Life</a></li><li><a href="../play/">Play</a></li><li><a href="../blog/">Read</a></li></ul></div>
    <div class="legal"><span>&copy; <span data-year></span> Dilia</span><span>Scores and streaks stay in this browser.</span></div>
  </div>
</footer>

<script src="../assets/tools.js"></script>
<script src="../assets/palette.js"></script>
<script src="../assets/menu.js"></script>
<script src="../assets/common.js"></script>
{scripts}
</body>
</html>
'''

# small pictures on the daily cards (decoration only)
ART_PATH = '''<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="ap" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e5007d"/><stop offset=".55" stop-color="#a08bff"/><stop offset="1" stop-color="#3fc3ff"/></linearGradient></defs><g fill="#ffffff10">''' + ''.join(f'<rect x="{18 + c * 30}" y="{18 + r * 30}" width="26" height="26" rx="7"/>' for r in range(4) for c in range(4)) + '''</g><polyline points="31,31 61,31 61,61 31,61 31,121 61,121 61,91 91,91 91,121 121,121 121,61 91,61 91,31 121,31" fill="none" stroke="url(#ap)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="31" cy="31" r="11" fill="#fff"/><circle cx="121" cy="31" r="11" fill="#fff"/></svg>'''
ART_SUD = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="18" y="18" width="114" height="114" rx="14" fill="#ffffff10" stroke="#ffffff30"/><path d="M56 18v114M94 18v114M18 56h114M18 94h114" stroke="#ffffff30" stroke-width="2"/><g font-family="Archivo,sans-serif" font-weight="800" font-size="24" fill="#fff" text-anchor="middle"><text x="37" y="46">5</text><text x="113" y="46" fill="#c4b5ff">3</text><text x="75" y="84">9</text><text x="37" y="122" fill="#c4b5ff">7</text><text x="113" y="122">1</text></g></svg>'
ART_MERGE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g><rect x="18" y="18" width="52" height="52" rx="12" fill="#ffffff10"/><rect x="80" y="18" width="52" height="52" rx="12" fill="#ffffff18"/><rect x="18" y="80" width="52" height="52" rx="12" fill="#ffffff18"/><rect x="80" y="80" width="52" height="52" rx="12" fill="#ffffff10"/></g></svg>'

# ---------------- hub ----------------
HUB = f'''<section class="phero"><div class="wrap">
  <p class="crumbp"><a href="../">Dilia</a> › <b>Play</b></p>
  <p class="eyeb" id="hno">Today's dailies</p>
  <h1>Come back every day,<br><span class="grad">play in one tap.</span></h1>
  <p class="lead">New puzzles every day at your midnight, the same for everyone in the world. No ads, no sign-up, no downloads. Your scores stay on this device.</p>
</div></section>

<section class="wrap psec" aria-labelledby="h-today">
  <h2 id="h-today">Today</h2>
  <div class="dailies">
    <a class="daily" href="../daily-path/" id="c-path">{ART_PATH}<span class="no" id="n-path">Daily path</span><b>Daily path</b><p>Draw one line through every square. Pass the numbers in order.</p><span class="st" id="s-path"></span></a>
    <a class="daily" href="../daily-sudoku/" id="c-sudoku">{ART_SUD}<span class="no" id="n-sudoku">Daily sudoku</span><b>Daily sudoku</b><p>Three boards a day: easy, medium and hard.</p><span class="st" id="s-sudoku"></span></a>
    <div class="daily soon">{ART_MERGE}<span class="no">Coming soon</span><b>Daily merge</b><p>Slide and merge tiles. Same tile order for everyone.</p><span class="st"><span class="stag2">Soon</span></span></div>
  </div>
  <div class="pstrip">
    <div class="pcard"><p class="eyeb">Streak</p><span class="big" id="hstreak">0</span><span class="small" id="hstreak2">Solve any daily to start a streak.</span></div>
    <div class="pcard"><p class="eyeb">This week</p><div class="wk" id="hweek"></div></div>
    <div class="pcard"><p class="eyeb">Your bests</p><span class="small" id="hbest">Solve a daily to see your best times.</span></div>
  </div>
</section>

<section class="wrap psec" aria-labelledby="h-any">
  <h2 id="h-any">Play any time</h2>
  <div class="dailies">
    <a class="daily" href="../path-puzzle/" id="c-levels">{ART_PATH}<span class="no" id="n-levels">Levels</span><b>Path puzzle</b><p>Endless levels, from 5 × 5 up to 8 × 8. Your next level is saved.</p><span class="st" id="s-levels"></span></a>
  </div>
</section>

<section class="wrap psec" aria-labelledby="h-soon">
  <h2 id="h-soon">Coming next</h2>
  <div class="pgrid">
    <div class="pcard"><span class="stag2">Soon</span><b>Same-deal classics</b><ul><li>Daily solitaire deal</li><li>Daily minesweeper board</li><li>Daily chess puzzle</li></ul></div>
    <div class="pcard"><span class="stag2">Soon</span><b>Puzzles</b><ul><li>Merge tiles, sudoku, minesweeper</li><li>Nonogram, sliding puzzles</li><li>Word search</li></ul></div>
    <div class="pcard"><span class="stag2">Soon</span><b>Cards and board</b><ul><li>Solitaire, mahjong</li><li>Chess, checkers, reversi</li><li>Ludo, connect four</li></ul></div>
    <div class="pcard"><span class="stag2">Soon</span><b>Arcade</b><ul><li>Snake</li><li>Brick breaker, pong</li><li>One-button games</li></ul></div>
    <div class="pcard"><span class="stag2">Soon</span><b>Brain and skill</b><ul><li>Typing test</li><li>Reaction time</li><li>Memory games</li></ul></div>
    <div class="pcard"><span class="stag2">Soon</span><b>Party and decide</b><ul><li>Wheel spinner</li><li>Dice, coin, team maker</li><li>Secret Santa draw</li></ul></div>
  </div>
</section>'''

# ---------------- daily path ----------------
STATS_PATH = '''<div class="pcard"><p class="eyeb">Today</p><span class="big" id="pno">#1</span><span class="small" id="pdate"></span></div>
    <div class="pcard"><p class="eyeb">Streak</p><span class="big"><span id="streak">0</span></span><span class="small">Best time <b id="sbest">–</b> · solved <b id="ssolved">0</b></span></div>'''
PATH = f'''<div class="wrap">
<div class="gwrap">
  <div class="gside">
    {STATS_PATH}
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Daily path</b></p>
    <div class="ghead"><div><h1>Daily path</h1><p class="sub"><span id="psize"></span> · same board for everyone today</p></div>
      <div class="meter"><div><small>TIME</small><b id="ptime">0:00</b></div><div><small>FILLED</small><b id="pfill">0</b></div></div></div>
    <div class="gbox"><div class="board" id="board" tabindex="0" role="application" aria-label="Path board. Start on 1, then use the arrow keys or drag."></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn" id="reset">Clear</button></div>
    <div class="done" id="done"><p class="eyeb">Solved</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><a class="pbtn" href="../path-puzzle/">More paths</a><a class="pbtn" href="../daily-sudoku/">Daily sudoku</a></div></div>
  </div>
  <div class="gside">
    <div class="pcard"><p class="eyeb">How to play</p><ul class="small"><li>Start on 1. Drag through the squares, or use the arrow keys.</li><li>Go through every square once.</li><li>Pass the numbers in order and finish on the last one.</li><li>Drag back, or press Undo, to fix a step.</li></ul></div>
    <div class="pcard"><p class="eyeb">More games</p><span class="small"><a href="../path-puzzle/">Path puzzle levels</a> · <a href="../daily-sudoku/">Daily sudoku</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the daily path</h2>
  <p>A new board arrives every day at midnight where you are. Everyone in the world gets the same board on the same date, so you can compare times with friends. Boards grow through the week: 5 × 5 on Monday and Tuesday, 6 × 6 midweek and 7 × 7 at the weekend.</p>
  <p>Every board has exactly one answer. Your line, time and streak are kept in this browser only. Nothing is sent anywhere.</p>
</section>
</div>'''

# ---------------- daily sudoku ----------------
SUD = '''<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="pcard"><p class="eyeb">Today</p><span class="big" id="sno">#1</span><span class="small" id="sdate"></span></div>
    <div class="pcard"><p class="eyeb">Streak</p><span class="big" id="streak">0</span><span class="small">Best: easy <b id="b-easy">–</b> · medium <b id="b-medium">–</b> · hard <b id="b-hard">–</b></span></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Daily sudoku</b></p>
    <div class="ghead"><div><h1>Daily sudoku</h1><p class="sub">Three boards today, the same for everyone</p></div>
      <div class="meter"><div><small>TIME</small><b id="stime">0:00</b></div><div><small>LEFT</small><b id="sleft">0</b></div></div></div>
    <div class="levels" role="group" aria-label="Level"><button type="button" data-lv="easy" aria-pressed="true">Easy</button><button type="button" data-lv="medium" aria-pressed="false">Medium</button><button type="button" data-lv="hard" aria-pressed="false">Hard</button></div>
    <div class="gbox"><div class="sgrid9" id="sgrid" tabindex="0" role="grid" aria-label="Sudoku board. Pick a square, then type a number."></div></div>
    <div class="pad" id="pad" aria-label="Numbers"></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn" id="erase">Erase</button><button type="button" class="pbtn" id="notes" aria-pressed="false">Notes</button><button type="button" class="pbtn" id="hint">Hint</button><button type="button" class="pbtn" id="check" aria-pressed="false">Show mistakes</button></div>
    <div class="done" id="done"><p class="eyeb">Solved</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dnext" hidden>Next level</button><a class="pbtn" href="../daily-path/">Daily path</a></div></div>
  </div>
  <div class="gside">
    <div class="pcard"><p class="eyeb">How to play</p><ul class="small"><li>Fill every row, column and 3 × 3 box with 1 to 9.</li><li>Pick a square, then tap a number or type it.</li><li>Notes: small pencil marks. Press N to switch.</li><li>Numbers that clash turn pink.</li></ul></div>
    <div class="pcard"><p class="eyeb">More games</p><span class="small"><a href="../daily-path/">Daily path</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the daily sudoku</h2>
  <p>Three new boards arrive every day at midnight where you are: easy, medium and hard. Everyone gets the same boards on the same date, and each board has exactly one answer.</p>
  <p>Hints fill one square and are shown in your result. Your board, time and streak are kept in this browser only. Nothing is sent anywhere.</p>
</section>
</div>'''

LEVELS = PATH.replace('<p class="eyeb">Today</p><span class="big" id="pno">#1</span><span class="small" id="pdate"></span>',
  '<p class="eyeb">Level</p><span class="big" id="pno">Level 1</span><span class="small" id="pdate"></span><div class="levnav"><button type="button" class="pbtn" id="lprev">Previous</button><button type="button" class="pbtn" id="lnext">Next</button></div>')
LEVELS = LEVELS.replace('<p class="eyeb">Streak</p><span class="big"><span id="streak">0</span></span><span class="small">Best time <b id="sbest">–</b> · solved <b id="ssolved">0</b></span>',
  '<p class="eyeb">Levels solved</p><span class="big" id="streak">0</span><span class="small">Best on <span id="sbestn"></span>: <b id="sbest">–</b></span>')
LEVELS = LEVELS.replace('<b>Daily path</b></p>', '<b>Path puzzle</b></p>').replace('<h1>Daily path</h1><p class="sub"><span id="psize"></span> · same board for everyone today</p>', '<h1>Path puzzle</h1><p class="sub"><span id="psize"></span> · endless levels</p>')
LEVELS = LEVELS.replace('<a class="pbtn" href="../path-puzzle/">More paths</a><a class="pbtn" href="../daily-sudoku/">Daily sudoku</a>', '<button type="button" class="pbtn" id="dnext">Next level</button>')
LEVELS = LEVELS.replace('<span class="small"><a href="../path-puzzle/">Path puzzle levels</a> · ', '<span class="small"><a href="../daily-path/">Daily path</a> · ')
LEVELS = LEVELS.replace(LEVELS[LEVELS.index('<section class="gtext">'):LEVELS.index('</section>') + 10], """<section class="gtext">
  <h2>About the path puzzle</h2>
  <p>Draw one line through every square and pass the numbers in order. Levels 1 to 10 are 5 × 5, then 6 × 6 up to level 30, 7 × 7 up to level 60, and 8 × 8 after that. Every level has exactly one answer, and each level is the same for everyone.</p>
  <p>Your solved levels and best times stay in this browser. Nothing is sent anywhere.</p>
</section>""")
assert LEVELS.count('id="dnext"') == 1 and 'id="lprev"' in LEVELS

GAME_JS = '<script src="../assets/playgen.js"></script>\n<script src="../assets/playkit.js"></script>\n'
PAGES = {
    'play': ('Play: daily puzzles and games | Dilia', 'Free daily puzzles, the same for everyone: daily path and daily sudoku. No ads, no sign-up. Scores stay on your device.', HUB, GAME_JS + '<script src="../assets/playhub.js"></script>'),
    'daily-path': ('Daily Path Puzzle - Free, New Every Day | Dilia Play', 'Draw one line through every square and pass the numbers in order. A new puzzle every day, the same for everyone. Free, no ads, no sign-up.', PATH, GAME_JS + '<script src="../assets/daily-path.js"></script>'),
    'path-puzzle': ('Path Puzzle - Endless Levels, Free | Dilia Play', 'Draw one line through every square and pass the numbers in order. Endless levels from 5x5 to 8x8. Free, no ads, no sign-up.', LEVELS, GAME_JS + '<script src="../assets/daily-path.js"></script>', 'levels'),
    'daily-sudoku': ('Daily Sudoku - Easy, Medium and Hard, Free | Dilia Play', 'Three new sudoku boards every day: easy, medium and hard. Notes, hints and mistake check. Free, no ads, no sign-up.', SUD, GAME_JS + '<script src="../assets/daily-sudoku.js"></script>'),
}
for slug, (t, d, body, js, *mode) in PAGES.items():
    dd = ROOT / slug; dd.mkdir(exist_ok=True)
    (dd / 'index.html').write_text(shell(t, d, body, js, mode=(mode[0] if mode else 'daily' if slug == 'daily-path' else '')))
    print('wrote', slug + '/')
