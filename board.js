// ═══════════════════════════════════════════════════════════════════════════
// board.js  —  render a backgammon position onto a <canvas>
//
// Depends on xgid.js (parseXGID).
//
// PUBLIC API
//   buildRenderState(parsed)           → normalised state object
//   drawBoard(ctx, state, opts)        → draws onto the canvas context
//   computePips(state)                 → { pipBottom, pipTop }
//   ptLabel(displayPt, turn)           → number shown on screen for that column
//
// CONVENTIONS (immutable, regardless of user display preferences)
//   • XGID active player (uppercase) = BOTTOM player, always.
//   • XGID opponent      (lowercase) = TOP    player, always.
//   • turn = 'bottom' → bottom player on roll  (XGID :3 = 1)
//   • turn = 'top'    → top    player on roll  (XGID :3 = -1)
//
// FIXED DISPLAY GRID (column positions never change)
//   Top    L→R: disp-pt 13 14 15 16 17 18 | bar | 19 20 21 22 23 24
//   Bottom L→R: disp-pt 12 11 10  9  8  7 | bar |  6  5  4  3  2  1
//   disp-pt 1-12  → bottom half  (stacks upward)
//   disp-pt 13-24 → top    half  (stacks downward)
//
// POINT LABELS shown on screen depend on turn:
//   turn='bottom': label = disp-pt        (pt 24 at top-right)
//   turn='top':    label = 25 - disp-pt   (pt 24 at bottom-right)
//
// RENDER OPTIONS (passed to drawBoard as `opts`)
//   flip         {bool}   mirror board left↔right around the bar (default false)
//   bottomColor  {string} CSS color for bottom player checkers (default '#1a1a1a')
//   topColor     {string} CSS color for top    player checkers (default '#ffffff')
// ═══════════════════════════════════════════════════════════════════════════

// ── buildRenderState ─────────────────────────────────────────────────────────
function buildRenderState(parsed) {
  const board = {};
  for (let pt = 1; pt <= 24; pt++) {
    board[pt] = {
      bottom: parsed.points[pt].active,
      top:    parsed.points[pt].opponent,
    };
  }
  return {
    board,                                      // board[1..24] = {bottom, top}
    bottomBar:  parsed.points[0].active + parsed.points[25].active,   // i=0 and i=25 are both active bar slots
    topBar:     parsed.points[0].opponent,                              // opponent bar at i=0
    bottomOff:  parsed.activeOff,
    topOff:     parsed.opponentOff,
    turn:       parsed.turn === 1 ? 'bottom' : 'top',
    cubeOwner:  parsed.cubeOwner === 0 ? 'centre'
                  : parsed.cubeOwner === 1 ? 'bottom' : 'top',
    cubeValue:  parsed.cubeValue,
    die1:       parsed.die1,
    die2:       parsed.die2,
    scoreBottom: parsed.scoreActive,
    scoreTop:    parsed.scoreOpponent,
    matchLength: parsed.matchLength,
    crawford:    parsed.crawford,
  };
}

// ── computePips ───────────────────────────────────────────────────────────────
// Bottom moves 24→1 (home = pts 1-6), pip = pt × count.
// Top    moves 1→24 (home = pts 19-24), pip = (25-pt) × count.
function computePips(state) {
  let pipBottom = state.bottomBar * 25;
  let pipTop    = state.topBar    * 25;
  for (let pt = 1; pt <= 24; pt++) {
    pipBottom += state.board[pt].bottom * pt;
    pipTop    += state.board[pt].top    * (25 - pt);
  }
  return { pipBottom, pipTop };
}

// ── ptLabel ───────────────────────────────────────────────────────────────────
function ptLabel(displayPt, turn) {
  return turn === 'bottom' ? displayPt : 25 - displayPt;
}

// ═══════════════════════════════════════════════════════════════════════════
// GEOMETRY — all coordinates derived from these constants
// ═══════════════════════════════════════════════════════════════════════════
const PW    = 40;             // point (triangle) width
const HALF  = PW * 6;        // 6 points per quadrant
const BARW  = 28;             // bar width
const PLAYW = HALF * 2 + BARW;

const PLAYH = 380;            // playing area height (excl. number rows)
const NUMH  = 22;             // number row height (top and bottom)
const BH    = NUMH + PLAYH + NUMH;  // total board height
const TRIH  = Math.floor(PLAYH / 2 * 0.88);  // triangle height
const CR    = 16;             // checker radius

