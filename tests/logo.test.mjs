import test from 'node:test';
import assert from 'node:assert/strict';
import { CROSSWORD_TILES } from '../components/sudoku/logoData.ts';

test('CROSSWORD_TILES has exactly 9 tiles representing sudoku digits 1-9', () => {
  assert.equal(CROSSWORD_TILES.length, 9);
});

test('CROSSWORD_TILES horizontal row spelling matches SUDOKU', () => {
  const horizontalTiles = CROSSWORD_TILES
    .filter((t) => t.row === 2)
    .sort((a, b) => a.col - b.col);

  const horizontalWord = horizontalTiles.map((t) => t.char).join('');
  assert.equal(horizontalWord, 'SUDOKU');
});

test('CROSSWORD_TILES vertical column spelling matches DUEL', () => {
  const verticalTiles = CROSSWORD_TILES
    .filter((t) => t.col === 6)
    .sort((a, b) => a.row - b.row);

  const verticalWord = verticalTiles.map((t) => t.char).join('');
  assert.equal(verticalWord, 'DUEL');
});

test('intersection tile is correctly identified at Row 2, Col 6 with letter U', () => {
  const intersectionTile = CROSSWORD_TILES.find((t) => t.type === 'intersection');
  assert.ok(intersectionTile);
  assert.equal(intersectionTile.char, 'U');
  assert.equal(intersectionTile.row, 2);
  assert.equal(intersectionTile.col, 6);
});
