export interface Tile {
  left: number;
  right: number;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  type: 'local' | 'bot' | 'network';
  hand: Tile[];
  isConnected?: boolean;
  teamId?: number; // 1 o 2 para el modo de equipos
}

export interface PlacedTile {
  tile: Tile;
  position: 'left' | 'right';
  rotation: number;
}

export interface BoardState {
  leftEnd: number | null;
  rightEnd: number | null;
  chain: PlacedTile[];
}

export type GameState =
  | 'setup'
  | 'playing'
  | 'round_end'
  | 'game_over';

export interface GameScore {
  playerId: string;
  points: number;
}

export interface RoundEndResult {
  type: 'domino' | 'tranca';
  winnerId: string | null;
  scores: { playerId: string; handScore: number }[];
  isTie?: boolean;
}

export interface GameOptions {
  playerName: string;
  isTeamMode: boolean;
  targetScore: number;
}

export interface GameStore {
  players: Player[];
  board: BoardState;
  currentTurnIndex: number;
  gameState: GameState;
  scores: GameScore[];
  roundNumber: number;
  lastPlayedTile: Tile | null;
  winnerId: string | null;
  gameOverWinnerId: string | null;
  targetScore: number;
  isTeamMode: boolean;

  startGame: (playerCount: number, botCount: number, options?: GameOptions) => void;
  playTile: (playerId: string, tileId: string, position: 'left' | 'right') => boolean;
  pass: (playerId: string) => void;
  nextTurn: () => void;
  resetRound: () => void;
  resetGame: () => void;
}

export type GameMessage =
  | { type: 'playTile'; tileId: string; position: 'left' | 'right' }
  | { type: 'pass' }
  | { type: 'sync'; state: { currentTurnIndex: number; board: BoardState } };
