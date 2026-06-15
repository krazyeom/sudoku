const { generatePuzzle } = require('./sudoku.js');

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
  return participant;
}

function disconnectParticipant(room, participantId) {
  const participant = room.participants.get(participantId);
  if (!participant) return;
  participant.connected = false;
  participant.lastSeenAt = new Date().toISOString();
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
}

function applyRoomMove(room, participantId, move) {
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
    return { type: 'cell-cleared', row, col, ownerId: participantId };
  }

  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error('Invalid value');
  }

  const solutionValue = room.solution[row][col];
  if (solutionValue !== value) {
    throw new Error('Incorrect value for this room');
  }
  if (cell.value !== null && cell.ownerId && cell.ownerId !== participantId) {
    throw new Error('Cell already claimed');
  }

  const isNewFill = cell.value === null;
  room.cells[row][col] = createCell(value, participantId, 'move');
  if (isNewFill) room.filledCells += 1;
  room.updatedAt = new Date().toISOString();
  room.solved = room.filledCells >= room.fillableCells;

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
  const viewerRole = computeOwnerRole(room, participantId);
  const board = room.cells.map((row) =>
    row.map((cell) => {
      if (cell.kind === 'clue') return cell.value;
      if (participantId && cell.ownerId === participantId) return cell.value;
      return null;
    }),
  );

  const occupancy = room.cells.map((row) =>
    row.map((cell) => {
      if (cell.kind === 'clue') return 'clue';
      if (cell.value === null) return 'empty';
      if (participantId && cell.ownerId === participantId) return 'self';
      return 'other';
    }),
  );

  return {
    roomId: room.roomId,
    difficulty: room.difficulty,
    clueCount: room.clueCount,
    puzzle: cloneGrid(room.puzzle),
    solution: cloneGrid(room.solution),
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
