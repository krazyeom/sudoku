import type { Connection, Room, Server } from 'partykit/server';

type Difficulty = 'easy' | 'medium' | 'hard';
type CellKind = 'empty' | 'clue' | 'move';
type Cell = { value: number | null; ownerId: string | null; kind: CellKind };
type PuzzleGrid = (number | null)[][];
type SolvedGrid = number[][];
type ParticipantRole = 'host' | 'guest' | 'spectator';
type Participant = {
  id: string;
  role: ParticipantRole;
  connected: boolean;
  joinedAt: string;
  lastSeenAt?: string | null;
};
type RoomState = {
  roomId: string;
  difficulty: Difficulty;
  puzzle: PuzzleGrid;
  solution: SolvedGrid;
  clueCount: number;
  cells: Cell[][];
  participants: Record<string, Participant>;
  solved: boolean;
  filledCells: number;
  fillableCells: number;
  createdAt: string;
  updatedAt: string;
};

const STATE_KEY = 'state';

function cloneGrid<T>(grid: T[][]): T[][] {
  return grid.map((row) => [...row]);
}

function shuffle<T>(values: T[]): T[] {
  const array = [...values];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

const BASE_PATTERN = (row: number, col: number) => ((row * 3 + Math.floor(row / 3) + col) % 9) + 1;

function buildSolvedGrid(): number[][] {
  const rowGroups = shuffle([0, 1, 2]);
  const colGroups = shuffle([0, 1, 2]);
  const rows = rowGroups.flatMap((group) => shuffle([0, 1, 2]).map((offset) => group * 3 + offset));
  const cols = colGroups.flatMap((group) => shuffle([0, 1, 2]).map((offset) => group * 3 + offset));
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const digitMap = new Map(digits.map((digit, index) => [index + 1, digit]));

  return rows.map((row) =>
    cols.map((col) => {
      const base = BASE_PATTERN(row, col);
      return digitMap.get(base) ?? base;
    }),
  );
}

function getCandidates(grid: PuzzleGrid, row: number, col: number): number[] {
  if (grid[row][col] !== null) return [];
  const used = new Set<number>();

  for (let i = 0; i < 9; i += 1) {
    const rowValue = grid[row][i];
    const colValue = grid[i][col];
    if (rowValue !== null) used.add(rowValue);
    if (colValue !== null) used.add(colValue);
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      const value = grid[r][c];
      if (value !== null) used.add(value);
    }
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((value) => !used.has(value));
}

function findBestCell(grid: PuzzleGrid) {
  let best: { row: number; col: number; candidates: number[] } | null = null;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (grid[row][col] !== null) continue;
      const candidates = getCandidates(grid, row, col);
      if (candidates.length === 0) return { row, col, candidates };
      if (!best || candidates.length < best.candidates.length) {
        best = { row, col, candidates };
        if (candidates.length === 1) return best;
      }
    }
  }

  return best;
}

function countSolutionsRecursive(grid: PuzzleGrid, limit: number): number {
  const target = findBestCell(grid);
  if (!target) return 1;
  if (target.candidates.length === 0) return 0;

  let solutions = 0;
  for (const candidate of target.candidates) {
    grid[target.row][target.col] = candidate;
    solutions += countSolutionsRecursive(grid, limit - solutions);
    if (solutions >= limit) {
      grid[target.row][target.col] = null;
      return solutions;
    }
  }

  grid[target.row][target.col] = null;
  return solutions;
}

function countSolutions(grid: PuzzleGrid, limit = 2): number {
  return countSolutionsRecursive(cloneGrid(grid), limit);
}

function targetClues(difficulty: Difficulty): { min: number; max: number } {
  switch (difficulty) {
    case 'easy':
      return { min: 42, max: 46 };
    case 'hard':
      return { min: 26, max: 30 };
    case 'medium':
    default:
      return { min: 34, max: 38 };
  }
}

function generatePuzzle(difficulty: Difficulty): { puzzle: PuzzleGrid; solution: SolvedGrid; clueCount: number; difficulty: Difficulty } {
  const { min, max } = targetClues(difficulty);
  const solution = buildSolvedGrid();
  const puzzle: PuzzleGrid = cloneGrid(solution);
  const cells = shuffle(
    Array.from({ length: 81 }, (_, index) => ({ row: Math.floor(index / 9), col: index % 9 })),
  );

  const target = min + Math.floor(Math.random() * (max - min + 1));
  let clues = 81;

  for (const { row, col } of cells) {
    if (clues <= target) break;
    const backup = puzzle[row][col];
    puzzle[row][col] = null;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[row][col] = backup;
      continue;
    }
    clues -= 1;
  }

  if (clues > target) {
    const filled = cells.filter(({ row, col }) => puzzle[row][col] !== null);
    for (const { row, col } of shuffle(filled)) {
      if (clues <= target) break;
      const backup = puzzle[row][col];
      puzzle[row][col] = null;
      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[row][col] = backup;
        continue;
      }
      clues -= 1;
    }
  }

  return {
    puzzle,
    solution,
    clueCount: clues,
    difficulty,
  };
}

