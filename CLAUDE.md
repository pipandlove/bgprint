# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

bgprint is a static, zero-dependency backgammon board renderer (vanilla JS + HTML Canvas). It parses an XGID or GnuBG ID and draws the position. Deployed as-is to GitHub Pages (pipandlove.github.io/bgprint) — no npm, no build step, no bundler, no test suite. Keep it that way: don't introduce dependencies or tooling.

## Running

```bash
python -m http.server 8080   # then open http://localhost:8080
```

Test a position via URL, e.g. `http://localhost:8080/?xgid=XGID=a--AaBBABBa-cA---cbbbB-B--:0:0:-1:00:0:0:0:0:10` (add `&raw=1` for image-only mode). Disable the browser cache in DevTools while iterating.

The parser/encoder files end with `if (typeof module !== 'undefined') module.exports = {...}`, so they can be exercised from Node for quick checks:

```bash
node -e "const {parseXGID}=require('./xgid.js'); const {toGnuBGID}=require('./encode.js'); console.log(toGnuBGID(parseXGID('XGID=-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10')))"
```

`board.js` has no Node export (it uses canvas globals).

## Architecture

Scripts are plain globals loaded in order by `index.html`: `xgid.js` → `gnubgid.js` → `encode.js` → `board.js`, then an inline `<script>` holding all UI wiring.

Data flow: **ID string → parser → `parsed` object → `buildRenderState()` → `drawBoard(ctx, state, opts)`**

- **`parsed` object** (shared contract): `parseXGID` and `parseGnuBGID` must return the *same* shape — `points[0..25]` each `{active, opponent}`, `activeOff`/`opponentOff`, `cubeValue`, `cubeOwner` (1/-1/0), `turn` (1/-1), `die1`/`die2`, `scoreActive`/`scoreOpponent`, `matchLength`, `crawford`, `maxCube`. It uses XGID vocabulary (active/opponent). `encode.js` (`toXGID`, `toGnuBGID`) consumes this shape and must remain the exact inverse of both parsers — the UI uses it to cross-display both IDs after every render.
- **Render state** (`buildRenderState` in `board.js`): translates to display vocabulary — `bottom`/`top`, `turn: 'bottom'|'top'`, `cubeOwner: 'centre'|'bottom'|'top'`. Parsers know nothing about rendering; the renderer knows nothing about ID formats.
- **Render options** (`opts`: `flip`, `bottomColor`, `topColor`) are kept separate from position state and passed to `drawBoard`.
- **Layout** in `board.js` is driven by module-level pixel constants (`PW`, `BARW`, `CR`, …) that derive the canvas size `CW`×`CH`. `index.html` sizes the canvas from these and renders scaled offscreen canvases for PNG download and `raw=1` mode.

## Display conventions (invariants)

- Active player (XGID uppercase) is **always the bottom** player; opponent (lowercase) is always top. This never changes with turn.
- The physical grid is fixed (display-pt 1–12 bottom, 13–24 top, pt 1 at bottom-right). Only the **labels** change with turn: `turn=1` → pt 24 at top-right; `turn=-1` → labels become `25 - pt`. See `ptLabel()`.
- `flip` mirrors left↔right around the bar (moves the bear-off side) and is purely a display option.
- Pip differential: positive = trailing. Dice are drawn in the roller's checker color.
- XGID board index 0 is the active player's bar, 25 the active player's tray; `buildRenderState` sums `points[0]` and `points[25]` active counts into `bottomBar`.
- GnuBG mapping details (bit layout, zone→point mapping, player 0/1 vs. on-roll) are documented in the header comment of `gnubgid.js`; trust that over the README's summary.

## URL API

Query params read in `boot()` (`index.html`): `xgid` or `gnubg` (format auto-detected by which is present), `flip=1`, `bottom`/`top` (hex colors without `#`), `ecl`/`dcl`/`end`/`edt`/`edp` (equity panel values), `raw=1`. When adding a new option, update `boot()`, the settings-panel sync, and the URL API section of `README.md`.
