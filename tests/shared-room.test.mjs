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

test('shared room snapshots hide other player numbers but keep clues visible', () => {
  const room = createRoomState({ roomId: 'room-1', difficulty: 'medium', puzzle, solution, hostId: 'host-token' });
  const host = registerParticipant(room, 'host-token');
  const guest = registerParticipant(room, 'guest-token');

  assert.equal(host.role, 'host');
  assert.equal(guest.role, 'guest');

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

test('shared room rejects changes to clue cells and solved board updates', () => {
  const room = createRoomState({ roomId: 'room-2', difficulty: 'medium', puzzle, solution, hostId: 'host-token' });
  registerParticipant(room, 'host-token');

  assert.throws(() => applyRoomMove(room, 'host-token', { row: 0, col: 0, value: 9 }), /clue/i);

  applyRoomMove(room, 'host-token', { row: 0, col: 2, value: 4 });
  applyRoomMove(room, 'host-token', { row: 0, col: 3, value: 6 });

  const snapshot = buildViewerSnapshot(room, 'host-token');
  assert.equal(snapshot.solved, false);
  assert.equal(snapshot.board[0][2], 4);
  assert.equal(snapshot.board[0][3], 6);
});
