/**
 * parseXGID(str)
 *
 * Parses an XGID string strictly according to the spec and returns a plain
 * JS object.  Nothing about rendering, colours or layout is decided here.
 *
 * Spec recap
 * ----------
 * XGID=<board>:<cubeVal>:<cubeOwner>:<turn>:<dice>:<score1>:<score2>:<crawford>:<length>:<maxCube>
 *
 * board  – 26 chars
 *   [0]     Active Player's Bar
 *   [1..24] Points 1-24 from Active Player's perspective (index i → point i)
 *   [25]    Active Player's borne-off tray
 *   Uppercase A-O = Active Player checkers  (A=1 … O=15)
 *   Lowercase a-o = Opponent checkers       (a=1 … o=15)
 *   '-'           = empty
 *
 * "Active Player" = the player whose home board is points 1-6.
 * turn=1  → Active Player is on roll.
 * turn=-1 → Opponent is on roll (position exported mid-turn or cube action).
 *
 * The returned object uses the spec's own vocabulary so callers can reason
 * about the position without guessing what "black" or "mover" means in
 * any particular rendering context.
 */
function parseXGID(str) {
  str = str.trim();
  if (str.toUpperCase().startsWith('XGID=')) str = str.slice(5);

  const parts = str.split(':');
  if (parts.length < 10) throw new Error(`Expected 10 colon-separated fields, got ${parts.length}`);

  const board = parts[0];
  if (board.length !== 26) throw new Error(`Board string must be 26 chars, got ${board.length}`);

  // ── Board array: index 0-25 ─────────────────────────────────────────────
  // points[i] for i=0..25 where:
  //   i=0     → Active Player bar
  //   i=1..24 → point i  (Active Player's point 1 through 24)
  //   i=25    → Active Player off (borne-off)
  // Each entry: { active: number, opponent: number }
  const points = [];
  for (let i = 0; i < 26; i++) {
    const ch   = board[i];
    const code = ch.charCodeAt(0);
    if (ch === '-') {
      points.push({ active: 0, opponent: 0 });
    } else if (code >= 65 && code <= 79) {        // A-O  uppercase → active
      points.push({ active: code - 64, opponent: 0 });
    } else if (code >= 97 && code <= 111) {       // a-o  lowercase → opponent
      points.push({ active: 0, opponent: code - 96 });
    } else {
      throw new Error(`Unexpected character '${ch}' at board index ${i}`);
    }
  }

  // ── Derived totals (validation) ─────────────────────────────────────────
  let activeOnBoard = 0, opponentOnBoard = 0;
  for (let i = 0; i < 26; i++) {
    activeOnBoard   += points[i].active;
    opponentOnBoard += points[i].opponent;
  }
  // Active off is not serialised; derive it.
  const activeOff   = 15 - activeOnBoard;
  const opponentOff = 15 - opponentOnBoard;
  if (activeOff   < 0) throw new Error(`Active player has ${activeOnBoard} checkers on board/bar (>15)`);
  if (opponentOff < 0) throw new Error(`Opponent has ${opponentOnBoard} checkers on board/bar (>15)`);

  // ── Metadata fields ─────────────────────────────────────────────────────
  const cubeValRaw = parseInt(parts[1], 10);
  // cubeVal=0 means cube at 1 (not yet turned).  Otherwise it IS the face value.
  const cubeValue  = Math.pow(2, cubeValRaw);  // 0→1, 1→2, 2→4, 3→8, ...

  const cubeOwner  = parseInt(parts[2], 10); // 1=active, -1=opponent, 0=centred

  const turn       = parseInt(parts[3], 10); // 1=active on roll, -1=opponent on roll

  const diceStr    = parts[4];               // e.g. "63", "00"
  const die1       = parseInt(diceStr[0], 10) || 0;
  const die2       = parseInt(diceStr[1], 10) || 0;

  const scoreActive   = parseInt(parts[5], 10);   // Active Player's match score
  const scoreOpponent = parseInt(parts[6], 10);   // Opponent's match score

  const crawford   = parseInt(parts[7], 10) === 1; // true if Crawford game
  const matchLength = parseInt(parts[8], 10);      // 0 = money game
  const maxCube    = Math.pow(2, parseInt(parts[9], 10)); // max cube face value

  return {
    // Raw board array indexed 0-25 as per spec
    // points[0]     = Active Player bar
    // points[1..24] = board points 1-24
    // points[25]    = Active Player off
    points,

    // Derived
    activeOff,
    opponentOff,

    // Cube
    cubeValue,    // current face value (1 if not turned)
    cubeOwner,    // 1=active owns, -1=opponent owns, 0=centred

    // Turn
    turn,         // 1=active on roll, -1=opponent on roll

    // Dice (sorted descending as per spec, 0/0 = not yet rolled)
    die1,
    die2,

    // Scores
    scoreActive,
    scoreOpponent,
    matchLength,  // 0 = money/unlimited
    crawford,
    maxCube,
  };
}

// Export for use in browser (board.js) and Node (tests)
if (typeof module !== 'undefined') module.exports = { parseXGID };
