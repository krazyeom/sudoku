const { generatePuzzle } = require('./sudoku.js');

const countdownTimers = new Map();
const ACTIVE_PARTICIPANT_TTL_MS = 15000;

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function createCell(value, ownerId, kind, claims = []) {
  return { value, ownerId, kind, claims };
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
    Array.from({ length: 9 }, () => createCell(null, null, 'empty', [])),
  );
}

function getCellClaims(cell) {
  return Array.isArray(cell.claims) ? cell.claims : [];
}

function syncCellFromClaims(cell) {
  if (cell.kind === 'clue') return;
  const claims = getCellClaims(cell);
  if (claims.length === 0) {
    cell.value = null;
    cell.ownerId = null;
    cell.kind = 'empty';
    cell.claims = [];
    return;
  }
  const latest = claims[claims.length - 1];
  cell.value = latest.value;
  cell.ownerId = latest.participantId;
  cell.kind = 'move';
}

function setCellClaim(cell, participantId, value) {
  const claims = getCellClaims(cell).filter((claim) => claim.participantId !== participantId);
  claims.push({ participantId, value });
  cell.claims = claims;
  syncCellFromClaims(cell);
}

function clearCellClaim(cell, participantId) {
  const before = getCellClaims(cell).length;
  const claims = getCellClaims(cell).filter((claim) => claim.participantId !== participantId);
  cell.claims = claims;
  syncCellFromClaims(cell);
  return before > 0 && claims.length === 0;
}

function elapsedSecondsSince(isoTime) {
  if (!isoTime) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(isoTime).getTime()) / 1000));
}

function markRoomCompleted(room, participantId) {
  if (room.solved) return;
  const participant = room.participants.get(participantId);
  room.solved = true;
  room.completedAt = new Date().toISOString();
  room.completedBy = participantId;
  room.completedByRole = participant?.role ?? null;
  room.completedElapsedSeconds = elapsedSecondsSince(room.startedAt);
}

function countFillableCells(puzzle) {
  return puzzle.flat().filter((cell) => cell === null).length;
}

function isViewerSolved(room, participantId) {
  if (room.phase !== 'playing' || !participantId) return false;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const cell = room.cells[row][col];
      if (cell.kind === 'clue') continue;
      const claim = getCellClaims(cell).find((entry) => entry.participantId === participantId);
      if (!claim || claim.value !== room.solution[row][col]) return false;
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
    completedAt: null,
    completedBy: null,
    completedByRole: null,
    completedElapsedSeconds: null,
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
  room.completedAt = null;
  room.completedBy = null;
  room.completedByRole = null;
  room.completedElapsedSeconds = null;
  room.updatedAt = new Date().toISOString();

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = nextPuzzle.puzzle[row][col];
      if (value === null) continue;
      room.cells[row][col] = createCell(value, 'system', 'clue', []);
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
    const hadClaims = getCellClaims(cell).length;
    const removedLastClaim = clearCellClaim(cell, participantId);
    if (hadClaims > 0 && removedLastClaim) {
      room.filledCells -= 1;
    }
    room.updatedAt = new Date().toISOString();
    const solved = isViewerSolved(room, participantId);
    if (solved) markRoomCompleted(room, participantId);
    return {
      type: 'cell-cleared',
      row,
      col,
      ownerId: participantId,
      solved: room.solved,
      completedAt: room.completedAt,
      completedBy: room.completedBy,
      completedByRole: room.completedByRole,
      completedElapsedSeconds: room.completedElapsedSeconds,
    };
  }

  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error('Invalid value');
  }

  const hadClaims = getCellClaims(cell).length;
  setCellClaim(cell, participantId, value);
  if (hadClaims === 0) room.filledCells += 1;
  room.updatedAt = new Date().toISOString();

  const solved = isViewerSolved(room, participantId);
  if (solved) markRoomCompleted(room, participantId);

  return {
    type: 'cell-updated',
    row,
    col,
    value,
    ownerId: participantId,
    solved: room.solved,
    completedAt: room.completedAt,
    completedBy: room.completedBy,
    completedByRole: room.completedByRole,
    completedElapsedSeconds: room.completedElapsedSeconds,
  };
}

function buildViewerSnapshot(room, participantId = null) {
  refreshRoomPhase(room);
  const viewerRole = computeOwnerRole(room, participantId);
  const isPlaying = room.phase === 'playing';
  const board = isPlaying
    ? room.cells.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          if (cell.kind === 'clue') return cell.value;
          const selfClaim = participantId ? getCellClaims(cell).find((entry) => entry.participantId === participantId) : null;
          if (selfClaim) return selfClaim.value;
          return null;
        }),
      )
    : null;
  const occupancy = isPlaying
    ? room.cells.map((row) =>
        row.map((cell) => {
          if (cell.kind === 'clue') return 'clue';
          const claims = getCellClaims(cell);
          if (claims.length === 0) return 'empty';
          const selfClaim = participantId ? claims.find((entry) => entry.participantId === participantId) : null;
          const otherClaims = claims.filter((entry) => entry.participantId !== participantId);
          if (selfClaim && otherClaims.length > 0) return 'both';
          if (selfClaim) return 'self';
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
    completedAt: room.completedAt,
    completedBy: room.completedBy,
    completedByRole: room.completedByRole,
    completedElapsedSeconds: room.completedElapsedSeconds,
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
