export interface CrosswordTile {
  char: string;
  row: number; // 1-based CSS grid row (1 to 4)
  col: number; // 1-based CSS grid col (1 to 6)
  type: 'sudoku' | 'duel' | 'intersection';
}

export const CROSSWORD_TILES: CrosswordTile[] = [
  // Duel vertical top: 'D'
  { char: 'D', row: 1, col: 6, type: 'duel' },

  // SUDOKU horizontal line: 'S', 'U', 'D', 'O', 'K', 'U'
  { char: 'S', row: 2, col: 1, type: 'sudoku' },
  { char: 'U', row: 2, col: 2, type: 'sudoku' },
  { char: 'D', row: 2, col: 3, type: 'sudoku' },
  { char: 'O', row: 2, col: 4, type: 'sudoku' },
  { char: 'K', row: 2, col: 5, type: 'sudoku' },
  // Intersection point: 'U'
  { char: 'U', row: 2, col: 6, type: 'intersection' },

  // Duel vertical bottom: 'E', 'L'
  { char: 'E', row: 3, col: 6, type: 'duel' },
  { char: 'L', row: 4, col: 6, type: 'duel' },
];