function makeId(prefix: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  let suffix = '';
  for (let index = 0; index < 8; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}

function createCell(value: number | null, ownerId: string | null, kind: CellKind): Cell {
  return { value, ownerId, kind };
}

function createEmptyCells(): Cell[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => createCell(null, null, 'empty')));
}

function countFillableCells(puzzle: PuzzleGrid): number {
  return puzzle.flat().filter((cell) => cell === null).length;
}

function createRoomState(options: { roomId?: string; hostId?: string; difficulty?: Difficulty; puzzle?: PuzzleGrid; solution?: SolvedGrid } = {}): RoomState {
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

  const createdAt = new Date().toISOString();
  const room: RoomState = {
    roomId,
    difficulty: puzzleData.difficulty,
    puzzle: puzzleData.puzzle,
    solution: puzzleData.solution,
    clueCount: puzzleData.clueCount,
    cells,
    participants: {},
    solved: false,
    filledCells,
    fillableCells: countFillableCells(puzzleData.puzzle),
    createdAt,
    updatedAt: createdAt,
  };

  room.participants[hostId] = {
    id: hostId,
    role: 'host',
    connected: true,
    joinedAt: createdAt,
  };

  return room;
}

function normalizeDifficulty(value: unknown): Difficulty {
  return value === 'easy' || value === 'hard' ? value : 'medium';
}

function computeViewerRole(state: RoomState, participantId: string | null): ParticipantRole {
  if (!participantId) return 'spectator';
  const participant = state.participants[participantId];
  if (!participant) return 'spectator';
  return participant.role;
}

function buildViewerSnapshot(state: RoomState, participantId: string | null = null) {
  const viewerRole = computeViewerRole(state, participantId);
  const board = state.cells.map((row) =>
    row.map((cell) => {
      if (cell.kind === 'clue') return cell.value;
      if (participantId && cell.ownerId === participantId) return cell.value;
      return null;
    }),
  );

  const occupancy = state.cells.map((row) =>
    row.map((cell) => {
      if (cell.kind === 'clue') return 'clue';
      if (cell.value === null) return 'empty';
      if (participantId && cell.ownerId === participantId) return 'self';
      return 'other';
    }),
  );

  return {
    roomId: state.roomId,
    difficulty: state.difficulty,
    clueCount: state.clueCount,
    puzzle: cloneGrid(state.puzzle),
    solution: cloneGrid(state.solution),
    board,
    occupancy,
    solved: state.solved,
    viewerRole,
    participants: Object.values(state.participants).map((participant) => ({
      id: participant.id,
      role: participant.role,
      connected: participant.connected,
      joinedAt: participant.joinedAt,
      lastSeenAt: participant.lastSeenAt ?? null,
    })),
    updatedAt: state.updatedAt,
  };
}

function registerParticipant(state: RoomState, participantId: string): Participant {
  const existing = state.participants[participantId];
  if (existing) {
    existing.connected = true;
    existing.lastSeenAt = new Date().toISOString();
    return existing;
  }

  const roleCounts = Object.values(state.participants).reduce(
    (counts, participant) => {
      if (participant.role === 'host') counts.host += 1;
      else if (participant.role === 'guest') counts.guest += 1;
      return counts;
    },
    { host: 0, guest: 0 },
  );

  const role: ParticipantRole = roleCounts.guest === 0 && roleCounts.host > 0 ? 'guest' : roleCounts.host === 0 ? 'host' : 'spectator';
  const participant: Participant = {
    id: participantId,
    role,
    connected: true,
    joinedAt: new Date().toISOString(),
  };
  state.participants[participantId] = participant;
  return participant;
}

function disconnectParticipant(state: RoomState, participantId: string) {
  const participant = state.participants[participantId];
  if (!participant) return;
  participant.connected = false;
  participant.lastSeenAt = new Date().toISOString();
}

function resetRoom(state: RoomState, options: { difficulty?: Difficulty; puzzle?: PuzzleGrid; solution?: SolvedGrid } = {}) {
  const nextPuzzle = options.puzzle && options.solution
    ? {
        puzzle: cloneGrid(options.puzzle),
        solution: cloneGrid(options.solution),
        clueCount: options.puzzle.flat().filter((cell) => cell !== null).length,
        difficulty: options.difficulty ?? state.difficulty,
      }
    : generatePuzzle(options.difficulty ?? state.difficulty);

  state.difficulty = nextPuzzle.difficulty;
  state.puzzle = nextPuzzle.puzzle;
  state.solution = nextPuzzle.solution;
  state.clueCount = nextPuzzle.clueCount;
  state.cells = createEmptyCells();
  state.filledCells = 0;
  state.fillableCells = countFillableCells(nextPuzzle.puzzle);
  state.solved = false;
  state.updatedAt = new Date().toISOString();

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = nextPuzzle.puzzle[row][col];
      if (value === null) continue;
      state.cells[row][col] = createCell(value, 'system', 'clue');
    }
  }
}

