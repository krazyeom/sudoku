import type { Difficulty, Grid } from '@/lib/sudoku';
import type {
  SharedRoomCellOccupancy,
  SharedRoomSnapshot,
  RoomRole,
  BattleMode,
  DebuffType,
  RoomAttack,
  CompletedUnit,
} from '@/lib/shared-room';

export type { BattleMode, DebuffType, RoomAttack, CompletedUnit, RoomRole };

export type Position = { row: number; col: number } | null;

export type NoteGrid = number[][][];

export type Snapshot = {
  board: Grid;
  notes: NoteGrid;
  elapsedSeconds: number;
};

export type ConfettiPiece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  hue: number;
  rotation: number;
};

export type RecordEntry = {
  difficulty: Difficulty;
  elapsedSeconds: number;
  clueCount: number;
  completedAt: string;
};

export type ItemCounts = {
  hint: number;
  autoFill: number;
};

export type GameMode = 'solo' | 'vs_ai' | 'online';

export function getItemsForBattleMode(mode: BattleMode): ItemCounts {
  switch (mode) {
    case 'hard':
      return { hint: 1, autoFill: 0 };
    case 'normal':
      return { hint: 2, autoFill: 1 };
    case 'easy':
      return { hint: 3, autoFill: 2 };
    case 'off':
    default:
      return { hint: 3, autoFill: 1 };
  }
}

export type Locale = 'ko' | 'en';

export type ActiveDebuff = {
  type: DebuffType;
  endsAt: number;
  label: string;
  attackerId?: string;
} | null;

export type BattleToast = {
  id: string;
  type: 'attack_launched' | 'attack_received' | 'line_cleared' | 'combo';
  title: string;
  subtitle: string;
  debuffType?: DebuffType;
  timestamp: number;
};

export type SavedGame = {
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  board: Grid;
  notes: NoteGrid;
  history: Snapshot[];
  selected: Position;
  noteMode: boolean;
  soundEnabled: boolean;
  items: ItemCounts;
  locale: Locale;
  elapsedSeconds: number;
  timerRunning: boolean;
  solved: boolean;
  battleMode?: BattleMode;
};

export type CompletionSummary = RecordEntry & {
  rank: number;
  total: number;
};

export type SharedCompletionSummary = {
  difficulty: Difficulty;
  clueCount: number;
  elapsedSeconds: number;
  completedAt: string;
  completedBy: string | null;
  completedByRole: RoomRole | null;
};

export type SharedRoomState = {
  roomId: string;
  participantId: string;
  role: 'host' | 'guest' | 'spectator';
  connected: boolean;
  snapshot: SharedRoomSnapshot | null;
  battleMode: BattleMode;
};

export type BattleSummary = {
  totalCells: number;
  fillableCells: number;
  clueCells: number;
  bothCells: number;
  selfCells: number;
  otherCells: number;
  selfProgress: number;
  otherProgress: number;
  battleActive: boolean;
  stage: { ko: string; en: string };
};

