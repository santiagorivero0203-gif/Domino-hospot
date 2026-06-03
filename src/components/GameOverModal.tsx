/**
 * GameOverModal.tsx — Modal de fin de partida premium.
 * Muestra al ganador absoluto de la partida con una corona
 * animada, confeti visual y tabla de puntuaciones final.
 */
import { motion } from 'framer-motion';
import { Crown, Home, Trophy } from 'lucide-react';
import type { GameScore, Player } from '../types';

interface GameOverModalProps {
  winnerId: string | null;
  players: Player[];
  scores: GameScore[];
  onMenu: () => void;
}

export default function GameOverModal({
  winnerId,
  players,
  scores,
  onMenu,
}: GameOverModalProps) {
  const winner = winnerId ? players.find((p) => p.id === winnerId) : null;
  const sortedScores = [...scores].sort((a, b) => a.points - b.points);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.9) 100%)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Resplandor dorado detrás del modal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative glass-panel-strong rounded-3xl p-8 max-w-md w-full border-gold/20"
      >
        {/* Estrellas decorativas flotantes */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-3 -right-3 text-gold/30"
        >
          <Trophy className="w-6 h-6" />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-2 -left-2 text-gold/20"
        >
          <Trophy className="w-4 h-4" />
        </motion.div>

        {/* Encabezado con corona animada */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [0, -5, 5, -3, 3, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            className="inline-block mb-4"
          >
            <Crown className="w-16 h-16 text-gold drop-shadow-lg" />
          </motion.div>
          <h2 className="text-white text-3xl font-extrabold mb-2">¡Juego Terminado!</h2>
          {winner ? (
            <p className="text-gradient-gold text-xl font-bold">
              🏆 {winner.name} gana la partida
            </p>
          ) : (
            <p className="text-white/60 text-lg font-light">Empate</p>
          )}
        </div>

        {/* Tabla de puntuaciones finales */}
        <div className="space-y-1.5 mb-6">
          <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] text-center mb-3 font-medium">
            Puntuación final
          </p>
          {sortedScores.map((s, idx) => {
            const player = players.find((p) => p.id === s.playerId);
            const isWinner = winner && s.playerId === winner.id;
            return (
              <motion.div
                key={s.playerId}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                  isWinner
                    ? 'bg-gold/10 border border-gold/25 shadow-neon-gold'
                    : 'bg-white/5 border border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-lg font-bold ${
                      isWinner ? 'text-gold' : 'text-white/30'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span
                    className={`${
                      isWinner ? 'text-white font-bold' : 'text-white/70'
                    }`}
                  >
                    {player?.name ?? '?'}
                  </span>
                </div>
                <span
                  className={`font-mono text-lg font-bold ${
                    isWinner ? 'text-gold' : 'text-white/40'
                  }`}
                >
                  {s.points}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Botón de regreso al menú */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onMenu}
          className="w-full btn-indigo flex items-center justify-center gap-2 text-lg"
        >
          <Home className="w-5 h-5" />
          Volver al menú principal
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