function applyRoomMove(state: RoomState, participantId: string, move: { row: number; col: number; value: number | null }) {
  if (state.solved) {
    throw new Error('Room already solved');
  }

  const participant = state.participants[participantId];
  if (!participant) {
    throw new Error('Unknown participant');
  }
  if (participant.role === 'spectator') {
    throw new Error('Spectator cannot edit the room');
  }

  const { row, col, value } = move;
  const cell = state.cells[row]?.[col];
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
      state.filledCells -= 1;
    }
    state.cells[row][col] = createCell(null, null, 'empty');
    state.updatedAt = new Date().toISOString();
    return { type: 'cell-cleared', row, col, ownerId: participantId };
  }

  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error('Invalid value');
  }

  const solutionValue = state.solution[row][col];
  if (solutionValue !== value) {
    throw new Error('Incorrect value for this room');
  }
  if (cell.value !== null && cell.ownerId && cell.ownerId !== participantId) {
    throw new Error('Cell already claimed');
  }

  const isNewFill = cell.value === null;
  state.cells[row][col] = createCell(value, participantId, 'move');
  if (isNewFill) state.filledCells += 1;
  state.updatedAt = new Date().toISOString();
  state.solved = state.filledCells >= state.fillableCells;

  return {
    type: 'cell-updated',
    row,
    col,
    value,
    ownerId: participantId,
    solved: state.solved,
  };
}

function messageText(data: string | ArrayBuffer | ArrayBufferView): string {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  return new TextDecoder().decode(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
}

async function loadState(room: Room, initialHostId: string): Promise<RoomState> {
  const stored = await room.storage.get<RoomState>(STATE_KEY);
  if (stored && stored.roomId === room.id) {
    return stored;
  }
  const state = createRoomState({ roomId: room.id, hostId: initialHostId, difficulty: 'medium' });
  await room.storage.put(STATE_KEY, state);
  return state;
}

async function saveState(room: Room, state: RoomState) {
  state.updatedAt = new Date().toISOString();
  await room.storage.put(STATE_KEY, state);
}

async function broadcastSnapshot(room: Room, state: RoomState) {
  room.connections.forEach((connection) => {
    connection.send(JSON.stringify({ type: 'room_snapshot', snapshot: buildViewerSnapshot(state, connection.id) }));
  });
}

async function broadcastEvent(room: Room, state: RoomState, event: Record<string, unknown>) {
  room.connections.forEach((connection) => {
    connection.send(JSON.stringify({ type: 'room_event', event, snapshot: buildViewerSnapshot(state, connection.id) }));
  });
}

async function getState(room: Room, initialHostId: string): Promise<RoomState> {
  return loadState(room, initialHostId);
}

export default class SudokuParty implements Server {
  constructor(readonly room: Room) {}

  async onConnect(connection: Connection) {
    const state = await getState(this.room, connection.id);
    registerParticipant(state, connection.id);
    await saveState(this.room, state);
    await broadcastSnapshot(this.room, state);
  }

  async onMessage(data: string | ArrayBuffer | ArrayBufferView, sender: Connection) {
    let payload: any;
    try {
      payload = JSON.parse(messageText(data));
    } catch {
      sender.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      return;
    }

    const state = await getState(this.room, sender.id);

    try {
      if (payload.type === 'create_room') {
        const participant = state.participants[sender.id];
        if (!participant || participant.role !== 'host') {
          throw new Error('Only the host can create a room');
        }
        resetRoom(state, { difficulty: normalizeDifficulty(payload.difficulty) });
        await saveState(this.room, state);
        await broadcastSnapshot(this.room, state);
        return;
      }

      if (payload.type === 'request_snapshot') {
        sender.send(JSON.stringify({ type: 'room_snapshot', snapshot: buildViewerSnapshot(state, sender.id) }));
        return;
      }

      if (payload.type === 'move') {
        const event = applyRoomMove(state, sender.id, {
          row: Number(payload.row),
          col: Number(payload.col),
          value: payload.value === null ? null : Number(payload.value),
        });
        await saveState(this.room, state);
        await broadcastEvent(this.room, state, event);
        return;
      }

      if (payload.type === 'reset_room') {
        const participant = state.participants[sender.id];
        if (!participant || participant.role !== 'host') throw new Error('Only the host can reset the room');
        resetRoom(state, { difficulty: normalizeDifficulty(payload.difficulty) });
        await saveState(this.room, state);
        await broadcastSnapshot(this.room, state);
        return;
      }

      if (payload.type === 'leave_room') {
        disconnectParticipant(state, sender.id);
        await saveState(this.room, state);
        sender.send(JSON.stringify({ type: 'left_room' }));
        await broadcastSnapshot(this.room, state);
        return;
      }

      throw new Error(`Unknown message type: ${payload.type}`);
    } catch (error) {
      sender.send(JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' }));
    }
  }

  async onClose(connection: Connection) {
    const state = await getState(this.room, connection.id);
    const participant = state.participants[connection.id];
    if (!participant || !participant.connected) return;
    disconnectParticipant(state, connection.id);
    await saveState(this.room, state);
    await broadcastSnapshot(this.room, state);
  }
}
