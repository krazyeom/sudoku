import type { Grid } from '@/lib/sudoku';
import type { BattleMode, RoomAttack, SharedRoomCellOccupancy, DebuffType } from '@/lib/shared-room';

export type AiRivalState = {
  board: Grid;
  filledCount: number;
  totalFillable: number;
  progressPercent: number;
  completedUnits: Set<string>;
  stunnedUntil: number;
  nextMoveTime: number;
  lastFilledCell: { row: number; col: number; value: number } | null;
};

/**
 * Creates initial state for AI Rival based on the current puzzle.
 */
export function createAiRival(puzzleGrid: Grid): AiRivalState {
  const board: Grid = puzzleGrid.map((row) => row.slice());
  let clueCount = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzleGrid[r][c] !== null) clueCount++;
    }
  }
  const totalFillable = 81 - clueCount;

  return {
    board,
    filledCount: 0,
    totalFillable,
    progressPercent: 0,
    completedUnits: new Set<string>(),
    stunnedUntil: 0,
    nextMoveTime: Date.now() + 3500, // Initial delay before AI begins
    lastFilledCell: null,
  };
}

/**
 * Realistic human-like pacing for AI.
 * Not an instantaneous bot, but tuned to feel engaging and fair.
 */
export function getAiMoveInterval(battleMode: BattleMode): number {
  switch (battleMode) {
    case 'hard':
      // 2.6s - 3.8s: skilled pace, but beatable with combos
      return 2600 + Math.floor(Math.random() * 1200);
    case 'easy':
      // 5.2s - 7.5s: relaxed pace, allows easy practice
      return 5200 + Math.floor(Math.random() * 2300);
    case 'normal':
    default:
      // 3.6s - 5.0s: thrilling back-and-forth
      return 3600 + Math.floor(Math.random() * 1400);
  }
}

/**
 * Advances the AI Rival by one cell move.
 */
