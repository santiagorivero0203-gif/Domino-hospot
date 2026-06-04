import { create } from 'zustand';
import type { GameStore, Player, BoardState, PlacedTile, RoundEndResult, GameOptions, GameMessage } from '../types';
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
 * Envía un mensaje al otro jugador a través del networkManager activo.
 * Se asegura de que haya un manager y una conexión activa antes de enviar.
 */
function sendNetworkMessage(msg: GameMessage) {
  const state = useGameStore.getState();
  if (state.networkManager) {
    try {
      state.networkManager.send(JSON.stringify(msg));
    } catch (e) {
      console.error('[NET] Error al enviar mensaje:', e);
    }
  }
}

/**
 * Global game state store managed by Zustand.
 * Handles the main game loop, player actions, turn progression,
 * AND multiplayer P2P synchronization.
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
  targetScore: 100,
  isTeamMode: false,
  networkManager: null,
  localPlayerId: null,
  isHost: false,

  // =========================================================================
  // SINGLEPLAYER: Inicia partida local contra bots (sin cambios)
  // =========================================================================
  startGame: (playerCount: number, botCount: number, options?: GameOptions) => {
    clearAllTimers();

    const tiles = generateTiles();
    const totalPlayers = playerCount + botCount;
    const hands = dealTiles(tiles, totalPlayers);

    const players: Player[] = [];

    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: getRandomId(),
        name: i === 0 ? (options?.playerName || 'Tú') : `Jugador ${i + 1}`,
        type: 'local',
        hand: hands[i],
        teamId: options?.isTeamMode ? (i % 2 === 0 ? 1 : 2) : undefined,
      });
    }

    for (let i = 0; i < botCount; i++) {
      const pIdx = playerCount + i;
      players.push({
        id: getRandomId(),
        name: `Bot ${i + 1}`,
        type: 'bot',
        hand: hands[pIdx],
        teamId: options?.isTeamMode ? (pIdx % 2 === 0 ? 1 : 2) : undefined,
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
      targetScore: options?.targetScore || 100,
      isTeamMode: options?.isTeamMode || false,
      networkManager: null,
      localPlayerId: null,
      isHost: false,
    });

    if (players[firstIdx].type === 'bot') {
      scheduleBotPlay();
    }
  },

  // =========================================================================
  // MULTIPLAYER: Inicia partida P2P real entre dos dispositivos
  // =========================================================================
  startMultiplayerGame: (role: 'host' | 'client', manager: any) => {
    clearAllTimers();

    // Guardamos el manager de red y configuramos el listener de datos
    manager.callbacks = {
      ...manager.callbacks,
      onData: (data: string) => {
        useGameStore.getState().receiveNetworkMessage(data);
      },
    };

    // Si PeerJS, re-registrar el onData en la conexión interna
    if (manager.conn) {
      manager.conn.off('data');
      manager.conn.on('data', (rawData: any) => {
        const str = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
        useGameStore.getState().receiveNetworkMessage(str);
      });
    }

    if (role === 'host') {
      // El HOST genera las fichas, reparte, y envía el estado al client
      const tiles = generateTiles();
      const hands = dealTiles(tiles, 2);

      const hostId = getRandomId();
      const clientId = getRandomId();

      const players: Player[] = [
        { id: hostId, name: 'Tú (Host)', type: 'local', hand: hands[0] },
        { id: clientId, name: 'Oponente', type: 'network', hand: hands[1] },
      ];

      // Determinar quién empieza (el que tenga el doble 6)
      let firstIdx = 0;
      if (hasDoubleSix(players[1].hand)) {
        firstIdx = 1;
      } else if (hasDoubleSix(players[0].hand)) {
        firstIdx = 0;
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
        targetScore: 100,
        isTeamMode: false,
        networkManager: manager,
        localPlayerId: hostId,
        isHost: true,
      });

      // Enviar estado inicial al Client con toda la información que necesita
      const syncMsg: GameMessage = {
        type: 'SYNC_STATE',
        state: {
          players: players.map((p, i) => ({
            ...p,
            // El client solo ve SUS fichas; las del host quedan ocultas
            hand: i === 1 ? p.hand : [],
          })),
          board: createInitialBoard(),
          currentTurnIndex: firstIdx,
          scores,
          roundNumber: 1,
          localPlayerId: clientId,
          hostPlayerId: hostId,
        },
      };

      // Pequeña demora para asegurar que la conexión esté lista
      setTimeout(() => {
        sendNetworkMessage(syncMsg);
      }, 500);

    } else {
      // El CLIENT espera el SYNC_STATE del host
      set({
        players: [],
        board: createInitialBoard(),
        currentTurnIndex: 0,
        gameState: 'setup', // Se queda en setup hasta recibir SYNC_STATE
        scores: [],
        roundNumber: 1,
        lastPlayedTile: null,
        winnerId: null,
        gameOverWinnerId: null,
        targetScore: 100,
        isTeamMode: false,
        networkManager: manager,
        localPlayerId: null, // Se asigna al recibir SYNC_STATE
        isHost: false,
      });
    }
  },

  // =========================================================================
  // RECIBIR MENSAJE DE RED: Procesa mensajes que llegan del otro dispositivo
  // =========================================================================
  receiveNetworkMessage: (data: string) => {
    let msg: GameMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      console.error('[NET] Mensaje de red inválido:', data);
      return;
    }

    const state = get();

    switch (msg.type) {
      // ---------------------------------------------------------------
      // SYNC_STATE: El Client recibe el estado completo del juego
      // ---------------------------------------------------------------
      case 'SYNC_STATE': {
        const s = msg.state;
        set({
          players: s.players,
          board: s.board,
          currentTurnIndex: s.currentTurnIndex,
          gameState: 'playing',
          scores: s.scores,
          roundNumber: s.roundNumber,
          lastPlayedTile: null,
          winnerId: null,
          gameOverWinnerId: null,
          localPlayerId: s.localPlayerId,
        });
        break;
      }

      // ---------------------------------------------------------------
      // PLAY_TILE: El otro jugador puso una ficha
      // ---------------------------------------------------------------
      case 'PLAY_TILE': {
        const { playerId, tileId, position } = msg;
        const playerIdx = state.players.findIndex((p) => p.id === playerId);
        if (playerIdx === -1) return;

        const player = state.players[playerIdx];
        const tile = player.hand.find((t) => t.id === tileId);
        
        if (!tile) {
          // En el lado del Host, el Client no tiene las fichas del host
          // así que podemos no encontrar la ficha aquí si somos client
          // y el host jugó; pero el host nos mandará un SYNC con el board actualizado.
          // Para el caso opuesto (host recibe jugada del client):
          // el host SÍ tiene las fichas del client en su estado.
          console.warn('[NET] Ficha no encontrada localmente:', tileId);
          return;
        }

        const result = applyPlay(tile, position, state.board);
        if (!result) {
          console.warn('[NET] Jugada inválida recibida');
          return;
        }

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

        // Verificar fin de ronda
        const hands = newPlayers.map((p) => p.hand);
        const playerIds = newPlayers.map((p) => p.id);
        const roundResult = checkRoundEnd(hands, playerIds, newBoard);

        if (roundResult) {
          finishRound(roundResult);
        } else {
          // Avanzar turno
          internalState.nextTurnTimeoutId = window.setTimeout(() => {
            internalState.nextTurnTimeoutId = null;
            const nextIdx = (playerIdx + 1) % newPlayers.length;
            useGameStore.setState({ currentTurnIndex: nextIdx });
          }, POST_PLAY_DELAY);
        }
        break;
      }

      // ---------------------------------------------------------------
      // PASS_TURN: El otro jugador pasó su turno
      // ---------------------------------------------------------------
      case 'PASS_TURN': {
        const { playerId } = msg;
        const playerIdx = state.players.findIndex((p) => p.id === playerId);
        if (playerIdx === -1) return;

        set({ lastPlayedTile: null });
        internalState.nextTurnTimeoutId = window.setTimeout(() => {
          internalState.nextTurnTimeoutId = null;
          const nextIdx = (playerIdx + 1) % state.players.length;
          useGameStore.setState({ currentTurnIndex: nextIdx });
        }, POST_PLAY_DELAY);
        break;
      }

      // ---------------------------------------------------------------
      // NEXT_ROUND: El Host inicia una nueva ronda (sincroniza fichas)
      // ---------------------------------------------------------------
      case 'NEXT_ROUND': {
        const s = msg.state;
        set({
          players: s.players,
          board: s.board,
          currentTurnIndex: s.currentTurnIndex,
          gameState: 'playing',
          scores: s.scores,
          roundNumber: s.roundNumber,
          lastPlayedTile: null,
          winnerId: null,
        });
        break;
      }
    }
  },

  // =========================================================================
  // PLAY TILE: Ahora envía por red si estamos en modo multijugador
  // =========================================================================
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

    // *** MULTIJUGADOR: Enviar la jugada al oponente ***
    if (state.networkManager && playerId === state.localPlayerId) {
      sendNetworkMessage({
        type: 'PLAY_TILE',
        playerId,
        tileId,
        position,
      });
    }

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

  // =========================================================================
  // PASS: Ahora envía por red si estamos en modo multijugador
  // =========================================================================
  pass: (playerId: string) => {
    const state = get();
    if (state.gameState !== 'playing') return;

    const playerIdx = state.players.findIndex((p) => p.id === playerId);
    if (playerIdx === -1) return;
    if (state.currentTurnIndex !== playerIdx) return;

    // *** MULTIJUGADOR: Enviar el pase al oponente ***
    if (state.networkManager && playerId === state.localPlayerId) {
      sendNetworkMessage({
        type: 'PASS_TURN',
        playerId,
      });
    }

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

    const newScores = [...state.scores];

    set({
      players: newPlayers,
      board: createInitialBoard(),
      currentTurnIndex: winnerIdx >= 0 ? winnerIdx : 0,
      gameState: 'playing',
      roundNumber: state.roundNumber + 1,
      lastPlayedTile: null,
      winnerId: null,
    });

    // *** MULTIJUGADOR: El Host envía el nuevo estado de ronda al Client ***
    if (state.networkManager && state.isHost) {
      const syncMsg: GameMessage = {
        type: 'NEXT_ROUND',
        state: {
          players: newPlayers.map((p) => {
            // El client (índice 1) solo ve SUS fichas
            const isClientPlayer = p.type === 'network';
            return {
              ...p,
              hand: isClientPlayer ? p.hand : [],
            };
          }),
          board: createInitialBoard(),
          currentTurnIndex: winnerIdx >= 0 ? winnerIdx : 0,
          scores: newScores,
          roundNumber: state.roundNumber + 1,
        },
      };
      sendNetworkMessage(syncMsg);
    }

    if (newPlayers[winnerIdx >= 0 ? winnerIdx : 0].type === 'bot') {
      scheduleBotPlay();
    }
  },

  resetGame: () => {
    clearAllTimers();
    const state = get();
    // Desconectar red si hay
    if (state.networkManager) {
      try { state.networkManager.disconnect(); } catch {}
    }
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
      targetScore: 100,
      isTeamMode: false,
      networkManager: null,
      localPlayerId: null,
      isHost: false,
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
  let newScores = [...state.scores];

  if (state.isTeamMode) {
    const teamRoundScores = { 1: 0, 2: 0 };
    result.scores.forEach((rs) => {
      const p = state.players.find((p) => p.id === rs.playerId);
      if (p && p.teamId) {
        teamRoundScores[p.teamId as 1 | 2] += rs.handScore;
      }
    });

    newScores = state.scores.map((s) => {
      const p = state.players.find((p) => p.id === s.playerId);
      if (p && p.teamId) {
        return { ...s, points: s.points + teamRoundScores[p.teamId as 1 | 2] };
      }
      return s;
    });
  } else {
    newScores = state.scores.map((s) => {
      const found = result.scores.find((rs) => rs.playerId === s.playerId);
      if (found) {
        return { ...s, points: s.points + found.handScore };
      }
      return s;
    });
  }

  const maxPoints = Math.max(...newScores.map((s) => s.points));
  const gameOver = maxPoints >= state.targetScore;
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
