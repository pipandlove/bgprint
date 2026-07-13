/**
 * encode.js
 *
 * Converts a parsed position object (from xgid.js or gnubgid.js) back into
 * an XGID string or a GnuBG ID string.
 *
 * Both encoders are the exact inverse of their respective parsers.
 */

// ── XGID encoder ──────────────────────────────────────────────────────────────
function toXGID(parsed) {
  const pos = [];
  for (let i = 0; i < 26; i++) {
    const { active, opponent } = parsed.points[i];
    if      (active   > 0) pos.push(String.fromCharCode(64 + active));   // A-O
    else if (opponent > 0) pos.push(String.fromCharCode(96 + opponent)); // a-o
    else                   pos.push('-');
  }
  const cubeLog  = Math.round(Math.log2(Math.max(1, parsed.cubeValue)));
  const co       = parsed.cubeOwner; // 1=active, -1=opponent, 0=centred
  const turn     = parsed.turn;
  const dice     = (parsed.die1 && parsed.die2)
                   ? `${parsed.die1}${parsed.die2}` : '00';
  const matchLen = parsed.matchLength || 0;
  const crawford = parsed.crawford ? 1 : 0;
  const score0   = parsed.scoreActive   || 0;
  const score1   = parsed.scoreOpponent || 0;

  return `XGID=${pos.join('')}:${cubeLog}:${co}:${turn}:${dice}:${score0}:${score1}:${crawford}:${matchLen}:${cubeLog}`;
}

// ── GnuBG encoder ─────────────────────────────────────────────────────────────
const ENCODE_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToB64(bytes, nChars) {
  // Pack bytes MSB-first into a raw bit stream, then group into 6-bit Base64 chars
  const raw = [];
  for (const byte of bytes)
    for (let b = 7; b >= 0; b--) raw.push((byte >> b) & 1);
  let s = '';
  for (let i = 0; i < nChars; i++) {
    let v = 0;
    for (let b = 0; b < 6; b++) v = (v << 1) | (raw[i * 6 + b] || 0);
    s += ENCODE_B64[v];
  }
  return s;
}

function encodeZones(zones) {
  // 25 zones: [pt1, pt2, ..., pt24, bar]
  // Each checker = 1 bit, zone separator = 0 bit → 40 bits total
  const bits = [];
  for (let z = 0; z < 25; z++) {
    for (let c = 0; c < zones[z]; c++) bits.push(1);
    if (z < 24) bits.push(0); // separator (not after the last zone)
  }
  while (bits.length < 40) bits.push(0);
  return bits.slice(0, 40);
}

function packBits(bits, nBytes) {
  // Pack bit array into bytes LSB-first (bit[0] = LSB of byte[0])
  const bytes = [];
  for (let i = 0; i < nBytes; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte |= ((bits[i * 8 + b] || 0) << b);
    bytes.push(byte);
  }
  return bytes;
}

function encodeGnuBGPosition(parsed) {
  // p1 (bottom, moves 1→24): zone Z = abs pt (Z+1)
  const p1Zones = new Array(25).fill(0);
  for (let pt = 1; pt <= 24; pt++) p1Zones[pt - 1] = parsed.points[pt].active;
  p1Zones[24] = (parsed.points[0].active || 0) + (parsed.points[25]?.active || 0); // bar (i=0 and i=25 both encode bar)

  // p0 (top, moves 24→1): zone Z = abs pt (24-Z)
  const p0Zones = new Array(25).fill(0);
  for (let pt = 1; pt <= 24; pt++) p0Zones[24 - pt] = parsed.points[pt].opponent;
  p0Zones[24] = parsed.points[0].opponent; // bar

  // bits 0-39 = not-on-roll player, bits 40-79 = on-roll player
  // turn=1 → p1(bottom) on roll; turn=-1 → p0(top) on roll
  let norBits, onrBits;
  if (parsed.turn === 1) {
    norBits = encodeZones(p0Zones); // p0 not on roll
    onrBits = encodeZones(p1Zones); // p1 on roll
  } else {
    norBits = encodeZones(p1Zones); // p1 not on roll
    onrBits = encodeZones(p0Zones); // p0 on roll
  }

  const allBits = [...norBits, ...onrBits];
  const posBytes = packBits(allBits, 10);
  return bytesToB64(posBytes, 14);
}

function encodeGnuBGMatch(parsed) {
  const bytes = new Array(9).fill(0);

  function writeBit(bitIdx, val) {
    if (val) bytes[Math.floor(bitIdx / 8)] |= (1 << (bitIdx % 8));
  }
  function writeInt(bitIdx, len, val) {
    for (let i = 0; i < len; i++) writeBit(bitIdx + i, (val >> i) & 1);
  }

  const cubeLog      = Math.round(Math.log2(Math.max(1, parsed.cubeValue)));
  // cubeOwner: 1=bottom=p1 → raw=1; -1=top=p0 → raw=0; 0=centred → raw=3
  const cubeOwnerRaw = parsed.cubeOwner === 0 ? 3
                     : parsed.cubeOwner === 1 ? 1
                     :                          0;
  // diceOwner: turn=1 → bottom(p1) rolled → 1; turn=-1 → top(p0) rolled → 0
  const diceOwner    = parsed.turn === 1 ? 1 : 0;

  writeInt(0,  4, cubeLog);
  writeInt(4,  2, cubeOwnerRaw);
  writeBit(6,     diceOwner);
  writeBit(7,     parsed.crawford ? 1 : 0);
  writeInt(8,  3, 1); // gameState = 1 (in progress)
  writeInt(15, 3, parsed.die1  || 0);
  writeInt(18, 3, parsed.die2  || 0);
  writeInt(21, 15, parsed.matchLength  || 0);
  writeInt(36, 15, parsed.scoreOpponent || 0); // score0 = p0 = top
  writeInt(51, 15, parsed.scoreActive   || 0); // score1 = p1 = bottom

  return bytesToB64(bytes, 12);
}

function toGnuBGID(parsed) {
  return encodeGnuBGPosition(parsed) + ':' + encodeGnuBGMatch(parsed);
}

if (typeof module !== 'undefined') module.exports = { toXGID, toGnuBGID };
