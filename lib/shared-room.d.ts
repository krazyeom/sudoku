import type { Difficulty, Grid } from './sudoku';

export type RoomRole = 'host' | 'guest' | 'spectator';

export type RoomParticipant = {
  id: string;
  role: RoomRole;
  connected: boolean;
  joinedAt: string;
  lastSeenAt?: string | null;
};

export type SharedRoomCellOccupancy = 'clue' | 'self' | 'other' | 'both' | 'empty';
export type SharedRoomPhase = 'lobby' | 'countdown' | 'playing';

export type BattleMode = 'hard' | 'normal' | 'easy' | 'off';
export type DebuffType = 'freeze' | 'scramble' | 'blind' | 'quake' | 'mist';

export type CompletedUnit = {
  type: 'row' | 'col' | 'box';
  index: number;
  key: string;
};

export type RoomAttack = {
  attackerId: string;
  attackerRole: RoomRole;
  debuffType: DebuffType;
  durationMs: number;
  labelKo: string;
  labelEn: string;
  units: CompletedUnit[];
  battleMode: BattleMode;
  timestamp: number;
};

export type SharedRoomSnapshot = {
  roomId: string;
  difficulty: Difficulty;
  clueCount: number;
  phase: SharedRoomPhase;
  battleMode: BattleMode;
  lastAttack: RoomAttack | null;
  countdownEndsAt: string | null;
  startedAt: string | null;
  puzzle: Grid | null;
  solution: Grid | null;
  board: Grid | null;
  occupancy: SharedRoomCellOccupancy[][] | null;
  solved: boolean;
  completedAt: string | null;
  completedBy: string | null;
  completedByRole: RoomRole | null;
  completedElapsedSeconds: number | null;
  viewerRole: RoomRole;
  participants: RoomParticipant[];
  updatedAt: string;
};

export type SharedRoomState = {
  roomId: string;
  difficulty: Difficulty;
  puzzle: Grid;
  solution: Grid;
  clueCount: number;
  phase: SharedRoomPhase;
  battleMode: BattleMode;
  completedUnits: Map<string, Set<string>>;
  lastAttack: RoomAttack | null;
  countdownEndsAt: string | null;
  startedAt: string | null;
  cells: Array<Array<{ value: number | null; ownerId: string | null; kind: 'clue' | 'move' | 'empty'; claims: Array<{ participantId: string; value: number }> }>>;
  participants: Map<string, RoomParticipant>;
  solved: boolean;
  completedAt: string | null;
  completedBy: string | null;
  completedByRole: RoomRole | null;
  completedElapsedSeconds: number | null;
  filledCells: number;
  fillableCells: number;
  createdAt: string;
  updatedAt: string;
};

export type SharedRoomMove = { row: number; col: number; value: number | null };

export declare function createRoomState(options?: {
  roomId?: string;
  hostId?: string;
  difficulty?: Difficulty;
  puzzle?: Grid;
  solution?: Grid;
  battleMode?: BattleMode;
}): SharedRoomState;

export declare function registerParticipant(room: SharedRoomState, participantId: string): RoomParticipant;
export declare function disconnectParticipant(room: SharedRoomState, participantId: string): void;
export declare function resetRoom(
  room: SharedRoomState,
  options?: { difficulty?: Difficulty; puzzle?: Grid; solution?: Grid; battleMode?: BattleMode },
): void;
export declare function setBattleMode(room: SharedRoomState, battleMode: BattleMode): BattleMode;
export declare function applyRoomMove(room: SharedRoomState, participantId: string, move: SharedRoomMove): {
  type: 'cell-updated' | 'cell-cleared';
  row: number;
  col: number;
  value?: number | null;
  ownerId: string;
  solved?: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  completedByRole?: RoomRole | null;
  completedElapsedSeconds?: number | null;
  completedUnits?: CompletedUnit[];
  attack?: RoomAttack | null;
};
export declare function buildViewerSnapshot(room: SharedRoomState, participantId?: string | null): SharedRoomSnapshot;
