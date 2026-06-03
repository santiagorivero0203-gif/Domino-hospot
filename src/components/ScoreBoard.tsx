/**
 * ScoreBoard.tsx — Marcador premium con glassmorphism.
 * Muestra las puntuaciones de todos los jugadores,
 * resaltando al jugador activo con un indicador animado.
 */
import { motion } from 'framer-motion';
import type { GameScore, Player } from '../types';

interface ScoreBoardProps {
  players: Player[];
  scores: GameScore[];
  currentTurnIndex: number;
  roundNumber: number;
}

export default function ScoreBoard({
  players,
  scores,
  currentTurnIndex,
  roundNumber,
}: ScoreBoardProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {/* Badge de ronda */}
      <div className="text-gold text-[10px] font-bold glass-panel rounded-lg px-2.5 py-1 flex-shrink-0 tracking-wider">
        R{roundNumber}
      </div>

      {/* Indicadores de cada jugador */}
      {players.map((player, idx) => {
        const isCurrent = idx === currentTurnIndex;
        const score = scores.find((s) => s.playerId === player.id);
        return (
          <motion.div
            key={player.id}
            animate={isCurrent ? { scale: [1, 1.03, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all duration-300 flex-shrink-0
              ${isCurrent
                ? 'glass-panel border-emerald/30 shadow-neon-green'
                : 'bg-white/5 border border-white/5'
              }
              ${player.type === 'bot' ? 'opacity-60' : ''}
            `}
          >
            {/* Punto indicador de turno activo */}
            {isCurrent && (
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-1.5 h-1.5 rounded-full bg-emerald flex-shrink-0"
              />
            )}
            <span
              className={`font-semibold ${isCurrent ? 'text-white' : 'text-white/50'}`}
            >
              {player.name}
            </span>
            <span className="text-white/25 text-[9px]">({player.hand.length})</span>
            <span className={`font-mono font-bold ml-0.5 ${isCurrent ? 'text-gold' : 'text-white/30'}`}>
              {score?.points ?? 0}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
