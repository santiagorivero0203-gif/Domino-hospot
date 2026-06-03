/**
 * OpponentHands.tsx — Muestra las fichas de los oponentes.
 * Visualiza de manera animada la cantidad de fichas que le quedan
 * a cada rival, mostrando el dorso de las fichas en la parte superior.
 */
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '../types';

interface OpponentHandsProps {
  players: Player[];
  localPlayerId?: string;
  currentTurnIndex: number;
}

export default function OpponentHands({ players, localPlayerId, currentTurnIndex }: OpponentHandsProps) {
  // Filtramos para obtener solo los rivales
  const opponents = players.filter((p) => p.id !== localPlayerId);

  if (opponents.length === 0) return null;

  return (
    <div className="absolute top-6 left-0 right-0 z-20 pointer-events-none flex justify-center gap-12 px-4">
      {opponents.map((opponent) => {
        const isCurrentTurn = players[currentTurnIndex]?.id === opponent.id;
        
        return (
          <div key={opponent.id} className="flex flex-col items-center gap-2">
            {/* Nombre e indicador de turno del oponente */}
            <div 
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md transition-all duration-300 ${
                isCurrentTurn 
                  ? 'bg-gold/90 text-black shadow-[0_0_15px_rgba(251,191,36,0.6)] scale-110' 
                  : 'bg-black/40 text-white/60 border border-white/10'
              }`}
            >
              {opponent.name}
            </div>
            
            {/* Fichas del oponente (ocultas) */}
            <motion.div layout className="flex gap-[2px] sm:gap-1">
              <AnimatePresence>
                {opponent.hand.map((tile) => (
                  <motion.div
                    key={tile.id}
                    layout
                    initial={{ opacity: 0, y: -20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.4, y: 20 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    className="w-[18px] h-[28px] sm:w-[22px] sm:h-[34px] rounded-[3px] border border-black/80 shadow-md"
                    style={{
                      background: '#fdfbf7', // Color marfil para el dorso
                      boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)' // Sombra interna sutil
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
