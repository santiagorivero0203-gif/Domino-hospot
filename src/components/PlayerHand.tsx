/**
 * PlayerHand.tsx — Mano del jugador con animaciones premium.
 * Muestra las fichas del jugador local ordenadas, con animaciones
 * de entrada/salida suaves y estado oculto para Pass & Play.
 */
import { motion, AnimatePresence } from 'framer-motion';
import type { Tile, BoardState } from '../types';
import TileComponent from './Tile';
import { sortHand } from '../engine/DominoEngine';

interface PlayerHandProps {
  tiles: Tile[];
  isCurrentPlayer: boolean;
  boardState: BoardState;
  onPlay: (tileId: string, position: 'left' | 'right') => void;
  onDragEnd?: (
    info: {
      point: { x: number; y: number };
      offset: { x: number; y: number };
    },
    tile: Tile
  ) => void;
  onTap?: (tileId: string) => void;
  hidden?: boolean;
}

export default function PlayerHand({
  tiles,
  isCurrentPlayer,
  boardState,
  onPlay,
  onDragEnd,
  onTap,
  hidden = false,
}: PlayerHandProps) {
  /* Modo oculto: muestra fichas boca abajo (Pass & Play) */
  if (hidden) {
    return (
      <div className="flex gap-1 sm:gap-1.5 justify-center px-1 py-2 sm:p-3 min-h-[96px] sm:min-h-[112px]">
        {tiles.map((_, i) => (
          <div
            key={i}
            className="w-11 h-20 sm:w-16 sm:h-28 rounded-xl border-2 border-white/5 flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            }}
          >
            <span className="text-white/10 text-2xl">●</span>
          </div>
        ))}
      </div>
    );
  }

  const sorted = sortHand(tiles);

  return (
    <motion.div
      className="flex gap-1 sm:gap-1.5 justify-center px-1 py-2 sm:p-3 overflow-x-auto min-h-[96px] sm:min-h-[112px] items-center"
      layout
    >
      <AnimatePresence>
        {sorted.map((tile) => (
          <motion.div
            key={tile.id}
            layout
            initial={{ opacity: 0, scale: 0.5, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.3, y: -30, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <TileComponent
              tile={tile}
              isDraggable={isCurrentPlayer}
              isInHand
              boardState={boardState}
              onPlay={onPlay}
              onDragEnd={onDragEnd}
              onTap={onTap}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
