import type { Difficulty, Grid } from '@/lib/sudoku';
import { getCandidates } from '@/lib/sudoku';
import type {
  BattleSummary,
  Locale,
  NoteGrid,
  Position,
  RecordEntry,
  Snapshot,
} from './types';
import type { SharedRoomCellOccupancy, SharedRoomSnapshot } from '@/lib/shared-room';

export const STORAGE_KEY = 'sudoku-studio-state-v3';
export const RECORDS_KEY = 'sudoku-studio-records-v1';
export const ROOM_TOKEN_PREFIX = 'sudoku-room-token-';

export function createEmptyOwnershipGrid(): SharedRoomCellOccupancy[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 'empty' as SharedRoomCellOccupancy));
}

export function ownershipFromPuzzle(puzzle: Grid): SharedRoomCellOccupancy[][] {
  return puzzle.map((row) => row.map((cell) => (cell === null ? 'empty' : 'clue')));
}

export function summarizeBattle(snapshot: SharedRoomSnapshot, participantId: string | null): BattleSummary {
  const cells = snapshot.occupancy?.flat() ?? [];
  const clueCells = cells.filter((cell) => cell === 'clue').length;
  const bothCells = cells.filter((cell) => cell === 'both').length;
  const selfCells = cells.filter((cell) => cell === 'self' || cell === 'both').length;
  const otherCells = cells.filter((cell) => cell === 'other' || cell === 'both').length;
  const fillableCells = Math.max(1, 81 - clueCells);
  const selfProgress = Math.min(100, Math.round((selfCells / fillableCells) * 100));
  const otherProgress = Math.min(100, Math.round((otherCells / fillableCells) * 100));
  const otherActive = snapshot.participants.some(
    (participant) => participant.connected && participant.role !== 'spectator' && participant.id !== participantId,
  );

  const stage =
    otherProgress < 20
      ? { ko: '초반 탐색', en: 'Opening' }
      : otherProgress < 55
        ? { ko: '중반 공방', en: 'Midgame clash' }
        : otherProgress < 85
          ? { ko: '후반 압박', en: 'Endgame pressure' }
          : { ko: '결전 직전', en: 'Final countdown' };

  return {
    totalCells: 81,
    fillableCells,
    clueCells,
    bothCells,
    selfCells,
    otherCells,
    selfProgress,
    otherProgress,
    battleActive: otherActive,
    stage,
  };
}

export function makeClientId(prefix = 'p'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DIFFICULTIES: Array<{
  id: Difficulty;
  label: Record<Locale, string>;
  detail: Record<Locale, string>;
}> = [
  {
    id: 'easy',
    label: { ko: '쉬움', en: 'Easy' },
    detail: { ko: '풍부한 단서와 직관적인 규칙', en: 'Generous clues and smooth solving' },
  },
  {
    id: 'medium',
    label: { ko: '보통', en: 'Medium' },
    detail: { ko: '균형 잡힌 난이도와 전략적 메모', en: 'Balanced logic and pencil marks' },
  },
  {
    id: 'hard',
    label: { ko: '어려움', en: 'Hard' },
    detail: { ko: '치밀한 후보수 배제와 깊은 추론', en: 'Minimal clues and advanced deduction' },
  },
];

export function getDifficultyLabel(locale: Locale, difficulty: Difficulty): string {
  const item = DIFFICULTIES.find((entry) => entry.id === difficulty);
  return item ? item.label[locale] : difficulty;
}

export function getDifficultyDetail(locale: Locale, difficulty: Difficulty): string {
  const item = DIFFICULTIES.find((entry) => entry.id === difficulty);
  return item ? item.detail[locale] : '';
}

export function sanitizeRoomIdInput(value: string): string {
  const raw = value.trim();
  if (!raw) return '';

  const directMatch = raw.match(/[?&]room=([^&]+)/);
  const candidate = directMatch ? directMatch[1] : raw;

  return candidate
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^.*\/+/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .trim();
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function cloneNotes(grid: NoteGrid): NoteGrid {
  return grid.map((row) => row.map((cell) => [...cell]));
}

export function createEmptyNotesGrid(): NoteGrid {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
}

export function isFilled(grid: Grid): boolean {
  return grid.every((row) => row.every((cell) => cell !== null));
}

export function buildNotes(grid: Grid, row: number, col: number): number[] {
  if (grid[row][col] !== null) return [];
  return getCandidates(grid, row, col);
}

export function normalizeGrid(value: unknown): Grid | null {
  if (!Array.isArray(value) || value.length !== 9) return null;
  const rows: Grid = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 9) return null;
    const nextRow = row.map((cell) => (typeof cell === 'number' && cell >= 1 && cell <= 9 ? cell : null));
    rows.push(nextRow);
  }
  return rows;
}

