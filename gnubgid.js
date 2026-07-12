/**
 * parseGnuBGID(str)
 *
 * Parses a GNU Backgammon ID string and returns the same object structure
 * as parseXGID() — so board.js / buildRenderState() needs no changes.
 *
 * Format: "<PositionID>:<MatchID>"
 *   PositionID — 14 Base64 characters (80 data bits packed into 10 bytes)
 *   MatchID    — 12 Base64 characters (66 data bits packed into 9 bytes)
 *
 * Reference: http://www.gnubg.org/documentation/doku.php?id=appendix
 *
 * ── Base64 alphabet ───────────────────────────────────────────────────────────
 * Standard: A–Z=0–25, a–z=26–51, 0–9=52–61, +=62, /=63
 *
 * ── Bit packing (same for both IDs) ──────────────────────────────────────────
 * 1. Each Base64 character → 6-bit value, written MSB-first into a raw bit stream.
 * 2. Raw bit stream packed into bytes MSB-first per byte → original byte array.
 * 3. Fields read from bytes in LITTLE-ENDIAN order:
 *      bit 1 (spec) = LSB of byte 0 = readBit(bytes, 0).
 *
 * ── Position ID (10 bytes = 80 bits) ─────────────────────────────────────────
 * Bits  0–39: player ON ROLL (bottom/active in our display)
 * Bits 40–79: player NOT ON ROLL (top/opponent)
 *
 * Each 40-bit block encodes 25 zones in order:
 *   zone 0 = player's pt 1 (their ace point / home)
 *   zone 1 = player's pt 2
 *   ...
 *   zone 23 = player's pt 24 (their far point)
 *   zone 24 = player's bar
 * Encoding: one '1' bit per checker in the current zone, then one '0' to
 * advance to the next zone. (15 ones + 25 zeros = 40 bits.)
 *
 * Mapping to absolute point numbers (points[1..24] in our system):
 *   On-roll zone Z  → absolute pt (Z+1)   [they move 1→24 from their home]
 *   Not-on-roll Z   → absolute pt (24−Z)  [opponent moves in reverse]
 *
 * ── Match ID (9 bytes = 66 bits used) ────────────────────────────────────────
 * Bit offsets (0-indexed, LSB of byte 0 = bit 0):
 *   0– 3  cube value (log₂): 0→1, 1→2, 2→4 …
 *   4– 5  cube owner: 00=player0(active/bottom), 01=player1(opponent/top), 11=centred
 *   6     dice owner: 0=player0 on roll, 1=player1 on roll
 *   7     Crawford flag
 *   8–10  game state: 000=none, 001=playing, 010=over, 011=resigned, 100=dropped
 *   11    turn owner
 *   12    double offered
 *   13–14 resign offered
 *   15–17 die 1 (0=not rolled, 1–6=face value)
 *   18–20 die 2
 *   21–35 match length (15-bit integer; 0=money game)
 *   36–50 player 0 score
 *   51–65 player 1 score
 */

const GNUBG_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// ── Core: Base64 string → byte array ─────────────────────────────────────────
function b64ToBytes(str, nChars, nBytes) {
  // 1. Each char → 6-bit value, written MSB-first into raw bit stream
  const raw = [];
  for (let i = 0; i < nChars; i++) {
    const ch  = i < str.length ? str[i] : 'A';
    const val = GNUBG_B64.indexOf(ch);
    if (val === -1) throw new Error(`Invalid GnuBG Base64 character: '${ch}'`);
    for (let b = 5; b >= 0; b--) raw.push((val >> b) & 1);
  }
  // 2. Pack raw bits into bytes MSB-first per byte
  const bytes = [];
  for (let i = 0; i < nBytes; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte |= ((raw[i * 8 + b] || 0) << (7 - b));
    bytes.push(byte);
  }
  return bytes;
}

// ── Read a little-endian integer from a byte array ────────────────────────────
// bit 0 = LSB of byte[0], bit 8 = LSB of byte[1], etc.
function readInt(bytes, bitStart, len) {
  let val = 0;
  for (let i = 0; i < len; i++) {
    const byteIdx = Math.floor((bitStart + i) / 8);
    const bitIdx  = (bitStart + i) % 8;
    if ((bytes[byteIdx] >> bitIdx) & 1) val |= (1 << i);
  }
  return val;
}

// ── Decode one 40-bit player block into 25 zone counts ───────────────────────
function decodeZones(bytes, startBit) {
  const zones = new Array(25).fill(0); // [pt1..pt24, bar]
  let zone = 0, bit = startBit;
  const end = startBit + 40;
  while (zone < 25 && bit < end) {
    const byteIdx = Math.floor(bit / 8);
    const bitIdx  = bit % 8;
    if ((bytes[byteIdx] >> bitIdx) & 1) { zones[zone]++; bit++; }
    else                                { zone++;         bit++; }
  }
  return zones;
}

