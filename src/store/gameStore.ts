import { create } from 'zustand';
import type { GameStore, Player, BoardState, PlacedTile, RoundEndResult } from '../types';
import {
  generateTiles,
  dealTiles,
  determineFirstPlayer,
  applyPlay,
  getValidPlays,
  checkRoundEnd,
  botPlay,
  createInitialBoard,
  hasDoubleSix,
} from '../engine/DominoEngine';

let idCounter = 0;
function getRandomId(): string {
  idCounter++;
  return `p-${idCounter}-${Math.random().toString(36).substring(2, 7)}`;
}

const BOT_DELAY = 900;
const POST_PLAY_DELAY = 350;
const TOTAL_SCORE_TO_WIN = 100;

interface InternalState {
  botTimeoutId: number | null;
  nextTurnTimeoutId: number | null;
}

const internalState: InternalState = {
  botTimeoutId: null,
  nextTurnTimeoutId: null,
};

function clearAllTimers() {
  if (internalState.botTimeoutId !== null) {
    clearTimeout(internalState.botTimeoutId);
    internalState.botTimeoutId = null;
  }
  if (internalState.nextTurnTimeoutId !== null) {
    clearTimeout(internalState.nextTurnTimeoutId);
    internalState.nextTurnTimeoutId = null;
  }
}

/**
 * Global game state store managed by Zustand.
 * Handles the main game loop, player actions, and turn progression.
 */
const useGameStore = create<GameStore>((set, get) => ({
  players: [],
  board: createInitialBoard(),
  currentTurnIndex: 0,
  gameState: 'setup',
  scores: [],
  roundNumber: 1,
  lastPlayedTile: null,
  winnerId: null,
  gameOverWinnerId: null,

  startGame: (playerCount: number, botCount: number) => {
    clearAllTimers();

    const tiles = generateTiles();
    const totalPlayers = playerCount + botCount;
    const hands = dealTiles(tiles, totalPlayers);

    const players: Player[] = [];

    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: getRandomId(),
        name: i === 0 ? 'Tú' : `Jugador ${i + 1}`,
        type: 'local',
        hand: hands[i],
      });
    }

    for (let i = 0; i < botCount; i++) {
      players.push({
        id: getRandomId(),
        name: `Bot ${i + 1}`,
        type: 'bot',
        hand: hands[playerCount + i],
      });
    }

    let firstIdx = determineFirstPlayer(1, hands, null);
    if (!hasDoubleSix(players[firstIdx].hand)) {
      const fallback = players.findIndex(
        (p) => p.type === 'local' && hasDoubleSix(p.hand),
      );
      if (fallback !== -1) firstIdx = fallback;
    }

    const scores = players.map((p) => ({ playerId: p.id, points: 0 }));

    set({
      players,
      board: createInitialBoard(),
      currentTurnIndex: firstIdx,
      gameState: 'playing',
      scores,
      roundNumber: 1,
      lastPlayedTile: null,
      winnerId: null,
      gameOverWinnerId: null,
    });

    if (players[firstIdx].type === 'bot') {
      scheduleBotPlay();
    }
  },

  playTile: (
    playerId: string,
    tileId: string,
    position: 'left' | 'right',
  ): boolean => {
    const state = get();
    if (state.gameState !== 'playing') return false;

    const playerIdx = state.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1) return false;
    if (state.currentTurnIndex !== playerIdx) return false;

    const player = state.players[playerIdx];
    const tile = player.hand.find((t) => t.id === tileId);
    if (!tile) return false;

    const result = applyPlay(tile, position, state.board);
    if (!result) return false;

    const newHand = player.hand.filter((t) => t.id !== tileId);
    const newPlayers = state.players.map((p, i) =>
      i === playerIdx ? { ...p, hand: newHand } : p,
    );

    const newChain: PlacedTile[] = [
      ...state.board.chain,
      { tile: result.tile, position: result.position, rotation: 0 },
    ];

    const newBoard: BoardState = {
      leftEnd: result.newLeftEnd,
      rightEnd: result.newRightEnd,
      chain: newChain,
    };

    set({
      players: newPlayers,
      board: newBoard,
      lastPlayedTile: result.tile,
    });

    const hands = newPlayers.map((p) => p.hand);
    const playerIds = newPlayers.map((p) => p.id);
    const roundResult = checkRoundEnd(hands, playerIds, newBoard);

    if (roundResult) {
      finishRound(roundResult);
    } else {
      internalState.nextTurnTimeoutId = window.setTimeout(() => {
        internalState.nextTurnTimeoutId = null;
        get().nextTurn();
      }, POST_PLAY_DELAY);
    }

    return true;
  },

  pass: (playerId: string) => {
    const state = get();
    if (state.gameState !== 'playing') return;

    const playerIdx = state.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1) return;
    if (state.currentTurnIndex !== playerIdx) return;

    set({ lastPlayedTile: null });
    internalState.nextTurnTimeoutId = window.setTimeout(() => {
      internalState.nextTurnTimeoutId = null;
      get().nextTurn();
    }, POST_PLAY_DELAY);
  },

  nextTurn: () => {
    const state = get();
    if (state.gameState !== 'playing') return;
    if (state.players.length === 0) return;

    const hands = state.players.map((p) => p.hand);
    const playerIds = state.players.map((p) => p.id);
    const roundResult = checkRoundEnd(hands, playerIds, state.board);

    if (roundResult) {
      finishRound(roundResult);
      return;
    }

    const nextIdx = (state.currentTurnIndex + 1) % state.players.length;
    set({ currentTurnIndex: nextIdx });

    if (state.players[nextIdx].type === 'bot') {
      scheduleBotPlay();
    }
  },

  resetRound: () => {
    clearAllTimers();
    const state = get();
    if (state.players.length === 0) return;

    const winnerIdx = state.winnerId
      ? state.players.findIndex((p) => p.id === state.winnerId)
      : state.currentTurnIndex;

    const tiles = generateTiles();
    const hands = dealTiles(tiles, state.players.length);

    const newPlayers = state.players.map((p, i) => ({
      ...p,
      hand: hands[i],
    }));

    set({
      players: newPlayers,
      board: createInitialBoard(),
      currentTurnIndex: winnerIdx >= 0 ? winnerIdx : 0,
      gameState: 'playing',
      roundNumber: state.roundNumber + 1,
      lastPlayedTile: null,
      winnerId: null,
    });

    if (newPlayers[winnerIdx >= 0 ? winnerIdx : 0].type === 'bot') {
      scheduleBotPlay();
    }
  },

  resetGame: () => {
    clearAllTimers();
    set({
      players: [],
      board: createInitialBoard(),
      currentTurnIndex: 0,
      gameState: 'setup',
      scores: [],
      roundNumber: 1,
      lastPlayedTile: null,
      winnerId: null,
      gameOverWinnerId: null,
    });
  },
}));

