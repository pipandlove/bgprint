# bgprint

🎲 **Live demo:** [pipandlove.github.io/bgprint](https://pipandlove.github.io/bgprint)

Try it with a position:

```
https://pipandlove.github.io/bgprint/?xgid=XGID=a--AaBBABBa-cA---cbbbB-B--:0:0:-1:00:0:0:0:0:10
```

To get just the board image with no surrounding UI, add `&raw=1`:

```
https://pipandlove.github.io/bgprint/?xgid=XGID=a--AaBBABBa-cA---cbbbB-B--:0:0:-1:00:0:0:0:0:10&raw=1
```

**A static, zero-dependency backgammon board renderer.**  
Parses an XGID or GnuBG ID and renders a clean monochrome board on an HTML Canvas — no server, no build step, no dependencies.

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

---

## Features

- **XGID and GnuBG ID** — both formats accepted, auto-detected from the URL or selectable via a toggle in the page
- **Correct board orientation** — bottom player fixed for the entire game; point numbering flips with turn (pt 24 top-right when bottom player rolls, bottom-right when top player rolls)
- **Pip counts** computed automatically from the position, with differential (positive = trailing)
- **Dice** rendered in the roller's checker color, placed on the correct half of the board
- **Doubling cube** displayed at centre, or bottom/top depending on ownership
- **Score boxes** shown in match play, hidden in money/unlimited games
- **Bearing-off trays** with borne-off checker dots
- **Equity panel** — optional Ecl, Dcl, End, Edt, Edp values displayed alongside the board
- **Settings panel** (☰ button) — flip board, custom checker colors, equity inputs
- **URL API** — every option passable as a query string for direct linking or embedding
- **PNG download** button
- **ID cross-display** — after each render, both the XGID and GnuBG ID of the position are shown with one-click copy buttons, regardless of which format was entered
- **Raw image mode** (`?raw=1`) — renders only the board with no surrounding UI, ideal for iframes or screenshot tools
- **iframe embeddable** — one `<iframe>` tag is all you need
- **Zero dependencies** — vanilla JS, HTML Canvas, no npm, no build step

---

## Project structure

```
bgprint/
  index.html   ← page shell, settings panel, wiring
  xgid.js      ← pure XGID parser (no rendering)
  gnubgid.js   ← GnuBG ID parser (same output object as xgid.js)
  board.js     ← renderer (buildRenderState, drawBoard, computePips)
  encode.js    ← encoders (toXGID, toGnuBGID) — inverse of the parsers
  style.css    ← layout and settings panel styles
  README.md    ← this file
  LICENSE      ← CC BY-SA 4.0
```

The code is intentionally split into clean, independent layers:

- **`xgid.js`** / **`gnubgid.js`** — pure parsers, no rendering logic. Both produce the same output object so `board.js` needs no changes regardless of input format.
- **`board.js`** converts the parsed object into a normalised render state (always from the bottom player's fixed perspective) and draws it onto a `<canvas>`. Rendering options (flip, colors) are passed in separately.
- **`index.html`** wires the two together and provides the settings panel UI.

---

## Display conventions

- **Bottom player** = the XGID Active Player (uppercase letters) / GnuBG player 1. Fixed for the entire game.
- **Top player** = the XGID Opponent (lowercase letters) / GnuBG player 0. Fixed for the entire game.
- **Point numbering** changes with turn:
  - `turn=1` (bottom player on roll): pt 24 at top-right, pt 1 at bottom-right.
  - `turn=-1` (top player on roll): pt 24 at bottom-right, pt 1 at top-right.
- The physical board grid never moves — only the labels on the points change.
- **Pip differential**: positive = trailing (more pips), negative = ahead (fewer pips).
- **Dice color** matches the rolling player's checker color.

---

## URL API

All parameters are passed as query string arguments. All are optional.

### Position

| Parameter | Description | Example |
|-----------|-------------|---------|
| `xgid` | Full XGID string | `xgid=XGID=-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10` |
| `gnubg` | GnuBG ID (PositionID:MatchID) | `gnubg=4HPwATDgc/ABMA:cAkAAAAAAAAA` |

### Display options

| Parameter | Description | Default |
|-----------|-------------|---------|
| `flip` | Mirror board left↔right around the bar | `0` |
| `bottom` | Bottom player checker color (hex, no `#`) | `1a1a1a` |
| `top` | Top player checker color (hex, no `#`) | `ffffff` |

### Equity values

Displayed in a panel to the right of the board when any value is provided.

| Parameter | Description |
|-----------|-------------|
| `ecl` | Cubeless equity, no double |
| `dcl` | Cubeless equity, double/take |
| `end` | Cubeful equity, no double |
| `edt` | Cubeful equity, double/take |
| `edp` | Cubeful equity, double/pass |

### Full example

```
https://pipandlove.github.io/bgprint/
  ?xgid=XGID=-b----E-C---eE---c-e----B-:0:0:-1:63:3:1:0:0:5
  &flip=0
  &bottom=1a1a1a&top=ffffff
  &ecl=0.42&dcl=0.38&end=0.44&edt=0.51&edp=1.00
```

---

## XGID format reference

```
XGID=<board>:<cubeVal>:<cubeOwner>:<turn>:<dice>:<score1>:<score2>:<crawford>:<length>:<maxCube>
```

| Field | Values | Notes |
|-------|--------|-------|
| `board` | 26 chars | Index 0 = bar, indices 1–24 = points 1–24, index 25 = borne-off tray. Uppercase A–O = active player (1–15 checkers), lowercase a–o = opponent. `-` = empty. |
| `cubeVal` | integer | Log₂ of cube face value: `0`=1, `1`=2, `2`=4, `3`=8… |
| `cubeOwner` | -1, 0, 1 | `1`=active player owns, `-1`=opponent owns, `0`=centred |
| `turn` | 1, -1 | `1`=active player on roll, `-1`=opponent on roll |
| `dice` | two digits | e.g. `63` for 6-3, `00`=not yet rolled |
| `score1` | integer | Active player's match score |
| `score2` | integer | Opponent's match score |
| `crawford` | 0, 1 | `1`=Crawford game |
| `length` | integer | Match length. `0`=money game |
| `maxCube` | integer | XG internal: log₂ of max cube evaluation ceiling |

Scores and match length are read directly from the XGID string — no URL override needed.  
Pip counts are computed automatically from the position.  
Dice color matches the roller's checker color.

---

## GnuBG ID format reference

```
<PositionID>:<MatchID>
```

| Part | Length | Description |
|------|--------|-------------|
| `PositionID` | 14 chars | Base64 encoding of a 80-bit position key. Player 1 (bottom) zones in bits 0–39, player 0 (top) in bits 40–79. Each 40-bit block encodes zones (pt1..pt24, bar) as runs of `1` bits separated by `0` transitions. |
| `MatchID` | 12 chars | Base64 encoding of a 66-bit match key. Contains cube value, cube owner, dice owner, Crawford flag, dice rolled, match length, and scores. |

In GnuBG: **player 1 = bottom player, player 0 = top player.**  
Reference: [gnubg.org/documentation — Appendix](http://www.gnubg.org/documentation/doku.php?id=appendix)

---

## Settings panel

Click the **☰** button (top-left) to open the settings panel:

- **Flip board** — mirrors the board left↔right around the bar (changes bear-off side).
- **Bottom / Top checker color** — color pickers; any CSS color works. Changes take effect immediately.
- **Equity fields** — enter Ecl, Dcl, End, Edt, Edp values; they appear in the equity panel alongside the board.

---

## Embed as iframe

```html
<iframe
  src="https://pipandlove.github.io/bgprint/?xgid=XGID=..."
  width="700" height="560" frameborder="0">
</iframe>
```

---

## Run locally

No build step or install required.

**Python (built-in)**
```bash
cd bgprint
python -m http.server 8080
# open http://localhost:8080
```

**Node**
```bash
npx serve .
```

**VS Code** — install the *Live Server* extension, right-click `index.html` → *Open with Live Server*.

> **Tip:** during development, open browser DevTools → Network tab → check **Disable cache** to avoid stale JS being served.

---

## Publish to GitHub Pages

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/bgprint.git
git push -u origin main
```

Then in your GitHub repo: **Settings → Pages → Source: Deploy from branch → Branch: main → / (root) → Save**

Live at `https://pipandlove.github.io/bgprint/` within ~60 seconds.

---

## Roadmap

- [ ] Display EPC (Keith count) when pip count is under 60
- [ ] Display winning chances (simple win, gammon, backgammon) for both players

---

## License

[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

Free to share and adapt for any purpose, including commercially, provided you give credit and distribute contributions under the same license.
