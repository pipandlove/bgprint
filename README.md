# bgboard

**A static, zero-dependency backgammon board renderer.**  
Takes an XGID or GnuBG position ID in a URL parameter and renders a clean, monochrome SVG/Canvas board — no server, no build step, no dependencies.

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

---

## Live demo

```
https://<your-username>.github.io/bgboard/?xgid=XGID=-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10
```

---

## URL API

All parameters are passed as query string arguments. All are optional and combinable.

### Position

| Parameter | Description | Example |
|-----------|-------------|---------|
| `xgid` | Full XGID string (preferred) | `xgid=XGID=-b----E-C---eE---c-e----B-:0:0:1:00:0:0:0:0:10` |

### XGID format reference

```
XGID=<pos>:<cube>:<owner>:<turn>:<dice>:<score0>:<score1>:<crawford>:<jacoby>:<matchlen>
```

| Field | Values | Notes |
|-------|--------|-------|
| `pos` | 26 chars | A–Z = bottom player (1–26 checkers), a–z = top player, `-` = empty |
| `cube` | 0–15 | Log₂ of cube value (0=1, 1=2, 2=4, 3=8…) |
| `owner` | -1, 0, 1 | -1=top, 0=centered, 1=bottom |
| `turn` | 1, -1 | Who is on roll |
| `dice` | two digits | e.g. `31` for 3-1. `00` = not rolled |
| `score0` | integer | Bottom player score |
| `score1` | integer | Top player score |
| `matchlen` | integer | 0 = money game |

### Pip counts

| Parameter | Description | Example |
|-----------|-------------|---------|
| `pip0` | Bottom player pip count | `pip0=113` |
| `pip1` | Top player pip count | `pip1=76` |

Displayed below the board as:  
`O: 76  (-37)` and `X: 113  (+37)`  
The number in parentheses is the differential (positive = ahead in the race).

### Scores and match

| Parameter | Description |
|-----------|-------------|
| `score0` | Override bottom player score |
| `score1` | Override top player score |
| `matchlen` | Override match length |

### Dice

| Parameter | Description | Example |
|-----------|-------------|---------|
| `dice` | Two digits | `dice=31` |

### Equity values (optional)

Displayed in a column to the right of the board when any value is provided.

| Parameter | Description |
|-----------|-------------|
| `ecl` | Cubeless equity, no double |
| `dcl` | Cubeless equity, double/take |
| `end` | Cubeful equity, no double |
| `edt` | Cubeful equity, double/take |
| `edp` | Cubeful equity, double/pass |

### Full example URL

```
https://<your-username>.github.io/bgboard/?xgid=XGID=-b----E-C---eE---c-e----B-:0:0:1:31:3:1:0:0:5&pip0=113&pip1=76&ecl=0.42&end=0.44&edt=0.51&edp=1.00
```

---

## Embed as iframe

Any page can embed a board with a single line:

```html
<iframe
  src="https://<your-username>.github.io/bgboard/?xgid=XGID=..."
  width="640" height="500" frameborder="0">
</iframe>
```

---

## Run locally

No build step or install required. Just serve the folder with any static server:

**Option 1 — Python (built-in, zero install)**
```bash
cd bgboard
python -m http.server 8080
# Open http://localhost:8080
```

**Option 2 — Node (if you have npm)**
```bash
npx serve .
# Open the URL it prints
```

**Option 3 — VS Code**  
Install the *Live Server* extension, right-click `index.html` → *Open with Live Server*.

---

## Publish to GitHub Pages

```bash
# 1. Create a new repo on github.com named "bgboard", then:
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/bgboard.git
git push -u origin main
```

Then in your repo on GitHub:  
**Settings → Pages → Source: Deploy from branch → Branch: main → / (root) → Save**

Your page will be live at `https://<your-username>.github.io/bgboard/` within ~60 seconds.

---

## Project structure

```
bgboard/
  index.html    ← the entire application (HTML + CSS + JS, single file)
  README.md     ← this file
  LICENSE       ← CC BY-SA 4.0
```

---

## Roadmap

- [ ] GnuBG position ID support (base64 decoding)
- [ ] PNG download button
- [ ] Dark mode
- [ ] Configurable checker colors
- [ ] Image → XGID (requires backend, see [bgboard-vision](../bgboard-vision))

---

## Contributing

Issues and pull requests welcome. Please keep the zero-dependency constraint — no npm, no bundler, no framework.

---

## License

[Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

You are free to share and adapt this work for any purpose, including commercially, as long as you give appropriate credit and distribute your contributions under the same license.
