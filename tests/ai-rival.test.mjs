import test from 'node:test';
import assert from 'node:assert/strict';

import { getItemsForBattleMode } from '../components/sudoku/types.ts';
import {
  createAiRival,
  getAiMoveInterval,
  stepAiRival,
  applyDebuffToAi,
  computeAiBattleMinimap,
} from '../components/sudoku/aiRival.ts';

test('getItemsForBattleMode balances items per battle difficulty', () => {
  const hard = getItemsForBattleMode('hard');
  assert.equal(hard.hint, 1);
  assert.equal(hard.autoFill, 0);

  const normal = getItemsForBattleMode('normal');
  assert.equal(normal.hint, 2);
  assert.equal(normal.autoFill, 1);

  const easy = getItemsForBattleMode('easy');
  assert.equal(easy.hint, 3);
  assert.equal(easy.autoFill, 2);

  const off = getItemsForBattleMode('off');
  assert.equal(off.hint, 3);
  assert.equal(off.autoFill, 1);
});

test('createAiRival initializes AI state properly with human-paced intervals', () => {
  const samplePuzzle = Array.from({ length: 9 }, () => Array(9).fill(null));
  samplePuzzle[0][0] = 5;
  samplePuzzle[1][1] = 3;

  const rival = createAiRival(samplePuzzle);
  assert.equal(rival.filledCount, 0);
  assert.equal(rival.totalFillable, 79);
  assert.equal(rival.progressPercent, 0);
  assert.equal(rival.board[0][0], 5);
  assert.equal(rival.board[0][1], null);

  const hardInterval = getAiMoveInterval('hard');
  assert.ok(hardInterval >= 2600 && hardInterval <= 3800);

  const normalInterval = getAiMoveInterval('normal');
  assert.ok(normalInterval >= 3600 && normalInterval <= 5000);

  const easyInterval = getAiMoveInterval('easy');
  assert.ok(easyInterval >= 5200 && easyInterval <= 7500);
});

test('applyDebuffToAi stuns AI and pushes nextMoveTime', () => {
  const samplePuzzle = Array.from({ length: 9 }, () => Array(9).fill(null));
  const rival = createAiRival(samplePuzzle);
  const now = Date.now();
  const stunned = applyDebuffToAi(rival, 3000);

  assert.ok(stunned.stunnedUntil >= now + 2900);
  assert.ok(stunned.nextMoveTime >= stunned.stunnedUntil);
});

test('computeAiBattleMinimap identifies clues, player cells, ai cells, and overlap', () => {
  const clueGrid = Array.from({ length: 9 }, () => Array(9).fill(null));
  clueGrid[0][0] = 7;

  const playerBoard = clueGrid.map((r) => r.slice());
  playerBoard[0][1] = 3; // player filled
  playerBoard[0][2] = 4; // both filled

  const aiBoard = clueGrid.map((r) => r.slice());
  aiBoard[0][2] = 4; // both filled
  aiBoard[0][3] = 9; // ai filled

  const minimap = computeAiBattleMinimap(playerBoard, aiBoard, clueGrid);

  assert.equal(minimap[0][0], 'clue');
  assert.equal(minimap[0][1], 'self');
  assert.equal(minimap[0][2], 'both');
  assert.equal(minimap[0][3], 'other');
  assert.equal(minimap[0][4], 'empty');
});