export function stepAiRival(
  current: AiRivalState,
  solution: Grid,
  battleMode: BattleMode
): {
  nextState: AiRivalState;
  attack: RoomAttack | null;
  solved: boolean;
} {
  const emptyCells: { row: number; col: number }[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (current.board[r][c] === null) {
        emptyCells.push({ row: r, col: c });
      }
    }
  }

  if (emptyCells.length === 0) {
    return {
      nextState: { ...current, progressPercent: 100 },
      attack: null,
      solved: true,
    };
  }

  // Pick a random empty cell to fill
  const pickIndex = Math.floor(Math.random() * emptyCells.length);
  const target = emptyCells[pickIndex];
  const correctVal = solution[target.row][target.col]!;

  const newBoard = current.board.map((row) => row.slice());
  newBoard[target.row][target.col] = correctVal;

  const newFilledCount = current.filledCount + 1;
  const progressPercent = Math.min(
    100,
    Math.round((newFilledCount / Math.max(1, current.totalFillable)) * 100)
  );

  const newUnits = new Set(current.completedUnits);
  const newlyCompleted: { type: 'row' | 'col' | 'box'; index: number }[] = [];

  // 1. Check Row
  const rowKey = `row-${target.row}`;
  if (!newUnits.has(rowKey)) {
    let rowOk = true;
    for (let c = 0; c < 9; c++) {
      if (newBoard[target.row][c] !== solution[target.row][c]) {
        rowOk = false;
        break;
      }
    }
    if (rowOk) {
      newUnits.add(rowKey);
      newlyCompleted.push({ type: 'row', index: target.row });
    }
  }

  // 2. Check Col
  const colKey = `col-${target.col}`;
  if (!newUnits.has(colKey)) {
    let colOk = true;
    for (let r = 0; r < 9; r++) {
      if (newBoard[r][target.col] !== solution[r][target.col]) {
        colOk = false;
        break;
      }
    }
    if (colOk) {
      newUnits.add(colKey);
      newlyCompleted.push({ type: 'col', index: target.col });
    }
  }

  // 3. Check Box
  const bRow = Math.floor(target.row / 3);
  const bCol = Math.floor(target.col / 3);
  const boxIndex = bRow * 3 + bCol;
  const boxKey = `box-${boxIndex}`;
  if (!newUnits.has(boxKey)) {
    let boxOk = true;
    for (let ro = bRow * 3; ro < bRow * 3 + 3; ro++) {
      for (let co = bCol * 3; co < bCol * 3 + 3; co++) {
        if (newBoard[ro][co] !== solution[ro][co]) {
          boxOk = false;
          break;
        }
      }
      if (!boxOk) break;
    }
    if (boxOk) {
      newUnits.add(boxKey);
      newlyCompleted.push({ type: 'box', index: boxIndex });
    }
  }

  let attack: RoomAttack | null = null;
  if (newlyCompleted.length > 0 && battleMode !== 'off') {
    let debuffType: DebuffType = 'quake';
    let durationMs = 2000;
    let labelKo = '알파도쿠 지진 공격';
    let labelEn = 'Alphadoku Board Quake';

    if (battleMode === 'hard') {
      if (newlyCompleted.some((u) => u.type === 'box')) {
        debuffType = 'freeze';
        durationMs = 1600;
        labelKo = '알파도쿠 AI 빙결 기습';
        labelEn = 'AI Freeze Assault';
      } else {
        debuffType = 'scramble';
        durationMs = 3500;
        labelKo = '알파도쿠 키패드 셔플';
        labelEn = 'AI Keypad Shuffle';
      }
    } else if (battleMode === 'normal') {
      if (newlyCompleted.some((u) => u.type === 'box')) {
        debuffType = 'scramble';
        durationMs = 2400;
        labelKo = '알파도쿠 키패드 셔플';
        labelEn = 'AI Keypad Shuffle';
      } else {
        debuffType = 'blind';
        durationMs = 2400;
        labelKo = '알파도쿠 잉크 블러';
        labelEn = 'AI Ink Splatter';
      }
    } else {
      debuffType = 'mist';
      durationMs = 1800;
      labelKo = '알파도쿠 안개 스모크';
      labelEn = 'AI Smoke Mist';
    }

    attack = {
      attackerId: 'ai-rival-alphadoku',
      attackerRole: 'guest',
      debuffType,
      durationMs,
      labelKo,
      labelEn,
      units: newlyCompleted.map((u) => ({ type: u.type, index: u.index, key: `${u.type}-${u.index}` })),
      battleMode,
      timestamp: Date.now(),
    };
  }

  const solved = newFilledCount >= current.totalFillable;

  const nextState: AiRivalState = {
    board: newBoard,
    filledCount: newFilledCount,
    totalFillable: current.totalFillable,
    progressPercent,
    completedUnits: newUnits,
    stunnedUntil: current.stunnedUntil,
    nextMoveTime: Date.now() + getAiMoveInterval(battleMode),
    lastFilledCell: { row: target.row, col: target.col, value: correctVal },
  };

  return { nextState, attack, solved };
}

/**
 * Applies player attack onto the AI Rival, delaying its next moves.
 */
export function applyDebuffToAi(current: AiRivalState, durationMs: number): AiRivalState {
  const stunnedUntil = Date.now() + durationMs;
  return {
    ...current,
    stunnedUntil,
    nextMoveTime: Math.max(current.nextMoveTime, Date.now() + durationMs + 800),
  };
}

/**
 * Generates the 9x9 battle minimap between player and AI Rival.
 */
export function computeAiBattleMinimap(
  playerBoard: Grid,
  aiBoard: Grid,
  clueGrid: Grid
): SharedRoomCellOccupancy[][] {
  const minimap: SharedRoomCellOccupancy[][] = [];
  for (let r = 0; r < 9; r++) {
    const row: SharedRoomCellOccupancy[] = [];
    for (let c = 0; c < 9; c++) {
      if (clueGrid[r][c] !== null) {
        row.push('clue');
      } else {
        const playerFilled = playerBoard[r][c] !== null;
        const aiFilled = aiBoard[r][c] !== null;
        if (playerFilled && aiFilled) {
          row.push('both');
        } else if (playerFilled) {
          row.push('self');
        } else if (aiFilled) {
          row.push('other');
        } else {
          row.push('empty');
        }
      }
    }
    minimap.push(row);
  }
  return minimap;
}
