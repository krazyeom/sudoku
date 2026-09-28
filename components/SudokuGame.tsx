"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './sudoku/sudoku.module.css';
import {
  Difficulty,
  Grid,
  Puzzle,
  generatePuzzle,
  solveSudoku,
} from '@/lib/sudoku';
import type {
  CompletionSummary,
  ConfettiPiece,
  ItemCounts,
  Locale,
  NoteGrid,
  Position,
  RecordEntry,
  SavedGame,
  SharedCompletionSummary,
  SharedRoomState,
  Snapshot,
} from './sudoku/types';
import type { SharedRoomCellOccupancy, SharedRoomSnapshot, RoomRole } from '@/lib/shared-room';
import { soundEffects } from './sudoku/sound';
import {
  STORAGE_KEY,
  RECORDS_KEY,
  ROOM_TOKEN_PREFIX,
  boardMatchesSolution,
  buildNotes,
  cloneGrid,
  cloneNotes,
  createEmptyNotesGrid,
  createEmptyOwnershipGrid,
  getConflictCells,
  getDifficultyLabel,
  hasNotes,
  isFilled,
  isPosition,
  makeClientId,
  normalizeGrid,
  normalizeHistory,
  normalizeNotesGrid,
  normalizeRecords,
  ownershipFromPuzzle,
  sanitizeRoomIdInput,
  summarizeBattle,
  toggleNote,
} from './sudoku/helpers';
import {
  buildShareCardSvg,
  buildShareText,
  copyTextToClipboard,
  downloadTextFile,
  formatTime,
} from './sudoku/share';
import { SudokuBoard } from './sudoku/SudokuBoard';
import { SudokuKeypad } from './sudoku/SudokuKeypad';
import { GameControls } from './sudoku/GameControls';
import { BattlePanel } from './sudoku/BattlePanel';
import { HeaderStatus } from './sudoku/HeaderStatus';
import { RecordsPanel } from './sudoku/RecordsPanel';
import { CompletionModal } from './sudoku/CompletionModal';

