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

export type { Difficulty, Grid, BattleMode, DebuffType, RoomAttack, CompletedUnit, RoomRole };

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
  shield?: number;
};

export type GameMode = 'solo' | 'vs_ai' | 'online' | 'daily';

export function getItemsForBattleMode(mode: BattleMode): ItemCounts {
  switch (mode) {
    case 'hard':
      return { hint: 1, autoFill: 0, shield: 1 };
    case 'normal':
      return { hint: 2, autoFill: 1, shield: 1 };
    case 'easy':
      return { hint: 3, autoFill: 2, shield: 2 };
    case 'off':
    default:
      return { hint: 3, autoFill: 1, shield: 0 };
  }
}

export type RankTier = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

export type RankProfile = {
  rp: number;
  tier: RankTier;
  wins: number;
  losses: number;
  winStreak: number;
};

export type RankTierInfo = {
  tier: RankTier;
  nameKo: string;
  nameEn: string;
  color: string;
  badge: string;
  minRp: number;
  maxRp: number;
  nextTier?: string;
};

export function getRankTierInfo(rp: number): RankTierInfo {
  if (rp >= 2000) {
    return {
      tier: 'master',
      nameKo: '마스터',
      nameEn: 'Master',
      color: '#f43f5e',
      badge: '👑',
      minRp: 2000,
      maxRp: 99999,
    };
  }
  if (rp >= 1500) {
    return {
      tier: 'diamond',
      nameKo: '다이아몬드',
      nameEn: 'Diamond',
      color: '#a855f7',
      badge: '💎',
      minRp: 1500,
      maxRp: 1999,
      nextTier: '마스터 (2,000 RP)',
    };
  }
  if (rp >= 1100) {
    return {
      tier: 'platinum',
      nameKo: '플래티넘',
      nameEn: 'Platinum',
      color: '#06b6d4',
      badge: '💠',
      minRp: 1100,
      maxRp: 1499,
      nextTier: '다이아몬드 (1,500 RP)',
    };
  }
  if (rp >= 700) {
    return {
      tier: 'gold',
      nameKo: '골드',
      nameEn: 'Gold',
      color: '#eab308',
      badge: '🥇',
      minRp: 700,
      maxRp: 1099,
      nextTier: '플래티넘 (1,100 RP)',
    };
  }
  if (rp >= 350) {
    return {
      tier: 'silver',
      nameKo: '실버',
      nameEn: 'Silver',
      color: '#94a3b8',
      badge: '🥈',
      minRp: 350,
      maxRp: 699,
      nextTier: '골드 (700 RP)',
    };
  }
  if (rp >= 100) {
    return {
      tier: 'bronze',
      nameKo: '브론즈',
      nameEn: 'Bronze',
      color: '#d97706',
      badge: '🥉',
      minRp: 100,
      maxRp: 349,
      nextTier: '실버 (350 RP)',
    };
  }
  return {
    tier: 'iron',
    nameKo: '아이언',
    nameEn: 'Iron',
    color: '#64748b',
    badge: '🛡️',
    minRp: 0,
    maxRp: 99,
    nextTier: '브론즈 (100 RP)',
  };
}

export type DailyRecord = {
  date: string; // YYYY-MM-DD
  solved: boolean;
  timeSeconds: number;
  completedAt?: string;
};

export type DailyChallengeState = {
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string | null;
  records: Record<string, DailyRecord>;
};

export type GameSettings = {
  autoCleanupNotes: boolean;
  highlightMatchingNumbers: boolean;
  hapticsEnabled: boolean;
};

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

