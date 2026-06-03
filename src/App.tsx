/**
 * App.tsx — Componente raíz de la aplicación.
 * Orquesta la navegación entre pantallas (setup, playing, multiplayer-qr)
 * usando transiciones animadas de Framer Motion.
 */
import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SkipForward, Trophy, X } from 'lucide-react';
import useGameStore from './store/gameStore';
import GameSetup from './components/GameSetup';
import Board from './components/Board';
import PlayerHand from './components/PlayerHand';
import TurnOverlay from './components/TurnOverlay';
import ScoreBoard from './components/ScoreBoard';
import RoundEndModal from './components/RoundEndModal';
import GameOverModal from './components/GameOverModal';
import QRConnectionArea from './components/QRConnectionArea';
import OpponentHands from './components/OpponentHands';
import { useGame } from './hooks/useGame';
import type { WebRTCManager } from './network/WebRTCManager';

/** Pantallas posibles de la aplicación */
type Screen = 'setup' | 'playing' | 'multiplayer-qr';

/**
 * Main application component.
 * Orchestrates navigation between screens and initializes game instances.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const game = useGame();
  const store = useGameStore();

  /** Inicia partida singleplayer con N bots */
  const handleStartSingleplayer = useCallback(
    (botCount: number) => {
      store.startGame(1, botCount);
      setScreen('playing');
    },
    [store],
  );

  /** Navega a la pantalla de conexión QR */
  const handleStartMultiplayer = useCallback(() => {
    setScreen('multiplayer-qr');
  }, []);

  /** Callback al establecer conexión WebRTC exitosa */
  const handleQRConnected = useCallback(
    (_manager: WebRTCManager) => {
      store.startGame(1, 0);
      setScreen('playing');
    },
    [store],
  );

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      <AnimatePresence mode="wait">
        {screen === 'setup' && (
          <GameSetup
            key="setup"
            onStartSingleplayer={handleStartSingleplayer}
            onStartMultiplayer={handleStartMultiplayer}
          />
        )}

        {screen === 'multiplayer-qr' && (
          <QRConnectionArea
            key="qr"
            onConnected={handleQRConnected}
            onBack={() => setScreen('setup')}
          />
        )}

        {screen === 'playing' && (
          <PlayingScreen
            key="playing"
            onExitToMenu={() => {
              store.resetGame();
              setScreen('setup');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * PlayingScreen — Pantalla principal de juego.
 * Contiene el tablero, la mano del jugador, el marcador
 * y los modales de fin de ronda/partida.
 */
function PlayingScreen({ onExitToMenu }: { onExitToMenu: () => void }) {
  const game = useGame();
  const store = useGameStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full flex flex-col"
    >
      {/* Barra superior con marcador y botón de salida */}
      <div className="flex items-center justify-between px-3 py-2 glass-panel gap-2">
        <ScoreBoard
          players={game.players}
          scores={game.scores}
          currentTurnIndex={game.currentTurnIndex}
          roundNumber={game.roundNumber}
        />
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onExitToMenu}
          className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          title="Salir al menú"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Tablero de juego (área principal) */}
      <div className="flex-1 relative p-2 min-h-0">
        <OpponentHands 
          players={game.players} 
          localPlayerId={game.localPlayer?.id} 
          currentTurnIndex={game.currentTurnIndex} 
        />
        <Board
          chain={game.board.chain}
          boardState={game.board}
          isLocalTurn={game.isLocalTurn}
          highlightEnds={game.isLocalTurn && game.canCurrentPlayerPlay}
        />
      </div>

      {/* Mano del jugador */}
      <div className="relative glass-panel">
        <PlayerHand
          tiles={game.localHand}
          isCurrentPlayer={game.isLocalTurn}
          boardState={game.board}
          onPlay={game.handlePlay}
          onDragEnd={game.handleDragEnd}
          onTap={game.handleTap}
        />
      </div>

      {/* Barra de acciones */}
      <div className="flex justify-center gap-3 px-4 py-2.5 glass-panel">
        {game.gameState === 'playing' &&
          game.isLocalTurn &&
          !game.canCurrentPlayerPlay &&
          !game.isBoardEmpty && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={game.handlePass}
              className="flex items-center gap-2 font-semibold py-2 px-6 rounded-xl transition-all text-sm text-white"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
              }}
            >
              <SkipForward className="w-4 h-4" />
              Pasar turno
            </motion.button>
          )}

        {game.gameState === 'playing' && game.isLocalTurn && game.isBoardEmpty && (
          <p className="text-white/40 text-xs flex items-center gap-2 font-light">
            <Trophy className="w-3.5 h-3.5 text-gold" />
            Coloca tu primera ficha (doble 6 si lo tienes)
          </p>
        )}
      </div>

      {/* Overlay de transición de turno */}
      <TurnOverlay
        show={game.showTurnOverlay && game.gameState === 'playing'}
        playerName={game.currentPlayer?.name ?? '...'}
        isFirstPlayer={game.isBoardEmpty}
        autoHide={true}
        autoHideMs={game.isBotTurn ? 1500 : 2000}
      />

      {/* Modales de fin de ronda y de partida */}
      <AnimatePresence>
        {game.gameState === 'round_end' && (
          <RoundEndModal
            winnerName={
              game.winnerId
                ? game.players.find((p) => p.id === game.winnerId)?.name ??
                  'Desconocido'
                : null
            }
            players={game.players}
            scores={game.scores}
            onNextRound={store.resetRound}
            onMenu={onExitToMenu}
          />
        )}
        {game.gameState === 'game_over' && (
          <GameOverModal
            winnerId={game.gameOverWinnerId}
            players={game.players}
            scores={game.scores}
            onMenu={onExitToMenu}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
