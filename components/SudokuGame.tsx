"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './SudokuGame.module.css';
import {
  Difficulty,
  Grid,
  Puzzle,
  countSolutions,
  generatePuzzle,
  getCandidates,
  solveSudoku,
} from '@/lib/sudoku';
import { filterAndSortRecords } from '@/lib/recordView';
import type { SharedRoomCellOccupancy, SharedRoomSnapshot, RoomRole } from '@/lib/shared-room';
type Position = { row: number; col: number } | null;

type NoteGrid = number[][][];

type Snapshot = {
  board: Grid;
  notes: NoteGrid;
  elapsedSeconds: number;
};

type ConfettiPiece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  hue: number;
  rotation: number;
};

type RecordEntry = {
  difficulty: Difficulty;
  elapsedSeconds: number;
  clueCount: number;
  completedAt: string;
};

type ItemCounts = {
  hint: number;
  autoFill: number;
};

type Locale = 'ko' | 'en';

type SavedGame = {
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  board: Grid;
  notes: NoteGrid;
  history: Snapshot[];
  selected: Position;
  noteMode: boolean;
  soundEnabled: boolean;
  items: ItemCounts;
  locale: Locale;
  elapsedSeconds: number;
  timerRunning: boolean;
  solved: boolean;
};

type CompletionSummary = RecordEntry & {
  rank: number;
  total: number;
};

type SharedCompletionSummary = {
  difficulty: Difficulty;
  clueCount: number;
  elapsedSeconds: number;
  completedAt: string;
  completedBy: string | null;
  completedByRole: RoomRole | null;
};

type SharedRoomState = {
  roomId: string;
  participantId: string;
  role: 'host' | 'guest' | 'spectator';
  connected: boolean;
  snapshot: SharedRoomSnapshot | null;
};

function createEmptyOwnershipGrid(): SharedRoomCellOccupancy[][] {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 'empty' as SharedRoomCellOccupancy));
}

function ownershipFromPuzzle(puzzle: Grid): SharedRoomCellOccupancy[][] {
  return puzzle.map((row) => row.map((cell) => (cell === null ? 'empty' : 'clue')));
}

function summarizeBattle(snapshot: SharedRoomSnapshot, participantId: string | null) {
  const cells = snapshot.occupancy?.flat() ?? [];
  const clueCells = cells.filter((cell) => cell === 'clue').length;
  const bothCells = cells.filter((cell) => cell === 'both').length;
  const selfCells = cells.filter((cell) => cell === 'self' || cell === 'both').length;
  const otherCells = cells.filter((cell) => cell === 'other' || cell === 'both').length;
  const fillableCells = 81 - clueCells;
  const rivalsConnected = snapshot.participants.filter(
    (participant) => participant.connected && participant.role !== 'spectator' && participant.id !== participantId,
  ).length;
  const otherProgress = fillableCells > 0 ? Math.round((otherCells / fillableCells) * 100) : 0;

  const stage =
    otherProgress >= 85 ? { ko: '막판 압박', en: 'Final push' }
    : otherProgress >= 60 ? { ko: '공세 구간', en: 'Momentum' }
    : otherProgress >= 35 ? { ko: '중반 추격', en: 'Midgame chase' }
    : otherProgress >= 12 ? { ko: '초반 탐색', en: 'Opening probe' }
    : { ko: '출발선', en: 'Starting line' };

  return {
    clueCells,
    selfCells,
    otherCells,
    bothCells,
    fillableCells,
    rivalsConnected,
    battleActive: rivalsConnected > 0,
    otherProgress,
    stage,
  };
}

const STORAGE_KEY = 'sudoku-studio-state-v3';
const RECORDS_KEY = 'sudoku-studio-records-v1';
const ROOM_TOKEN_PREFIX = 'sudoku-room-token-';

function getWebSocketUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === 'http:') url.protocol = 'ws:';
      if (url.protocol === 'https:') url.protocol = 'wss:';
      return url.toString().replace(/\/$/, '');
    } catch {
      return configuredUrl.replace(/\/$/, '');
    }
  }

  if (typeof window === 'undefined') return '';
  const url = new URL('/ws', window.location.href);
  url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString().replace(/\/$/, '');
}

function makeClientId(prefix = 'p'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const DIFFICULTIES: Array<{
  value: Difficulty;
  koLabel: string;
  enLabel: string;
  koDetail: string;
  enDetail: string;
}> = [
  { value: 'easy', koLabel: '하', enLabel: 'Easy', koDetail: '여유 있게 시작', enDetail: 'Relaxed start' },
  { value: 'medium', koLabel: '중', enLabel: 'Medium', koDetail: '밸런스 좋은 난이도', enDetail: 'Balanced challenge' },
  { value: 'hard', koLabel: '상', enLabel: 'Hard', koDetail: '깊게 생각하는 퍼즐', enDetail: 'A deeper puzzle' },
];

function getDifficultyLabel(locale: Locale, difficulty: Difficulty): string {
  const item = DIFFICULTIES.find((entry) => entry.value === difficulty);
  if (!item) return difficulty;
  return locale === 'ko' ? item.koLabel : item.enLabel;
}

function getDifficultyDetail(locale: Locale, difficulty: Difficulty): string {
  const item = DIFFICULTIES.find((entry) => entry.value === difficulty);
  if (!item) return difficulty;
  return locale === 'ko' ? item.koDetail : item.enDetail;
}

function sanitizeRoomIdInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const parsed = new URL(trimmed);
    const room = parsed.searchParams.get('room');
    if (room) return room.toLowerCase().replace(/[^a-z0-9-]/g, '');
  } catch {
    // fall through to plain text sanitizing
  }

  const roomParamMatch = trimmed.match(/[?&]room=([a-z0-9-]+)/i);
  if (roomParamMatch?.[1]) return roomParamMatch[1].toLowerCase().replace(/[^a-z0-9-]/g, '');

  return trimmed.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function cloneNotes(grid: NoteGrid): NoteGrid {
  return grid.map((row) => row.map((cell) => [...cell]));
}

function createEmptyNotesGrid(): NoteGrid {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]));
}

function isFilled(grid: Grid): boolean {
  return grid.every((row) => row.every((cell) => cell !== null));
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildShareText(summary: CompletionSummary, locale: Locale): string {
  const difficultyLabel = getDifficultyLabel(locale, summary.difficulty);
  return locale === 'ko'
    ? [
        'Dual Sudoku',
        `Difficulty: ${difficultyLabel}`,
        `Time: ${formatTime(summary.elapsedSeconds)}`,
        `Clues: ${summary.clueCount}`,
        `Rank: ${summary.rank}/${summary.total}`,
      ].join('\n')
    : [
        'I completed a Dual Sudoku puzzle! 🎉',
        `Difficulty: ${difficultyLabel}`,
        `Time: ${formatTime(summary.elapsedSeconds)}`,
        `Clues: ${summary.clueCount}`,
        `Rank: ${summary.rank}/${summary.total}`,
      ].join('\n');
}

function buildShareCardSvg(summary: CompletionSummary, locale: Locale): string {
  const difficultyLabel = getDifficultyLabel(locale, summary.difficulty);
  const textLines =
    locale === 'ko'
      ? [
          'Dual Sudoku',
          `${difficultyLabel} puzzle complete`,
          `Time ${formatTime(summary.elapsedSeconds)}`,
          `Clues ${summary.clueCount}`,
          `Rank #${summary.rank}/${summary.total}`,
        ]
      : [
          'Dual Sudoku',
          `${difficultyLabel} puzzle complete`,
          `Time ${formatTime(summary.elapsedSeconds)}`,
          `Clues ${summary.clueCount}`,
          `Rank #${summary.rank}/${summary.total}`,
        ];

  const svgText = textLines
    .map(
      (line, index) =>
        `<text x="64" y="${128 + index * 54}" fill="${index === 0 ? '#f8fafc' : '#cbd5e1'}" font-size="${index === 0 ? 44 : 28}" font-weight="${index === 0 ? 900 : 700}" font-family="Inter, ui-sans-serif, system-ui, sans-serif">${escapeXml(line)}</text>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" rx="48" fill="url(#bg)"/>
  <rect x="42" y="42" width="1116" height="546" rx="38" fill="rgba(15, 23, 42, 0.72)" stroke="rgba(148, 163, 184, 0.22)"/>
  <circle cx="1010" cy="126" r="118" fill="rgba(56, 189, 248, 0.12)"/>
  <circle cx="1060" cy="512" r="156" fill="rgba(168, 85, 247, 0.14)"/>
  <rect x="64" y="64" width="180" height="14" rx="7" fill="url(#accent)"/>
  ${svgText}
  <text x="64" y="460" fill="#94a3b8" font-size="22" font-family="Inter, ui-sans-serif, system-ui, sans-serif">Single-solution sudoku • Modern UI • PM2 run</text>
</svg>`;
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildNotes(grid: Grid, row: number, col: number): number[] {
  if (grid[row][col] !== null) return [];
  return getCandidates(grid, row, col);
}

function normalizeGrid(value: unknown): Grid | null {
  if (!Array.isArray(value) || value.length !== 9) return null;
  const rows = value.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) return null;
    const cells = row.map((cell) => (cell === null ? null : Number(cell)));
    if (cells.some((cell) => cell !== null && !Number.isInteger(cell))) return null;
    return cells as Grid[number];
  });
  if (rows.some((row) => row === null)) return null;
  return rows as Grid;
}

