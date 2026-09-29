import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRoomMove,
  buildViewerSnapshot,
  createRoomState,
  registerParticipant,
  setBattleMode,
} from '../lib/shared-room.js';

const puzzle = [
  [5, 3, null, null, 7, null, null, null, null],
  [6, null, null, 1, 9, 5, null, null, null],
  [null, 9, 8, null, null, null, null, 6, null],
  [8, null, null, null, 6, null, null, null, 3],
  [4, null, null, 8, null, 3, null, null, 1],
  [7, null, null, null, 2, null, null, null, 6],
  [null, 6, null, null, null, null, 2, 8, null],
  [null, null, null, 4, 1, 9, null, null, 5],
  [null, null, null, null, 8, null, null, 7, 9],
];

const solution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

test('shared room stays hidden in lobby and countdown, then reveals the board when playing', () => {
  const room = createRoomState({ roomId: 'room-0', difficulty: 'medium', puzzle, solution, hostId: 'host-token' });
  const host = registerParticipant(room, 'host-token');
  const hostLobby = buildViewerSnapshot(room, 'host-token');

  assert.equal(host.role, 'host');
  assert.equal(room.phase, 'lobby');
  assert.equal(hostLobby.phase, 'lobby');
  assert.equal(hostLobby.board, null);
  assert.equal(hostLobby.puzzle, null);
  assert.equal(hostLobby.solution, null);

  const guest = registerParticipant(room, 'guest-token');
  const hostCountdown = buildViewerSnapshot(room, 'host-token');
  const guestCountdown = buildViewerSnapshot(room, 'guest-token');

  assert.equal(guest.role, 'guest');
  assert.equal(room.phase, 'countdown');
  assert.equal(hostCountdown.phase, 'countdown');
  assert.equal(guestCountdown.phase, 'countdown');
  assert.equal(hostCountdown.board, null);
  assert.equal(guestCountdown.board, null);
  assert.equal(hostCountdown.puzzle, null);
  assert.equal(guestCountdown.solution, null);

  room.countdownEndsAt = new Date(Date.now() - 1).toISOString();
  const hostPlaying = buildViewerSnapshot(room, 'host-token');
  const guestPlaying = buildViewerSnapshot(room, 'guest-token');

  assert.equal(room.phase, 'playing');
  assert.equal(hostPlaying.phase, 'playing');
  assert.equal(guestPlaying.phase, 'playing');
  assert.equal(hostPlaying.board[0][0], 5);
  assert.equal(guestPlaying.board[0][0], 5);
  assert.equal(hostPlaying.occupancy[0][0], 'clue');
  assert.equal(guestPlaying.occupancy[0][0], 'clue');
});

test('shared room snapshots hide other player numbers but keep clues visible', () => {
  const room = createRoomState({ roomId: 'room-1', difficulty: 'medium', puzzle, solution, hostId: 'host-token' });
  const host = registerParticipant(room, 'host-token');
  const guest = registerParticipant(room, 'guest-token');

  assert.equal(host.role, 'host');
  assert.equal(guest.role, 'guest');

  room.phase = 'playing';
  room.startedAt = new Date().toISOString();
  room.countdownEndsAt = room.startedAt;

  applyRoomMove(room, 'host-token', { row: 0, col: 2, value: 4 });

  const hostSnapshot = buildViewerSnapshot(room, 'host-token');
  const guestSnapshot = buildViewerSnapshot(room, 'guest-token');

  assert.equal(hostSnapshot.board[0][2], 4);
  assert.equal(hostSnapshot.occupancy[0][2], 'self');
  assert.equal(guestSnapshot.board[0][2], null);
  assert.equal(guestSnapshot.occupancy[0][2], 'other');
  assert.equal(guestSnapshot.board[0][0], 5);
  assert.equal(guestSnapshot.occupancy[0][0], 'clue');
});

test('shared room keeps both players numbers in the same cell and marks overlap', () => {
  const room = createRoomState({ roomId: 'room-3', difficulty: 'medium', puzzle, solution, hostId: 'host-token' });
  registerParticipant(room, 'host-token');
  registerParticipant(room, 'guest-token');

  room.phase = 'playing';
  room.startedAt = new Date().toISOString();
  room.countdownEndsAt = room.startedAt;

  applyRoomMove(room, 'host-token', { row: 0, col: 2, value: 4 });
  applyRoomMove(room, 'guest-token', { row: 0, col: 2, value: 9 });

  const hostSnapshot = buildViewerSnapshot(room, 'host-token');
  const guestSnapshot = buildViewerSnapshot(room, 'guest-token');

  assert.equal(room.filledCells, 1);
  assert.equal(hostSnapshot.board[0][2], 4);
  assert.equal(guestSnapshot.board[0][2], 9);
  assert.equal(hostSnapshot.occupancy[0][2], 'both');
  assert.equal(guestSnapshot.occupancy[0][2], 'both');

  applyRoomMove(room, 'guest-token', { row: 0, col: 2, value: null });
  const afterClearHostSnapshot = buildViewerSnapshot(room, 'host-token');

  assert.equal(afterClearHostSnapshot.board[0][2], 4);
  assert.equal(afterClearHostSnapshot.occupancy[0][2], 'self');
});