const SIDEW = 34;             // left/right side column width (scores, trays)
const GAP   = 10;             // gap between board and side columns
const PIPH  = 24;             // pip count row height (above and below board)
const PAD   = 14;             // outer canvas padding

const CW = PAD + SIDEW + GAP + PLAYW + GAP + SIDEW + PAD;
const CH = PAD + PIPH  + BH  + PIPH  + PAD;

// Key x anchors
const BX     = PAD + SIDEW + GAP;   // left edge of playing area
const SCOREX = PAD;                  // left edge of score column
const BEARX  = BX + PLAYW + GAP;    // left edge of bearing-off column

// Key y anchors
const BY       = PAD + PIPH;
const TOPNUMY  = BY;
const TOPTRIY  = BY + NUMH;
const MIDY     = BY + NUMH + PLAYH / 2;
const BOTTTRIY = BY + NUMH + PLAYH;
const BOTNUMY  = BOTTTRIY;
const PIPBOTY  = BY + BH + PIPH / 2;
const PIPTOPY  = PAD + PIPH / 2;
const LEFTCX   = BX + HALF / 2;
const RIGHTCX  = BX + HALF + BARW + HALF / 2;

// ── Coordinate helpers ────────────────────────────────────────────────────────
// Display grid (fixed — never changes):
//   Top    L→R: disp-pt 13..18 | bar | 19..24
//   Bottom L→R: disp-pt 12..7  | bar |  6..1
// When flip=true, left↔right is mirrored around the bar.

function ptCX(pt, flip) {
  // Returns x-centre of the point's column.
  let cx;
  if      (pt >= 13 && pt <= 18) cx = BX + (pt - 13) * PW + PW / 2;
  else if (pt >= 19 && pt <= 24) cx = BX + HALF + BARW + (pt - 19) * PW + PW / 2;
  else if (pt >= 7  && pt <= 12) cx = BX + (12 - pt) * PW + PW / 2;
  else if (pt >= 1  && pt <=  6) cx = BX + HALF + BARW + (6 - pt) * PW + PW / 2;
  else return 0;
  if (flip) cx = BX + PLAYW - (cx - BX); // mirror around bar
  return cx;
}

function isTopHalf(pt)  { return pt >= 13; }

// Column index within its quadrant (0-5), for triangle colouring.
// Based purely on position, so colour never changes with turn or flip.
function colIdx(pt) {
  if (pt >= 13 && pt <= 18) return pt - 13;
  if (pt >= 19 && pt <= 24) return pt - 19;
  if (pt >= 7  && pt <= 12) return 12 - pt;
  return 6 - pt;
}