function scheduleBotPlay() {
  internalState.botTimeoutId = window.setTimeout(() => {
    internalState.botTimeoutId = null;
    executeBotPlay();
  }, BOT_DELAY);
}

function executeBotPlay() {
  const state = useGameStore.getState();
  if (state.gameState !== 'playing') return;

  const current = state.players[state.currentTurnIndex];
  if (!current || current.type !== 'bot') return;

  const validPlays = getValidPlays(current.hand, state.board);

  if (validPlays.length === 0) {
    useGameStore.getState().pass(current.id);
    return;
  }

  const play = botPlay(current.hand, state.board);
  if (play) {
    useGameStore.getState().playTile(current.id, play.tile.id, play.position);
  }
}

function finishRound(result: RoundEndResult) {
  const state = useGameStore.getState();
  const newScores = state.scores.map((s) => {
    const found = result.scores.find((rs) => rs.playerId === s.playerId);
    if (found) {
      return { ...s, points: s.points + found.handScore };
    }
    return s;
  });

  const maxPoints = Math.max(...newScores.map((s) => s.points));
  const gameOver = maxPoints >= TOTAL_SCORE_TO_WIN;
  const winners = newScores.filter((s) => s.points === maxPoints);
  const gameOverWinnerId =
    gameOver && winners.length === 1 ? winners[0].playerId : null;

  useGameStore.setState({
    gameState: gameOver ? 'game_over' : 'round_end',
    winnerId: result.winnerId,
    scores: newScores,
    gameOverWinnerId,
  });
}

export default useGameStore;
