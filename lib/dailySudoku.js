import { countSolutions } from './sudoku.js';

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateStringToSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 12345;
}

export function getDailyDifficulty(dateStr) {
  const dayOfWeek = new Date(dateStr).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'hard';
  if (dayOfWeek === 2 || dayOfWeek === 4) return 'easy';
  return 'medium';
}

const BASE_PATTERN = (row, col) => ((row * 3 + Math.floor(row / 3) + col) % 9) + 1;

function seededShuffle(values, rand) {
  const array = [...values];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rand() * (index + 1));
    [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
  }
  return array;
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

export function generateDailyPuzzle(dateStr = getTodayDateString()) {
  const difficulty = getDailyDifficulty(dateStr);
  const seed = dateStringToSeed(dateStr);
  const rand = mulberry32(seed);

  const rowGroups = seededShuffle([0, 1, 2], rand);
  const colGroups = seededShuffle([0, 1, 2], rand);
  const rows = rowGroups.flatMap((group) => seededShuffle([0, 1, 2], rand).map((offset) => group * 3 + offset));
  const cols = colGroups.flatMap((group) => seededShuffle([0, 1, 2], rand).map((offset) => group * 3 + offset));
  const digits = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rand);
  const digitMap = new Map(digits.map((digit, index) => [index + 1, digit]));

  const solution = rows.map((row) =>
    cols.map((col) => {
      const base = BASE_PATTERN(row, col);
      return digitMap.get(base) ?? base;
    })
  );

  const puzzle = cloneGrid(solution);
  const cells = seededShuffle(
    Array.from({ length: 81 }, (_, index) => ({ row: Math.floor(index / 9), col: index % 9 })),
    rand
  );

  const target = difficulty === 'easy' ? 44 : difficulty === 'hard' ? 28 : 36;
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

  return {
    date: dateStr,
    difficulty,
    puzzle,
    solution,
    clueCount: clues,
  };
}
