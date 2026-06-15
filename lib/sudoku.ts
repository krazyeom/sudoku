export type Difficulty = 'easy' | 'medium' | 'hard';
export type Cell = number | null;
export type Grid = Cell[][];

export interface Puzzle {
  puzzle: Grid;
  solution: Grid;
  clueCount: number;
  difficulty: Difficulty;
}

const BASE_PATTERN = (row: number, col: number) => ((row * 3 + Math.floor(row / 3) + col) % 9) + 1;

function cloneGrid(grid: Grid): Grid {
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

function buildSolvedGrid(): Grid {
  const rowGroups = shuffle([0, 1, 2]);
  const colGroups = shuffle([0, 1, 2]);
  const rows = rowGroups.flatMap((group) => shuffle([0, 1, 2]).map((offset) => group * 3 + offset));
  const cols = colGroups.flatMap((group) => shuffle([0, 1, 2]).map((offset) => group * 3 + offset));
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const digitMap = new Map<number, number>(digits.map((digit, index) => [index + 1, digit]));

  return rows.map((row) =>
    cols.map((col) => {
      const base = BASE_PATTERN(row, col);
      return digitMap.get(base) ?? base;
    }),
  );
}

function findBestCell(grid: Grid): { row: number; col: number; candidates: number[] } | null {
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

export function getCandidates(grid: Grid, row: number, col: number): number[] {
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

export function isValidPlacement(grid: Grid, row: number, col: number, value: number): boolean {
  if (value < 1 || value > 9) return false;

  for (let index = 0; index < 9; index += 1) {
    if (index !== col && grid[row][index] === value) return false;
    if (index !== row && grid[index][col] === value) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if ((r !== row || c !== col) && grid[r][c] === value) return false;
    }
  }

  return true;
}

function countSolutionsRecursive(grid: Grid, limit: number): number {
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

export function countSolutions(grid: Grid, limit = 2): number {
  return countSolutionsRecursive(cloneGrid(grid), limit);
}

export function solveSudoku(grid: Grid): Grid | null {
  const working = cloneGrid(grid);

  function solve(): boolean {
    const target = findBestCell(working);
    if (!target) return true;
    if (target.candidates.length === 0) return false;

    for (const candidate of target.candidates) {
      working[target.row][target.col] = candidate;
      if (solve()) return true;
    }

    working[target.row][target.col] = null;
    return false;
  }

  return solve() ? working : null;
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

export function generatePuzzle(difficulty: Difficulty): Puzzle {
  const { min, max } = targetClues(difficulty);
  const solution = buildSolvedGrid();
  const puzzle = cloneGrid(solution);
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