// ── Main parser ───────────────────────────────────────────────────────────────
function parseGnuBGID(str) {
  str = str.trim();
  const sep = str.indexOf(':');
  if (sep === -1)
    throw new Error('GnuBG ID must contain ":" separating Position ID and Match ID');

  const posStr   = str.slice(0, sep);
  const matchStr = str.slice(sep + 1);

  if (posStr.length   !== 14) throw new Error(`Position ID must be 14 chars (got ${posStr.length})`);
  if (matchStr.length !== 12) throw new Error(`Match ID must be 12 chars (got ${matchStr.length})`);

  // ── Decode match first (needed to know diceOwner before mapping position) ──
  const matchBytes = b64ToBytes(matchStr, 12, 9);

  const cubeValLog2  = readInt(matchBytes,  0, 4);
  const cubeOwnerRaw = readInt(matchBytes,  4, 2); // 00=p0(top), 01=p1(bottom), 11=centred
  const diceOwner    = readInt(matchBytes,  6, 1); // 0=p0 on roll, 1=p1 on roll
  const crawfordBit  = readInt(matchBytes,  7, 1);
  const die1         = readInt(matchBytes, 15, 3); // 0=not rolled
  const die2         = readInt(matchBytes, 18, 3);
  const matchLength  = readInt(matchBytes, 21, 15); // 0=money game
  const score0       = readInt(matchBytes, 36, 15); // player 0 (bottom) score
  const score1       = readInt(matchBytes, 51, 15); // player 1 (top) score

  // ── Decode position ─────────────────────────────────────────────────────────
  const posBytes = b64ToBytes(posStr, 14, 10);

  const onRollZones    = decodeZones(posBytes,  0);
  const notOnRollZones = decodeZones(posBytes, 40);

  // Build points[0..25]: 0=bar, 1..24=absolute pts, 25=off tray
  const points = [];
  for (let i = 0; i <= 25; i++) points.push({ active: 0, opponent: 0 });

  // GnuBG player 0 = bottom player (active in our display), always.
  // GnuBG player 1 = top player (opponent in our display), always.
  //
  // The position is encoded from the ON-ROLL player's perspective.
  // When diceOwner=0: on-roll = player 0 = bottom → on-roll zones go to active.
  // When diceOwner=1: on-roll = player 1 = top   → on-roll zones go to opponent,
  //   and the board perspective is from player 1's POV, so we must mirror.
  //
  // In both cases, a player's zone Z = their pt(Z+1).
  // Player 0 (bottom): zone Z → absolute pt (Z+1)   [moves pt1→pt24]
  // Player 1 (top):    zone Z → absolute pt (24-Z)  [moves pt24→pt1 from their view]

  // GnuBG: player 1 = bottom player (active), player 0 = top player (opponent).
  // diceOwner=1 → player 1 (bottom) on roll → on-roll zones = active/bottom.
  // diceOwner=0 → player 0 (top) on roll    → on-roll zones = opponent/top.
  if (diceOwner === 1) {
    // on-roll = player 1 = bottom/active
    for (let z = 0; z < 24; z++) points[z + 1].active   = onRollZones[z];
    points[0].active   = onRollZones[24];    // bar
    for (let z = 0; z < 24; z++) points[24 - z].opponent = notOnRollZones[z];
    points[0].opponent = notOnRollZones[24]; // bar
  } else {
    // on-roll = player 0 = top/opponent
    for (let z = 0; z < 24; z++) points[24 - z].opponent = onRollZones[z];
    points[0].opponent = onRollZones[24];    // bar
    for (let z = 0; z < 24; z++) points[z + 1].active    = notOnRollZones[z];
    points[0].active   = notOnRollZones[24]; // bar
  }

  const cubeValue = Math.pow(2, cubeValLog2);

  // Cube owner → our convention: 1=active/bottom, -1=opponent/top, 0=centred
  const cubeOwner = cubeOwnerRaw === 3 ? 0
                  : cubeOwnerRaw === 1 ? 1
                  :                     -1;

  // Turn: diceOwner 0=p0(bottom) rolled → turn=1; 1=p1(top) rolled → turn=-1
  // Turn: diceOwner=1 → p1(bottom) rolled → turn=1; diceOwner=0 → p0(top) rolled → turn=-1
  const turn = diceOwner === 1 ? 1 : -1;

  // Derive borne-off counts (15 minus all on-board + bar checkers)
  let activeOnBoard = 0, opponentOnBoard = 0;
  for (let i = 0; i <= 25; i++) {
    activeOnBoard   += points[i].active;
    opponentOnBoard += points[i].opponent;
  }
  const activeOff   = 15 - activeOnBoard;
  const opponentOff = 15 - opponentOnBoard;

  if (activeOff   < 0) throw new Error('Active player checker count exceeds 15');
  if (opponentOff < 0) throw new Error('Opponent checker count exceeds 15');

  return {
    points,
    activeOff,
    opponentOff,
    cubeValue,
    cubeOwner,
    turn,
    die1,
    die2,
    scoreActive:   score1,  // p1 = bottom/active
    scoreOpponent: score0,  // p0 = top/opponent
    matchLength,
    crawford: crawfordBit === 1,
  };
}

if (typeof module !== 'undefined') module.exports = { parseGnuBGID };
