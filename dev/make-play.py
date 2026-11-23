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
<link rel="stylesheet" href="../assets/play-light.css">
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
ART_MERGE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850" text-anchor="middle"><rect x="18" y="18" width="52" height="52" rx="12" fill="#e5007d"/><text x="44" y="53" font-size="24" fill="#fff">8</text><rect x="80" y="18" width="52" height="52" rx="12" fill="#7a5cff"/><text x="106" y="53" font-size="22" fill="#fff">64</text><rect x="18" y="80" width="52" height="52" rx="12" fill="#2c3352"/><text x="44" y="115" font-size="24" fill="#dfe4f2">2</text><rect x="80" y="80" width="52" height="52" rx="12" fill="#ffd400"/><text x="106" y="113" font-size="17" fill="#0b1220">2048</text></g></svg>'

ART_MINES = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850" font-size="26" text-anchor="middle">' + ''.join(f'<rect x="{18 + c * 39}" y="{18 + r * 39}" width="35" height="35" rx="8" fill="{"#111a2c" if (r, c) in ((0, 0), (0, 1), (1, 0), (1, 1), (2, 0)) else "#3a4466"}"/>' for r in range(3) for c in range(3)) + '<text x="74" y="46" fill="#3fc3ff">1</text><text x="74" y="85" fill="#34d399">2</text><text x="35" y="124" fill="#3fc3ff">1</text><circle cx="113" cy="113" r="9" fill="#0b1220" stroke="#ff2d8f" stroke-width="2"/></g></svg>'

ART_SOL = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850"><rect x="26" y="30" width="62" height="86" rx="9" fill="#fbfbff" transform="rotate(-10 57 73)"/><text x="34" y="58" font-size="20" fill="#0b1220" transform="rotate(-10 57 73)">K♠</text><rect x="62" y="26" width="62" height="86" rx="9" fill="#fbfbff" transform="rotate(9 93 69)"/><text x="70" y="54" font-size="20" fill="#e5007d" transform="rotate(9 93 69)">A♥</text></g></svg>'

ART_SNAKE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="as" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5cff"/><stop offset="1" stop-color="#3fc3ff"/></linearGradient></defs><g fill="#ffffff10">' + ''.join(f'<rect x="{18 + c * 30}" y="{18 + r * 30}" width="26" height="26" rx="7"/>' for r in range(4) for c in range(4)) + '</g><polyline points="31,121 31,91 61,91 61,61 91,61 91,31" fill="none" stroke="url(#as)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><circle cx="121" cy="31" r="12" fill="#ff2d8f"/><circle cx="98" cy="28" r="3" fill="#fff"/></svg>'
ART_TYPE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g fill="#ffffff14" stroke="#ffffff30">' + ''.join(f'<rect x="{14 + c * 31}" y="{32 + r * 34}" width="27" height="28" rx="7"/>' for r in range(3) for c in range(4)) + '</g><rect x="14" y="108" width="120" height="26" rx="8" fill="#ffffff14" stroke="#ffffff30"/><rect x="45" y="32" width="27" height="28" rx="7" fill="#7a5cff"/><rect x="76" y="66" width="27" height="28" rx="7" fill="#e5007d"/></svg>'
ART_RX = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="54" fill="#0f8a4f"/><circle cx="75" cy="75" r="54" fill="none" stroke="#ffffff40" stroke-width="3"/><path d="M82 30 52 82h20l-6 38 32-54H78z" fill="#fff"/></svg>'

ART_PYR = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g fill="#fbfbff">' + ''.join(f'<rect x="{75 - (r + 1) * 11 + k * 22}" y="{22 + r * 26}" width="20" height="26" rx="4"/>' for r in range(4) for k in range(r + 1)) + '</g><g font-family="Archivo,sans-serif" font-weight="850" font-size="12" text-anchor="middle" fill="#0b1220"><text x="75" y="40">13</text></g></svg>'
ART_PEAKS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g fill="#fbfbff">' + ''.join(f'<rect x="{x}" y="{y}" width="18" height="24" rx="4"/>' for x, y in [(30,28),(75,28),(120,28),(21,48),(39,48),(66,48),(84,48),(111,48),(129,48),(12,68),(30,68),(48,68),(57,68),(75,68),(93,68),(102,68),(120,68),(138,68)] if x < 132) + '</g><rect x="40" y="108" width="30" height="30" rx="5" fill="#ffffff44"/><rect x="80" y="108" width="30" height="30" rx="5" fill="#fbfbff"/></svg>'
ART_SPIDER = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850"><rect x="24" y="26" width="46" height="64" rx="7" fill="#fbfbff"/><text x="30" y="46" font-size="15" fill="#0b1220">K♠</text><rect x="52" y="44" width="46" height="64" rx="7" fill="#fbfbff"/><text x="58" y="64" font-size="15" fill="#0b1220">Q♠</text><rect x="80" y="62" width="46" height="64" rx="7" fill="#fbfbff"/><text x="86" y="82" font-size="15" fill="#e5007d">J♥</text></g></svg>'
ART_CHESS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g><rect x="20" y="20" width="110" height="110" rx="10" fill="#a97b52"/><g fill="#ead9b8"><rect x="20" y="20" width="27.5" height="27.5"/><rect x="75" y="20" width="27.5" height="27.5"/><rect x="47.5" y="47.5" width="27.5" height="27.5"/><rect x="102.5" y="47.5" width="27.5" height="27.5"/><rect x="20" y="75" width="27.5" height="27.5"/><rect x="75" y="75" width="27.5" height="27.5"/><rect x="47.5" y="102.5" width="27.5" height="27.5"/><rect x="102.5" y="102.5" width="27.5" height="27.5"/></g><text x="75" y="104" font-size="78" text-anchor="middle" fill="#232323" font-family="Segoe UI Symbol,Noto Sans Symbols 2,DejaVu Sans,serif">&#9822;&#xFE0E;</text></g></svg>'
ART_MJ = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850" text-anchor="middle"><rect x="22" y="36" width="52" height="68" rx="9" fill="#d9dcf0"/><rect x="26" y="30" width="52" height="68" rx="9" fill="#fbfbff"/><text x="52" y="72" font-size="30" fill="#1d4ed8">5</text><text x="52" y="90" font-size="14" fill="#1d4ed8">●</text><rect x="72" y="46" width="52" height="68" rx="9" fill="#d9dcf0"/><rect x="76" y="40" width="52" height="68" rx="9" fill="#fbfbff"/><text x="102" y="86" font-size="34" fill="#e5007d">◆</text></g></svg>'
# ---------------- hub ----------------
ART_WHEEL = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g transform="translate(75 80)">' + ''.join(f'<path d="M0 0L{54*__import__("math").cos(i*1.0472):.1f} {54*__import__("math").sin(i*1.0472):.1f}A54 54 0 0 1 {54*__import__("math").cos((i+1)*1.0472):.1f} {54*__import__("math").sin((i+1)*1.0472):.1f}Z" fill="{c}"/>' for i, c in enumerate(['#e5007d', '#7a5cff', '#0780b8', '#0f8a4f', '#c2410c', '#6d28d9'])) + '<circle r="9" fill="#0b1220" stroke="#fff" stroke-width="3"/></g><path d="M66 12h18l-9 20z" fill="#ffd400"/></svg>'
ART_TEAMS = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g fill="#fff"><circle cx="45" cy="52" r="14"/><circle cx="105" cy="52" r="14" fill="#c4b5ff"/><circle cx="75" cy="92" r="14" fill="#3fc3ff"/></g><g fill="#ffffff55"><path d="M22 112a23 23 0 0 1 46 0z"/><path d="M82 112a23 23 0 0 1 46 0z"/></g></svg>'
ART_DICE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="30" y="30" width="90" height="90" rx="18" fill="#fbfbff"/><g fill="#0b1220"><circle cx="58" cy="58" r="8"/><circle cx="92" cy="58" r="8"/><circle cx="58" cy="92" r="8"/><circle cx="92" cy="92" r="8"/></g><circle cx="75" cy="75" r="8" fill="#e5007d"/></svg>'