export default function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle('medium'));
  const [board, setBoard] = useState<Grid>(() => cloneGrid(puzzle.puzzle));
  const [notes, setNotes] = useState<NoteGrid>(() => createEmptyNotesGrid());
  const [selected, setSelected] = useState<Position>(null);
  const [message, setMessage] = useState('빈 칸을 클릭하거나 숫자를 입력해 게임을 시작하세요.');
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
  const [locale, setLocale] = useState<Locale>('ko');
  const [hintPreview, setHintPreview] = useState<{ row: number; col: number; value: number } | null>(null);
  const [roomInput, setRoomInput] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);
  const [sharedCompletionSummary, setSharedCompletionSummary] = useState<SharedCompletionSummary | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [ownership, setOwnership] = useState<SharedRoomCellOccupancy[][]>(() => ownershipFromPuzzle(puzzle.puzzle));
  const [sharedRoom, setSharedRoom] = useState<SharedRoomState | null>(null);
  const [sharedCountdownTick, setSharedCountdownTick] = useState(0);

  const sharedRoomPollRef = useRef<number | null>(null);
  const timerOriginRef = useRef<number | null>(null);
  const completionSavedRef = useRef(false);
  const copyToastTimerRef = useRef<number | null>(null);

  const fixedCells = useMemo(() => puzzle.puzzle.map((row) => row.map((cell) => cell !== null)), [puzzle]);
  const conflictCells = useMemo(() => getConflictCells(board), [board]);

  const battleSummary = useMemo(
    () => (sharedRoom?.snapshot ? summarizeBattle(sharedRoom.snapshot, sharedRoom.participantId) : null),
    [sharedRoom?.participantId, sharedRoom?.snapshot]
  );
  const sharedMatchPhase = sharedRoom?.snapshot?.phase ?? null;
  const sharedMatchIsPlaying = sharedMatchPhase === 'playing';
  const sharedMatchIsCountdown = sharedMatchPhase === 'countdown';
  const sharedMatchCountDownSeconds = useMemo(() => {
    if (!sharedRoom?.snapshot?.countdownEndsAt || !sharedMatchIsCountdown) return null;
    return Math.max(0, Math.ceil((new Date(sharedRoom.snapshot.countdownEndsAt).getTime() - Date.now()) / 1000));
  }, [sharedRoom?.snapshot?.countdownEndsAt, sharedMatchIsCountdown, sharedCountdownTick]);

  const sharedRoomIsActive = Boolean(sharedRoom);
  const sharedMatchGateActive = sharedRoomIsActive && !sharedMatchIsPlaying;
  const sharedBattleMiniMapGrid = sharedRoom?.snapshot?.occupancy ?? createEmptyOwnershipGrid();

  function flashToast(text: string) {
    setCopyToast(text);
    if (copyToastTimerRef.current !== null) {
      window.clearTimeout(copyToastTimerRef.current);
    }
    copyToastTimerRef.current = window.setTimeout(() => {
      setCopyToast(null);
      copyToastTimerRef.current = null;
    }, 2200);
  }

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

  // Shared Room Communication
  async function sendSharedMessage(payload: Record<string, unknown>) {
    if (typeof window === 'undefined') return null;
    try {
      const response = await fetch('/api/shared-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? 'Request failed');
      return data;
    } catch {
      setMessage(locale === 'ko' ? '방 동기화에 실패했습니다.' : 'Failed to sync with room.');
      return null;
    }
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
          : null
      );
      setCompletionSummary(null);
      completionSavedRef.current = true;
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
          : current
    );

    if (snapshot.phase === 'countdown') {
      setMessage(
        locale === 'ko'
          ? `상대방이 연결되었습니다. ${sharedMatchCountDownSeconds ?? 5}초 후 시작합니다!`
          : `Opponent joined. Starting in ${sharedMatchCountDownSeconds ?? 5} seconds!`
      );
    } else if (snapshot.phase === 'lobby') {
      setMessage(locale === 'ko' ? '상대방의 참가를 기다리고 있습니다.' : 'Waiting for opponent to join.');
    } else if (snapshot.solved) {
      setMessage(locale === 'ko' ? '퍼즐이 완료되었습니다.' : 'Puzzle is complete.');
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
      const res = await fetch(`/api/shared-room?${query.toString()}`);
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.snapshot) {
        applySharedSnapshot(data.snapshot, participantId);
      }
    } catch {
      // ignore
    }
  }

  function startSharedRoomPolling(roomId: string, participantId: string) {
    stopSharedRoomPolling();
    void pollSharedRoom(roomId, participantId);
    sharedRoomPollRef.current = window.setInterval(() => {
      void pollSharedRoom(roomId, participantId);
    }, 1000);
  }

  function connectSharedRoom(roomId: string, seedDifficulty?: Difficulty, initialRole: RoomRole = 'spectator') {
    if (typeof window === 'undefined') return;
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

  function disconnectSharedRoom() {
    stopSharedRoomPolling();
    if (sharedRoom) {
      void sendSharedMessage({ type: 'leave_room', roomId: sharedRoom.roomId, participantId: sharedRoom.participantId });
    }
    setSharedRoom(null);
    setOwnership(ownershipFromPuzzle(puzzle.puzzle));
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('room');
    window.history.replaceState(null, '', nextUrl.toString());
    setMessage(locale === 'ko' ? '방에서 퇴장했습니다.' : 'Left the room.');
  }

  // Hydration & Storage
  useEffect(() => {
    setHydrated(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedGame>;
        const savedPuzzle = normalizeGrid(saved.puzzle);
        const savedSolution = normalizeGrid(saved.solution);
        const savedBoard = normalizeGrid(saved.board);
        const savedNotes = normalizeNotesGrid(saved.notes);
        const savedHistory = normalizeHistory(saved.history);

        if (savedPuzzle && savedSolution && savedBoard && savedNotes) {
          const restDiff = saved.difficulty === 'easy' || saved.difficulty === 'medium' || saved.difficulty === 'hard'
            ? saved.difficulty
            : 'medium';

          setDifficulty(restDiff);
          setPuzzle({
            puzzle: savedPuzzle,
            solution: savedSolution,
            clueCount: savedPuzzle.flat().filter((cell) => cell !== null).length,
            difficulty: restDiff,
          });
          setBoard(savedBoard);
          setNotes(savedNotes);
          setHistory(savedHistory);
          setSelected(isPosition(saved.selected) ? saved.selected : null);
          setNoteMode(Boolean(saved.noteMode));
          setSoundEnabled(saved.soundEnabled ?? true);
          setItems({
            hint: Number.isInteger(saved.items?.hint) ? Math.max(0, saved.items!.hint) : 3,
            autoFill: Number.isInteger(saved.items?.autoFill) ? Math.max(0, saved.items!.autoFill) : 1,
          });
          setElapsedSeconds(Number.isFinite(saved.elapsedSeconds) ? Math.max(0, Math.floor(saved.elapsedSeconds!)) : 0);
          setTimerRunning(Boolean(saved.timerRunning));
          setSolved(Boolean(saved.solved));
        }
      }

      const recRaw = window.localStorage.getItem(RECORDS_KEY);
      if (recRaw) {
        setRecords(normalizeRecords(JSON.parse(recRaw)));
      }
    } catch {
      // ignore corrupted save
    }
  }, []);

  // Save to LocalStorage
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
  }, [hydrated, difficulty, puzzle, board, notes, history, selected, noteMode, soundEnabled, items, locale, elapsedSeconds, timerRunning, solved]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }, [hydrated, records]);

  // URL room check
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    const roomParam = new URLSearchParams(window.location.search).get('room');
    if (roomParam) {
      connectSharedRoom(roomParam, undefined, 'spectator');
    }
    return () => {
      stopSharedRoomPolling();
    };
  }, [hydrated]);

  // Timer interval
  useEffect(() => {
    if (!timerRunning) {
      timerOriginRef.current = null;
      return;
    }
    timerOriginRef.current = Date.now() - elapsedSeconds * 1000;
    const interval = window.setInterval(() => {
      if (!timerOriginRef.current) return;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerOriginRef.current) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  // Countdown tick
  useEffect(() => {
    if (!sharedMatchIsCountdown) return;
    const interval = window.setInterval(() => setSharedCountdownTick((t) => t + 1), 1000);
    return () => window.clearInterval(interval);
  }, [sharedMatchIsCountdown]);

  // Solved event
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
      }))
    );

    if (soundEnabled) {
      void soundEffects.playCompletion();
    }

    if (!sharedRoom && !completionSavedRef.current) {
      completionSavedRef.current = true;
      const newRecord: RecordEntry = {
        difficulty,
        elapsedSeconds,
        clueCount: puzzle.clueCount,
        completedAt: new Date().toISOString(),
      };
      const updated = [newRecord, ...records]
        .sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || b.completedAt.localeCompare(a.completedAt))
        .slice(0, 50);

      setRecords(updated);
      setCompletionSummary({
        ...newRecord,
        rank: updated.findIndex((r) => r.completedAt === newRecord.completedAt) + 1,
        total: updated.length,
      });
    }
  }, [solved, difficulty, elapsedSeconds, puzzle.clueCount, records, soundEnabled, sharedRoom]);

  // Board Cell Interaction
  function handleCellClick(rowIndex: number, colIndex: number) {
    if (selected?.row === rowIndex && selected?.col === colIndex) {
      setSelected(null);
      return;
    }
    setSelected({ row: rowIndex, col: colIndex });
  }

  function updateCell(value: number) {
    if (sharedMatchGateActive) {
      setMessage(locale === 'ko' ? '대결이 시작될 때까지 기다려 주세요.' : 'Please wait for the match to start.');
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
      setHistory((cur) => [...cur, captureSnapshot()].slice(-30));
      setHintPreview(null);
      if (soundEnabled) void soundEffects.playNote();
      return;
    }

    const currentValue = board[row][col];
    const currentNotes = notes[row][col];
    const nextBoard = cloneGrid(board);
    const nextNotes = cloneNotes(notes);

    if (currentValue === value && currentNotes.length === 0) {
      nextBoard[row][col] = null;
      nextNotes[row][col] = [value];
      setBoard(nextBoard);
      setNotes(nextNotes);
      setHistory((cur) => [...cur, captureSnapshot()].slice(-30));
      if (soundEnabled) void soundEffects.playNote();
      return;
    }

    nextBoard[row][col] = value;
    nextNotes[row][col] = [];
    setBoard(nextBoard);
    setNotes(nextNotes);
    setHistory((cur) => [...cur, captureSnapshot()].slice(-30));
    setChecks([]);
    setHintPreview(null);

    if (soundEnabled) void soundEffects.playInput(value);

    if (sharedRoom) {
      void sendSharedMessage({
        type: 'move',
        roomId: sharedRoom.roomId,
        participantId: sharedRoom.participantId,
        row,
        col,
        value,
      });
    }

    if (boardMatchesSolution(nextBoard, puzzle.solution)) {
      setSolved(true);
    }
  }

  function clearCell() {
    if (sharedMatchGateActive || !selected || solved) return;
    const { row, col } = selected;
    if (fixedCells[row][col]) return;

    startTimerIfNeeded();
    const nextBoard = cloneGrid(board);
    const nextNotes = cloneNotes(notes);
    nextBoard[row][col] = null;
    nextNotes[row][col] = [];

    setBoard(nextBoard);
    setNotes(nextNotes);
    setHistory((cur) => [...cur, captureSnapshot()].slice(-30));
    setHintPreview(null);

    if (soundEnabled) void soundEffects.playErase();

    if (sharedRoom) {
      void sendSharedMessage({
        type: 'move',
        roomId: sharedRoom.roomId,
        participantId: sharedRoom.participantId,
        row,
        col,
        value: null,
      });
    }
  }

  function handleUndo() {
    if (sharedMatchGateActive || sharedRoomIsActive || history.length === 0) return;
    const previous = history[history.length - 1];
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
    setHistory((cur) => cur.slice(0, -1));
  }

  function resetGame(nextDifficulty: Difficulty = difficulty) {
    if (sharedRoom) {
      if (sharedRoom.role !== 'host') {
        setMessage(locale === 'ko' ? '방장만 새 게임을 시작할 수 있습니다.' : 'Only the host can reset the game.');
        return;
      }
      void sendSharedMessage({
        type: 'reset_room',
        roomId: sharedRoom.roomId,
        participantId: sharedRoom.participantId,
        difficulty: nextDifficulty,
      });
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
    setMessage(
      locale === 'ko'
        ? `${getDifficultyLabel(locale, nextDifficulty)} 난이도로 새 게임을 시작했습니다.`
        : `Started a new ${nextDifficulty} puzzle.`
    );
  }

  function handleHint() {
    if (sharedMatchGateActive || sharedRoomIsActive || solved || items.hint <= 0) return;
    const solvedBoard = solveSudoku(board);
    if (!solvedBoard) {
      setMessage(locale === 'ko' ? '현재 보드에 오류가 있어 힌트를 계산할 수 없습니다.' : 'Please fix conflicts first.');
      return;
    }

    let target: Position = selected;
    if (!target || fixedCells[target.row][target.col] || board[target.row][target.col] !== null) {
      target = null;
      for (let r = 0; r < 9 && !target; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === null && !fixedCells[r][c]) {
            target = { row: r, col: c };
            break;
          }
        }
      }
    }

    if (!target) return;
    const val = solvedBoard[target.row][target.col];
    if (val === null) return;

    setSelected(target);
    setHintPreview({ row: target.row, col: target.col, value: val });
    setItems((cur) => ({ ...cur, hint: Math.max(0, cur.hint - 1) }));
    setMessage(locale === 'ko' ? `힌트: (${target.row + 1}, ${target.col + 1}) 위치는 ${val}입니다.` : `Hint: (${target.row + 1}, ${target.col + 1}) is ${val}.`);
  }

  function handleAutoFill() {
    if (sharedMatchGateActive || sharedRoomIsActive || solved || items.autoFill <= 0) return;
    const solvedBoard = solveSudoku(board);
    if (!solvedBoard) {
      setMessage(locale === 'ko' ? '현재 보드에 충돌이 있습니다. 먼저 수정해주세요.' : 'Resolve conflicts first.');
      return;
    }

    startTimerIfNeeded();
    let target: Position = selected;
    if (!target || fixedCells[target.row][target.col] || board[target.row][target.col] !== null) {
      target = null;
      for (let r = 0; r < 9 && !target; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === null && !fixedCells[r][c]) {
            target = { row: r, col: c };
            break;
          }
        }
      }
    }

    if (!target) return;
    const val = solvedBoard[target.row][target.col];
    if (val === null) return;

    const nextBoard = cloneGrid(board);
    const nextNotes = cloneNotes(notes);
    nextBoard[target.row][target.col] = val;
    nextNotes[target.row][target.col] = [];

    setBoard(nextBoard);
    setNotes(nextNotes);
    setHistory((cur) => [...cur, captureSnapshot()].slice(-30));
    setSelected(target);
    setHintPreview(null);
    setItems((cur) => ({ ...cur, autoFill: Math.max(0, cur.autoFill - 1) }));
    setChecks([]);

    if (soundEnabled) void soundEffects.playInput(val);

    if (boardMatchesSolution(nextBoard, puzzle.solution)) {
      setSolved(true);
    }
  }

  function handleCheck() {
    const wrong: { row: number; col: number }[] = [];
    const conflictList = Array.from(conflictCells).map((entry) => {
      const [r, c] = entry.split('-').map(Number);
      return { row: r, col: c };
    });

    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell !== null && cell !== puzzle.solution[r][c]) {
          wrong.push({ row: r, col: c });
        }
      });
    });

    const combined = Array.from(new Map([...wrong, ...conflictList].map((it) => [`${it.row}-${it.col}`, it])).values());
    setChecks(combined);

    if (boardMatchesSolution(board, puzzle.solution)) {
      setSolved(true);
    } else if (combined.length === 0) {
      setMessage(locale === 'ko' ? '현재까지 입력한 숫자에 오류가 없습니다. 완벽해요!' : 'No conflicts found. Looking good!');
    } else {
      setMessage(locale === 'ko' ? `${combined.length}개의 칸에 오류나 중복이 있습니다.` : `${combined.length} cells have conflicts.`);
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        const cur = selected ?? { row: 0, col: 0 };
        const dRow = key === 'arrowup' ? -1 : key === 'arrowdown' ? 1 : 0;
        const dCol = key === 'arrowleft' ? -1 : key === 'arrowright' ? 1 : 0;
        setSelected({
          row: Math.max(0, Math.min(8, cur.row + dRow)),
          col: Math.max(0, Math.min(8, cur.col + dCol)),
        });
        return;
      }

      if (!selected) return;

      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        updateCell(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        clearCell();
      } else if (e.key === 'Escape') {
        setSelected(null);
      } else if (key === 'n') {
        e.preventDefault();
        setNoteMode((cur) => !cur);
      } else if (key === 'h') {
        e.preventDefault();
        handleAutoFill();
      } else if (key === 'i') {
        e.preventDefault();
        handleHint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, board, puzzle, notes, noteMode, solved, items, sharedMatchGateActive]);

  // Sharing
  async function handleShare() {
    if (!completionSummary && !sharedCompletionSummary) return;
    const summaryToShare: CompletionSummary = completionSummary ?? {
      difficulty: sharedCompletionSummary!.difficulty,
      elapsedSeconds: sharedCompletionSummary!.elapsedSeconds,
      clueCount: sharedCompletionSummary!.clueCount,
      completedAt: sharedCompletionSummary!.completedAt,
      rank: 1,
      total: 1,
    };

    const text = buildShareText(summaryToShare, locale);

    try {
      if (navigator.share) {
        const svg = buildShareCardSvg(summaryToShare, locale);
        const file = new File([svg], `sudoku-${Date.now()}.svg`, { type: 'image/svg+xml' });
        await navigator.share({ title: 'SudokuDuo', text, files: [file] });
      } else {
        const copied = await copyTextToClipboard(text);
        flashToast(copied ? (locale === 'ko' ? '결과를 클립보드에 복사했습니다!' : 'Copied result to clipboard!') : 'Failed to copy');
      }
    } catch {
      await copyTextToClipboard(text);
      flashToast(locale === 'ko' ? '결과 텍스트를 복사했습니다!' : 'Copied result text!');
    }
  }

  if (!hydrated) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          Loading SudokuDuo…
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Tab Navigation: Play vs Records */}
      <div className={styles.tabNav} role="tablist">
        <button
          type="button"
          className={`${styles.tabBtn} ${activePanel === 'play' ? styles.tabBtnActive : ''}`}
          onClick={() => setActivePanel('play')}
        >
          🎮 {locale === 'ko' ? '스튜디오 플레이' : 'Play Studio'}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activePanel === 'records' ? styles.tabBtnActive : ''}`}
          onClick={() => setActivePanel('records')}
        >
          🏆 {locale === 'ko' ? '명예의 전당 & 기록' : 'Records & Stats'}
        </button>
      </div>

      <div className={styles.layout}>
        {/* Left Column: Game Management & Keypad */}
        <aside className={styles.card}>
          {activePanel === 'play' ? (
            <>
              {/* Header Status HUD */}
              <HeaderStatus
                elapsedSeconds={elapsedSeconds}
                timerRunning={timerRunning}
                noteMode={noteMode}
                soundEnabled={soundEnabled}
                locale={locale}
                onToggleSound={() => setSoundEnabled((cur) => !cur)}
                onToggleLocale={() => setLocale((cur) => (cur === 'ko' ? 'en' : 'ko'))}
              />

              {/* Status Message */}
              <div className={styles.statusBar}>
                <span className={styles.statusIndicator} />
                <span>{message}</span>
              </div>

              {/* Game Action Controls */}
              <GameControls
                difficulty={difficulty}
                items={items}
                locale={locale}
                sharedRoomActive={sharedRoomIsActive}
                canUndo={history.length > 0}
                onDifficultyChange={(d) => resetGame(d)}
                onNewGame={() => resetGame(difficulty)}
                onHint={handleHint}
                onAutoFill={handleAutoFill}
                onCheck={handleCheck}
                onUndo={handleUndo}
              />

              {/* 1v1 Battle Panel */}
              <BattlePanel
                sharedRoom={sharedRoom}
                battleSummary={battleSummary}
                minimapGrid={sharedBattleMiniMapGrid}
                roomInput={roomInput}
                locale={locale}
                onRoomInputChange={setRoomInput}
                onCreateRoom={() => {
                  const id = `room-${Math.random().toString(36).slice(2, 9)}`;
                  setRoomInput(id);
                  connectSharedRoom(id, difficulty, 'host');
                }}
                onJoinRoom={() => {
                  const clean = sanitizeRoomIdInput(roomInput);
                  if (clean) connectSharedRoom(clean, undefined, 'guest');
                }}
                onCopyRoomId={async () => {
                  if (sharedRoom) {
                    await copyTextToClipboard(sharedRoom.roomId);
                    flashToast(locale === 'ko' ? '방 ID를 복사했습니다!' : 'Copied Room ID!');
                  }
                }}
                onCopyInviteLink={async () => {
                  if (sharedRoom) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('room', sharedRoom.roomId);
                    await copyTextToClipboard(url.toString());
                    flashToast(locale === 'ko' ? '초대 링크를 복사했습니다!' : 'Copied Invite Link!');
                  }
                }}
                onDisconnectRoom={disconnectSharedRoom}
              />
            </>
          ) : (
            /* Records & Stats View */
            <RecordsPanel
              records={records}
              difficultyFilter={recordDifficultyFilter}
              sortMode={recordSortMode}
              locale={locale}
              onFilterChange={setRecordDifficultyFilter}
              onSortChange={setRecordSortMode}
              onExportJson={() => {
                downloadTextFile(
                  `sudoku-records-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify({ records, exportedAt: new Date().toISOString() }, null, 2),
                  'application/json'
                );
              }}
              onExportCsv={() => {
                const header = ['difficulty', 'elapsedSeconds', 'clueCount', 'completedAt'];
                const rows = records.map((r) => [r.difficulty, r.elapsedSeconds, r.clueCount, r.completedAt]);
                const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
                downloadTextFile(`sudoku-records-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
              }}
              onImportJson={() => {
                const input = window.prompt(locale === 'ko' ? 'JSON 데이터를 붙여넣으세요.' : 'Paste JSON records:');
                if (!input) return;
                try {
                  const parsed = JSON.parse(input);
                  const imported = normalizeRecords(parsed.records || parsed);
                  if (imported.length > 0) {
                    setRecords(imported);
                    flashToast(locale === 'ko' ? `${imported.length}개 기록을 불러왔습니다!` : `Imported ${imported.length} records!`);
                  }
                } catch {
                  flashToast(locale === 'ko' ? '올바른 JSON 형식이 아닙니다.' : 'Invalid JSON');
                }
              }}
              onClearRecords={() => {
                if (window.confirm(locale === 'ko' ? '모든 기록을 삭제하시겠습니까?' : 'Delete all saved records?')) {
                  setRecords([]);
                  window.localStorage.removeItem(RECORDS_KEY);
                  flashToast(locale === 'ko' ? '기록이 삭제되었습니다.' : 'All records deleted.');
                }
              }}
            />
          )}
        </aside>

        {/* Right Column: The Sudoku Board & Tactile Keypad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SudokuBoard
            board={board}
            notes={notes}
            fixedCells={fixedCells}
            selected={selected}
            solved={solved}
            conflictCells={conflictCells}
            checks={checks}
            hintPreview={hintPreview}
            difficulty={difficulty}
            locale={locale}
            sharedMatchGateActive={sharedMatchGateActive}
            sharedMatchIsCountdown={sharedMatchIsCountdown}
            sharedMatchCountDownSeconds={sharedMatchCountDownSeconds}
            onCellClick={handleCellClick}
          />

          <SudokuKeypad
            board={board}
            noteMode={noteMode}
            disabled={sharedMatchGateActive || !selected || solved}
            locale={locale}
            onNumberClick={updateCell}
            onClearClick={clearCell}
            onToggleNoteMode={() => setNoteMode((cur) => !cur)}
            onUndoClick={handleUndo}
            canUndo={history.length > 0 && !sharedRoomIsActive}
          />
        </div>
      </div>

      {/* Floating Toast Notification */}
      {copyToast && <div className={styles.toastAlert}>{copyToast}</div>}

      {/* Celebration Modal */}
      <CompletionModal
        isOpen={showCompleteModal}
        completionSummary={completionSummary}
        sharedCompletionSummary={sharedCompletionSummary}
        confettiPieces={confettiPieces}
        locale={locale}
        onClose={() => setShowCompleteModal(false)}
        onNewGame={() => {
          setShowCompleteModal(false);
          resetGame(difficulty);
        }}
        onShare={() => void handleShare()}
      />
    </div>
  );
}
