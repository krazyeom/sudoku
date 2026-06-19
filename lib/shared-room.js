const { generatePuzzle } = require('./sudoku.js');

const countdownTimers = new Map();
const ACTIVE_PARTICIPANT_TTL_MS = 15000;

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function createCell(value, ownerId, kind) {
  return { value, ownerId, kind };
}

function makeId(prefix) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let suffix = '';
  for (let index = 0; index < 8; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}

function createEmptyCells() {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => createCell(null, null, 'empty')),
  );
}

function countFillableCells(puzzle) {
  return puzzle.flat().filter((cell) => cell === null).length;
}

function isRoomSolved(room) {
  if (room.filledCells < room.fillableCells) return false;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const cell = room.cells[row][col];
      if (cell.kind === 'clue') continue;
      if (cell.value !== room.solution[row][col]) return false;
    }
  }
  return true;
}

function getConnectedActiveCount(room) {
  const now = Date.now();
  let activeCount = 0;
  for (const participant of room.participants.values()) {
    if (participant.connected && participant.lastSeenAt) {
      const lastSeenAt = new Date(participant.lastSeenAt).getTime();
      if (Number.isFinite(lastSeenAt) && now - lastSeenAt > ACTIVE_PARTICIPANT_TTL_MS) {
        participant.connected = false;
      }
    }
    if (participant.connected && participant.role !== 'spectator') {
      activeCount += 1;
    }
  }
  return activeCount;
}

function clearCountdownTimer(roomId) {
  const timer = countdownTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    countdownTimers.delete(roomId);
  }
}

function notifyRoom(room) {
  if (typeof room.onStateChange === 'function') {
    room.onStateChange(room);
  }
}

function startCountdown(room) {
  clearCountdownTimer(room.roomId);
  const now = new Date().toISOString();
  room.phase = 'countdown';
  room.countdownEndsAt = new Date(Date.now() + 5000).toISOString();
  room.startedAt = null;
  room.updatedAt = now;
  notifyRoom(room);

  const timer = setTimeout(() => {
    countdownTimers.delete(room.roomId);
    const activeRoom = room;
    if (!activeRoom || activeRoom.phase !== 'countdown') return;
    if (getConnectedActiveCount(activeRoom) < 2) {
      refreshRoomPhase(activeRoom);
      return;
    }
    const countdownEndsAt = activeRoom.countdownEndsAt ? new Date(activeRoom.countdownEndsAt).getTime() : 0;
    if (Date.now() < countdownEndsAt) {
      const delay = Math.max(0, countdownEndsAt - Date.now());
      countdownTimers.set(activeRoom.roomId, setTimeout(() => {
        countdownTimers.delete(activeRoom.roomId);
        refreshRoomPhase(activeRoom);
      }, delay));
      return;
    }
    startPlaying(activeRoom);
    notifyRoom(activeRoom);
  }, 5000);

  countdownTimers.set(room.roomId, timer);
}

function startPlaying(room) {
  clearCountdownTimer(room.roomId);
  room.phase = 'playing';
  if (!room.startedAt) {
    room.startedAt = new Date().toISOString();
  }
  room.countdownEndsAt = room.countdownEndsAt ?? room.startedAt;
  room.updatedAt = new Date().toISOString();
  notifyRoom(room);
}

function resetToLobby(room) {
  clearCountdownTimer(room.roomId);
  room.phase = 'lobby';
  room.countdownEndsAt = null;
  room.startedAt = null;
  room.updatedAt = new Date().toISOString();
  notifyRoom(room);
}

function refreshRoomPhase(room) {
  const activeCount = getConnectedActiveCount(room);
  if (room.phase === 'playing') {
    return;
  }
  if (room.phase === 'countdown') {
    if (activeCount < 2) {
      resetToLobby(room);
      return;
    }
    const countdownEndsAt = room.countdownEndsAt ? new Date(room.countdownEndsAt).getTime() : 0;
    if (Date.now() >= countdownEndsAt) {
      startPlaying(room);
    }
    return;
  }
  if (activeCount >= 2) {
    startCountdown(room);
  }
}

function computeOwnerRole(room, participantId) {
  if (!participantId) return 'spectator';
  const participant = room.participants.get(participantId);
  if (!participant) return 'spectator';
  return participant.role;
}

function createRoomState(options = {}) {
  const puzzleData = options.puzzle && options.solution
    ? {
        puzzle: cloneGrid(options.puzzle),
        solution: cloneGrid(options.solution),
        clueCount: options.puzzle.flat().filter((cell) => cell !== null).length,
        difficulty: options.difficulty ?? 'medium',
      }
    : generatePuzzle(options.difficulty ?? 'medium');

  const roomId = options.roomId ?? makeId('room');
  const hostId = options.hostId ?? makeId('p');
  const cells = createEmptyCells();
  let filledCells = 0;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = puzzleData.puzzle[row][col];
      if (value === null) continue;
      cells[row][col] = createCell(value, 'system', 'clue');
    }
  }

  const room = {
    roomId,
    difficulty: puzzleData.difficulty,
    puzzle: puzzleData.puzzle,
    solution: puzzleData.solution,
    clueCount: puzzleData.clueCount,
    cells,
    participants: new Map(),
    phase: 'lobby',
    countdownEndsAt: null,
    startedAt: null,
    solved: false,
    filledCells,
    fillableCells: countFillableCells(puzzleData.puzzle),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  room.participants.set(hostId, {
    id: hostId,
    role: 'host',
    connected: true,
    joinedAt: new Date().toISOString(),
  });

  return room;
}