ART_BINGO = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="22" y="22" width="106" height="106" rx="14" fill="#fbfbff"/><g font-family="Archivo,sans-serif" font-weight="850" font-size="15" text-anchor="middle" fill="#0b1220"><text x="40" y="52">B</text><text x="63" y="52">I</text><text x="86" y="52">N</text><text x="109" y="52" fill="#e5007d">G</text><text x="40" y="82">7</text><text x="63" y="82">22</text><text x="86" y="82" fill="#7a5cff">★</text><text x="109" y="82">51</text><text x="40" y="112">14</text><text x="63" y="112">38</text><text x="86" y="112">60</text><text x="109" y="112">71</text></g></svg>'
ART_QUIZ = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="22" y="22" width="106" height="40" rx="12" fill="#ffffff22"/><rect x="22" y="72" width="50" height="26" rx="10" fill="#0f8a4f"/><rect x="78" y="72" width="50" height="26" rx="10" fill="#ffffff22"/><rect x="22" y="104" width="50" height="26" rx="10" fill="#ffffff22"/><rect x="78" y="104" width="50" height="26" rx="10" fill="#ffffff22"/><text x="75" y="50" font-family="Archivo,sans-serif" font-weight="850" font-size="26" text-anchor="middle" fill="#fff">?</text></svg>'
ART_SCORE = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><g font-family="Archivo,sans-serif" font-weight="850" text-anchor="middle"><rect x="20" y="26" width="110" height="46" rx="12" fill="#ffffff22"/><rect x="20" y="82" width="110" height="46" rx="12" fill="#ffd40033" stroke="#ffd400" stroke-width="2"/><text x="105" y="58" font-size="26" fill="#fff">12</text><text x="105" y="114" font-size="26" fill="#ffd400">18</text></g></svg>'
ART_SANTA = '<svg class="art" viewBox="0 0 150 150" aria-hidden="true"><rect x="28" y="62" width="94" height="66" rx="10" fill="#e5007d"/><rect x="68" y="62" width="14" height="66" fill="#ffd400"/><rect x="22" y="46" width="106" height="24" rx="8" fill="#7a5cff"/><rect x="68" y="46" width="14" height="24" fill="#ffd400"/><path d="M75 46c-14-22-34-14-26-4 5 6 26 4 26 4zM75 46c14-22 34-14 26-4-5 6-26 4-26 4z" fill="none" stroke="#ffd400" stroke-width="5" stroke-linejoin="round"/></svg>'
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
    <a class="daily" href="../daily-merge/" id="c-merge">{ART_MERGE}<span class="no" id="n-merge">Daily merge</span><b>Daily merge</b><p>Slide and join tiles. Same new tiles for everyone today.</p><span class="st" id="s-merge"></span></a>
    <a class="daily" href="../daily-minesweeper/" id="c-mines">{ART_MINES}<span class="no" id="n-mines">Daily minesweeper</span><b>Daily minesweeper</b><p>One 16 × 16 board, solvable by logic, the same for everyone.</p><span class="st" id="s-mines"></span></a>
    <a class="daily" href="../daily-solitaire/" id="c-sol">{ART_SOL}<span class="no" id="n-sol">Daily solitaire</span><b>Daily solitaire</b><p>One winnable Klondike deal, the same for everyone.</p><span class="st" id="s-sol"></span></a>
  </div>
  <div class="pstrip">
    <div class="gcard"><p class="eyeb">Streak</p><span class="big" id="hstreak">0</span><span class="small" id="hstreak2">Solve any daily to start a streak.</span></div>
    <div class="gcard"><p class="eyeb">This week</p><div class="wk" id="hweek"></div></div>
    <div class="gcard"><p class="eyeb">Your bests</p><span class="small" id="hbest">Solve a daily to see your best times.</span></div>
  </div>
</section>

<section class="wrap psec" aria-labelledby="h-any">
  <h2 id="h-any">Play any time</h2>
  <div class="dailies">
    <a class="daily" href="../path-puzzle/" id="c-levels">{ART_PATH}<span class="no" id="n-levels">Levels</span><b>Path puzzle</b><p>Endless levels, from 5 × 5 up to 8 × 8. Your next level is saved.</p><span class="st" id="s-levels"></span></a>
    <a class="daily" href="../merge/">{ART_MERGE}<span class="no">Free play</span><b>Merge</b><p>Reach 2048 on a 4 × 4, 5 × 5 or 6 × 6 board. Undo any time.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../minesweeper/">{ART_MINES}<span class="no">Free play</span><b>Minesweeper</b><p>Beginner to expert, custom sizes and a no-guessing mode.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../solitaire/">{ART_SOL}<span class="no">Free play</span><b>Solitaire</b><p>Klondike, draw 1 or 3, winnable deals and unlimited undo.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../freecell/">{ART_SOL}<span class="no">Free play</span><b>FreeCell</b><p>Classic deal numbers, every deal winnable. Drag or tap, undo any time.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../pyramid/">{ART_PYR}<span class="no">Free play</span><b>Pyramid</b><p>Take away pairs that add up to 13. Winnable deals.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../tripeaks/">{ART_PEAKS}<span class="no">Free play</span><b>TriPeaks</b><p>Clear three peaks, one rank up or down. Winnable deals.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../spider/">{ART_SPIDER}<span class="no">Free play</span><b>Spider</b><p>1, 2 or 4 suits. Build down, take off full runs.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../mahjong/">{ART_MJ}<span class="no">Free play</span><b>Mahjong</b><p>Classic turtle layout. Match free tiles. Every deal clearable.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../chess/">{ART_CHESS}<span class="no">Board</span><b>Chess</b><p>Full rules. Play the computer at four levels, or two players on one device.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../snake/">{ART_SNAKE}<span class="no">Arcade</span><b>Snake</b><p>Classic with deadly walls, or modern with wrap-around edges and bonus stars.</p><span class="st"><span class="chip" id="s-snake">Play</span></span></a>
    <a class="daily" href="../typing-test/">{ART_TYPE}<span class="no">Skill</span><b>Typing test</b><p>15, 30 or 60 seconds in English, Arabic, Spanish, Hindi or Portuguese.</p><span class="st"><span class="chip" id="s-typing">Play</span></span></a>
    <a class="daily" href="../reaction-time/">{ART_RX}<span class="no">Skill</span><b>Reaction time</b><p>Wait for green, then tap. Your speed in milliseconds.</p><span class="st"><span class="chip" id="s-rx">Play</span></span></a>
    <a class="daily" href="../wheel-spinner/">{ART_WHEEL}<span class="no">Party</span><b>Wheel spinner</b><p>Type the options, spin, get one fair winner. Share the wheel by link.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../team-maker/">{ART_TEAMS}<span class="no">Party</span><b>Team maker</b><p>Split a list of names into fair random teams. Or pick a name at random.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../dice-roller/">{ART_DICE}<span class="no">Party</span><b>Dice, coin, number</b><p>Roll dice with any sides, flip a coin, draw random numbers.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../bingo-card-generator/">{ART_BINGO}<span class="no">Party</span><b>Bingo</b><p>Print bingo cards, classic or with your own words, and call the numbers.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../quiz-maker/">{ART_QUIZ}<span class="no">Party</span><b>Quiz maker</b><p>Write a multiple-choice quiz and play it on one screen. Save it as a file.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../score-keeper/">{ART_SCORE}<span class="no">Party</span><b>Scoreboard</b><p>Keep score for up to 12 teams. Tap to add points.</p><span class="st"><span class="chip">Play</span></span></a>
    <a class="daily" href="../secret-santa-generator/">{ART_SANTA}<span class="no">Party</span><b>Secret Santa</b><p>Draw names on one device. Everyone sees only their own person.</p><span class="st"><span class="chip">Play</span></span></a>
  </div>
</section>

<section class="wrap psec" aria-labelledby="h-soon">
  <h2 id="h-soon">Coming next</h2>
  <div class="pgrid">
    <div class="gcard"><span class="stag2">Soon</span><b>Same-deal classics</b><ul><li>Daily word puzzle</li><li>Daily chess puzzle</li></ul></div>
    <div class="gcard"><span class="stag2">Soon</span><b>Puzzles</b><ul><li>Nonogram</li><li>Nonogram, sliding puzzles</li><li>Word search</li></ul></div>
    <div class="gcard"><span class="stag2">Soon</span><b>Cards and board</b><ul><li>Checkers, reversi</li><li>Ludo, connect four</li></ul></div>
    <div class="gcard"><span class="stag2">Soon</span><b>Arcade</b><ul><li>Brick breaker, pong</li><li>One-button games</li></ul></div>
    <div class="gcard"><span class="stag2">Soon</span><b>Brain and skill</b><ul><li>Memory games</li><li>Aim trainer</li><li>Speed reading</li></ul></div>
  </div>