function normalizeNotesGrid(value: unknown): NoteGrid | null {
  if (!Array.isArray(value) || value.length !== 9) return null;
  const rows = value.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) return null;
    const cells = row.map((cell) => {
      if (!Array.isArray(cell)) return null;
      const notes = cell.map((note) => Number(note)).filter((note) => Number.isInteger(note) && note >= 1 && note <= 9);
      return Array.from(new Set(notes)).sort((a, b) => a - b);
    });
    if (cells.some((cell) => cell === null)) return null;
    return cells as number[][];
  });
  if (rows.some((row) => row === null)) return null;
  return rows as NoteGrid;
}

function isPosition(value: unknown): value is Position {
  if (value === null) return true;
  if (typeof value !== 'object' || value === null) return false;
  const maybe = value as { row?: unknown; col?: unknown };
  return Number.isInteger(maybe.row) && Number.isInteger(maybe.col);
}

function normalizeHistory(value: unknown): Snapshot[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const snapshot = item as { board?: unknown; notes?: unknown; elapsedSeconds?: unknown };
      const board = normalizeGrid(snapshot.board);
      const notes = normalizeNotesGrid(snapshot.notes);
      const elapsedSeconds = Number(snapshot.elapsedSeconds);
      if (!board || !notes || !Number.isFinite(elapsedSeconds)) return null;
      return {
        board,
        notes,
        elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)),
      };
    })
    .filter((entry): entry is Snapshot => entry !== null)
    .slice(-30);
}

function normalizeRecords(value: unknown): RecordEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const record = item as { difficulty?: unknown; elapsedSeconds?: unknown; clueCount?: unknown; completedAt?: unknown };
      if (record.difficulty !== 'easy' && record.difficulty !== 'medium' && record.difficulty !== 'hard') return null;
      const elapsedSeconds = Number(record.elapsedSeconds);
      const clueCount = Number(record.clueCount);
      const completedAt = typeof record.completedAt === 'string' ? record.completedAt : '';
      if (!Number.isFinite(elapsedSeconds) || !Number.isFinite(clueCount) || !completedAt) return null;
      return {
        difficulty: record.difficulty,
        elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)),
        clueCount: Math.max(0, Math.floor(clueCount)),
        completedAt,
      };
    })
    .filter((entry): entry is RecordEntry => entry !== null)
    .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || b.completedAt.localeCompare(a.completedAt))
    .slice(0, 20);
}

function toggleNote(notes: NoteGrid, row: number, col: number, value: number): NoteGrid {
  const next = cloneNotes(notes);
  const cell = next[row][col];
  if (cell.includes(value)) {
    next[row][col] = cell.filter((note) => note !== value);
  } else {
    next[row][col] = [...cell, value].sort((a, b) => a - b);
  }
  return next;
}

function hasNotes(notes: NoteGrid, row: number, col: number): boolean {
  return notes[row][col].length > 0;
}

function getSelectedCellLabel(position: Position): string {
  if (!position) return '';
  return `${position.row + 1}, ${position.col + 1}`;
}

function getConflictCells(board: Grid): Set<string> {
  const conflicts = new Set<string>();

  const markGroup = (positions: Array<{ row: number; col: number; value: number | null }>) => {
    const seen = new Map<number, Array<{ row: number; col: number }>>();
    positions.forEach(({ row, col, value }) => {
      if (value === null) return;
      const bucket = seen.get(value) ?? [];
      bucket.push({ row, col });
      seen.set(value, bucket);
    });

    seen.forEach((cells) => {
      if (cells.length < 2) return;
      cells.forEach(({ row, col }) => conflicts.add(`${row}-${col}`));
    });
  };

  for (let index = 0; index < 9; index += 1) {
    markGroup(board[index].map((value, col) => ({ row: index, col, value })));
    markGroup(board.map((row, rowIndex) => ({ row: rowIndex, col: index, value: row[index] })));
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const cells: Array<{ row: number; col: number; value: number | null }> = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          cells.push({ row, col, value: board[row][col] });
        }
      }
      markGroup(cells);
    }
  }

  return conflicts;
}

function boardMatchesSolution(board: Grid, solution: Grid): boolean {
  return board.every((row, rowIndex) => row.every((cell, colIndex) => cell === solution[rowIndex][colIndex]));
}

function getNoteCellValue(notes: number[]): string[] {
  const slots = Array.from({ length: 9 }, () => '');
  notes.forEach((note) => {
    const index = note - 1;
    if (index >= 0 && index < 9) {
      slots[index] = String(note);
    }
  });
  return slots;
}

async function playCompletionSound() {
  if (typeof window === 'undefined') return;
  const AudioContextClass =
    window.AudioContext || (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  try {
    if (context.state === 'suspended') {
      await context.resume();
    }

    const now = context.currentTime + 0.02;
    const melody = [523.25, 659.25, 783.99, 1046.5];
    melody.forEach((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = index % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.28);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now + index * 0.11);
      osc.stop(now + index * 0.11 + 0.32);
    });

    const bass = context.createOscillator();
    const bassGain = context.createGain();
    bass.type = 'sine';
    bass.frequency.value = 196;
    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    bass.connect(bassGain);
    bassGain.connect(context.destination);
    bass.start(now);
    bass.stop(now + 0.6);

    window.setTimeout(() => {
      void context.close();
    }, 1200);
  } catch {
    try {
      await context.close();
    } catch {
      // ignore
    }
  }
}