// ── Utility ───────────────────────────────────────────────────────────────────
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAW BOARD
// ═══════════════════════════════════════════════════════════════════════════
function drawBoard(ctx, state, opts) {
  opts = opts || {};
  const flip        = opts.flip        || false;
  const bottomColor = opts.bottomColor || '#1a1a1a';
  const topColor    = opts.topColor    || '#ffffff';
  const { turn } = state;

  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = '#ebebeb';
  ctx.fillRect(0, 0, CW, CH);

  // ── Board surface ───────────────────────────────────────────────────────
  ctx.fillStyle = '#f8f8f8';
  rrect(ctx, BX, BY, PLAYW, BH, 5); ctx.fill();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5;
  rrect(ctx, BX, BY, PLAYW, BH, 5); ctx.stroke();

  // ── Bar ────────────────────────────────────────────────────────────────
  const barX  = BX + HALF;
  const barCX = barX + BARW / 2;
  ctx.fillStyle = '#e0e0e0'; ctx.fillRect(barX, BY+1, BARW, BH-2);
  ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(barX,       BY+1); ctx.lineTo(barX,       BY+BH-1);
  ctx.moveTo(barX+BARW, BY+1); ctx.lineTo(barX+BARW, BY+BH-1);
  ctx.stroke();

  // ── Triangles ──────────────────────────────────────────────────────────
  ctx.save();
  rrect(ctx, BX+1, BY+1, PLAYW-2, BH-2, 4); ctx.clip();
  for (let pt = 1; pt <= 24; pt++) {
    const cx   = ptCX(pt, flip);
    const top  = isTopHalf(pt);
    const dark = colIdx(pt) % 2 === 0;
    ctx.beginPath();
    if (top) {
      ctx.moveTo(cx - PW/2, TOPTRIY);
      ctx.lineTo(cx + PW/2, TOPTRIY);
      ctx.lineTo(cx,        TOPTRIY + TRIH);
    } else {
      ctx.moveTo(cx - PW/2, BOTTTRIY);
      ctx.lineTo(cx + PW/2, BOTTTRIY);
      ctx.lineTo(cx,        BOTTTRIY - TRIH);
    }
    ctx.closePath();
    ctx.fillStyle = dark ? '#888' : '#e8e8e8'; ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 0.5; ctx.stroke();
  }
  ctx.restore();

  // ── Point number labels ─────────────────────────────────────────────────
  ctx.fillStyle = '#666'; ctx.font = '10px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let pt = 1; pt <= 24; pt++) {
    const cx  = ptCX(pt, flip);
    const y   = isTopHalf(pt) ? TOPNUMY + NUMH/2 : BOTNUMY + NUMH/2;
    ctx.fillText(ptLabel(pt, turn), cx, y);
  }
  ctx.textBaseline = 'alphabetic';

  // ── Checkers on points ──────────────────────────────────────────────────
  const { board, bottomBar, topBar } = state;
  for (let pt = 1; pt <= 24; pt++) {
    if (board[pt].bottom > 0) drawStack(ctx, pt, board[pt].bottom, bottomColor, flip);
    if (board[pt].top    > 0) drawStack(ctx, pt, board[pt].top,    topColor,    flip);
  }

  // ── Bar checkers ────────────────────────────────────────────────────────
  if (bottomBar > 0) drawBarStack(ctx, barCX, bottomBar, bottomColor);
  if (topBar    > 0) drawBarStack(ctx, barCX, topBar,    topColor);

  // ── Left column: score boxes (match play only) ──────────────────────────
  if (state.matchLength > 0) {
    const sh = BH / 2 - 6;
    drawScoreBox(ctx, state.scoreTop,    SCOREX, BY + 2,          SIDEW, sh);
    drawScoreBox(ctx, state.scoreBottom, SCOREX, BY + BH/2 + 4,   SIDEW, sh);
  }

  // ── Right column: bearing-off trays ─────────────────────────────────────
  const trayW = SIDEW, trayH = BH/2 - 6, trayX = BEARX;
  ctx.fillStyle = '#fff';
  ctx.fillRect(trayX, BY+2,          trayW, trayH);
  ctx.fillRect(trayX, BY+BH/2+4,     trayW, trayH);
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
  ctx.strokeRect(trayX, BY+2,         trayW, trayH);
  ctx.strokeRect(trayX, BY+BH/2+4,    trayW, trayH);
  // Top tray = top player off, bottom tray = bottom player off
  drawBornOff(ctx, state.topOff,    topColor,    trayX, BY+2,       trayW, trayH, 'top');
  drawBornOff(ctx, state.bottomOff, bottomColor, trayX, BY+BH/2+4,  trayW, trayH, 'bottom');

  // ── Cube ────────────────────────────────────────────────────────────────
  drawCube(ctx, state, trayX, trayW);

  // ── Dice ────────────────────────────────────────────────────────────────
  if (state.die1 && state.die2) {
    // Bottom rolled → right half, top rolled → left half
    const diceCX   = state.turn === 'bottom' ? RIGHTCX : LEFTCX;
    const dieColor = state.turn === 'bottom' ? bottomColor : topColor;
    const dotColor = state.turn === 'bottom' ? topColor    : bottomColor;
    drawDice(ctx, state.die1, state.die2, diceCX, MIDY, dieColor, dotColor);
  }

  // ── Pip counts ──────────────────────────────────────────────────────────
  const { pipBottom, pipTop } = computePips(state);
  drawPips(ctx, pipBottom, pipTop);
}