test('shared room completion is broadcast to both players', () => {
  const solvedPuzzle = solution.map((row) => row.slice());
  solvedPuzzle[0][0] = null;
  const room = createRoomState({ roomId: 'room-4', difficulty: 'medium', puzzle: solvedPuzzle, solution, hostId: 'host-token' });
  registerParticipant(room, 'host-token');
  registerParticipant(room, 'guest-token');

  room.phase = 'playing';
  room.startedAt = new Date().toISOString();
  room.countdownEndsAt = room.startedAt;

  const result = applyRoomMove(room, 'host-token', { row: 0, col: 0, value: 5 });
  assert.equal(result.solved, true);
  assert.equal(room.solved, true);
  assert.equal(room.completedBy, 'host-token');
  assert.equal(room.completedByRole, 'host');
  assert.equal(typeof room.completedAt, 'string');
  assert.equal(typeof room.completedElapsedSeconds, 'number');

  const hostSnapshot = buildViewerSnapshot(room, 'host-token');
  const guestSnapshot = buildViewerSnapshot(room, 'guest-token');

  assert.equal(hostSnapshot.solved, true);
  assert.equal(guestSnapshot.solved, true);
  assert.equal(hostSnapshot.completedAt, guestSnapshot.completedAt);
  assert.equal(hostSnapshot.completedBy, 'host-token');
  assert.equal(guestSnapshot.completedBy, 'host-token');
  assert.equal(hostSnapshot.completedElapsedSeconds, guestSnapshot.completedElapsedSeconds);
  assert.equal(hostSnapshot.board[0][0], 5);
  assert.equal(guestSnapshot.board[0][0], null);
});

test('shared room generates attack debuff when row, col, or box is completed in battle modes', () => {
  // Setup a puzzle where row 0 only needs col 8 to complete, but row 8 has an empty cell
  const almostRow0Puzzle = solution.map((r) => r.slice());
  almostRow0Puzzle[0][8] = null;
  almostRow0Puzzle[8][8] = null;

  const room = createRoomState({
    roomId: 'room-battle-hard',
    difficulty: 'medium',
    puzzle: almostRow0Puzzle,
    solution,
    hostId: 'host-token',
    battleMode: 'hard',
  });
  registerParticipant(room, 'host-token');
  registerParticipant(room, 'guest-token');

  room.phase = 'playing';
  room.startedAt = new Date().toISOString();
  room.countdownEndsAt = room.startedAt;

  // Filling incorrect number does NOT trigger attack
  const wrongMove = applyRoomMove(room, 'host-token', { row: 0, col: 8, value: 7 });
  assert.equal(wrongMove.completedUnits.length, 0);
  assert.equal(wrongMove.attack, null);

  // Clearing cell does not trigger attack
  applyRoomMove(room, 'host-token', { row: 0, col: 8, value: null });

  // Filling the correct number completes row 0, col 8, and box 2!
  const correctVal = solution[0][8]; // 2
  const moveResult = applyRoomMove(room, 'host-token', { row: 0, col: 8, value: correctVal });

  assert.ok(moveResult.completedUnits.length > 0);
  assert.ok(moveResult.attack !== null);
  assert.equal(moveResult.attack.attackerId, 'host-token');
  assert.equal(moveResult.attack.battleMode, 'hard');
  assert.ok(['freeze', 'scramble', 'blind', 'quake'].includes(moveResult.attack.debuffType));
  assert.ok(moveResult.attack.durationMs > 0);

  // Clearing and refilling does NOT re-trigger attack for already completed units (anti-spam protection)
  applyRoomMove(room, 'host-token', { row: 0, col: 8, value: null });
  const repeatMove = applyRoomMove(room, 'host-token', { row: 0, col: 8, value: correctVal });
  assert.equal(repeatMove.completedUnits.length, 0);
  assert.equal(repeatMove.attack, null);
});

test('battleMode "off" does not produce attack debuffs', () => {
  const almostRow0Puzzle = solution.map((r) => r.slice());
  almostRow0Puzzle[0][8] = null;
  almostRow0Puzzle[8][8] = null;

  const room = createRoomState({
    roomId: 'room-battle-off',
    difficulty: 'medium',
    puzzle: almostRow0Puzzle,
    solution,
    hostId: 'host-token',
    battleMode: 'off',
  });
  registerParticipant(room, 'host-token');
  registerParticipant(room, 'guest-token');

  room.phase = 'playing';
  room.startedAt = new Date().toISOString();
  room.countdownEndsAt = room.startedAt;

  const result = applyRoomMove(room, 'host-token', { row: 0, col: 8, value: solution[0][8] });
  assert.ok(result.completedUnits.length > 0);
  assert.equal(result.attack, null); // attack is suppressed in 'off' mode
});

test('setBattleMode correctly updates room state and snapshot', () => {
  const room = createRoomState({ roomId: 'room-mode-test', hostId: 'host-token' });
  assert.equal(room.battleMode, 'normal');

  setBattleMode(room, 'hard');
  assert.equal(room.battleMode, 'hard');

  const snapshot = buildViewerSnapshot(room, 'host-token');
  assert.equal(snapshot.battleMode, 'hard');

  setBattleMode(room, 'off');
  assert.equal(room.battleMode, 'off');
});