function registerParticipant(room, participantId) {
  const existing = room.participants.get(participantId);
  if (existing) {
    existing.connected = true;
    existing.lastSeenAt = new Date().toISOString();
    refreshRoomPhase(room);
    return existing;
  }

  const roleCounts = Array.from(room.participants.values()).reduce(
    (counts, participant) => {
      if (participant.role === 'host') counts.host += 1;
      else if (participant.role === 'guest') counts.guest += 1;
      return counts;
    },
    { host: 0, guest: 0 },
  );

  const role = roleCounts.guest === 0 && roleCounts.host > 0 ? 'guest' : roleCounts.host === 0 ? 'host' : 'spectator';
  const participant = {
    id: participantId,
    role,
    connected: true,
    joinedAt: new Date().toISOString(),
  };
  room.participants.set(participantId, participant);
  refreshRoomPhase(room);
  return participant;
}

function disconnectParticipant(room, participantId) {
  const participant = room.participants.get(participantId);
  if (!participant) return;
  participant.connected = false;
  participant.lastSeenAt = new Date().toISOString();
  refreshRoomPhase(room);
}

function resetRoom(room, options = {}) {
  const nextPuzzle = options.puzzle && options.solution
    ? {
        puzzle: cloneGrid(options.puzzle),
        solution: cloneGrid(options.solution),
        clueCount: options.puzzle.flat().filter((cell) => cell !== null).length,
        difficulty: options.difficulty ?? room.difficulty,
      }
    : generatePuzzle(options.difficulty ?? room.difficulty);

  room.difficulty = nextPuzzle.difficulty;
  room.puzzle = nextPuzzle.puzzle;
  room.solution = nextPuzzle.solution;
  room.clueCount = nextPuzzle.clueCount;
  room.cells = createEmptyCells();
  room.filledCells = 0;
  room.fillableCells = countFillableCells(nextPuzzle.puzzle);
  room.solved = false;
  room.updatedAt = new Date().toISOString();

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = nextPuzzle.puzzle[row][col];
      if (value === null) continue;
      room.cells[row][col] = createCell(value, 'system', 'clue');
    }
  }

  resetToLobby(room);
  refreshRoomPhase(room);
}

function applyRoomMove(room, participantId, move) {
  if (room.phase !== 'playing') {
    throw new Error('Room is not ready yet');
  }
  if (room.solved) {
    throw new Error('Room already solved');
  }

  const participant = room.participants.get(participantId);
  if (!participant) {
    throw new Error('Unknown participant');
  }
  if (participant.role === 'spectator') {
    throw new Error('Spectator cannot edit the room');
  }

  const { row, col, value } = move;
  const cell = room.cells[row]?.[col];
  if (!cell) {
    throw new Error('Invalid cell');
  }
  if (cell.kind === 'clue') {
    throw new Error('Cannot edit a clue cell');
  }

  if (value === null) {
    if (cell.ownerId && cell.ownerId !== participantId) {
      throw new Error('Cannot clear another player\'s cell');
    }
    if (cell.value !== null) {
      room.filledCells -= 1;
    }
    room.cells[row][col] = createCell(null, null, 'empty');
    room.updatedAt = new Date().toISOString();
    room.solved = isRoomSolved(room);
    return { type: 'cell-cleared', row, col, ownerId: participantId };
  }

  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error('Invalid value');
  }

  const isNewFill = cell.value === null;
  room.cells[row][col] = createCell(value, participantId, 'move');
  if (isNewFill) room.filledCells += 1;
  room.updatedAt = new Date().toISOString();
  room.solved = isRoomSolved(room);

  return {
    type: 'cell-updated',
    row,
    col,
    value,
    ownerId: participantId,
    solved: room.solved,
  };
}

function buildViewerSnapshot(room, participantId = null) {
  refreshRoomPhase(room);
  const viewerRole = computeOwnerRole(room, participantId);
  const isPlaying = room.phase === 'playing';
  const board = isPlaying
    ? room.cells.map((row) =>
        row.map((cell) => {
          if (cell.kind === 'clue') return cell.value;
          if (participantId && cell.ownerId === participantId) return cell.value;
          return null;
        }),
      )
    : null;
  const occupancy = isPlaying
    ? room.cells.map((row) =>
        row.map((cell) => {
          if (cell.kind === 'clue') return 'clue';
          if (cell.value === null) return 'empty';
          if (participantId && cell.ownerId === participantId) return 'self';
          return 'other';
        }),
      )
    : null;

  return {
    roomId: room.roomId,
    difficulty: room.difficulty,
    clueCount: room.clueCount,
    phase: room.phase,
    countdownEndsAt: room.countdownEndsAt,
    startedAt: room.startedAt,
    puzzle: isPlaying ? cloneGrid(room.puzzle) : null,
    solution: isPlaying ? cloneGrid(room.solution) : null,
    board,
    occupancy,
    solved: room.solved,
    viewerRole,
    participants: Array.from(room.participants.values()).map((participant) => ({
      id: participant.id,
      role: participant.role,
      connected: participant.connected,
      joinedAt: participant.joinedAt,
      lastSeenAt: participant.lastSeenAt ?? null,
    })),
    updatedAt: room.updatedAt,
  };
}


module.exports = {
  createRoomState,
  registerParticipant,
  disconnectParticipant,
  resetRoom,
  applyRoomMove,
  buildViewerSnapshot,
};
