/**
 * RoundEndModal.tsx — Modal de fin de ronda premium.
 * Muestra el ganador de la ronda actual con una tabla de
 * puntuaciones ordenada y animaciones escalonadas.
 */
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import type { GameScore, Player } from '../types';

interface RoundEndModalProps {
  winnerName: string | null;
  players: Player[];
  scores: GameScore[];
  onNextRound: () => void;
  onMenu: () => void;
}

export default function RoundEndModal({
  winnerName,
  players,
  scores,
  onNextRound,
  onMenu,
}: RoundEndModalProps) {
  const sortedScores = [...scores].sort((a, b) => b.points - a.points);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="glass-panel-strong rounded-3xl p-6 max-w-md w-full"
      >
        {/* Encabezado con trofeo animado */}
        <div className="text-center mb-5">
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 4, 0], y: [0, -5, 0] }}
            transition={{ duration: 0.8 }}
            className="inline-block mb-3"
          >
            <Trophy className="w-12 h-12 text-gold drop-shadow-lg" />
          </motion.div>
          <h2 className="text-white text-2xl font-bold">
            {winnerName
              ? `🏆 ${winnerName} gana`
              : 'Ronda empatada'}
          </h2>
        </div>

        {/* Tabla de posiciones */}
        <div className="space-y-1.5 mb-6">
          {sortedScores.map((s, idx) => {
            const player = players.find((p) => p.id === s.playerId);
            const isTop = idx === 0;
            return (
              <motion.div
                key={s.playerId}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.08 }}
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                  isTop
                    ? 'bg-gold/10 border border-gold/20'
                    : 'bg-white/5 border border-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-bold text-sm ${
                      isTop ? 'text-gold' : 'text-white/30'
                    }`}
                  >
                    {idx + 1}.
                  </span>
                  <span
                    className={`text-sm ${
                      isTop ? 'text-white font-bold' : 'text-white/70'
                    }`}
                  >
                    {player?.name ?? '?'}
                  </span>
                  {player && (
                    <span className="text-[10px] text-white/25">
                      ({player.hand.length})
                    </span>
                  )}
                </div>
                <span
                  className={`font-mono text-sm font-bold ${
                    isTop ? 'text-gold' : 'text-white/40'
                  }`}
                >
                  {s.points} pts
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNextRound}
            className="flex-1 btn-emerald flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Siguiente ronda
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onMenu}
            className="flex items-center justify-center gap-2 glass-panel hover:bg-white/10 text-white/70 font-semibold py-3 px-4 rounded-2xl transition-all"
          >
            <Home className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