export function normalizeNotesGrid(value: unknown): NoteGrid | null {
  if (!Array.isArray(value) || value.length !== 9) return null;
  const rows: NoteGrid = [];
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 9) return null;
    const nextRow = row.map((cell) => {
      if (!Array.isArray(cell)) return [];
      return cell.filter((digit): digit is number => typeof digit === 'number' && digit >= 1 && digit <= 9);
    });
    rows.push(nextRow);
  }
  return rows;
}

export function isPosition(value: unknown): value is Position {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { row?: unknown; col?: unknown };
  return typeof candidate.row === 'number' && typeof candidate.col === 'number';
}

export function normalizeHistory(value: unknown): Snapshot[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const board = normalizeGrid((item as { board?: unknown }).board);
      const notes = normalizeNotesGrid((item as { notes?: unknown }).notes);
      const elapsedSeconds = Number((item as { elapsedSeconds?: unknown }).elapsedSeconds);
      if (!board || !notes || !Number.isFinite(elapsedSeconds)) return null;
      return {
        board,
        notes,
        elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)),
      };
    })
    .filter((item): item is Snapshot => item !== null)
    .slice(-30);
}

export function normalizeRecords(value: unknown): RecordEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const difficulty = (item as { difficulty?: unknown }).difficulty;
      const elapsedSeconds = Number((item as { elapsedSeconds?: unknown }).elapsedSeconds);
      const clueCount = Number((item as { clueCount?: unknown }).clueCount);
      const completedAt = String((item as { completedAt?: unknown }).completedAt ?? '');

      if (
        (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') ||
        !Number.isFinite(elapsedSeconds) ||
        !Number.isFinite(clueCount) ||
        !completedAt
      ) {
        return null;
      }

      return {
        difficulty,
        elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)),
        clueCount: Math.max(0, Math.floor(clueCount)),
        completedAt,
      };
    })
    .filter((item): item is RecordEntry => item !== null)
    .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || b.completedAt.localeCompare(a.completedAt))
    .slice(0, 50);
}

export function toggleNote(notes: NoteGrid, row: number, col: number, value: number): NoteGrid {
  const current = notes[row][col];
  const next = current.includes(value) ? current.filter((digit) => digit !== value) : [...current, value].sort((a, b) => a - b);
  const nextNotes = cloneNotes(notes);
  nextNotes[row][col] = next;
  return nextNotes;
}

export function hasNotes(notes: NoteGrid, row: number, col: number): boolean {
  return notes[row][col].length > 0;
}

export function getSelectedCellLabel(position: Position): string {
  if (!position) return 'None';
  return `(${position.row + 1}, ${position.col + 1})`;
}

export function getConflictCells(board: Grid): Set<string> {
  const conflicts = new Set<string>();

  for (let r = 0; r < 9; r += 1) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < 9; c += 1) {
      const val = board[r][c];
      if (val !== null) {
        const cols = seen.get(val) ?? [];
        cols.push(c);
        seen.set(val, cols);
      }
    }
    seen.forEach((cols) => {
      if (cols.length > 1) {
        cols.forEach((col) => conflicts.add(`${r}-${col}`));
      }
    });
  }

  for (let c = 0; c < 9; c += 1) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < 9; r += 1) {
      const val = board[r][c];
      if (val !== null) {
        const rows = seen.get(val) ?? [];
        rows.push(r);
        seen.set(val, rows);
      }
    }
    seen.forEach((rows) => {
      if (rows.length > 1) {
        rows.forEach((row) => conflicts.add(`${row}-${c}`));
      }
    });
  }

  for (let block = 0; block < 9; block += 1) {
    const br = Math.floor(block / 3) * 3;
    const bc = (block % 3) * 3;
    const seen = new Map<number, Array<{ r: number; c: number }>>();
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        const val = board[br + r][bc + c];
        if (val !== null) {
          const cells = seen.get(val) ?? [];
          cells.push({ r: br + r, c: bc + c });
          seen.set(val, cells);
        }
      }
    }
    seen.forEach((cells) => {
      if (cells.length > 1) {
        cells.forEach((cell) => conflicts.add(`${cell.r}-${cell.c}`));
      }
    });
  }

  return conflicts;
}

export function boardMatchesSolution(board: Grid, solution: Grid): boolean {
  return board.every((row, r) => row.every((cell, c) => cell !== null && cell === solution[r][c]));
}

export function getNoteCellValue(notes: number[]): string[] {
  const slots = Array.from({ length: 9 }, () => '');
  notes.forEach((note) => {
    const index = note - 1;
    if (index >= 0 && index < 9) {
      slots[index] = String(note);
    }
  });
  return slots;
}

export function getRemainingCounts(board: Grid): Record<number, number> {
  const counts: Record<number, number> = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const val = board[r][c];
      if (val !== null && counts[val] !== undefined) {
        counts[val] -= 1;
      }
    }
  }
  return counts;
}
