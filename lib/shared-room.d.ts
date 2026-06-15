import type { Difficulty, Grid } from './sudoku';

export type RoomRole = 'host' | 'guest' | 'spectator';

export type RoomParticipant = {
  id: string;
  role: RoomRole;
  connected: boolean;
  joinedAt: string;
  lastSeenAt?: string | null;
};

export type SharedRoomCellOccupancy = 'clue' | 'self' | 'other' | 'empty';

export type SharedRoomSnapshot = {
  roomId: string;
  difficulty: Difficulty;
  clueCount: number;
  puzzle: Grid;
  solution: Grid;
  board: Grid;
  occupancy: SharedRoomCellOccupancy[][];
  solved: boolean;
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
  cells: Array<Array<{ value: number | null; ownerId: string | null; kind: 'clue' | 'move' | 'empty' }>>;
  participants: Map<string, RoomParticipant>;
  solved: boolean;
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
}): SharedRoomState;

export declare function registerParticipant(room: SharedRoomState, participantId: string): RoomParticipant;
export declare function disconnectParticipant(room: SharedRoomState, participantId: string): void;
export declare function resetRoom(
  room: SharedRoomState,
  options?: { difficulty?: Difficulty; puzzle?: Grid; solution?: Grid },
): void;
export declare function applyRoomMove(room: SharedRoomState, participantId: string, move: SharedRoomMove): {
  type: 'cell-updated' | 'cell-cleared';
  row: number;
  col: number;
  value?: number | null;
  ownerId: string;
  solved?: boolean;
};
export declare function buildViewerSnapshot(room: SharedRoomState, participantId?: string | null): SharedRoomSnapshot;