</section>'''

# ---------------- daily path ----------------
STATS_PATH = '''<div class="gcard"><p class="eyeb">Today</p><span class="big" id="pno">#1</span><span class="small" id="pdate"></span></div>
    <div class="gcard"><p class="eyeb">Streak</p><span class="big"><span id="streak">0</span></span><span class="small">Best time <b id="sbest">–</b> · solved <b id="ssolved">0</b></span></div>'''
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
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Start on 1. Drag through the squares, or use the arrow keys.</li><li>Go through every square once.</li><li>Pass the numbers in order and finish on the last one.</li><li>Drag back, or press Undo, to fix a step.</li></ul></div>
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../path-puzzle/">Path puzzle levels</a> · <a href="../daily-sudoku/">Daily sudoku</a> · <a href="../play/">All of Play</a></span></div>
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
    <div class="gcard"><p class="eyeb">Today</p><span class="big" id="sno">#1</span><span class="small" id="sdate"></span></div>
    <div class="gcard"><p class="eyeb">Streak</p><span class="big" id="streak">0</span><span class="small">Best: easy <b id="b-easy">–</b> · medium <b id="b-medium">–</b> · hard <b id="b-hard">–</b></span></div>
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
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Fill every row, column and 3 × 3 box with 1 to 9.</li><li>Pick a square, then tap a number or type it.</li><li>Notes: small pencil marks. Press N to switch.</li><li>Numbers that clash turn pink.</li></ul></div>
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../daily-path/">Daily path</a> · <a href="../play/">All of Play</a></span></div>
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

# ---------------- merge (free play + daily) ----------------
def merge_body(daily):
    side1 = '<div class="gcard"><p class="eyeb">Today</p><span class="big" id="mno">#1</span><span class="small" id="mdate"></span></div>' if daily else ''
    sizes = '' if daily else '<div class="msize" role="group" aria-label="Board size"><button type="button" data-n="4" aria-pressed="true">4 × 4</button><button type="button" data-n="5" aria-pressed="false">5 × 5</button><button type="button" data-n="6" aria-pressed="false">6 × 6</button></div>'
    best = '<div class="gcard"><p class="eyeb">' + ('Best daily score' if daily else 'Best score on this size') + '</p><span class="big" id="mbest">–</span></div>'
    title = 'Daily merge' if daily else 'Merge'
    sub = 'Same tiles for everyone today · one game a day' if daily else 'Slide and join tiles. Reach 2048, then go higher.'
    btns = ('<a class="pbtn" href="../merge/">Free play</a>' if daily else '<button type="button" class="pbtn" id="newgame">New game</button>')
    dbtn = ('<a class="pbtn" href="../merge/">Free play</a><a class="pbtn" href="../daily-path/">Daily path</a>' if daily else '<button type="button" class="pbtn" id="dagain">Play again</button><a class="pbtn" href="../daily-merge/">Daily merge</a>')
    howto = ('<li>Swipe, or use the arrow keys (or W A S D).</li><li>Two equal tiles that touch join into one: 2 + 2 = 4.</li><li>A new tile appears after every move.</li><li>Reach 2048. The game ends when no move is left.</li>'
             + ('<li>Everyone gets the same new tiles in the same order today. No undo, one game a day.</li>' if daily else '<li>Undo takes back a move.</li>'))
    about = ('<p>One new game every day at midnight where you are. Everyone gets the same new tiles in the same order, so the best players really are the best. Your score is final when no move is left.</p>' if daily else
             '<p>Slide the tiles in four directions. Equal tiles join and add up, and the aim is to reach the 2048 tile. Choose a 4 × 4, 5 × 5 or 6 × 6 board; bigger boards give more room and longer games.</p>')
    return f"""<div class="wrap">
<div class="gwrap">
  <div class="gside">
    {side1}
    {best}
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div>
      <div class="meter"><div id="mscorebox"><small>SCORE</small><b id="mscore">0</b></div><div><small>MOVES</small><b id="mmoves">0</b></div></div></div>
    {sizes}
    <div class="gbox" id="mbox"><div class="mboard" id="mboard" tabindex="0" role="application" aria-label="Board"><div id="mcells"></div><div id="mtiles"></div></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button>{btns}</div>
    <div class="done" id="done"><p class="eyeb">Game over · score</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button>{dbtn}</div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{howto}</ul></div>
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../{'merge' if daily else 'daily-merge'}/">{'Merge free play' if daily else 'Daily merge'}</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title.lower()}</h2>
  {about}
  <p>Your game and best score stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
PAGES['merge'] = ('Merge - Free Number Tile Puzzle, Reach 2048 | Dilia Play', 'Slide and join number tiles to reach 2048 and beyond. 4x4, 5x5 and 6x6 boards, undo. Free, no ads, no sign-up.', merge_body(False), GAME_JS + '<script src="../assets/merge-game.js"></script>', 'free')
PAGES['daily-merge'] = ('Daily Merge - Same Tiles for Everyone | Dilia Play', 'One number-merge game a day with the same tiles for everyone. Reach 2048 and compare scores. Free, no ads, no sign-up.', merge_body(True), GAME_JS + '<script src="../assets/merge-game.js"></script>', 'daily')

# ---------------- minesweeper (free + daily) ----------------
def mines_body(daily):
    title = 'Daily minesweeper' if daily else 'Minesweeper'
    sub = '16 × 16 · 40 mines · same board for everyone today' if daily else '<span id="msize"></span>'
    tools = ('' if daily else '<div class="mtools"><div class="mlevel" role="group" aria-label="Level"><button type="button" data-lv="beginner" aria-pressed="true">Beginner</button><button type="button" data-lv="intermediate" aria-pressed="false">Intermediate</button><button type="button" data-lv="expert" aria-pressed="false">Expert</button><button type="button" data-lv="custom" aria-pressed="false">Custom</button></div><button type="button" class="pbtn" id="noguess" aria-pressed="true">No guessing</button></div>'
             '<div class="mcustom" id="custom" hidden><label>WIDTH<input id="cw" type="number" min="5" max="30" inputmode="numeric"></label><label>HEIGHT<input id="ch" type="number" min="5" max="30" inputmode="numeric"></label><label>MINES<input id="cm" type="number" min="1" max="270" inputmode="numeric"></label><button type="button" class="pbtn" id="capply">Start</button></div>')
    meter = '<div><small>MINES</small><b id="mleft">0</b></div><div><small>TIME</small><b id="mtime">0:00</b></div>' + ('<div><small>TRY</small><b id="mtries">1</b></div>' if daily else '')
    btns = '<button type="button" class="pbtn" id="flagmode" aria-pressed="false">Flag mode</button>' + ('' if daily else '<button type="button" class="pbtn" id="newgame">New game</button>')
    dbtn = ('<a class="pbtn" href="../minesweeper/">Free play</a><a class="pbtn" href="../play/">All of Play</a>' if daily else '<button type="button" class="pbtn" id="dagain">Play again</button><a class="pbtn" href="../daily-minesweeper/">Daily board</a>')
    side1 = ('<div class="gcard"><p class="eyeb">Today</p><span class="big" id="mno">#1</span><span class="small" id="mdate"></span></div><div class="gcard"><p class="eyeb">Streak</p><span class="big" id="streak">0</span><span class="small">Best daily time <b id="sbest">–</b></span></div>'
             if daily else '<div class="gcard"><p class="eyeb">Best time</p><span class="big" id="sbest">–</span><span class="small" id="sbestl"></span></div>')
    howto = ('<li>Tap a square to open it. A number says how many mines touch it.</li><li>Long-press, right-click or use Flag mode to mark a mine.</li><li>Tap a number when all its mines are flagged to open the rest around it.</li><li>Keyboard: arrows, Enter to open, F to flag.</li>'
             + ('<li>The board opens at the same square for everyone. If you hit a mine, the same board starts again and your tries are counted.</li>' if daily else '<li>Your first tap is always safe. With No guessing on, every board can be solved by logic alone.</li>'))
    about = ('<p>One new board every day at midnight where you are: 16 × 16 with 40 mines, the same for everyone, opened at the same square. Every daily board can be solved by logic, with no guessing.</p>' if daily else
             '<p>Classic minesweeper with three levels (9 × 9, 16 × 16 and 30 × 16) and your own custom size. On a phone the expert board turns tall so the squares stay big enough to tap. No guessing mode makes boards that can always be solved by logic.</p>')
    return f"""<div class="wrap">
<div class="gwrap one">
  <div class="gside">
    {side1}
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{howto}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div><div class="meter">{meter}</div></div>
    {tools}
    <div class="gbox"><div class="mwrap"><div class="mines" id="mines" tabindex="0" role="application" aria-label="Minefield. Arrow keys move, Enter opens, F flags."></div></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns">{btns}</div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Cleared</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button>{dbtn}</div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../{'minesweeper' if daily else 'daily-minesweeper'}/">{'Minesweeper free play' if daily else 'Daily minesweeper'}</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title.lower()}</h2>
  {about}
  <p>Your board and times stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
PAGES['minesweeper'] = ('Minesweeper - Free, No Guessing Mode | Dilia Play', 'Classic minesweeper: beginner, intermediate, expert and custom boards. No guessing mode, flags by long-press. Free, no ads, no sign-up.', mines_body(False), GAME_JS + '<script src="../assets/mines-game.js"></script>', 'free')
PAGES['daily-minesweeper'] = ('Daily Minesweeper - Same Board for Everyone | Dilia Play', 'One minesweeper board a day, the same for everyone and solvable by logic. Race the clock and share your time. Free, no ads, no sign-up.', mines_body(True), GAME_JS + '<script src="../assets/mines-game.js"></script>', 'daily')

# ---------------- solitaire (free + daily) ----------------
def sol_body(daily):
    title = 'Daily solitaire' if daily else 'Solitaire'
    sub = 'Klondike, draw 1 · a winnable deal, the same for everyone today' if daily else 'Klondike · drag, or tap a card to move it'
    tools = '' if daily else '<div class="mtools"><div class="sdraw" role="group" aria-label="Draw"><button type="button" data-d="1" aria-pressed="true">Draw 1</button><button type="button" data-d="3" aria-pressed="false">Draw 3</button></div><button type="button" class="pbtn" id="winnable" aria-pressed="true">Winnable deals</button></div>'
    btns = '<button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn go" id="finish" hidden>Finish</button>' + ('' if daily else '<button type="button" class="pbtn" id="newgame">New deal</button>')
    dbtn = ('<a class="pbtn" href="../solitaire/">Free play</a><a class="pbtn" href="../play/">All of Play</a>' if daily else '<button type="button" class="pbtn" id="dagain">New deal</button><a class="pbtn" href="../daily-solitaire/">Daily deal</a>')
    side1 = ('<div class="gcard"><p class="eyeb">Today</p><span class="big" id="sno">#1</span><span class="small" id="sdate"></span></div><div class="gcard"><p class="eyeb">Streak</p><span class="big" id="streak">0</span><span class="small">Best daily time <b id="sbest">–</b></span></div>'
             if daily else '<div class="gcard"><p class="eyeb">Best time · draw <span id="sdraw">1</span></p><span class="big" id="sbest">–</span><span class="small">Games won: <b id="swins">0</b></span></div>')
    howto = ('<li>Build four home piles from Ace to King, one per suit.</li><li>In the columns, put a card on one rank higher of the other colour. Only a King goes on an empty column.</li><li>Tap the deck to turn cards. Tap a card to send it to the best place, or drag it.</li><li>Keys: D turns a card, U or Ctrl+Z undoes.</li>'
             + ('<li>Today\'s deal is the same for everyone and can be won.</li>' if daily else '<li>Winnable deals (draw 1): every deal can be won.</li>'))
    about = ('<p>One new Klondike deal every day at midnight where you are, the same for everyone. Every daily deal has been checked by a solver and can be won. Draw one card at a time, with as many passes through the deck as you like.</p>' if daily else
             '<p>Classic Klondike solitaire with draw 1 or draw 3 and unlimited passes through the deck. With Winnable deals on, every draw-1 deal has been checked by a solver before you see it. Undo as much as you like; when all cards are face up, Finish sends them home.</p>')
    return f"""<div class="wrap">
<div class="gwrap one">
  <div class="gside">
    {side1}
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{howto}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div><div class="meter"><div><small>TIME</small><b id="stime">0:00</b></div><div><small>MOVES</small><b id="smoves">0</b></div></div></div>
    {tools}
    <div class="gbox"><div class="ksol" id="sol" role="application" aria-label="Solitaire table"></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns">{btns}</div>
    <div class="done" id="done"><p class="eyeb">Won</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button>{dbtn}</div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../{'solitaire' if daily else 'daily-solitaire'}/">{'Solitaire free play' if daily else 'Daily solitaire'}</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title.lower()}</h2>
  {about}
  <p>Your game and times stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
PAGES['solitaire'] = ('Solitaire - Free Klondike, Winnable Deals | Dilia Play', 'Free Klondike solitaire: draw 1 or draw 3, winnable deals, unlimited undo, tap or drag. No ads, no sign-up.', sol_body(False), GAME_JS + '<script src="../assets/solitaire-game.js"></script>', 'free')
PAGES['daily-solitaire'] = ('Daily Solitaire - Same Winnable Deal for Everyone | Dilia Play', 'One Klondike solitaire deal a day, the same for everyone and checked to be winnable. Free, no ads, no sign-up.', sol_body(True), GAME_JS + '<script src="../assets/solitaire-game.js"></script>', 'daily')
# ---------------- card games: FreeCell, Pyramid, TriPeaks (free play) ----------------
CARD_LINKS = [('solitaire', 'Solitaire'), ('freecell', 'FreeCell'), ('pyramid', 'Pyramid'), ('tripeaks', 'TriPeaks'), ('spider', 'Spider'), ('mahjong', 'Mahjong'), ('daily-solitaire', 'Daily solitaire')]
def card_body(slug, title, sub, boardid, howto, about, extra_side='', winnable=True, finish=False, tools_html='', extra_btns=''):
    more = ' · '.join(f'<a href="../{a}/">{b}</a>' for a, b in CARD_LINKS if a != slug)
    tools = '<div class="mtools"><button type="button" class="pbtn" id="winnable" aria-pressed="true">Winnable deals</button></div>' if winnable else tools_html
    fin = '<button type="button" class="pbtn go" id="finish" hidden>Finish</button>' if finish else ''
    how = ''.join(f'<li>{h}</li>' for h in howto)
    return f"""<div class="wrap">
<div class="gwrap one">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Best time</p><span class="big" id="sbest">–</span><span class="small">Games won: <b id="swins">0</b></span></div>
    {extra_side}
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small">{how}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div><div class="meter"><div><small>TIME</small><b id="stime">0:00</b></div><div><small>MOVES</small><b id="smoves">0</b></div></div></div>
    {tools}
    <div class="gbox"><div class="ksol" id="{boardid}" role="application" aria-label="{title} table"></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button>{extra_btns}{fin}<button type="button" class="pbtn" id="newgame">New deal</button></div>
    <div class="done" id="done"><p class="eyeb">Cleared</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">New deal</button><a class="pbtn" href="../play/">All of Play</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More card games</p><span class="small">{more} · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About {title}</h2>
  {about}
  <p>Your game and times stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""
CARD_JS = GAME_JS + '<script src="../assets/cardgames.js"></script><script src="../assets/cardkit.js"></script>'
PAGES['freecell'] = ('FreeCell - Free Online, Every Deal Winnable | Dilia Play', 'Free FreeCell with the classic deal numbers. Every deal can be won. Drag or tap, supermoves, undo and a Finish button. No ads, no sign-up.',
    card_body('freecell', 'FreeCell', 'Eight columns, four free cells · drag, or tap a card to move it', 'fc',
      ['Move all cards home, Ace to King, one pile per suit.', 'In the columns, put a card on one rank higher of the other colour.', 'Four free cells hold one card each. Tap a card to send it to the best place.', 'Move several cards at once when you have free cells or empty columns. Keys: U or Ctrl+Z undoes.'],
      '<p>FreeCell uses the classic deal numbers 1 to 32000. Every one of them can be won, and the single deal that cannot (number 11982) is never dealt. The deal number is shown so you can compare with friends. You can move a run of cards together as long as you have enough free cells and empty columns; undo is unlimited, and Finish sends the cards home when the game is won.</p>',
      extra_side='<div class="gcard"><p class="eyeb">Deal</p><span class="big" id="fcno">#1</span></div>', winnable=False, finish=True), CARD_JS + '<script src="../assets/freecell-game.js"></script>', 'free')
PAGES['pyramid'] = ('Pyramid Solitaire - Free, Winnable Deals | Dilia Play', 'Free Pyramid solitaire: remove pairs that add up to 13. Winnable deals, unlimited passes through the deck and undo. No ads, no sign-up.',
    card_body('pyramid', 'Pyramid', 'Take away pairs that add up to 13 · tap two cards', 'pyr',
      ['Tap two free cards that add up to 13 to take them away. A free King goes on its own.', 'Ace is 1, Jack 11, Queen 12, King 13.', 'A card is free when no card lies on top of it. Use the card on the waste pile as a partner too.', 'Tap the deck for the next card, as many times round as you like. Clear all 28 pyramid cards to win.'],
      '<p>Clear the pyramid by pairing free cards that add up to 13, or by removing Kings alone. The deck turns one card at a time and you can go through it as many times as you like. With Winnable deals on, every deal has been checked by a solver before you see it. Undo as much as you like.</p>'), CARD_JS + '<script src="../assets/pyramid-game.js"></script>', 'free')
PAGES['tripeaks'] = ('TriPeaks Solitaire - Free, Winnable Deals | Dilia Play', 'Free TriPeaks solitaire: clear three peaks by playing cards one rank higher or lower. Winnable deals and undo. No ads, no sign-up.',
    card_body('tripeaks', 'TriPeaks', 'Clear three peaks · tap a card one rank above or below', 'tpk',
      ['Tap a face-up card that is one rank higher or lower than the open card.', 'King and Ace count as neighbours.', 'Tap the deck when you are stuck. There is no second pass.', 'Clear all 28 cards in the peaks to win. Keys: D draws, U undoes.'],
      '<p>Clear all 28 cards from the three peaks. Play any uncovered card that is one rank above or below the open card; Aces and Kings wrap around. When there is no play, draw from the deck. The deck is used once. With Winnable deals on, every deal has been checked by a solver, so a clever route always exists.</p>',
      extra_side='<div class="gcard"><p class="eyeb">Left</p><span class="small">Peak cards: <b id="tpleft">28</b> · Deck: <b id="tpstock">23</b></span></div>'), CARD_JS + '<script src="../assets/tripeaks-game.js"></script>', 'free')
PAGES['spider'] = ('Spider Solitaire - 1, 2 or 4 Suits, Free | Dilia Play', 'Free Spider solitaire with 1, 2 or 4 suits. Drag or tap, deal rows, unlimited undo. No ads, no sign-up.',
    card_body('spider', 'Spider', 'Two packs, ten columns · drag, or tap a card to move it', 'spd',
      ['Build each column down in rank, King to Ace, on any suit.', 'Only a run of one suit moves together.', 'A full King-to-Ace run of one suit leaves the table. Take off all 8 to win.', 'Tap the deck to deal one card on each column (no empty columns allowed). Keys: D deals, U undoes.'],
      '<p>Spider uses two packs of cards. Choose 1 suit for a relaxed game, 2 suits for a fair challenge, or 4 suits for the full test. Deals are random, and with 4 suits many of them cannot be won, so use undo freely. One-suit deals are almost always winnable.</p>',
      extra_side='<div class="gcard"><p class="eyeb">Progress</p><span class="small">Runs taken off: <b id="spdone">0</b> of 8 · Deals left: <b id="spleft">5</b></span></div>', winnable=False,
      tools_html='<div class="mtools"><div class="sdraw" role="group" aria-label="Suits"><button type="button" data-d="1" aria-pressed="true">1 suit</button><button type="button" data-d="2" aria-pressed="false">2 suits</button><button type="button" data-d="4" aria-pressed="false">4 suits</button></div></div>'), CARD_JS + '<script src="../assets/spider-game.js"></script>', 'free')
PAGES['mahjong'] = ('Mahjong Solitaire - Free Online, Every Deal Clearable | Dilia Play', 'Free mahjong solitaire with the classic turtle layout. Every deal can be cleared. Hints, shuffle and undo. No ads, no sign-up.',
    card_body('mahjong', 'Mahjong', 'Turtle layout · tap two free tiles that match', 'mjb',
      ['Tap two free tiles with the same face to take them away.', 'A tile is free when nothing lies on it and its left or right side is open.', 'Any flower matches any flower, and any season matches any season.', 'Stuck? Shuffle mixes the tiles that are left. Hint shows an open pair.'],
      '<p>Clear all 144 tiles of the classic turtle layout. Every deal is built backwards from an empty board, so a way to clear it always exists. Tiles are shown with numbers and symbols: ● dots, ▮ bamboo, ❖ characters, E S W N winds, ◆ ◇ dragons, ✿ flowers and ❄ seasons. The tiles are small on a phone held upright; a tablet, a computer or a phone turned sideways is more comfortable.</p>',
      extra_side='<div class="gcard"><p class="eyeb">Left</p><span class="small">Tiles: <b id="mjleft">144</b></span></div>', winnable=False,
      extra_btns='<button type="button" class="pbtn" id="hint">Hint</button><button type="button" class="pbtn go" id="shuffle" hidden>Shuffle</button>'), CARD_JS + '<script src="../assets/mahjong-game.js"></script>', 'free')
# ---------------- arcade and skill: snake, reaction time, typing test (free play; best scores stay in the browser) ----------------

def snake_body():
    return """<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Best score</p><span class="big" id="kbest">0</span><span class="small" id="kmodeline"></span></div>
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Arrow keys or W A S D to steer. On a phone: swipe, or use the buttons.</li><li>Eat the pink apples to grow. Don't touch your own tail.</li><li>Classic: the walls are deadly. Modern: the edges wrap round, and a gold star (+5) shows up after every 5th apple.</li><li>Space or P pauses.</li></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Snake</b></p>
    <div class="ghead"><div><h1>Snake</h1><p class="sub">Classic and modern modes</p></div>
      <div class="meter"><div><small>SCORE</small><b id="kscore">0</b></div><div><small>LENGTH</small><b id="klen">3</b></div></div></div>
    <div class="mtools"><div class="mlevel" role="group" aria-label="Mode"><button type="button" data-m="classic" aria-pressed="true">Classic</button><button type="button" data-m="modern" aria-pressed="false">Modern</button></div></div>
    <div class="snkbox" id="snkbox"><canvas id="snk" role="img" aria-label="Snake board. Use the arrow keys or swipe to steer."></canvas><div class="snkov" id="snkov"></div></div>
    <div class="dpad" aria-label="Steer"><button type="button" class="u" data-d="0" aria-label="Up">▲</button><button type="button" class="l" data-d="3" aria-label="Left">◀</button><button type="button" class="d" data-d="2" aria-label="Down">▼</button><button type="button" class="r" data-d="1" aria-label="Right">▶</button></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="pause" disabled>Pause</button><button type="button" class="pbtn" id="newgame">New game</button></div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Game over · score</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">Play again</button></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../typing-test/">Typing test</a> · <a href="../reaction-time/">Reaction time</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About snake</h2>
  <p>Steer the snake to the apples. Each apple makes it longer and the game a little faster. In Classic mode the walls end the game; in Modern mode the edges wrap round, so you can leave one side and come back on the other, and a gold star worth 5 points appears after every fifth apple for a few seconds.</p>
  <p>Fill the whole board and you win. Your best score for each mode stays in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""

def reaction_body():
    return """<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Fastest ever</p><span class="big" id="rxbest">–</span><span class="small">Average <b id="rxavg">–</b> · <b id="rxcount">0</b> tries</span></div>
    <div class="gcard"><p class="eyeb">How it works</p><ul class="small"><li>Tap the box to start. It turns red: wait.</li><li>When it turns green, tap as fast as you can.</li><li>Tap too soon and the try does not count.</li><li>Space or Enter works too. 5 tries make a round.</li></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Reaction time</b></p>
    <div class="ghead"><div><h1>Reaction time</h1><p class="sub">How fast can you tap? In milliseconds.</p></div>
      <div class="meter"><div><small>TRY</small><b id="rxtry">1/5</b></div><div><small>LAST</small><b id="rxlast">–</b></div></div></div>
    <div class="rxpad" id="rxpad" role="button" tabindex="0" data-s="idle"><b id="rxbig">Tap to start</b><span id="rxsub"></span></div>
    <div class="rxdots" id="rxdots" aria-hidden="true"></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="done" id="done"><p class="eyeb">Round done · average</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button></div></div>
    <div class="gcard" style="margin-top:16px"><p class="eyeb">History</p><svg class="rxchart" id="rxchart" viewBox="0 0 300 110" preserveAspectRatio="none" role="img" aria-label="Your last reaction times"></svg><span class="small" id="rxnote"></span></div>
    <div class="gbtns"><button type="button" class="pbtn" id="rxclear">Clear history</button></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../typing-test/">Typing test</a> · <a href="../snake/">Snake</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the reaction time test</h2>
  <p>Wait for the box to turn green, then tap. The time counts from the moment the green is drawn to your tap. It includes the delay of your screen, device and browser, so use it to compare yourself on the same device, not against other people's numbers on other devices.</p>
  <p>Typical results are in the range of 200 to 300 milliseconds. This is a fun test, not a medical one. Your times stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""

def typing_body():
    return """<div class="wrap">
<div class="gwrap one">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Best for this setting</p><span class="big" id="tbest">–</span><span class="small" id="tbest2"></span></div>
    <div class="gcard"><p class="eyeb">How it works</p><ul class="small"><li>Click the box and type the words. Press the space bar after each word.</li><li>The timer starts at your first key. Esc starts again.</li><li>Speed counts only words typed exactly right (5 letters = 1 word). Accuracy counts every letter.</li><li>Arabic and Hindi need that language on your keyboard.</li></ul></div>
    <div class="gcard"><p class="eyeb">Recent tests</p><ul class="thist" id="thist"></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Typing test</b></p>
    <div class="ghead"><div><h1>Typing test</h1><p class="sub">Speed and accuracy · 15, 30 or 60 seconds</p></div>
      <div class="meter"><div><small>TIME</small><b id="ttime">30</b></div><div><small>WPM</small><b id="twpm">0</b></div></div></div>
    <div class="mtools"><div class="mlevel tlang" role="group" aria-label="Language"><button type="button" data-l="en" aria-pressed="true">English</button><button type="button" data-l="ar" aria-pressed="false" lang="ar">العربية</button><button type="button" data-l="es" aria-pressed="false" lang="es">Español</button><button type="button" data-l="hi" aria-pressed="false" lang="hi">हिन्दी</button><button type="button" data-l="pt" aria-pressed="false" lang="pt">Português</button></div>
      <div class="msize" role="group" aria-label="Time" style="margin:0"><button type="button" data-d="15" aria-pressed="false">15 s</button><button type="button" data-d="30" aria-pressed="true">30 s</button><button type="button" data-d="60" aria-pressed="false">60 s</button></div></div>
    <div class="gbox"><div class="tybox" id="tybox"><div class="tywords" id="tywords" aria-label="Words to type"></div>
      <input class="tin" id="tin" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Type the words here"></div></div>
    <p class="msg" id="thint" style="color:var(--pmut)"></p><p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="restart">Start again</button></div>
    <div class="done" id="done"><p class="eyeb">Time's up</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">Try again</button></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../reaction-time/">Reaction time</a> · <a href="../snake/">Snake</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the typing test</h2>
  <p>Choose English, Arabic, Spanish, Hindi or Portuguese, and 15, 30 or 60 seconds. The words are common everyday words, picked at random each time. Your speed is shown in words per minute (WPM), where five letters count as one word, and only words typed exactly right count. Accuracy is the share of letters you typed correctly.</p>
  <p>Your best scores and last ten tests stay in this browser. Nothing is sent anywhere.</p>
</section>
</div>"""

def chess_body():
    return """<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">Your record</p><span class="big" id="clvname">Casual</span><span class="small" id="crec">0 won · 0 drawn · 0 lost</span></div>
    <div class="gcard"><p class="eyeb">How to play</p><ul class="small"><li>Choose Play White or Play Black, then press Start game (as White you can also just move).</li><li>Tap a piece, then a green mark. Or drag it.</li><li>All rules are in: castling, en passant, promotion, check, stalemate and draws.</li><li>Undo takes back your last move (and the reply). Keys: U undo, F flip board.</li><li>Your game is saved in this browser.</li></ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>Chess</b></p>
    <div class="ghead"><div><h1>Chess</h1><p class="sub">Play the computer or a friend on one device</p></div><div class="meter"><div><small>MOVE</small><b id="cmoves">0</b></div></div></div>
    <div class="cchips"><div class="mlevel" role="group" aria-label="Mode"><button type="button" data-cm="cpu" aria-pressed="true">Vs computer</button><button type="button" data-cm="two" aria-pressed="false">Two players</button></div>
      <div class="mlevel" id="clevels" role="group" aria-label="Level"><button type="button" data-cl="1" aria-pressed="false">Beginner</button><button type="button" data-cl="2" aria-pressed="true">Casual</button><button type="button" data-cl="3" aria-pressed="false">Club</button><button type="button" data-cl="4" aria-pressed="false">Expert</button></div>
      <div class="mlevel" id="cside" role="group" aria-label="Your colour"><button type="button" data-cs="0" aria-pressed="true">Play White</button><button type="button" data-cs="1" aria-pressed="false">Play Black</button></div></div>
    <div class="chbox"><div class="chb" id="chb" role="application" aria-label="Chess board"></div><div class="cpromo" id="promo" hidden></div></div>
    <p class="cturn" id="cturn" aria-live="polite">White to move</p>
    <div class="gbtns"><button type="button" class="pbtn go" id="cstart" hidden>Start game</button></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="undo">Undo</button><button type="button" class="pbtn" id="flip">Flip board</button><button type="button" class="pbtn" id="newgame">New game</button></div>
    <div class="done" id="done"><p class="eyeb" id="deyebrow">Game over</p><div class="t" id="dtime"></div><p id="dline"></p>
      <div class="gbtns"><button type="button" class="pbtn go" id="share">Share result</button><button type="button" class="pbtn" id="saveimg">Save image</button><button type="button" class="pbtn" id="dagain">New game</button><a class="pbtn" href="../play/">All of Play</a></div></div>
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">Moves</p><ol class="clist" id="clist" style="list-style:none"></ol></div>
    <div class="gcard"><p class="eyeb">More games</p><span class="small"><a href="../solitaire/">Solitaire</a> · <a href="../mahjong/">Mahjong</a> · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About Chess</h2>
  <p>Play the full game of chess against a computer opponent at four levels, or pass the device between two players. The computer is an engine written for Dilia that runs inside your browser, so nothing is sent anywhere. Beginner and Casual make human-like mistakes. Club plays solid, tactical chess. Expert searches deeper and uses the full thinking time, and on a slow phone it will play weaker than on a computer.</p>
  <p>Draws are applied automatically: stalemate, threefold repetition, the fifty-move rule and positions where neither side can mate. Undo is unlimited. Your game stays in this browser.</p>
</section>
</div>"""
PAGES['chess'] = ('Chess - Play the Computer or a Friend, Free | Dilia Play', 'Free chess with full rules. Play the computer at four levels, or two players on one device. Undo, flip board, saved game. No ads, no sign-up.', chess_body(), GAME_JS + '<script src="../assets/chess-core.js"></script><script src="../assets/chess-game.js"></script>', 'free')
PAGES['snake'] = ('Snake - Free Classic and Modern Snake Game | Dilia Play', 'Play Snake free: classic mode with deadly walls, or modern mode with wrap-around edges and bonus stars. Keyboard or swipe. No ads, no sign-up.', snake_body(), GAME_JS + '<script src="../assets/snake-game.js"></script>', 'free')
PAGES['reaction-time'] = ('Reaction Time Test - How Fast Are You? Free | Dilia Play', 'Test your reaction time in milliseconds: wait for green, then tap. Five tries per round and a history chart. Free, no ads, no sign-up.', reaction_body(), GAME_JS + '<script src="../assets/reaction-game.js"></script>', 'free')
PAGES['typing-test'] = ('Typing Test - Speed and Accuracy in 5 Languages, Free | Dilia Play', 'Free typing test with 15, 30 and 60 second rounds in English, Arabic, Spanish, Hindi and Portuguese. Shows WPM and accuracy. No ads, no sign-up.', typing_body(), GAME_JS + '<script src="../assets/typing-words.js"></script><script src="../assets/typing-game.js"></script>', 'free')

# ---------------- party and decide: wheel, picker, team maker, dice, coin, random number (free play, nothing saved but your own lists) ----------------
PARTY_LINKS = [('wheel-spinner', 'Wheel spinner'), ('random-name-picker', 'Random name picker'), ('team-maker', 'Team maker'), ('dice-roller', 'Dice roller'), ('coin-flip', 'Coin flip'), ('random-number-generator', 'Random number'), ('bingo-card-generator', 'Bingo cards'), ('bingo-caller', 'Bingo caller'), ('quiz-maker', 'Quiz maker'), ('score-keeper', 'Scoreboard'), ('secret-santa-generator', 'Secret Santa')]
def party_body(slug, title, sub, how, tool, about):
    more = ' · '.join(f'<a href="../{s}/">{n}</a>' for s, n in PARTY_LINKS if s != slug)
    lis = ''.join(f'<li>{x}</li>' for x in how)
    return f"""<div class="wrap">
<div class="gwrap">
  <div class="gside">
    <div class="gcard"><p class="eyeb">How it works</p><ul class="small">{lis}</ul></div>
  </div>
  <div>
    <p class="crumbp"><a href="../">Dilia</a> › <a href="../play/">Play</a> › <b>{title}</b></p>
    <div class="ghead"><div><h1>{title}</h1><p class="sub">{sub}</p></div></div>
    {tool}
  </div>
  <div class="gside">
    <div class="gcard"><p class="eyeb">More party tools</p><span class="small">{more} · <a href="../play/">All of Play</a></span></div>
  </div>
</div>
<section class="gtext">
  <h2>About the {title.lower()}</h2>
  {about}
</section>
</div>"""

TOOL_WHEEL = """<div id="party" data-pm="wheel">
    <div class="gbox"><div class="pt-wheelwrap"><canvas id="wcv" width="640" height="640" role="img" aria-label="Wheel"></canvas><span class="pt-ptr" aria-hidden="true"></span></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn go" id="spin">Spin</button><button type="button" class="pbtn" id="wshuffle">Shuffle order</button><button type="button" class="pbtn" id="wlink">Copy link to this wheel</button></div>
    <div class="done pt-res" id="done"><p class="eyeb">The wheel says</p><div class="t" id="dtime"></div><p id="dline"></p><div class="gbtns"><button type="button" class="pbtn" id="wremove">Remove from wheel</button></div></div>
    <label class="pt-lbl" for="wents">Entries, one per line <span id="wcount"></span></label>
    <textarea class="pt-ta" id="wents" rows="6" maxlength="4000" spellcheck="false"></textarea>
    <label class="pt-chk"><input type="checkbox" id="wrm"> Remove the winner after each spin</label>
    <div class="gcard" id="wrecentbox" style="margin-top:16px" hidden><p class="eyeb">Recent results</p><ul class="pt-hist" id="wrecent"></ul><div class="gbtns"><button type="button" class="pbtn" id="wclear">Clear recent</button></div></div>
  </div>"""
TOOL_PICK = """<div id="party" data-pm="pick">
    <div class="done pt-res" id="done"><p class="eyeb" id="rtitle"></p><div id="rlist" class="pt-reslist" aria-live="polite"></div></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="pt-row"><label for="pnum">How many to pick<input class="pt-in" id="pnum" type="number" min="1" max="50" value="1" inputmode="numeric"></label></div>
    <label class="pt-chk"><input type="checkbox" id="pnorep"> Do not pick the same name twice <span id="pleft" class="small"></span></label>
    <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="go">Pick</button><button type="button" class="pbtn" id="copy">Copy result</button><button type="button" class="pbtn" id="preset">Start over</button><button type="button" class="pbtn" id="pshuffle">Shuffle list</button></div>
    <label class="pt-lbl" for="pnames">Names, one per line <span id="pcount"></span></label>
    <textarea class="pt-ta" id="pnames" rows="8" maxlength="8000" spellcheck="false"></textarea>
  </div>"""
TOOL_TEAMS = """<div id="party" data-pm="teams">
    <div class="pt-row"><div role="group" aria-label="How to split" class="mlevel"><label class="pbtn" style="min-height:36px"><input type="radio" name="tmode" value="teams" checked> Teams</label><label class="pbtn" style="min-height:36px"><input type="radio" name="tmode" value="size"> Team size</label></div>
      <label for="tnum"><span id="tlabel">How many teams</span><input class="pt-in" id="tnum" type="number" min="1" max="100" value="2" inputmode="numeric"></label></div>
    <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="go">Make teams</button><button type="button" class="pbtn" id="copy">Copy teams</button><button type="button" class="pbtn" id="pshuffle">Shuffle list</button></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="done pt-res" id="done"><p class="eyeb">Your teams</p><div class="pt-teams" id="tteams"></div></div>
    <label class="pt-lbl" for="pnames">Names, one per line <span id="pcount"></span></label>
    <textarea class="pt-ta" id="pnames" rows="8" maxlength="8000" spellcheck="false"></textarea>
  </div>"""
SIDES = ''.join(f'<button type="button" class="pbtn" data-s="{n}" aria-pressed="{"true" if n == 6 else "false"}">d{n}</button>' for n in (4, 6, 8, 10, 12, 20, 100))
TOOL_DICE = f"""<div id="party" data-pm="dice">
    <div class="dicebox" id="dicebox" role="img" aria-label="Your dice"></div>
    <div class="done pt-res" id="done"><p class="eyeb">Total</p><div class="t" id="dtotal"></div><p id="dline"></p></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="pt-row"><label for="dn">Dice<input class="pt-in" id="dn" type="number" min="1" max="10" value="1" inputmode="numeric"></label><label for="dsides">Sides<input class="pt-in" id="dsides" type="number" min="2" max="1000" value="6" inputmode="numeric"></label></div>
    <div class="pt-sides" role="group" aria-label="Common dice">{SIDES}</div>
    <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="roll">Roll</button><button type="button" class="pbtn" id="dcopy">Copy result</button></div>
    <div class="gcard" id="dhistbox" style="margin-top:16px" hidden><p class="eyeb">Last rolls</p><ul class="pt-hist" id="dhist"></ul></div>
  </div>"""
TOOL_COIN = """<div id="party" data-pm="coin">
    <div class="coinbox"><div class="coin" id="coin" role="img" aria-label="Coin"><div class="ch">HEADS</div><div class="ct">TAILS</div></div></div>
    <div class="done pt-res" id="done"><p class="eyeb">It landed on</p><div class="t" id="dtotal"></div><p id="dline"></p></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn go" id="flip">Flip the coin</button><button type="button" class="pbtn" id="cclear">Clear tally</button></div>
    <div class="gcard" style="margin-top:16px"><p class="eyeb">Tally</p><span class="small">Heads <b id="chead">0</b> · Tails <b id="ctail">0</b> · <span id="cpct"></span></span><p class="small" id="chist" style="margin:8px 0 0"></p></div>
  </div>"""
TOOL_NUM = """<div id="party" data-pm="number">
    <div class="done pt-res" id="done"><p class="eyeb">Your numbers</p><div id="nlist" aria-live="polite"></div><p id="dline"></p></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="pt-row"><label for="nmin">Lowest<input class="pt-in" id="nmin" type="number" value="1" inputmode="numeric"></label><label for="nmax">Highest<input class="pt-in" id="nmax" type="number" value="100" inputmode="numeric"></label><label for="ncount">How many<input class="pt-in" id="ncount" type="number" min="1" max="100" value="1" inputmode="numeric"></label></div>
    <label class="pt-chk"><input type="checkbox" id="nnorep"> No number twice</label>
    <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="go">Generate</button><button type="button" class="pbtn" id="ncopy">Copy numbers</button></div>
  </div>"""
PJS = '<script src="../assets/party-rng.js"></script>\n'
PAGES['wheel-spinner'] = ('Wheel Spinner - Free Random Wheel, Share by Link | Dilia Play', 'Type your options, spin the wheel and get one fair winner. Share the wheel by link. Free, no ads, no sign-up, nothing leaves your device.',
    party_body('wheel-spinner', 'Wheel spinner', 'Type the options, spin, get one winner.', ['Type one option per line (up to 50).', 'Press Spin or the space bar.', 'Tick "Remove the winner" to run elimination rounds.', '"Copy link" shares the exact wheel.'], TOOL_WHEEL,
    '<p>The winner is chosen first by a fair random pick, and then the wheel is turned so it stops on that entry. Every entry has exactly the same chance, whatever the size of its slice looks like.</p><p>Your entries and recent results stay in this browser. The share link holds the entries inside the address itself, so nothing is stored on a server.</p>'), PJS + '<script src="../assets/party-wheel.js"></script>', 'free')
PAGES['random-name-picker'] = ('Random Name Picker - Pick a Winner Fairly, Free | Dilia Play', 'Paste a list of names and pick one or several at random. Optional no-repeat mode for draws and raffles. Free, no ads, no sign-up.',
    party_body('random-name-picker', 'Random name picker', 'Paste names, pick one or more at random.', ['Type one name per line (up to 200).', 'Choose how many to pick.', 'Tick "do not pick the same name twice" for a draw with no repeats.', 'Press Start over to put everyone back.'], TOOL_PICK,
    '<p>Each pick uses the secure random source of your browser, so every name has the same chance. Names are picked without repeating inside one draw. With "do not pick the same name twice" ticked, names already picked stay out until you press Start over.</p><p>Your list stays in this browser and is shared with the team maker. Nothing is sent anywhere.</p>'), PJS + '<script src="../assets/party-pick.js"></script>', 'free')
PAGES['team-maker'] = ('Team Maker - Random Team Generator, Fair Teams | Dilia Play', 'Paste names and split them into fair random teams, by number of teams or people per team. Copy the result. Free, no ads, no sign-up.',
    party_body('team-maker', 'Team maker', 'Split a list of names into fair random teams.', ['Type one name per line (up to 200).', 'Choose the number of teams, or the people in each team.', 'Press Make teams again for a new split.', 'Team sizes never differ by more than one.'], TOOL_TEAMS,
    '<p>Names are shuffled with a fair random method and then dealt out one by one, so team sizes never differ by more than one person. Choose either how many teams you want or how many people each team should have.</p><p>Your list stays in this browser and is shared with the random name picker. Nothing is sent anywhere.</p>'), PJS + '<script src="../assets/party-pick.js"></script>', 'free')
PAGES['dice-roller'] = ('Dice Roller - Roll d6, d20 and Any Dice Online, Free | Dilia Play', 'Roll 1 to 10 dice with 2 to 1000 sides: d4, d6, d8, d10, d12, d20, d100. Fair random results and a total. Free, no ads, no sign-up.',
    party_body('dice-roller', 'Dice roller', 'Roll up to 10 dice with any number of sides.', ['Choose how many dice and how many sides.', 'Press Roll. The total is added up for you.', 'The six-sided die turns in 3D; other dice show the number.', 'The last 10 rolls are listed below.'], TOOL_DICE,
    '<p>Every roll is a fair random pick between 1 and the number of sides, so each face has the same chance. Use d6 for board games, d20 for role-playing games, or any number from 2 to 1000 sides.</p><p>Nothing is sent anywhere. Rolls are not saved when you leave the page.</p>'), PJS + '<script src="../assets/party-dice.js"></script>', 'free')
PAGES['coin-flip'] = ('Coin Flip - Heads or Tails, Fair and Free | Dilia Play', 'Flip a coin online: heads or tails with a fair random result and a running tally. Free, no ads, no sign-up.',
    party_body('coin-flip', 'Coin flip', 'Heads or tails, decided fairly.', ['Press Flip the coin.', 'The tally of heads and tails stays in this browser.', 'Clear tally starts the count again.'], TOOL_COIN,
    '<p>Each flip is a fair random choice between heads and tails, so a long run of the same side can happen and does not change the next flip. The tally is kept in this browser only.</p>'), PJS + '<script src="../assets/party-dice.js"></script>', 'free')
PAGES['random-number-generator'] = ('Random Number Generator - Any Range, No Repeats | Dilia Play', 'Generate random whole numbers between any two values, one or many, with an option for no repeats. Free, no ads, no sign-up.',
    party_body('random-number-generator', 'Random number generator', 'Whole numbers between any two values.', ['Set the lowest and highest number.', 'Choose how many numbers you want (up to 100).', 'Tick "No number twice" for a draw without repeats.', 'Copy the numbers with one tap.'], TOOL_NUM,
    '<p>Each number is a fair random pick, so every whole number from the lowest to the highest value has the same chance. Use it for raffles, games and picking sample numbers. Values can be from -1,000,000,000 to 1,000,000,000.</p><p>Nothing is sent anywhere.</p>'), PJS + '<script src="../assets/party-dice.js"></script>', 'free')

TOOL_BCARDS = """<div id="party" data-pm="cards">
    <div class="pt-noprint">
      <div class="pt-row"><div role="group" aria-label="Kind of card" class="mlevel"><label class="pbtn" style="min-height:36px"><input type="radio" name="bkind" value="classic" checked> Classic 1 to 75</label><label class="pbtn" style="min-height:36px"><input type="radio" name="bkind" value="words"> My own words</label></div>
        <label for="bn">How many cards<input class="pt-in" id="bn" type="number" min="1" max="30" value="4" inputmode="numeric"></label></div>
      <div id="btitlebox" hidden><label class="pt-lbl" for="btitle">Title on the cards</label><input class="pt-in" id="btitle" type="text" maxlength="20" value="BINGO" style="width:100%"></div>
      <div id="bwordsbox" hidden><label class="pt-lbl" for="bwords">Words or phrases, one per line (at least 24)</label><textarea class="pt-ta" id="bwords" rows="8" maxlength="6000" spellcheck="false"></textarea></div>
      <p class="msg" id="msg" role="status" aria-live="polite"></p>
      <div class="gbtns" style="margin-top:12px"><button type="button" class="pbtn go" id="go">Make cards</button></div>
      <div id="bactions" hidden><div class="gbtns"><button type="button" class="pbtn" id="bprint">Print the cards</button></div></div>
    </div>
    <div class="pt-bcards" id="bcards"></div>
  </div>"""
TOOL_CALLER = """<div id="party" data-pm="caller">
    <div class="done pt-res on"><p class="eyeb">Last number called</p><div class="pt-big" id="clast" aria-live="polite">–</div><p id="cprev"></p><p class="small" id="ccount"></p></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn go" id="go">Call next number</button><button type="button" class="pbtn" id="cundo">Undo last</button><button type="button" class="pbtn" id="creset">New game</button></div>
    <div class="pt-cboard" id="cboard" role="group" aria-label="Numbers 1 to 75"></div>
  </div>"""
TOOL_SCORE = """<div id="party" data-pm="score">
    <div class="pt-sides" role="group" aria-label="Points per tap"><button type="button" class="pbtn" data-st="1" aria-pressed="true">1 point</button><button type="button" class="pbtn" data-st="2" aria-pressed="false">2</button><button type="button" class="pbtn" data-st="5" aria-pressed="false">5</button><button type="button" class="pbtn" data-st="10" aria-pressed="false">10</button></div>
    <div id="slist" style="margin-top:14px"></div>
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div class="gbtns"><button type="button" class="pbtn" id="sadd">Add a team</button><button type="button" class="pbtn" id="ssort" aria-pressed="false">Rank by score</button><button type="button" class="pbtn" id="scopy">Copy standings</button><button type="button" class="pbtn" id="sreset">Reset scores</button></div>
  </div>"""
TOOL_QUIZ = """<div id="party" data-pm="quiz">
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div id="qedit">
      <label class="pt-lbl" for="qtitle">Quiz title <span id="qcount"></span></label><input class="pt-in" id="qtitle" type="text" maxlength="60" style="width:100%" placeholder="My quiz">
      <div id="qlist" style="margin-top:14px"></div>
      <div class="gbtns"><button type="button" class="pbtn" id="qadd">Add a question</button></div>
      <label class="pt-chk"><input type="checkbox" id="qshuf"> Ask the questions in random order</label>
      <label class="pt-chk"><input type="checkbox" id="qshufa"> Shuffle the answers</label>
      <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="qstart">Play the quiz</button><button type="button" class="pbtn" id="qsave">Save as a file</button><label class="pbtn pt-file">Load a quiz file<input type="file" id="qfile" accept=".json,application/json"></label><button type="button" class="pbtn" id="qnew">New quiz</button></div>
    </div>
    <div id="qplay" hidden>
      <p class="eyeb" id="qprog"></p>
      <div id="qstage"></div>
      <div class="gbtns"><button type="button" class="pbtn" id="qshow">Show answer</button><button type="button" class="pbtn go" id="qnext">Next question</button><button type="button" class="pbtn" id="qback">Back to editing</button></div>
      <div id="qfinal" hidden><div class="done pt-res on"><p class="eyeb">Your score</p><div class="t" id="qscore"></div><p id="qline"></p><div class="gbtns"><button type="button" class="pbtn go" id="qagain">Play again</button><button type="button" class="pbtn" id="qedit2">Edit the quiz</button></div></div></div>
    </div>
  </div>"""
TOOL_SANTA = """<div id="party" data-pm="santa">
    <p class="msg" id="msg" role="status" aria-live="polite"></p>
    <div id="ssetup">
      <label class="pt-lbl" for="sn">Names, one per line (3 to 50)</label><textarea class="pt-ta" id="sn" rows="7" maxlength="3000" spellcheck="false" placeholder="Amira&#10;Ben&#10;Chen&#10;Diego"></textarea>
      <label class="pt-lbl" for="sx">Do not pair (optional), one pair per line, like: Amira, Ben</label><textarea class="pt-ta" id="sx" rows="3" maxlength="1500" spellcheck="false" style="min-height:70px"></textarea>
      <div class="gbtns" style="margin-top:14px"><button type="button" class="pbtn go" id="go">Make the draw</button></div>
    </div>
    <div id="sflow" hidden>
      <div class="done pt-res on"><div id="sstage"></div></div>
      <div class="gbtns"><button type="button" class="pbtn go" id="snext">I am …</button><button type="button" class="pbtn" id="sfullbtn" hidden>Show full list (spoils the surprise)</button><button type="button" class="pbtn" id="sagain">Start over</button></div>
      <div id="sfull" hidden class="gcard" style="margin-top:16px"><p class="eyeb">Full list, for the organiser</p><ul class="pt-hist" id="sfulllist"></ul><div class="gbtns"><button type="button" class="pbtn" id="sfullcopy">Copy list</button></div></div>
    </div>
  </div>"""
PJ2 = lambda f: PJS + f'<script src="../assets/{f}.js"></script>'
PAGES['bingo-card-generator'] = ('Bingo Card Generator - Printable Bingo Cards, Free | Dilia Play', 'Make printable bingo cards: classic 1 to 75 or your own words. Up to 30 different cards at once. Free, no ads, no sign-up.',
    party_body('bingo-card-generator', 'Bingo card generator', 'Printable cards, classic or with your own words.', ['Choose classic 1 to 75 or your own words (at least 24).', 'Choose how many cards (up to 30). Every card is different.', 'Press Make cards, then Print the cards.', 'Use the Bingo caller to call the numbers.'], TOOL_BCARDS,
    '<p>Classic cards follow the 75-ball rules: column B holds numbers 1 to 15, I 16 to 30, N 31 to 45, G 46 to 60 and O 61 to 75, with a free space in the middle. With your own words, each card takes 24 of your words in a random order.</p><p>Cards are made on your device and printed from your browser. Nothing is sent anywhere.</p>'), PJ2('party-bingo'), 'free')
PAGES['bingo-caller'] = ('Bingo Caller - Call Bingo Numbers 1 to 75, Free | Dilia Play', 'Call bingo numbers 1 to 75 without repeats, with a board of called numbers and undo. Free, no ads, no sign-up.',
    party_body('bingo-caller', 'Bingo caller', 'Call the numbers, never the same one twice.', ['Press Call next number or the space bar.', 'The board shows every number called so far.', 'Undo last takes back a number.', 'New game clears the board (press twice).'], TOOL_CALLER,
    '<p>Each number from 1 to 75 is called at most once, picked fairly from the numbers left. The letter shows which column it belongs to. The game is saved in this browser, so a page reload does not lose it.</p><p>Make matching cards with the bingo card generator.</p>'), PJ2('party-bingo'), 'free')
PAGES['score-keeper'] = ('Scoreboard - Free Online Score Keeper for Teams | Dilia Play', 'Keep score for up to 12 teams or players. Tap to add or remove points, rank by score and copy the standings. Free, no ads, no sign-up.',
    party_body('score-keeper', 'Scoreboard', 'Keep score for teams or players.', ['Type a name for each team (up to 12).', 'Pick 1, 2, 5 or 10 points, then tap + or −.', 'Rank by score puts the leader on top.', 'Scores are saved in this browser.'], TOOL_SCORE,
    '<p>Use the scoreboard for game nights, quizzes, sports days and classrooms. The team in the lead is outlined in gold. Scores and names stay in this browser, so you can close the page and come back.</p>'), PJ2('party-score').replace(PJS, ''), 'free')
PAGES['quiz-maker'] = ('Quiz Maker - Make and Play a Multiple-Choice Quiz, Free | Dilia Play', 'Write multiple-choice questions, play them on one screen with a score, and save the quiz as a file to share. Free, no ads, no sign-up.',
    party_body('quiz-maker', 'Quiz maker', 'Write a quiz, play it on one screen.', ['Write questions with up to 4 answers and mark the right one.', 'Press Play the quiz. Tap an answer, or use Show answer as host.', 'Save the quiz as a file and load it later or on another device.', 'Your quiz is kept in this browser while you edit.'], TOOL_QUIZ,
    '<p>Each question has up to four answers and one right answer. In play mode, tapping an answer shows the right one at once and counts a point if you were right. As a host, press Show answer to reveal it without scoring.</p><p>Save as a file gives you a small file you can send to someone. Loading a file only accepts the quiz format and is checked before it is used. Nothing is sent anywhere.</p>'), PJ2('party-quiz'), 'free')
PAGES['secret-santa-generator'] = ('Secret Santa Generator - Draw Names on One Device, Free | Dilia Play', 'Draw Secret Santa names on one device: pass it around, everyone sees only their own person. Optional do-not-pair rules. Free, no ads, no sign-up.',
    party_body('secret-santa-generator', 'Secret Santa generator', 'Draw names on one device, nobody sees the others.', ['Type the names (3 to 50). Optionally add pairs who must not draw each other.', 'Press Make the draw.', 'Pass the device: each person taps their name, sees their person, then hides it.', 'The draw is never saved. Leaving the page clears it.'], TOOL_SANTA,
    '<p>Nobody draws themselves, and pairs you list under "do not pair" never draw each other. The draw is made fairly among all valid arrangements. Only the names you typed are saved in this browser; the result of the draw lives in memory until you leave the page.</p><p>The organiser can open the full list at the end, which spoils the surprise for the organiser.</p>'), PJ2('party-santa'), 'free')
for slug, (t, d, body, js, *mode) in PAGES.items():
    dd = ROOT / slug; dd.mkdir(exist_ok=True)
    (dd / 'index.html').write_text(shell(t, d, body, js, mode=(mode[0] if mode else 'daily' if slug == 'daily-path' else '')))
    print('wrote', slug + '/')