export default function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle('medium'));
  const [board, setBoard] = useState<Grid>(() => cloneGrid(puzzle.puzzle));
  const [notes, setNotes] = useState<NoteGrid>(() => createEmptyNotesGrid());
  const [selected, setSelected] = useState<Position>(null);
  const [message, setMessage] = useState('Tap an empty cell to enter a number.');
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [checks, setChecks] = useState<{ row: number; col: number }[]>([]);
  const [solved, setSolved] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([]);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [activePanel, setActivePanel] = useState<'play' | 'records'>('play');
  const [recordDifficultyFilter, setRecordDifficultyFilter] = useState<'all' | Difficulty>('all');
  const [recordSortMode, setRecordSortMode] = useState<'fastest' | 'newest' | 'oldest'>('fastest');
  const [noteMode, setNoteMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [items, setItems] = useState<ItemCounts>({ hint: 3, autoFill: 1 });
  const [locale, setLocale] = useState<Locale>('en');
  const [hintPreview, setHintPreview] = useState<{ row: number; col: number; value: number } | null>(null);
  const [roomInput, setRoomInput] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);
  const [sharedCompletionSummary, setSharedCompletionSummary] = useState<SharedCompletionSummary | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [ownership, setOwnership] = useState<SharedRoomCellOccupancy[][]>(() => ownershipFromPuzzle(puzzle.puzzle));
  const [sharedRoom, setSharedRoom] = useState<SharedRoomState | null>(null);
  const [sharedCountdownTick, setSharedCountdownTick] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const sharedRoomPollRef = useRef<number | null>(null);
  const shouldClearSharedRoomRef = useRef(false);
  const timerOriginRef = useRef<number | null>(null);
  const completionSavedRef = useRef(false);

  const fixedCells = useMemo(() => puzzle.puzzle.map((row) => row.map((cell) => cell !== null)), [puzzle]);

  const candidateCount = selected ? buildNotes(board, selected.row, selected.col).length : 0;
  const conflictCells = useMemo(() => getConflictCells(board), [board]);
  const battleSummary = useMemo(
    () => (sharedRoom?.snapshot ? summarizeBattle(sharedRoom.snapshot, sharedRoom.participantId) : null),
    [sharedRoom?.participantId, sharedRoom?.snapshot],
  );
  const sharedMatchPhase = sharedRoom?.snapshot?.phase ?? null;
  const sharedMatchIsPlaying = sharedMatchPhase === 'playing';
  const sharedMatchIsCountdown = sharedMatchPhase === 'countdown';
  const sharedMatchCountDownSeconds = useMemo(() => {
    if (!sharedRoom?.snapshot?.countdownEndsAt || !sharedMatchIsCountdown) return null;
    return Math.max(0, Math.ceil((new Date(sharedRoom.snapshot.countdownEndsAt).getTime() - Date.now()) / 1000));
  }, [sharedRoom?.snapshot?.countdownEndsAt, sharedMatchIsCountdown, sharedCountdownTick]);
  const sharedRoomIsActive = Boolean(sharedRoom);
  const sharedRoomIsHost = sharedRoom?.role === 'host';
  const sharedMatchGateActive = sharedRoomIsActive && !sharedMatchIsPlaying;
  const sharedBattleMiniMapGrid = sharedRoom?.snapshot?.occupancy ?? createEmptyOwnershipGrid();

  function syncOwnershipFromBoard(nextBoard: Grid, participantId: string | null) {
    setOwnership(
      nextBoard.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const clue = puzzle.puzzle[rowIndex][colIndex] !== null;
          if (clue) return 'clue';
          if (cell === null) return 'empty';
          if (participantId && sharedRoom?.participantId === participantId) return 'self';
          return sharedRoom?.participantId ? 'other' : 'empty';
        }),
      ),
    );
  }

  function applySharedSnapshot(snapshot: SharedRoomSnapshot, participantId?: string | null) {
    const viewerId = participantId ?? sharedRoom?.participantId ?? null;
    let nextPuzzle: Puzzle | null = null;
    let nextBoard: Grid | null = null;
    let nextOccupancy: SharedRoomCellOccupancy[][] = createEmptyOwnershipGrid();

    if (snapshot.phase === 'playing' && snapshot.puzzle && snapshot.solution && snapshot.board && snapshot.occupancy) {
      nextPuzzle = {
        puzzle: snapshot.puzzle,
        solution: snapshot.solution,
        clueCount: snapshot.clueCount,
        difficulty: snapshot.difficulty,
      };
      nextBoard = snapshot.board;
      nextOccupancy = snapshot.occupancy;
    }

    setDifficulty(snapshot.difficulty);
    if (nextPuzzle) setPuzzle(nextPuzzle);
    if (nextBoard) setBoard(nextBoard);
    setOwnership(nextOccupancy);
    setSolved(snapshot.phase === 'playing' ? snapshot.solved : false);
    setChecks([]);
    setHintPreview(null);

    if (snapshot.solved) {
      setSharedCompletionSummary(
        snapshot.completedAt && snapshot.completedElapsedSeconds !== null
          ? {
              difficulty: snapshot.difficulty,
              clueCount: snapshot.clueCount,
              elapsedSeconds: snapshot.completedElapsedSeconds,
              completedAt: snapshot.completedAt,
              completedBy: snapshot.completedBy,
              completedByRole: snapshot.completedByRole,
            }
          : null,
      );
      setCompletionSummary(null);
      completionSavedRef.current = true;
    } else {
      setSharedCompletionSummary(null);
      setCompletionSummary(null);
      setShowCompleteModal(false);
      setConfettiPieces([]);
      completionSavedRef.current = false;
    }
    setSharedRoom((current) =>
      current
        ? { ...current, connected: true, role: snapshot.viewerRole, snapshot }
        : viewerId
          ? {
              roomId: snapshot.roomId,
              participantId: viewerId,
              role: snapshot.viewerRole,
              connected: true,
              snapshot,
            }
          : current,
    );
    if (snapshot.phase === 'countdown') {
      setMessage(
        locale === 'ko'
          ? `상대방이 연결됐어요. ${sharedMatchCountDownSeconds ?? 5}초 뒤 시작합니다.`
          : `Opponent joined. Starting in ${sharedMatchCountDownSeconds ?? 5} seconds.`,
      );
      return;
    }
    if (snapshot.phase === 'lobby') {
      setMessage(locale === 'ko' ? '상대방을 기다리는 중이에요.' : 'Waiting for a second player.');
      return;
    }
    setMessage(
    snapshot.solved
      ? 'The shared puzzle is already complete.'
      : snapshot.participants.filter((participant) => participant.connected && participant.role !== 'spectator').length > 1
        ? 'Synced with your opponent. Let’s start together.'
        : 'Connected to the shared puzzle.',
    );
  }

  async function sendSharedMessage(payload: Record<string, unknown>) {
    if (typeof window === 'undefined') return null;
    try {
      const response = await fetch('/api/shared-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as any;
      if (!response.ok) {
        throw new Error(data?.message ?? 'Shared-room request failed.');
      }
      return data;
    } catch {
      setMessage(locale === 'ko' ? '공유 방 요청에 실패했어요.' : 'Shared-room request failed.');
      return null;
    }
  }

  function stopSharedRoomPolling() {
    if (sharedRoomPollRef.current !== null) {
      window.clearInterval(sharedRoomPollRef.current);
      sharedRoomPollRef.current = null;
    }
  }

  async function pollSharedRoom(roomId: string, participantId: string) {
    const query = new URLSearchParams({ roomId, participantId });
    try {
      const response = await fetch(`/api/shared-room?${query.toString()}`);
      if (!response.ok) return;
      const payload = (await response.json().catch(() => null)) as any;
      if (payload?.snapshot) {
        applySharedSnapshot(payload.snapshot, participantId);
      }
    } catch {
      // ignore polling errors and try again on the next tick
    }
  }

  function startSharedRoomPolling(roomId: string, participantId: string) {
    stopSharedRoomPolling();
    void pollSharedRoom(roomId, participantId);
    sharedRoomPollRef.current = window.setInterval(() => {
      void pollSharedRoom(roomId, participantId);
    }, 1000);
  }

  useEffect(() => {
    if (!sharedMatchIsCountdown) return;
    const intervalId = window.setInterval(() => setSharedCountdownTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [sharedMatchIsCountdown, sharedRoom?.snapshot?.countdownEndsAt]);

  function disconnectSharedRoom() {
    shouldClearSharedRoomRef.current = true;
    stopSharedRoomPolling();
    if (sharedRoom) {
      void sendSharedMessage({ type: 'leave_room', roomId: sharedRoom.roomId, participantId: sharedRoom.participantId });
    }
    socketRef.current = null;
    setSharedRoom(null);
    setOwnership(ownershipFromPuzzle(puzzle.puzzle));
  }

  function getRoomInviteUrl(roomId: string): string {
    if (typeof window === 'undefined') return `?room=${roomId}`;
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    return url.toString();
  }

  async function copyRoomId() {
    if (!sharedRoom || typeof window === 'undefined') return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sharedRoom.roomId);
        setMessage(locale === 'ko' ? '방 ID를 복사했어요.' : 'Copied the room ID.');
        return;
      }
    } catch {
      // fall through to prompt fallback
    }

    const copied = window.prompt(locale === 'ko' ? '아래 방 ID를 복사해 주세요.' : 'Copy this room ID:', sharedRoom.roomId);
    if (copied !== null) {
      setMessage(locale === 'ko' ? '방 ID를 표시했어요. 직접 복사해 주세요.' : 'Shown the room ID for manual copy.');
    } else {
      setMessage(locale === 'ko' ? '방 ID 복사에 실패했어요.' : 'Could not copy the room ID.');
    }
  }

  async function copyRoomInviteLink() {
    if (!sharedRoom) return;
    const invite = getRoomInviteUrl(sharedRoom.roomId);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invite);
        setMessage(locale === 'ko' ? '참가 링크를 복사했어요.' : 'Copied the join link.');
        return;
      }
    } catch {
      // fall through to manual copy fallback
    }

    const copied = window.prompt(locale === 'ko' ? '아래 참가 링크를 복사해 주세요.' : 'Copy this join link:', invite);
    if (copied !== null) {
      setMessage(locale === 'ko' ? '참가 링크를 표시했어요. 직접 복사해 주세요.' : 'Shown the join link for manual copy.');
    } else {
      setMessage(locale === 'ko' ? '링크 복사에 실패했어요.' : 'Could not copy the link.');
    }
  }

  function joinRoomFromInput() {
    const roomId = sanitizeRoomIdInput(roomInput.trim());
    if (!roomId) {
      setMessage(locale === 'ko' ? '방 ID를 입력해 주세요.' : 'Please enter a room ID.');
      return;
    }
    if (roomId !== roomInput.trim()) {
      setRoomInput(roomId);
    }
    connectSharedRoom(roomId, undefined, 'guest');
  }

  function connectSharedRoom(roomId: string, seedDifficulty?: Difficulty, initialRole: RoomRole = 'spectator') {
    if (typeof window === 'undefined') return;
    shouldClearSharedRoomRef.current = false;
    stopSharedRoomPolling();

    const participantKey = `${ROOM_TOKEN_PREFIX}${roomId}`;
    const participantId = window.localStorage.getItem(participantKey) ?? makeClientId('p');
    window.localStorage.setItem(participantKey, participantId);
    setSharedRoom({
      roomId,
      participantId,
      role: initialRole,
      connected: false,
      snapshot: null,
    });

    const action = seedDifficulty ? 'create_room' : 'join_room';
    void sendSharedMessage({ type: action, roomId, participantId, difficulty: seedDifficulty }).then((payload) => {
      if (!payload) return;
      if (payload.roomId) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('room', payload.roomId);
        window.history.replaceState(null, '', nextUrl.toString());
        setRoomInput(payload.roomId);
      }
      if (payload.snapshot) {
        applySharedSnapshot(payload.snapshot, participantId);
      }
      startSharedRoomPolling(roomId, participantId);
    });
  }

  function createSharedRoom(nextDifficulty: Difficulty = difficulty) {
    if (typeof window === 'undefined') return;
    const roomId = `room-${Math.random().toString(36).slice(2, 9)}`;
    setRoomInput(roomId);
    connectSharedRoom(roomId, nextDifficulty, 'host');
  }

  const normalizedRoomId = useMemo(() => sanitizeRoomIdInput(roomInput), [roomInput]);
  const canJoinRoom = normalizedRoomId.length > 0;
  useEffect(() => {
    setHydrated(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<SavedGame>;
      const savedPuzzle = normalizeGrid(saved.puzzle);
      const savedSolution = normalizeGrid(saved.solution);
      const savedBoard = normalizeGrid(saved.board);
      const savedNotes = normalizeNotesGrid(saved.notes);
      const savedHistory = normalizeHistory(saved.history);
      const savedRecords = normalizeRecords(window.localStorage.getItem(RECORDS_KEY) ? JSON.parse(window.localStorage.getItem(RECORDS_KEY) as string) : []);

      if (!savedPuzzle || !savedSolution || !savedBoard || !savedNotes) return;
      if (!isPosition(saved.selected)) return;
      if (saved.selected && (saved.selected.row < 0 || saved.selected.row > 8 || saved.selected.col < 0 || saved.selected.col > 8)) return;

      const restoredDifficulty = saved.difficulty === 'easy' || saved.difficulty === 'medium' || saved.difficulty === 'hard'
        ? saved.difficulty
        : 'medium';

      setDifficulty(restoredDifficulty);
      setPuzzle({
        puzzle: savedPuzzle,
        solution: savedSolution,
        clueCount: savedPuzzle.flat().filter((cell) => cell !== null).length,
        difficulty: restoredDifficulty,
      });
      setBoard(savedBoard);
      setNotes(savedNotes);
      setHistory(savedHistory);
      setSelected(saved.selected ?? null);
      setNoteMode(Boolean(saved.noteMode));
      setSoundEnabled(saved.soundEnabled ?? true);
      setItems({
        hint: Number.isInteger(saved.items?.hint) ? Math.max(0, saved.items!.hint!) : 3,
        autoFill: Number.isInteger(saved.items?.autoFill) ? Math.max(0, saved.items!.autoFill!) : 1,
      });
      setLocale('en');
      setHintPreview(null);
      setElapsedSeconds(Number.isFinite(saved.elapsedSeconds) ? Math.max(0, Math.floor(saved.elapsedSeconds ?? 0)) : 0);
      setTimerRunning(Boolean(saved.timerRunning));
      setSolved(Boolean(saved.solved));
      setChecks([]);
      setRecords(savedRecords);
      setLastBackupAt(new Date().toISOString());
      setMessage(saved.locale === 'en' ? 'Loaded your previous progress.' : '이전 진행상태를 불러왔어요.');
    } catch {
      // ignore broken save data
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: SavedGame = {
      difficulty,
      puzzle: puzzle.puzzle,
      solution: puzzle.solution,
      board,
      notes,
      history,
      selected,
      noteMode,
      soundEnabled,
      items,
      locale,
      elapsedSeconds,
      timerRunning,
      solved,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setLastBackupAt(new Date().toISOString());
  }, [hydrated, difficulty, puzzle, board, notes, history, selected, noteMode, soundEnabled, items, locale, elapsedSeconds, timerRunning, solved]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }, [hydrated, records]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    const roomId = new URLSearchParams(window.location.search).get('room');
    if (roomId) {
      connectSharedRoom(roomId, undefined, 'spectator');
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [hydrated]);

  useEffect(() => {
    if (!timerRunning) {
      timerOriginRef.current = null;
      return;
    }

    timerOriginRef.current = Date.now() - elapsedSeconds * 1000;
    const intervalId = window.setInterval(() => {
      if (!timerOriginRef.current) return;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerOriginRef.current) / 1000)));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    if (!solved) return;
    setTimerRunning(false);
    setShowCompleteModal(true);
    setConfettiPieces(
      Array.from({ length: 72 }, (_, index) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.2 + Math.random() * 1.9,
        size: 6 + Math.random() * 12,
        hue: [42, 112, 188, 264, 330, 16][index % 6],
        rotation: Math.random() * 360,
      })),
    );

    if (sharedRoom?.snapshot?.solved && sharedRoom.snapshot.completedAt && sharedRoom.snapshot.completedElapsedSeconds !== null) {
      setSharedCompletionSummary({
        difficulty: sharedRoom.snapshot.difficulty,
        clueCount: sharedRoom.snapshot.clueCount,
        elapsedSeconds: sharedRoom.snapshot.completedElapsedSeconds,
        completedAt: sharedRoom.snapshot.completedAt,
        completedBy: sharedRoom.snapshot.completedBy,
        completedByRole: sharedRoom.snapshot.completedByRole,
      });
      setCompletionSummary(null);
    } else if (!completionSavedRef.current) {
      completionSavedRef.current = true;
      const record: RecordEntry = {
        difficulty,
        elapsedSeconds,
        clueCount: puzzle.clueCount,
        completedAt: new Date().toISOString(),
      };
      const nextRecords = [record, ...records].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || b.completedAt.localeCompare(a.completedAt)).slice(0, 20);
      setRecords(nextRecords);
      setCompletionSummary({
        ...record,
        rank: nextRecords.findIndex((entry) => entry.completedAt === record.completedAt) + 1,
        total: nextRecords.length,
      });
    }

    if (soundEnabled) {
      void playCompletionSound();
    }

    if (sharedRoom?.snapshot?.solved) {
      const solverLabel = sharedRoom.snapshot.completedByRole === 'host' ? (locale === 'ko' ? '방장' : 'host') : sharedRoom.snapshot.completedByRole === 'guest' ? (locale === 'ko' ? '게스트' : 'guest') : (locale === 'ko' ? '누군가' : 'Someone');
      setMessage(
        locale === 'ko'
          ? `${solverLabel}가 ${formatTime(sharedRoom.snapshot.completedElapsedSeconds ?? elapsedSeconds)} 만에 퍼즐을 완성했어요!`
          : `${solverLabel} finished the puzzle in ${formatTime(sharedRoom.snapshot.completedElapsedSeconds ?? elapsedSeconds)}!`,
      );
    } else {
      setMessage('Correct! You completed the puzzle!');
    }
  }, [solved, difficulty, elapsedSeconds, puzzle.clueCount, records, soundEnabled, sharedRoom?.snapshot?.solved, sharedRoom?.snapshot?.completedAt, sharedRoom?.snapshot?.completedElapsedSeconds, sharedRoom?.snapshot?.completedByRole]);

  function handleCellClick(rowIndex: number, colIndex: number) {
    if (selected?.row === rowIndex && selected?.col === colIndex) {
      setSelected(null);
      return;
    }
    setSelected({ row: rowIndex, col: colIndex });
  }

  function moveSelection(deltaRow: number, deltaCol: number) {
    const current = selected ?? { row: 0, col: 0 };
    const next = {
      row: Math.max(0, Math.min(8, current.row + deltaRow)),
      col: Math.max(0, Math.min(8, current.col + deltaCol)),
    };
    setSelected(next);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isArrow = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key);
      if (isArrow) {
        event.preventDefault();
        if (key === 'arrowup') moveSelection(-1, 0);
        if (key === 'arrowdown') moveSelection(1, 0);
        if (key === 'arrowleft') moveSelection(0, -1);
        if (key === 'arrowright') moveSelection(0, 1);
        return;
      }

      if (!selected) return;
      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        updateCell(Number(event.key));
      }
      if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        event.preventDefault();
        clearCell();
      }
      if (event.key === 'Escape') {
        setSelected(null);
      }
      if (key === 'n') {
        event.preventDefault();
        setNoteMode((current) => !current);
      }
      if (key === 'h') {
        event.preventDefault();
        handleHint();
      }
      if (key === 'i') {
        event.preventDefault();
        handleHintItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, board, puzzle, notes, noteMode, solved, items]);

  function startTimerIfNeeded() {
    if (timerRunning || solved) return;
    setTimerRunning(true);
  }

  function captureSnapshot(): Snapshot {
    return {
      board: cloneGrid(board),
      notes: cloneNotes(notes),
      elapsedSeconds,
    };
  }

  function resetGame(nextDifficulty: Difficulty = difficulty) {
    if (sharedRoom) {
      if (sharedRoom.role !== 'host') {
        setMessage('Only the host can start a new puzzle.');
        return;
      }
      sendSharedMessage({ type: 'reset_room', roomId: sharedRoom.roomId, participantId: sharedRoom.participantId, difficulty: nextDifficulty });
      setMessage('Requested a new puzzle for the shared room.');
      return;
    }

    const nextPuzzle = generatePuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    setPuzzle(nextPuzzle);
    setBoard(cloneGrid(nextPuzzle.puzzle));
    setNotes(createEmptyNotesGrid());
    setSelected(null);
    setHistory([]);
    setChecks([]);
    setSolved(false);
    setShowCompleteModal(false);
    setConfettiPieces([]);
    setCompletionSummary(null);
    setSharedCompletionSummary(null);
    completionSavedRef.current = false;
    setNoteMode(false);
    setItems({ hint: 3, autoFill: 1 });
    setHintPreview(null);
    setElapsedSeconds(0);
    setTimerRunning(false);
    timerOriginRef.current = null;
    setOwnership(ownershipFromPuzzle(nextPuzzle.puzzle));
    setMessage(`Started a new ${nextDifficulty === 'easy' ? 'easy' : nextDifficulty === 'medium' ? 'medium' : 'hard'} game.`);
  }

  function pushHistory(nextBoard: Grid, nextNotes: NoteGrid) {
    setHistory((current) => [...current, captureSnapshot()].slice(-30));
    setBoard(nextBoard);
    setNotes(nextNotes);
    setChecks([]);
    setHintPreview(null);
    syncOwnershipFromBoard(nextBoard, sharedRoom?.participantId ?? null);
    startTimerIfNeeded();
  }

  function updateCell(value: number) {
    if (sharedMatchGateActive) {
      setMessage(locale === 'ko' ? '상대방이 연결될 때까지 기다려 주세요.' : 'Please wait until the match starts.');
      return;
    }
    if (!selected) return;
    const { row, col } = selected;
    if (fixedCells[row][col] || solved) return;
    if (value < 1 || value > 9) return;

    startTimerIfNeeded();

    if (noteMode) {
      const nextNotes = toggleNote(notes, row, col, value);
      setNotes(nextNotes);
      setHistory((current) => [...current, captureSnapshot()].slice(-30));
      setHintPreview(null);
      setMessage(`(${row + 1}, ${col + 1}) note ${hasNotes(nextNotes, row, col) ? 'toggled' : 'updated'} with ${value}.`);
      return;
    }

    const nextBoard = cloneGrid(board);
    const nextNotes = cloneNotes(notes);
    nextBoard[row][col] = value;
    nextNotes[row][col] = [];
    pushHistory(nextBoard, nextNotes);
    setChecks([]);
    if (sharedRoom) {
      sendSharedMessage({ type: 'move', roomId: sharedRoom?.roomId, participantId: sharedRoom?.participantId, row, col, value });
    }
    if (boardMatchesSolution(nextBoard, puzzle.solution)) {
      setSolved(true);
    }
    setMessage(`Entered ${value} at (${row + 1}, ${col + 1}).`);
  }

  function clearCell() {
    if (sharedMatchGateActive) {
      setMessage(locale === 'ko' ? '상대방이 연결될 때까지 기다려 주세요.' : 'Please wait until the match starts.');
      return;
    }
    if (!selected) return;
    const { row, col } = selected;
    if (fixedCells[row][col] || solved) return;

    startTimerIfNeeded();

    const nextBoard = cloneGrid(board);
    const nextNotes = cloneNotes(notes);
    nextBoard[row][col] = null;
    nextNotes[row][col] = [];
    pushHistory(nextBoard, nextNotes);
    if (sharedRoom) {
      sendSharedMessage({ type: 'move', roomId: sharedRoom.roomId, participantId: sharedRoom.participantId, row, col, value: null });
    }
    setMessage('Cleared the board and notes.');
  }

  function handleUndo() {
    if (sharedMatchGateActive) {
      setMessage('You can only edit after the countdown finishes.');
      return;
    }
    if (sharedRoom) {
      setMessage('Undo is unavailable in shared mode.');
      return;
    }

    setHistory((current) => {
      if (current.length === 0) {
        setMessage('No moves to undo.');
        return current;
      }
      const previous = current[current.length - 1];
      setBoard(cloneGrid(previous.board));
      setNotes(cloneNotes(previous.notes));
      setElapsedSeconds(previous.elapsedSeconds);
      setChecks([]);
      setSolved(false);
      setShowCompleteModal(false);
      setConfettiPieces([]);
      setCompletionSummary(null);
      completionSavedRef.current = false;
      setHintPreview(null);
      setOwnership(ownershipFromPuzzle(previous.board));
      setMessage('Reverted the last move.');
      return current.slice(0, -1);
    });
  }

  function handleClearRecords() {
    if (typeof window !== 'undefined' && !window.confirm('Delete all saved records?')) return;
    setRecords([]);
    window.localStorage.removeItem(RECORDS_KEY);
    setMessage('Deleted all records.');
  }

  function handleExportRecords() {
    const payload = {
      exportedAt: new Date().toISOString(),
      records,
      settings: { soundEnabled },
    };
    downloadTextFile(`sudoku-records-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json');
    setMessage('Downloaded the record file.');
  }

  function handleExportCsv() {
    const header = ['difficulty', 'elapsedSeconds', 'clueCount', 'completedAt'];
    const rows = records.map((record) => [record.difficulty, String(record.elapsedSeconds), String(record.clueCount), record.completedAt]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    downloadTextFile(`sudoku-records-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
    setMessage('Downloaded the CSV file.');
  }

  async function handleShareCompletion() {
    if (sharedCompletionSummary) {
      const text = [
        locale === 'ko' ? 'Dual Sudoku에서 퍼즐을 완성했어요! 🎉' : 'I completed a Dual Sudoku puzzle! 🎉',
        `Difficulty: ${getDifficultyLabel(locale, sharedCompletionSummary.difficulty)}`,
        `Time: ${formatTime(sharedCompletionSummary.elapsedSeconds)}`,
        `Clues: ${sharedCompletionSummary.clueCount}`,
      ].join('\n');
      const shareCardSummary: CompletionSummary = {
        difficulty: sharedCompletionSummary.difficulty,
        elapsedSeconds: sharedCompletionSummary.elapsedSeconds,
        clueCount: sharedCompletionSummary.clueCount,
        completedAt: sharedCompletionSummary.completedAt,
        rank: 1,
        total: 1,
      };

      try {
        if (navigator.share) {
          const svg = buildShareCardSvg(shareCardSummary, locale);
          const file = new File([svg], `sudoku-completion-${Date.now()}.svg`, { type: 'image/svg+xml' });
          await navigator.share({
            title: 'Dual Sudoku completion card',
            text,
            files: [file],
          });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          setMessage('Copied the completion summary to the clipboard.');
        } else {
          downloadTextFile(`sudoku-completion-${new Date().toISOString().slice(0, 10)}.txt`, text, 'text/plain');
          setMessage('Downloaded the completion summary file.');
        }
      } catch {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          setMessage('Copied the completion summary to the clipboard.');
        } else {
          setMessage('Could not complete sharing.');
        }
      }
      return;
    }

    if (!completionSummary) return;
    const text = buildShareText(completionSummary, locale);
    try {
      if (navigator.share) {
        const svg = buildShareCardSvg(completionSummary, locale);
        const file = new File([svg], `sudoku-completion-${Date.now()}.svg`, { type: 'image/svg+xml' });
        await navigator.share({
          title: 'Dual Sudoku completion card',
          text,
          files: [file],
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setMessage('Copied the completion summary to the clipboard.');
      } else {
        downloadTextFile(`sudoku-completion-${new Date().toISOString().slice(0, 10)}.txt`, text, 'text/plain');
        setMessage('Downloaded the completion summary file.');
      }
    } catch {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setMessage('Copied the completion summary to the clipboard.');
      } else {
        setMessage('Could not complete sharing.');
      }
    }
  }

  function handleImportRecords() {
    const input = window.prompt('Paste the exported JSON here.');
    if (!input) return;

    try {
      const parsed = JSON.parse(input) as { records?: unknown; settings?: { soundEnabled?: unknown } } | unknown;
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid');
      const payload = parsed as { records?: unknown; settings?: { soundEnabled?: unknown } };
      const importedRecords = normalizeRecords(payload.records);
      if (importedRecords.length === 0) {
        throw new Error('no records');
      }
      setRecords(importedRecords);
      if (typeof payload.settings?.soundEnabled === 'boolean') {
        setSoundEnabled(payload.settings.soundEnabled);
      }
      setActivePanel('records');
      setMessage(`${importedRecords.length} records imported.`);
    } catch {
      setMessage('Could not import the records JSON. Please check the format.');
    }
  }

  function handleCheck() {
    const wrong: { row: number; col: number }[] = [];
    const conflictList = Array.from(conflictCells).map((entry) => {
      const [row, col] = entry.split('-').map(Number);
      return { row, col };
    });
    const solvedBoard = solveSudoku(board);

    if (!solvedBoard) {
      setChecks(conflictList);
      setMessage('This board can still be completed, but please double-check your inputs.');
      return;
    }

    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== null && cell !== puzzle.solution[r][c]) {
          wrong.push({ row: r, col: c });
        }
      });
    });

    const nextChecks = Array.from(new Map([...wrong, ...conflictList].map((item) => [`${item.row}-${item.col}`, item])).values());
    setChecks(nextChecks);
    if (boardMatchesSolution(board, puzzle.solution)) {
      setSolved(true);
      return;
    }
    if (nextChecks.length === 0 && isFilled(board)) {
      setSolved(true);
    } else if (nextChecks.length === 0) {
      setMessage('No conflicts here. Keep going.');
    } else {
      setMessage(`${nextChecks.length} cells differ from the solution.`);
    }
  }

  function handleHintItem() {
    if (sharedMatchGateActive) {
      setMessage(locale === 'ko' ? '시작 후에만 힌트를 사용할 수 있어요.' : 'Hints are available after the match starts.');
      return;
    }
    if (sharedRoom) {
      setMessage(locale === 'ko' ? '공유 경기에서는 힌트를 사용할 수 없어요.' : 'Hints are disabled in shared matches.');
      return;
    }
    if (solved) return;
    if (items.hint <= 0) {
      setMessage('No auto-fill items left.');
      return;
    }

    const solvedBoard = solveSudoku(board);
    if (!solvedBoard) {
      setMessage('This board cannot be hinted right now. Please clean up the inputs first.');
      return;
    }

    let target: Position = selected;
    if (!target || fixedCells[target.row][target.col] || board[target.row][target.col] !== null) {
      target = null;
      for (let r = 0; r < 9 && !target; r += 1) {
        for (let c = 0; c < 9; c += 1) {
          if (board[r][c] === null && !fixedCells[r][c]) {
            target = { row: r, col: c };
            break;
          }
        }
      }
    }

    if (!target) {
      setMessage('No more cells can receive hints.');
      return;
    }

    const value = solvedBoard[target.row][target.col];
    if (value === null) {
      setMessage('Hint calculation failed to find a value.');
      return;
    }

    setSelected(target);
    setHintPreview({ row: target.row, col: target.col, value });
    setItems((current) => ({ ...current, hint: Math.max(0, current.hint - 1) }));
    setMessage(`Hint: (${target.row + 1}, ${target.col + 1}) should be ${value}.`);
  }

  function handleHint() {
    if (sharedMatchGateActive) {
      setMessage(locale === 'ko' ? '시작 후에만 자동입력을 사용할 수 있어요.' : 'Auto-fill is available after the match starts.');
      return;
    }
    if (sharedRoom) {
      setMessage(locale === 'ko' ? '공유 경기에서는 자동입력을 사용할 수 없어요.' : 'Auto-fill is disabled in shared matches.');
      return;
    }
    if (solved) return;
    if (items.autoFill <= 0) {
      setMessage('No auto-fill items left.');
      return;
    }

    const solvedBoard = solveSudoku(board);
    if (!solvedBoard) {
      setMessage('This board cannot be hinted right now. Please clean up the inputs first.');
      return;
    }

    startTimerIfNeeded();

    let target: Position = selected;
    if (!target || fixedCells[target.row][target.col] || board[target.row][target.col] !== null) {
      target = null;
      for (let r = 0; r < 9 && !target; r += 1) {
        for (let c = 0; c < 9; c += 1) {
          if (board[r][c] === null && !fixedCells[r][c]) {
            target = { row: r, col: c };
            break;
          }
        }
      }
    }

    if (!target) {
      setMessage('No auto-fill items left.');
      return;
    }

    const nextBoard = cloneGrid(board);
    const nextNotes = cloneNotes(notes);
    nextBoard[target.row][target.col] = solvedBoard[target.row][target.col];
    nextNotes[target.row][target.col] = [];
    setBoard(nextBoard);
    setNotes(nextNotes);
    setHistory((current) => [...current, captureSnapshot()].slice(-30));
    setSelected(target);
    setHintPreview(null);
    setItems((current) => ({ ...current, autoFill: Math.max(0, current.autoFill - 1) }));
    setChecks([]);
    setMessage(`Auto-fill: placed ${solvedBoard[target.row][target.col]} at (${target.row + 1}, ${target.col + 1}).`);
  }

  const hasSavedState = hydrated && window.localStorage.getItem(STORAGE_KEY) !== null;
  const visibleRecords = useMemo(
    () => filterAndSortRecords(records, recordDifficultyFilter, recordSortMode).slice(0, 8),
    [records, recordDifficultyFilter, recordSortMode],
  );
  const bestByDifficulty = useMemo(() => {
    const all: Record<Difficulty, RecordEntry | null> = { easy: null, medium: null, hard: null };
    for (const record of records) {
      if (!all[record.difficulty] || record.elapsedSeconds < all[record.difficulty]!.elapsedSeconds) {
        all[record.difficulty] = record;
      }
    }
    return all;
  }, [records]);
  const stats = useMemo(() => {
    const total = records.length;
    const average = total > 0 ? Math.round(records.reduce((sum, record) => sum + record.elapsedSeconds, 0) / total) : 0;
    const best = total > 0 ? records[0] : null;
    const hardestSolved = records.filter((record) => record.difficulty === 'hard').length;
    return { total, average, best, hardestSolved };
  }, [records]);

  if (!hydrated) {
    return (
      <section className={styles.shell}>
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelLabel}>Sudoku</p>
              <h2 className={styles.panelTitle}>Loading…</h2>
            </div>
          </div>
          <p className={styles.message}>Preparing the game state…</p>
        </aside>
        <section className={styles.boardWrap}>
          <div className={styles.boardMeta}>
            <div>
              <p className={styles.panelLabel}>Sudoku Board</p>
              <h3 className={styles.boardTitle}>Loading the puzzle and styling…</h3>
            </div>
          </div>
        </section>
      </section>
    );
  }

  return (
    <>
      <section className={styles.shell}>
      <aside className={styles.panel}>
        <div className={styles.panelTabs} role="tablist" aria-label="panel views">
          <button type="button" className={`${styles.panelTab} ${activePanel === 'play' ? styles.panelTabActive : ''}`} onClick={() => setActivePanel('play')}>
            {locale === 'ko' ? '플레이' : 'Play'}
          </button>
          <button type="button" className={`${styles.panelTab} ${activePanel === 'records' ? styles.panelTabActive : ''}`} onClick={() => setActivePanel('records')}>
            {locale === 'ko' ? '기록' : 'Records'}
          </button>
        </div>

        {activePanel === 'play' ? (
          <>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>{locale === 'ko' ? '난이도' : 'Difficulty'}</p>
                <h2 className={styles.panelTitle}>{locale === 'ko' ? '새 게임 시작' : 'Start a new game'}</h2>
              </div>
              <div className={styles.badge}>{puzzle.clueCount} clues</div>
            </div>

            <div className={styles.statusRow}>
              <div className={styles.statusChip}>
                <span>{locale === 'ko' ? '타이머' : 'Timer'}</span>
                <strong>{formatTime(elapsedSeconds)}</strong>
              </div>
              <button
                type="button"
                className={`${styles.statusChip} ${noteMode ? styles.statusChipActive : ''}`}
                onClick={() => setNoteMode((current) => !current)}
              >
                <span>{locale === 'ko' ? '메모 모드' : 'Notes'}</span>
                <strong>{noteMode ? 'ON' : 'OFF'}</strong>
              </button>
              <button
                type="button"
                className={`${styles.statusChip} ${soundEnabled ? styles.statusChipActive : ''}`}
                onClick={() => setSoundEnabled((current) => !current)}
              >
                <span>{locale === 'ko' ? '사운드' : 'Sound'}</span>
                <strong>{soundEnabled ? 'ON' : 'OFF'}</strong>
              </button>
              <button type="button" className={styles.statusChip} onClick={() => setLocale((current) => (current === 'ko' ? 'en' : 'ko'))}>
                <span>{locale === 'ko' ? '언어' : 'Language'}</span>
                <strong>{locale === 'ko' ? '한국어' : 'English'}</strong>
              </button>
            </div>

            <div className={styles.roomPanel}>
              {sharedRoom ? (
                <>
                  <div className={styles.roomMeta}>
                    <span>{locale === 'ko' ? '공유 방' : 'Shared room'}</span>
                    <button
                      type="button"
                      className={styles.roomIdButton}
                      onClick={() => { void copyRoomId(); }}
                      aria-label={locale === 'ko' ? '방 ID 복사' : 'Copy room ID'}
                      title={locale === 'ko' ? '터치하면 방 ID를 복사해요.' : 'Tap to copy the room ID.'}
                    >
                      <strong>{sharedRoom.roomId}</strong>
                    </button>
                    <small>
                      {sharedRoom.connected
                        ? locale === 'ko'
                          ? sharedRoom.role === 'host'
                            ? '방장'
                            : sharedRoom.role === 'guest'
                              ? '참가자'
                              : '관전자'
                          : sharedRoom.role === 'host'
                            ? 'Host'
                            : sharedRoom.role === 'guest'
                              ? 'Guest'
                              : 'Spectator'
                        : locale === 'ko'
                          ? '연결 중...'
                          : 'Connecting...'}
                    </small>
                    <small>
                      {locale === 'ko' ? '방 ID를 누르면 복사되고, 초대 링크는 옆 버튼으로 복사해요.' : 'Tap the room ID to copy it, or use the invite link button.'}
                    </small>
                  </div>
                  <div className={styles.roomActions}>
                    <button type="button" className={styles.actionSecondary} onClick={copyRoomInviteLink}>
                      {locale === 'ko' ? '초대 링크 복사' : 'Copy invite link'}
                    </button>
                    <button type="button" className={styles.actionSecondary} onClick={disconnectSharedRoom}>
                      {locale === 'ko' ? '방 나가기' : 'Leave room'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.roomField}>
                    <label htmlFor="room-id-input">{locale === 'ko' ? '방 ID' : 'Room ID'}</label>
                    <input
                      id="room-id-input"
                      className={styles.roomFieldInput}
                      value={roomInput}
                      onChange={(event) => setRoomInput(sanitizeRoomIdInput(event.target.value))}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData('text');
                        if (pasted) {
                          event.preventDefault();
                          setRoomInput(sanitizeRoomIdInput(pasted));
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          joinRoomFromInput();
                        }
                      }}
                      inputMode="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      placeholder={locale === 'ko' ? '링크를 붙여넣어도 room ID만 자동 추출해요.' : 'Paste a link or room ID; we will extract the room ID.'}
                    />
                    <small className={styles.roomFieldHint}>
                      {locale === 'ko' ? '방 링크를 그대로 붙여넣어도 방 ID만 남기고 정리합니다.' : 'You can paste the full invite link; only the room ID will be kept.'}
                    </small>
                  </div>
                  <div className={styles.roomActions}>
                    <button type="button" className={styles.actionPrimary} onClick={() => createSharedRoom(difficulty)}>
                      {locale === 'ko' ? '방 만들기' : 'Create room'}
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionSecondary} ${canJoinRoom ? styles.roomJoinReady : ''}`}
                      onClick={joinRoomFromInput}
                      disabled={!canJoinRoom}
                    >
                      {locale === 'ko' ? '방 참가' : 'Join room'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className={styles.itemRow}>
              <button type="button" className={styles.itemChip} onClick={handleHintItem} disabled={items.hint <= 0 || solved || Boolean(sharedRoom)}>
                <span>{locale === 'ko' ? '힌트 아이템' : 'Hint item'}</span>
                <strong>x{items.hint}</strong>
                <small>I</small>
              </button>
              <button type="button" className={styles.itemChip} onClick={handleHint} disabled={items.autoFill <= 0 || solved || Boolean(sharedRoom)}>
                <span>{locale === 'ko' ? '자동입력 아이템' : 'Auto-fill item'}</span>
                <strong>x{items.autoFill}</strong>
                <small>H</small>
              </button>
            </div>

            <div className={styles.difficultyRow}>
              {DIFFICULTIES.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`${styles.difficultyButton} ${difficulty === item.value ? styles.difficultyActive : ''}`}
                  onClick={() => resetGame(item.value)}
                  disabled={Boolean(sharedRoom) && !sharedRoomIsHost}
                >
                  <span>{locale === 'ko' ? item.koLabel : item.enLabel}</span>
                  <small>{locale === 'ko' ? item.koDetail : item.enDetail}</small>
                </button>
              ))}
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <span>{locale === 'ko' ? '해결 상태' : 'Status'}</span>
                <strong>{solved ? (locale === 'ko' ? '완료' : 'Done') : (locale === 'ko' ? '진행 중' : 'In progress')}</strong>
              </div>
              <div className={styles.statCard}>
                <span>{locale === 'ko' ? '후보 수' : 'Candidates'}</span>
                <strong>{selected ? candidateCount : '—'}</strong>
              </div>
              <div className={styles.statCard}>
                <span>{locale === 'ko' ? '저장' : 'Saved'}</span>
                <strong>{hasSavedState ? 'ON' : 'OFF'}</strong>
              </div>
              <div className={styles.statCard}>
                <span>{locale === 'ko' ? '백업' : 'Backup'}</span>
                <strong>{lastBackupAt ? new Date(lastBackupAt).toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</strong>
              </div>
            </div>

            <p className={styles.message}>{message}</p>

            <div className={styles.actions}>
              <button type="button" className={styles.actionPrimary} onClick={() => resetGame(difficulty)} disabled={sharedRoomIsActive && !sharedRoomIsHost}>
                {locale === 'ko' ? '새 퍼즐' : 'New puzzle'}
              </button>
              <button type="button" className={styles.actionSecondary} onClick={handleHint} disabled={sharedRoomIsActive}>
                {locale === 'ko' ? '자동입력' : 'Auto-fill'}
              </button>
              <button type="button" className={styles.actionSecondary} onClick={handleCheck} disabled={sharedRoomIsActive}>
                {locale === 'ko' ? '검사' : 'Check'}
              </button>
              <button type="button" className={styles.actionSecondary} onClick={handleUndo} disabled={sharedRoomIsActive}>
                {locale === 'ko' ? '되돌리기' : 'Undo'}
              </button>
            </div>

          </>
        ) : (
          <>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelLabel}>{locale === 'ko' ? '기록' : 'Records'}</p>
                <h2 className={styles.panelTitle}>{locale === 'ko' ? '베스트 랭킹' : 'Best records'}</h2>
              </div>
              <div className={styles.panelHeaderActions}>
                <div className={styles.badge}>{records.length} plays</div>
                <button type="button" className={styles.actionSecondary} onClick={handleExportRecords}>
                  {locale === 'ko' ? '내보내기' : 'Export'}
                </button>
                <button type="button" className={styles.actionSecondary} onClick={handleExportCsv}>
                  CSV
                </button>
                <button type="button" className={styles.actionSecondary} onClick={handleImportRecords}>
                  {locale === 'ko' ? '가져오기' : 'Import'}
                </button>
                <button type="button" className={styles.actionSecondary} onClick={handleClearRecords}>
                  {locale === 'ko' ? '기록 초기화' : 'Reset'}
                </button>
              </div>
            </div>

            <div className={styles.recordToolbar}>
              <div className={styles.recordFilters}>
                {(['all', 'easy', 'medium', 'hard'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`${styles.filterChip} ${recordDifficultyFilter === level ? styles.filterChipActive : ''}`}
                    onClick={() => setRecordDifficultyFilter(level)}
                  >
                    {level === 'all' ? (locale === 'ko' ? '전체' : 'All') : level === 'easy' ? (locale === 'ko' ? '하' : 'Easy') : level === 'medium' ? (locale === 'ko' ? '중' : 'Medium') : (locale === 'ko' ? '상' : 'Hard')}
                  </button>
                ))}
              </div>
              <div className={styles.recordSorts}>
                {([
                  ['fastest', 'Fastest'],
                  ['newest', 'Newest'],
                  ['oldest', 'Oldest'],
                ] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`${styles.filterChip} ${recordSortMode === mode ? styles.filterChipActive : ''}`}
                    onClick={() => setRecordSortMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statsCard}>
                <span>{locale === 'ko' ? '총 완료' : 'Solved'}</span>
                <strong>{stats.total}</strong>
              </div>
              <div className={styles.statsCard}>
                <span>{locale === 'ko' ? '평균 시간' : 'Average'}</span>
                <strong>{stats.total > 0 ? formatTime(stats.average) : '—'}</strong>
              </div>
              <div className={styles.statsCard}>
                <span>{locale === 'ko' ? '최고 기록' : 'Best time'}</span>
                <strong>{stats.best ? formatTime(stats.best.elapsedSeconds) : '—'}</strong>
              </div>
              <div className={styles.statsCard}>
                <span>{locale === 'ko' ? '상 난이도 완료' : 'Hard clears'}</span>
                <strong>{stats.hardestSolved}</strong>
              </div>
            </div>

            <div className={styles.rankGrid}>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
                const best = bestByDifficulty[level];
                return (
                  <div key={level} className={styles.rankCard}>
                    <span>{locale === 'ko' ? (level === 'easy' ? '하' : level === 'medium' ? '중' : '상') : level.toUpperCase()[0]}</span>
                    <strong>{best ? formatTime(best.elapsedSeconds) : '—'}</strong>
                    <small>{best ? `${best.clueCount} clues · ${new Date(best.completedAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}` : locale === 'ko' ? '기록 없음' : 'No record yet'}</small>
                  </div>
                );
              })}
            </div>

            <div className={styles.recordList}>
              {visibleRecords.length > 0 ? visibleRecords.map((record, index) => (
                <div key={`${record.completedAt}-${index}`} className={styles.recordItem}>
                  <div>
                    <strong>{record.difficulty === 'easy' ? '하' : record.difficulty === 'medium' ? '중' : '상'}</strong>
                    <span>{record.clueCount} clues</span>
                  </div>
                  <div>
                    <strong>{formatTime(record.elapsedSeconds)}</strong>
                    <span>{new Date(record.completedAt).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')}</span>
                  </div>
                </div>
              )) : <p className={styles.recordEmpty}>{locale === 'ko' ? '아직 기록이 없어요. 첫 퍼즐을 완성해보세요.' : 'No records yet. Finish your first puzzle to see rankings.'}</p>}
</div>
          </>
        )}
      </aside>

      <section className={styles.boardWrap}>
        <div className={styles.boardMeta}>
          <div>
            <p className={styles.panelLabel}>Sudoku Board</p>
            <h3 className={styles.boardTitle}>{locale === 'ko' ? '집중하기 좋은 클린한 레이아웃' : 'A clean layout for focused play'}</h3>
          </div>
          <div className={styles.boardMetaSide}>
            {sharedRoom?.snapshot ? (
              <div className={styles.battleCard}>
                <div className={styles.battleCardHeader}>
                  <div>
                    <p className={styles.panelLabel}>{locale === 'ko' ? '대결 미니맵' : 'Battle minimap'}</p>
                    <h4 className={styles.battleCardTitle}>
                      {battleSummary?.battleActive
                        ? locale === 'ko'
                          ? '상대 진행 상황'
                          : 'Opponent progress'
                        : locale === 'ko'
                          ? '상대 참가 대기 중'
                          : 'Waiting for an opponent'}
                    </h4>
                  </div>
                  <div className={styles.battleScore}>
                    <strong>{locale === 'ko' ? `${battleSummary?.otherProgress ?? 0}% 점유` : `${battleSummary?.otherProgress ?? 0}% controlled`}</strong>
                    <span>{locale === 'ko' ? `${battleSummary?.otherCells ?? 0}칸 확보` : `${battleSummary?.otherCells ?? 0} cells`}</span>
                  </div>
                </div>
                <div className={styles.battleProgress} aria-hidden="true">
                  <span
                    style={{
                      width: `${battleSummary && battleSummary.fillableCells > 0 ? Math.min(100, (battleSummary.otherCells / battleSummary.fillableCells) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className={styles.battleCaption}>
                  {battleSummary?.battleActive
                    ? locale === 'ko'
                      ? `상대가 ${battleSummary.otherCells}/${battleSummary.fillableCells}칸을 채웠어요. ${battleSummary.stage.ko} 구간이에요.`
                      : `Your rival has filled ${battleSummary.otherCells}/${battleSummary.fillableCells} cells. ${battleSummary.stage.en}.`
                    : locale === 'ko'
                      ? '상대가 들어오면 미니맵이 살아나요.'
                      : 'The minimap comes alive when a rival joins.'}
                </p>
                <div className={styles.battleMiniMap} aria-label={locale === 'ko' ? '상대 진행 미니맵' : 'Opponent minimap'}>
                  {sharedBattleMiniMapGrid.flatMap((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <span
                        key={`${rowIndex}-${colIndex}`}
                        className={`${styles.battleMiniCell} ${
                          cell === 'clue'
                            ? styles.battleMiniClue
                            : cell === 'self'
                              ? styles.battleMiniSelf
                              : cell === 'both'
                                ? styles.battleMiniBoth
                                : cell === 'other'
                                  ? styles.battleMiniOther
                                  : styles.battleMiniEmpty
}`}
                        aria-hidden="true"
                      />
                    )),
                  )}
                </div>
                <div className={styles.battleLegend}>
                  <span><i className={styles.battleLegendSelf} />{locale === 'ko' ? '내 수' : 'Mine'}</span>
                  <span><i className={styles.battleLegendOther} />{locale === 'ko' ? '상대 수' : 'Rival'}</span>
                  <span><i className={styles.battleLegendBoth} />{locale === 'ko' ? '겹침' : 'Overlap'}</span>
                  <span><i className={styles.battleLegendClue} />{locale === 'ko' ? '주어진 숫자' : 'Clue'}</span>
                </div>
              </div>
            ) : null}
            <span className={styles.boardHint}>{locale === 'ko' ? '클릭하거나 키보드 1~9를 사용하세요. I = 힌트, H = 자동입력' : 'Click a cell or press 1–9. I = hint, H = auto-fill.'}</span>
          </div>
        </div>

        {sharedMatchGateActive ? (
          <div className={styles.boardGate} role="status" aria-live="polite">
            <p className={styles.panelLabel}>{locale === 'ko' ? '매치 준비 중' : 'Match lobby'}</p>
            <h3 className={styles.boardGateTitle}>
              {sharedMatchIsCountdown
                ? locale === 'ko'
                  ? `${sharedMatchCountDownSeconds ?? 5}초 뒤 시작합니다`
                  : `Starting in ${sharedMatchCountDownSeconds ?? 5} seconds`
                : locale === 'ko'
                  ? '상대방이 들어오면 5초 카운트다운 후 시작해요'
                  : 'Waiting for the second player, then a 5-second countdown will start'}
            </h3>
            <p className={styles.boardGateText}>
              {sharedMatchIsCountdown
                ? locale === 'ko'
                  ? '양쪽 모두 같은 시점에 퍼즐이 공개됩니다.'
                  : 'Both players will see the board at the same time.'
                : locale === 'ko'
                  ? '대기 중에는 판을 미리 보여주지 않습니다.'
                  : 'The board stays hidden until both players are ready.'}
            </p>
          </div>
        ) : null}
        <div className={`${styles.board} ${solved ? styles.boardSolved : ""} ${sharedMatchGateActive ? styles.boardLocked : ""} ${sharedMatchGateActive ? styles.boardHidden : ""}`} role="grid" aria-label="Sudoku board">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isFixed = fixedCells[rowIndex][colIndex];
              const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
              const inSameRow = selected?.row === rowIndex;
              const inSameCol = selected?.col === colIndex;
              const inSameBox =
                selected &&
                Math.floor(selected.row / 3) === Math.floor(rowIndex / 3) &&
                Math.floor(selected.col / 3) === Math.floor(colIndex / 3);
              const isWrong = difficulty === 'easy' && checks.some((item) => item.row === rowIndex && item.col === colIndex);
              const noteDigits = notes[rowIndex][colIndex];
              const classes = [
                styles.cell,
                isFixed ? styles.cellFixed : '',
                isSelected ? styles.cellSelected : '',
                solved ? styles.cellSolved : '',
                (inSameRow || inSameCol || inSameBox) && !isSelected ? styles.cellFocus : '',
                (isWrong || conflictCells.has(`${rowIndex}-${colIndex}`)) ? styles.cellWrong : '',
                hintPreview?.row === rowIndex && hintPreview?.col === colIndex ? styles.cellHint : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  role="gridcell"
                  type="button"
                  aria-label={`row ${rowIndex + 1} column ${colIndex + 1}`}
                  className={classes}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {cell !== null ? (
                    <span className={styles.cellValue}>{cell}</span>
                  ) : noteDigits.length > 0 ? (
                    <span className={styles.cellNotesGrid}>
                      {getNoteCellValue(noteDigits).map((value, index) => (
                        <span key={index} className={styles.cellNoteValue}>
                          {value}
                        </span>
                      ))}
                    </span>
                  ) : selected ? (
                    <span className={styles.cellPlaceholder}>•</span>
                  ) : null}
                </button>
              );
            }),
          )}
        </div>

        <div className={styles.keypad}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((number) => (
            <button type="button" key={number} onClick={() => updateCell(number)} className={styles.keypadButton} disabled={sharedMatchGateActive || !selected || solved}>
              {number}
            </button>
          ))}
          <button type="button" onClick={clearCell} className={`${styles.keypadButton} ${styles.keypadClear}`} disabled={sharedMatchGateActive || !selected || solved}>
            {locale === 'ko' ? '지우기' : 'Clear'}
          </button>
        </div>
      </section>
    </section>

      {showCompleteModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Puzzle complete" onClick={() => setShowCompleteModal(false)}>
          <div className={styles.confettiLayer} aria-hidden="true">
            {confettiPieces.map((piece, index) => (
              <span
                key={index}
                className={styles.confettiPiece}
                style={{
                  left: `${piece.left}%`,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                  width: `${piece.size}px`,
                  height: `${piece.size * 0.5}px`,
                  background: `hsl(${piece.hue} 95% 62%)`,
                  transform: `rotate(${piece.rotation}deg)`,
                }}
              />
            ))}
          </div>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <p className={styles.panelLabel}>{locale === 'ko' ? '전투 종료' : 'Battle over'}</p>
            <h3 className={styles.modalTitle}>
              {sharedCompletionSummary
                ? locale === 'ko'
                  ? `${sharedCompletionSummary.completedByRole === 'host' ? '방장' : sharedCompletionSummary.completedByRole === 'guest' ? '게스트' : '누군가'}가 전장을 제압했어요 ⚔️`
                  : `${sharedCompletionSummary.completedByRole === 'host' ? 'Host' : sharedCompletionSummary.completedByRole === 'guest' ? 'Guest' : 'Someone'} won the duel ⚔️`
                : locale === 'ko'
                  ? '전장을 제압했어요 ⚔️'
                  : 'Battle won ⚔️'}
            </h3>
            <p className={styles.modalText}>
              {sharedCompletionSummary
                ? locale === 'ko'
                  ? `${sharedCompletionSummary.completedByRole === 'host' ? '방장' : sharedCompletionSummary.completedByRole === 'guest' ? '게스트' : '누군가'}가 ${formatTime(sharedCompletionSummary.elapsedSeconds)} 만에 승리를 거뒀습니다.`
                  : `${sharedCompletionSummary.completedByRole === 'host' ? 'Host' : sharedCompletionSummary.completedByRole === 'guest' ? 'Guest' : 'Someone'} claimed victory in ${formatTime(sharedCompletionSummary.elapsedSeconds)}.`
                : locale === 'ko'
                  ? `${getDifficultyLabel(locale, difficulty)} 난이도를 ${formatTime(elapsedSeconds)} 만에 끝냈습니다.`
                  : `Finished the ${getDifficultyLabel(locale, difficulty)} puzzle in ${formatTime(elapsedSeconds)}.`}
            </p>
            {sharedCompletionSummary ? (
              <div className={styles.shareCard}>
                <span>{locale === 'ko' ? '전투 기록' : 'Battle record'}</span>
                <strong>{getDifficultyLabel(locale, sharedCompletionSummary.difficulty)} · {formatTime(sharedCompletionSummary.elapsedSeconds)}</strong>
                <small>
                  {locale === 'ko'
                    ? `${sharedCompletionSummary.completedByRole === 'host' ? '방장' : sharedCompletionSummary.completedByRole === 'guest' ? '게스트' : '누군가'}가 승리했어요`
                    : `${sharedCompletionSummary.completedByRole === 'host' ? 'Host' : sharedCompletionSummary.completedByRole === 'guest' ? 'Guest' : 'Someone'} won the duel`}
                </small>
              </div>
            ) : completionSummary ? (
              <div className={styles.shareCard}>
                <span>{locale === 'ko' ? '공유 카드' : 'Share card'}</span>
                <strong>{locale === 'ko' ? getDifficultyLabel(locale, completionSummary.difficulty) : getDifficultyLabel(locale, completionSummary.difficulty)} · {formatTime(completionSummary.elapsedSeconds)}</strong>
                <small>{locale === 'ko' ? `${completionSummary.clueCount} clues · #${completionSummary.rank}/${completionSummary.total}` : `${completionSummary.clueCount} clues · #${completionSummary.rank}/${completionSummary.total}`}</small>
              </div>
            ) : null}
            <div className={styles.modalActions}>
              <button className={styles.actionPrimary} onClick={() => { setShowCompleteModal(false); setConfettiPieces([]); resetGame(difficulty); }}>
                {locale === 'ko' ? '새 퍼즐' : 'New puzzle'}
              </button>
              <button className={styles.actionSecondary} onClick={() => { void handleShareCompletion(); }}>
                {locale === 'ko' ? '공유하기' : 'Share'}
              </button>
              <button className={styles.actionSecondary} onClick={() => { setShowCompleteModal(false); setConfettiPieces([]); }}>
                {locale === 'ko' ? '계속 보기' : 'Keep playing'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
