#!/usr/bin/env bash
# Release gate: everything that must pass before a change reaches the live site. Same script locally and in CI.
set -u
cd "$(dirname "$0")/../.."
fail=0; step() { echo; echo "=== $1"; shift; if "$@"; then echo "--- PASS"; else echo "--- FAIL: $*"; fail=1; fi; }
python3 dev/tests/serve.py & SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT; sleep 1
step "Static security gate" python3 dev/security-check.py
fp() { { git status --porcelain --untracked-files=all; git diff; } | sha1sum; }
before=$(fp)
step "Generated pages match their sources" bash -c 'python3 dev/make-pages.py >/dev/null && python3 dev/make-blog.py >/dev/null'
if [ "$(fp)" != "$before" ]; then echo "--- FAIL: rebuilding pages changed files (run make-pages.py and make-blog.py, then commit):"; git status --short | head -20; fail=1; fi
step "Calculator maths" node dev/tests/test-calcmath.js
step "All pages: security policy, errors, no outside requests" python3 dev/tests/test-sweep.py
step "Calculator pages" python3 dev/tests/test-calc.py
step "Hostile PDF guard" python3 dev/tests/test-guard.py
step "Fill forms: My details" python3 dev/tests/test-autofill.py
step "Reader: Comments panel" python3 dev/tests/test-comments.py
step "Home page and Life/Play hubs" python3 dev/tests/test-home.py
step "Light/dark switch on every page family" python3 dev/tests/test-theme.py
step "Daily puzzles: one answer, 400 days" node dev/tests/test-playgen.js
step "Merge rules" node dev/tests/test-merge.js
step "Play: hub and daily games played through" python3 dev/tests/test-play.py
step "Arcade rules: snake, typing score, word lists" node dev/tests/test-arcade.js
step "Arcade: snake, reaction time, typing test" python3 dev/tests/test-arcade.py
step "Party tools: fair random picks" node dev/tests/test-party-rng.js
step "Party tools: wheel, picker, teams, dice, coin, numbers" python3 dev/tests/test-party.py
step "Party tools 2: bingo, quiz, scoreboard, Secret Santa" python3 dev/tests/test-party2.py
step "Card games: rules and solvers" node dev/tests/test-cards.js
step "Card games: FreeCell, Pyramid, TriPeaks" python3 dev/tests/test-cards.py
step "Chess: rules, perft, engine" node dev/tests/test-chess-core.js
step "Chess: page" python3 dev/tests/test-chess.py
step "Checkers and reversi: rules and computer" node dev/tests/test-boards.js
step "Checkers and reversi: pages" python3 dev/tests/test-boards.py
step "Ludo: rules and computer" node dev/tests/test-ludo.js
step "Ludo: page" python3 dev/tests/test-ludo.py
step "Backgammon: rules and computer" node dev/tests/test-backgammon.js
step "Word and crossword engines" bash -c "node dev/tests/test-word.js && node dev/tests/test-crossword.js"
step "Chess puzzles verified" node dev/tests/test-chess-puzzles.js
step "Holiday planner: engine" node dev/tests/test-holplan.js
step "Holiday planner: page" python3 dev/tests/test-holplan.py
step "Festival dates" node dev/tests/test-festivals.js
step "Life pages" python3 dev/tests/test-life.py
step "Puzzle rules" node dev/tests/test-puzzles.js
step "Arcade and puzzle pages" python3 dev/tests/test-mini.py
step "Win celebration" python3 dev/tests/test-celebrate.py
echo; [ $fail = 0 ] && echo "GATE PASSED" || echo "GATE FAILED"
exit $fail
