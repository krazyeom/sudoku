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
  isValidPlacement,
  solveSudoku,
} from '@/lib/sudoku';

type Position = { row: number; col: number } | null;

type NoteGrid = number[][][];

type Snapshot = {
  board: Grid;
  notes: NoteGrid;
  elapsedSeconds: number;
};

type SavedGame = {
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  board: Grid;
  notes: NoteGrid;
  history: Snapshot[];
  selected: Position;
  noteMode: boolean;
  elapsedSeconds: number;
  timerRunning: boolean;
  solved: boolean;
};

const STORAGE_KEY = 'sudoku-studio-state-v2';

const DIFFICULTIES: Array<{ value: Difficulty; label: string; detail: string }> = [
  { value: 'easy', label: '하', detail: '여유 있게 시작' },
  { value: 'medium', label: '중', detail: '밸런스 좋은 난이도' },
  { value: 'hard', label: '상', detail: '깊게 생각하는 퍼즐' },
];

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
  if (!position) return '선택 없음';
  return `${position.row + 1}행 ${position.col + 1}열`;
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

export default function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle('medium'));
  const [board, setBoard] = useState<Grid>(() => cloneGrid(puzzle.puzzle));
  const [notes, setNotes] = useState<NoteGrid>(() => createEmptyNotesGrid());
  const [selected, setSelected] = useState<Position>(null);
  const [message, setMessage] = useState('빈 칸을 눌러 숫자를 입력해보세요.');
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [checks, setChecks] = useState<{ row: number; col: number }[]>([]);
  const [solved, setSolved] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [noteMode, setNoteMode] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const timerOriginRef = useRef<number | null>(null);

  const fixedCells = useMemo(() => puzzle.puzzle.map((row) => row.map((cell) => cell !== null)), [puzzle]);

  const candidateCount = selected ? buildNotes(board, selected.row, selected.col).length : 0;
  const conflictCells = useMemo(() => getConflictCells(board), [board]);

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
      setElapsedSeconds(Number.isFinite(saved.elapsedSeconds) ? Math.max(0, Math.floor(saved.elapsedSeconds ?? 0)) : 0);
      setTimerRunning(Boolean(saved.timerRunning));
      setSolved(Boolean(saved.solved));
      setChecks([]);
      setMessage('이전 진행상태를 불러왔어요.');
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
      elapsedSeconds,
      timerRunning,
      solved,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, difficulty, puzzle, board, notes, history, selected, noteMode, elapsedSeconds, timerRunning, solved]);

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
    setMessage('정답입니다. 퍼즐을 완성했어요!');
  }, [solved]);

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, board, puzzle, notes, noteMode, solved]);

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
    const nextPuzzle = generatePuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    setPuzzle(nextPuzzle);
    setBoard(cloneGrid(nextPuzzle.puzzle));
    setNotes(createEmptyNotesGrid());
    setSelected(null);
    setHistory([]);
    setChecks([]);
    setSolved(false);
    setNoteMode(false);
    setElapsedSeconds(0);
    setTimerRunning(false);
    timerOriginRef.current = null;
    setMessage(`${nextDifficulty === 'easy' ? '하' : nextDifficulty === 'medium' ? '중' : '상'} 난이도 새 게임을 시작했어요.`);
  }

  function pushHistory(nextBoard: Grid, nextNotes: NoteGrid) {
    setHistory((current) => [...current, captureSnapshot()].slice(-30));
    setBoard(nextBoard);
    setNotes(nextNotes);
    setChecks([]);
    startTimerIfNeeded();
  }

  function updateCell(value: number) {
    if (!selected) return;
    const { row, col } = selected;
    if (fixedCells[row][col] || solved) return;
    if (value < 1 || value > 9) return;

    startTimerIfNeeded();

    if (noteMode) {
      const nextNotes = toggleNote(notes, row, col, value);
      setNotes(nextNotes);
      setHistory((current) => [...current, captureSnapshot()].slice(-30));
      setMessage(`(${row + 1}, ${col + 1}) 메모에 ${value}를 ${hasNotes(nextNotes, row, col) ? '추가/삭제' : '반영'}했어요.`);
      return;
    }

    if (!isValidPlacement(board, row, col, value)) {
      setMessage(`그 자리에는 ${value}를 둘 수 없어요.`);
      return;
    }

    const nextBoard = cloneGrid(board);
    const nextNotes = cloneNotes(notes);
    nextBoard[row][col] = value;
    nextNotes[row][col] = [];
    pushHistory(nextBoard, nextNotes);
    if (boardMatchesSolution(nextBoard, puzzle.solution)) {
      setSolved(true);
    }
    setMessage(`(${row + 1}, ${col + 1})에 ${value}를 입력했어요.`);
  }

  function clearCell() {
    if (!selected) return;
    const { row, col } = selected;
    if (fixedCells[row][col] || solved) return;

    startTimerIfNeeded();

    const nextBoard = cloneGrid(board);
    const nextNotes = cloneNotes(notes);
    nextBoard[row][col] = null;
    nextNotes[row][col] = [];
    pushHistory(nextBoard, nextNotes);
    setMessage('칸과 메모를 비웠어요.');
  }

  function handleUndo() {
    setHistory((current) => {
      if (current.length === 0) {
        setMessage('되돌릴 수 있는 수가 없어요.');
        return current;
      }
      const previous = current[current.length - 1];
      setBoard(cloneGrid(previous.board));
      setNotes(cloneNotes(previous.notes));
      setElapsedSeconds(previous.elapsedSeconds);
      setChecks([]);
      setSolved(false);
      setMessage('마지막 수를 되돌렸어요.');
      return current.slice(0, -1);
    });
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
      setMessage('현재 배치는 아직 완성될 수 있지만, 입력을 다시 확인해보세요.');
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
      setMessage('충돌은 없어요. 계속 진행해보세요.');
    } else {
      setMessage(`${nextChecks.length}개의 칸이 해답과 달라요.`);
    }
  }

  function handleHint() {
    if (solved) return;
    const solvedBoard = solveSudoku(board);
    if (!solvedBoard) {
      setMessage('힌트를 줄 수 없는 상태예요. 먼저 입력을 정리해보세요.');
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
      setMessage('더 이상 채울 칸이 없어요.');
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
    setChecks([]);
    setMessage(`힌트: (${target.row + 1}, ${target.col + 1})에 ${solvedBoard[target.row][target.col]}를 넣어보세요.`);
  }

  const hasSavedState = hydrated && window.localStorage.getItem(STORAGE_KEY) !== null;

  return (
    <>
      <section className={styles.shell}>
      <aside className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelLabel}>난이도</p>
            <h2 className={styles.panelTitle}>새 게임 시작</h2>
          </div>
          <div className={styles.badge}>{puzzle.clueCount} clues</div>
        </div>

        <div className={styles.statusRow}>
          <div className={styles.statusChip}>
            <span>타이머</span>
            <strong>{formatTime(elapsedSeconds)}</strong>
          </div>
          <button
            className={`${styles.statusChip} ${noteMode ? styles.statusChipActive : ''}`}
            onClick={() => setNoteMode((current) => !current)}
          >
            <span>메모 모드</span>
            <strong>{noteMode ? 'ON' : 'OFF'}</strong>
          </button>
        </div>

        <div className={styles.difficultyRow}>
          {DIFFICULTIES.map((item) => (
            <button
              key={item.value}
              className={`${styles.difficultyButton} ${difficulty === item.value ? styles.difficultyActive : ''}`}
              onClick={() => resetGame(item.value)}
            >
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span>해결 상태</span>
            <strong>{solved ? '완료' : '진행 중'}</strong>
          </div>
          <div className={styles.statCard}>
            <span>후보 수</span>
            <strong>{selected ? candidateCount : '—'}</strong>
          </div>
          <div className={styles.statCard}>
            <span>저장</span>
            <strong>{hasSavedState ? 'ON' : 'OFF'}</strong>
          </div>
        </div>

        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button className={styles.actionPrimary} onClick={() => resetGame(difficulty)}>
            새 퍼즐
          </button>
          <button className={styles.actionSecondary} onClick={handleHint}>
            힌트
          </button>
          <button className={styles.actionSecondary} onClick={handleCheck}>
            검사
          </button>
          <button className={styles.actionSecondary} onClick={handleUndo}>
            Undo
          </button>
        </div>

        <div className={styles.keypad}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((number) => (
            <button key={number} onClick={() => updateCell(number)} className={styles.keypadButton}>
              {number}
            </button>
          ))}
          <button onClick={clearCell} className={`${styles.keypadButton} ${styles.keypadClear}`}>
            지우기
          </button>
        </div>
      </aside>

      <section className={styles.boardWrap}>
        <div className={styles.boardMeta}>
          <div>
            <p className={styles.panelLabel}>Sudoku Board</p>
            <h3 className={styles.boardTitle}>집중하기 좋은 클린한 레이아웃</h3>
          </div>
          <span className={styles.boardHint}>클릭하거나 키보드 1~9를 사용하세요. N = 메모, H = 힌트</span>
        </div>

        <div className={styles.board} role="grid" aria-label="Sudoku board">
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
              const isWrong = checks.some((item) => item.row === rowIndex && item.col === colIndex);
              const noteDigits = notes[rowIndex][colIndex];
              const classes = [
                styles.cell,
                isFixed ? styles.cellFixed : '',
                isSelected ? styles.cellSelected : '',
                (inSameRow || inSameCol || inSameBox) && !isSelected ? styles.cellFocus : '',
                (isWrong || conflictCells.has(`${rowIndex}-${colIndex}`)) ? styles.cellWrong : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  role="gridcell"
                  aria-label={`row ${rowIndex + 1} column ${colIndex + 1}`}
                  className={classes}
                  onClick={() => setSelected({ row: rowIndex, col: colIndex })}
                >
                  {cell !== null ? (
                    <span className={styles.cellValue}>{cell}</span>
                  ) : noteDigits.length > 0 ? (
                    <span className={styles.cellNotes}>{noteDigits.join(' ')}</span>
                  ) : selected ? (
                    <span className={styles.cellPlaceholder}>•</span>
                  ) : null}
                </button>
              );
            }),
          )}
        </div>
      </section>
    </section>

      {showCompleteModal ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="퍼즐 완료" onClick={() => setShowCompleteModal(false)}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <p className={styles.panelLabel}>완료</p>
            <h3 className={styles.modalTitle}>퍼즐을 완성했어요 🎉</h3>
            <p className={styles.modalText}>
              {difficulty === 'easy' ? '하' : difficulty === 'medium' ? '중' : '상'} 난이도를 {formatTime(elapsedSeconds)} 만에 끝냈습니다.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.actionPrimary} onClick={() => { setShowCompleteModal(false); resetGame(difficulty); }}>
                새 퍼즐
              </button>
              <button className={styles.actionSecondary} onClick={() => setShowCompleteModal(false)}>
                계속 보기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
