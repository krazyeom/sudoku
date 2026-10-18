export function createEmptyNotesGrid() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
}

export function cloneNotes(grid) {
  return grid.map((row) => row.map((cell) => [...cell]));
}

export function cleanupNotesAfterNumber(notes, row, col, num) {
  const nextNotes = cloneNotes(notes);
  // Clear notes in the same row and col
  for (let i = 0; i < 9; i++) {
    nextNotes[row][i] = nextNotes[row][i].filter((n) => n !== num);
    nextNotes[i][col] = nextNotes[i][col].filter((n) => n !== num);
  }
  // Clear notes in the same 3x3 box
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      nextNotes[br + r][bc + c] = nextNotes[br + r][bc + c].filter((n) => n !== num);
    }
  }
  // Empty notes for the cell itself
  nextNotes[row][col] = [];
  return nextNotes;
}

export function computeAllCandidates(board) {
  const result = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => [])
  );
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== null) continue;
      const used = new Set();
      for (let i = 0; i < 9; i++) {
        if (board[r][i] !== null) used.add(board[r][i]);
        if (board[i][c] !== null) used.add(board[i][c]);
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const val = board[br + dr][bc + dc];
          if (val !== null) used.add(val);
        }
      }
      const candidates = [];
      for (let num = 1; num <= 9; num++) {
        if (!used.has(num)) candidates.push(num);
      }
      result[r][c] = candidates;
    }
  }
  return result;
}
