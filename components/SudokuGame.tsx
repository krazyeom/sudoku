'use client';

import { useEffect, useMemo, useState } from 'react';
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

const DIFFICULTIES: Array<{ value: Difficulty; label: string; detail: string }> = [
  { value: 'easy', label: '하', detail: '여유 있게 시작' },
  { value: 'medium', label: '중', detail: '밸런스 좋은 난이도' },
  { value: 'hard', label: '상', detail: '깊게 생각하는 퍼즐' },
];

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function isFilled(grid: Grid): boolean {
  return grid.every((row) => row.every((cell) => cell !== null));
}

function buildNotes(grid: Grid, row: number, col: number): number[] {
  if (grid[row][col] !== null) return [];
  return getCandidates(grid, row, col);
}

export default function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generatePuzzle('medium'));
  const [board, setBoard] = useState<Grid>(() => cloneGrid(puzzle.puzzle));
  const [selected, setSelected] = useState<Position>(null);
  const [message, setMessage] = useState('빈 칸을 눌러 숫자를 입력해보세요.');
  const [history, setHistory] = useState<Grid[]>([]);
  const [checks, setChecks] = useState<{ row: number; col: number }[]>([]);
  const [solved, setSolved] = useState(false);

  const fixedCells = useMemo(() => {
    return puzzle.puzzle.map((row) => row.map((cell) => cell !== null));
  }, [puzzle]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, board, puzzle]);

  useEffect(() => {
    setSolved(isFilled(board) && countSolutions(board, 2) === 1);
  }, [board]);

  function resetGame(nextDifficulty: Difficulty = difficulty) {
    const nextPuzzle = generatePuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    setPuzzle(nextPuzzle);
    setBoard(cloneGrid(nextPuzzle.puzzle));
    setSelected(null);
    setHistory([]);
    setChecks([]);
    setSolved(false);
    setMessage(`${nextDifficulty === 'easy' ? '하' : nextDifficulty === 'medium' ? '중' : '상'} 난이도 새 게임을 시작했어요.`);
  }

  function pushHistory(nextBoard: Grid) {
    setHistory((current) => [...current, cloneGrid(current.length ? board : puzzle.puzzle)]);
    setBoard(nextBoard);
    setChecks([]);
  }

  function updateCell(value: number) {
    if (!selected) return;
    const { row, col } = selected;
    if (fixedCells[row][col]) return;
    if (value < 1 || value > 9) return;

    if (!isValidPlacement(board, row, col, value)) {
      setMessage(`그 자리에는 ${value}를 둘 수 없어요.`);
      return;
    }

    const nextBoard = cloneGrid(board);
    nextBoard[row][col] = value;
    pushHistory(nextBoard);
    setMessage(`(${row + 1}, ${col + 1})에 ${value}를 입력했어요.`);
  }

  function clearCell() {
    if (!selected) return;
    const { row, col } = selected;
    if (fixedCells[row][col]) return;
    const nextBoard = cloneGrid(board);
    nextBoard[row][col] = null;
    pushHistory(nextBoard);
    setMessage('칸을 비웠어요.');
  }

  function handleUndo() {
    setHistory((current) => {
      if (current.length === 0) {
        setMessage('되돌릴 수 있는 수가 없어요.');
        return current;
      }
      const previous = current[current.length - 1];
      setBoard(cloneGrid(previous));
      setChecks([]);
      setSolved(false);
      setMessage('마지막 수를 되돌렸어요.');
      return current.slice(0, -1);
    });
  }

  function handleCheck() {
    const wrong: { row: number; col: number }[] = [];
    const solvedBoard = solveSudoku(board);

    if (!solvedBoard) {
      setChecks([]);
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

    setChecks(wrong);
    if (wrong.length === 0 && isFilled(board)) {
      setSolved(true);
      setMessage('정답입니다. 퍼즐을 완성했어요!');
    } else if (wrong.length === 0) {
      setMessage('충돌은 없어요. 계속 진행해보세요.');
    } else {
      setMessage(`${wrong.length}개의 칸이 해답과 달라요.`);
    }
  }

  function handleHint() {
    const solvedBoard = solveSudoku(board);
    if (!solvedBoard) {
      setMessage('힌트를 줄 수 없는 상태예요. 먼저 입력을 정리해보세요.');
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
      setMessage('더 이상 채울 칸이 없어요.');
      return;
    }

    const nextBoard = cloneGrid(board);
    nextBoard[target.row][target.col] = solvedBoard[target.row][target.col];
    setBoard(nextBoard);
    setHistory((current) => [...current, cloneGrid(board)]);
    setSelected(target);
    setChecks([]);
    setMessage(`힌트: (${target.row + 1}, ${target.col + 1})에 ${solvedBoard[target.row][target.col]}를 넣어보세요.`);
  }

  const candidateCount = selected ? buildNotes(board, selected.row, selected.col).length : 0;

  return (
    <section className={styles.shell}>
      <aside className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <p className={styles.panelLabel}>난이도</p>
            <h2 className={styles.panelTitle}>새 게임 시작</h2>
          </div>
          <div className={styles.badge}>{puzzle.clueCount} clues</div>
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
            <span>되돌리기</span>
            <strong>{history.length}</strong>
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
          <span className={styles.boardHint}>클릭하거나 키보드 1~9를 사용하세요.</span>
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
              const classes = [
                styles.cell,
                isFixed ? styles.cellFixed : '',
                isSelected ? styles.cellSelected : '',
                (inSameRow || inSameCol || inSameBox) && !isSelected ? styles.cellFocus : '',
                isWrong ? styles.cellWrong : '',
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
                  {cell ?? ''}
                </button>
              );
            }),
          )}
        </div>
      </section>
    </section>
  );
}