// ── Stack: from triangle base toward centre ───────────────────────────────────
function drawStack(ctx, pt, count, color, flip) {
  const cx    = ptCX(pt, flip);
  const top   = isTopHalf(pt);
  const baseY = top ? TOPTRIY : BOTTTRIY;
  const dir   = top ? 1 : -1;
  const MAX = 5, shown = Math.min(count, MAX);
  for (let i = 0; i < shown; i++)
    drawChecker(ctx, cx, baseY + dir * (CR + i * CR * 2), color);
  if (count > MAX) {
    const cy = baseY + dir * (CR + (shown-1) * CR * 2);
    ctx.fillStyle = color === '#ffffff' ? '#222' : '#fff';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(count, cx, cy);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawChecker(ctx, cx, cy, color) {
  ctx.beginPath(); ctx.arc(cx, cy, CR, 0, Math.PI*2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = color === '#ffffff' ? '#444' : '#666';
  ctx.lineWidth = 1.2; ctx.stroke();
}

// ── Bar stack: bottom in lower half, top in upper half ───────────────────────
function drawBarStack(ctx, cx, count, color) {
  const isBottom = (color !== '#ffffff');
  const baseY    = isBottom ? MIDY + CR + 2 : MIDY - CR - 2;
  const dir      = isBottom ? 1 : -1;
  const MAX = 3, shown = Math.min(count, MAX);
  for (let i = 0; i < shown; i++) drawChecker(ctx, cx, baseY + dir*i*CR*2, color);
  if (count > MAX) {
    ctx.fillStyle = '#444'; ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(count, cx, baseY + dir*MAX*CR*2);
    ctx.textBaseline = 'alphabetic';
  }
}

// ── Borne-off dots in trays ───────────────────────────────────────────────────
function drawBornOff(ctx, count, color, tx, ty, tw, th, side) {
  if (count <= 0) return;
  const r = 3, gap = 3, cols = Math.max(1, Math.floor((tw-4)/(r*2+gap)));
  for (let i = 0; i < Math.min(count, 15); i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const cx  = tx + r + 2 + col*(r*2+gap);
    const cy  = side === 'bottom'
      ? ty + th - r - 3 - row*(r*2+gap)
      : ty + r  + 3     + row*(r*2+gap);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.8; ctx.stroke();
  }
}

// ── Cube ──────────────────────────────────────────────────────────────────────
function drawCube(ctx, state, trayX, trayW) {
  if (!state.cubeValue) return;
  const label = String(state.cubeValue);
  const sz = 26, cx = trayX + trayW/2;
  let cy;
  if      (state.cubeOwner === 'centre') cy = MIDY;
  else if (state.cubeOwner === 'bottom') cy = BY + BH - sz/2 - 6;
  else                                   cy = BY + sz/2 + 6;
  rrect(ctx, cx-sz/2, cy-sz/2, sz, sz, 4);
  ctx.fillStyle = '#222'; ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${label.length > 2 ? 9 : 11}px Georgia, serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy); ctx.textBaseline = 'alphabetic';
}

// ── Score box ─────────────────────────────────────────────────────────────────
function drawScoreBox(ctx, score, x, y, w, h) {
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#333'; ctx.font = '11px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(score), x+w/2, y+h/2);
  ctx.textBaseline = 'alphabetic';
}

// ── Dice ──────────────────────────────────────────────────────────────────────
function drawDice(ctx, d1, d2, cx, cy, dieColor, dotColor) {
  const s = 20, gap = 4;
  drawOneDie(ctx, cx-s-gap/2, cy-s/2, s, d1, dieColor, dotColor);
  drawOneDie(ctx, cx+gap/2,   cy-s/2, s, d2, dieColor, dotColor);
}
function drawOneDie(ctx, x, y, s, val, dieColor, dotColor) {
  rrect(ctx, x, y, s, s, 3);
  ctx.fillStyle = dieColor; ctx.fill();
  ctx.strokeStyle = dotColor; ctx.lineWidth = 1; ctx.stroke();
  const pips = {
    1:[[.5,.5]],
    2:[[.28,.28],[.72,.72]],
    3:[[.28,.28],[.5,.5],[.72,.72]],
    4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
    5:[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],
    6:[[.28,.22],[.72,.22],[.28,.5],[.72,.5],[.28,.78],[.72,.78]],
  };
  (pips[val]||[]).forEach(([c,r]) => {
    ctx.beginPath(); ctx.arc(x+s*c, y+s*r, 2, 0, Math.PI*2);
    ctx.fillStyle = dotColor; ctx.fill();
  });
}

// ── Pip counts ────────────────────────────────────────────────────────────────
function drawPips(ctx, pipBottom, pipTop) {
  const fmt = (pip, adv) => {
    const ds = adv === 0 ? '(=)' : adv > 0 ? `(+${adv})` : `(${adv})`;
    return `${pip}  ${ds}`;
  };
  const rx = BX + PLAYW - 5;
  ctx.font = '11px Georgia, serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#888';
  ctx.fillText(fmt(pipTop,    pipTop    - pipBottom), rx, PIPTOPY);
  ctx.fillStyle = '#222';
  ctx.fillText(fmt(pipBottom, pipBottom - pipTop),    rx, PIPBOTY);
  ctx.textBaseline = 'alphabetic';
}
