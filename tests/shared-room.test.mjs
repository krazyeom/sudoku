import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRoomMove,
  buildViewerSnapshot,
  createRoomState,
  registerParticipant,
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

test('shared room accepts non-solution values but keeps solved false until the board matches', () => {
  const room = createRoomState({ roomId: 'room-2', difficulty: 'medium', puzzle, solution, hostId: 'host-token' });
  registerParticipant(room, 'host-token');

  room.phase = 'playing';
  room.startedAt = new Date().toISOString();
  room.countdownEndsAt = room.startedAt;

  assert.throws(() => applyRoomMove(room, 'host-token', { row: 0, col: 0, value: 9 }), /clue/i);

  assert.doesNotThrow(() => applyRoomMove(room, 'host-token', { row: 0, col: 2, value: 9 }));
  let snapshot = buildViewerSnapshot(room, 'host-token');
  assert.equal(snapshot.board[0][2], 9);
  assert.equal(snapshot.solved, false);

  applyRoomMove(room, 'host-token', { row: 0, col: 2, value: 4 });
  applyRoomMove(room, 'host-token', { row: 0, col: 3, value: 6 });

  snapshot = buildViewerSnapshot(room, 'host-token');
  assert.equal(snapshot.solved, false);
  assert.equal(snapshot.board[0][2], 4);
  assert.equal(snapshot.board[0][3], 6);
});
