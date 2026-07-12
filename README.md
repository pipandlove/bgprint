# bgprint

🎲 **Live demo:** [pipandlove.github.io/bgprint](https://pipandlove.github.io/bgprint)

Try it with a position:

```
https://pipandlove.github.io/bgprint/?xgid=XGID=a--AaBBABBa-cA---cbbbB-B--:0:0:-1:00:0:0:0:0:10
```

**A static, zero-dependency backgammon board renderer.**  
Parses an XGID string and renders a clean monochrome board on an HTML Canvas — no server, no build step, no dependencies.

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)


---

## Project structure

```
bgprint/
  index.html   ← page shell, settings panel, wiring
  xgid.js      ← pure XGID parser (no rendering)
  board.js     ← renderer (buildRenderState, drawBoard, computePips)
  style.css    ← layout and settings panel styles
  README.md    ← this file
  LICENSE      ← CC BY-SA 4.0
```

The code is intentionally split into three layers:

- **`xgid.js`** parses the raw XGID string into a plain JS object, strictly following the spec. No rendering decisions here.
- **`board.js`** converts the parsed object into a normalised render state (always from the bottom player's fixed perspective) and draws it onto a `<canvas>`.
- **`index.html`** wires the two together and provides the settings panel UI.

---

## Display conventions

- **Bottom player** = the XGID Active Player (uppercase letters). Fixed for the entire game.
- **Top player** = the XGID Opponent (lowercase letters). Fixed for the entire game.
- **Point numbering** changes with turn:
  - `turn=1` (bottom player on roll): pt 24 at top-right, pt 1 at bottom-right.
  - `turn=-1` (top player on roll): pt 24 at bottom-right, pt 1 at top-right.
- The physical board grid never moves — only the labels on the points change.
- **Pip differential**: positive = trailing (more pips), negative = ahead (fewer pips).

---

## URL API

All parameters are passed as query string arguments. All are optional.

### Position

| Parameter | Description | Example |
|-----------|-------------|---------|
| `xgid` | Full XGID string | `xgid=XGID=-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10` |

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
https://<your-username>.github.io/bgprint/
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

## Settings panel

Click the **☰** button (top-left) to open the settings panel:

- **Flip board** — mirrors the board left↔right around the bar (changes bear-off side).
- **Bottom / Top checker color** — color pickers; any CSS color works. Changes take effect immediately.
- **Equity fields** — enter Ecl, Dcl, End, Edt, Edp values; they appear in the equity panel alongside the board.

---

## Embed as iframe

```html
<iframe
  src="https://<your-username>.github.io/bgprint/?xgid=XGID=..."
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

Live at `https://<your-username>.github.io/bgprint/` within ~60 seconds.

---

## Roadmap

- [ ] GnuBG position ID support (base64 decoding)
- [ ] Display EPC (Keith count) when pip count is under 60
- [ ] Add a URL parameter to render just the board image with no surrounding page UI
- [ ] Display winning chances (simple win, gammon, backgammon) for both players

---

## License

[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

Free to share and adapt for any purpose, including commercially, provided you give credit and distribute contributions under the same license.
