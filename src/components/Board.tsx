/**
 * Board.tsx — Tablero de juego premium.
 * Renderiza la cadena de fichas jugadas con layout de serpentina,
 * indicadores de extremos, y un estado vacío visualmente atractivo.
 */
import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlacedTile, BoardState } from '../types';
import { isFirstMove } from '../engine/DominoEngine';
import TileFace from './TileFace';

interface BoardProps {
  chain: PlacedTile[];
  boardState: BoardState;
  isLocalTurn?: boolean;
  highlightEnds?: boolean;
}

/** Dimensiones de cada ficha en el tablero (px) */
const TILE_W = 64;
const TILE_H = 96;
const GAP = 2;

interface LayoutItem {
  x: number;
  y: number;
  rotation: number;
  tile: PlacedTile;
}

function isDouble(tile: PlacedTile) {
  return tile.tile.left === tile.tile.right;
}

function getChainLayout(chain: PlacedTile[]): LayoutItem[] {
  if (chain.length === 0) return [];
  
  const result: LayoutItem[] = [];
  
  // Encontrar el tile central (el primero jugado)
  const centerTile = chain[0];
  const isCenterDouble = isDouble(centerTile);
  
  // El centro siempre en 0,0. Si es doble, va vertical (0 deg), si no, horizontal (-90 deg)
  const centerRotation = isCenterDouble ? 0 : -90;
  result.push({ x: 0, y: 0, rotation: centerRotation, tile: centerTile });

  // Variables de seguimiento para la rama derecha
  let currentRightValue = centerTile.tile.right;
  let currentRightX = isCenterDouble ? TILE_W / 2 + GAP : TILE_H / 2 + GAP;
  
  // Variables de seguimiento para la rama izquierda
  let currentLeftValue = centerTile.tile.left;
  let currentLeftX = isCenterDouble ? -(TILE_W / 2 + GAP) : -(TILE_H / 2 + GAP);

  // Procesar las fichas en orden
  for (let i = 1; i < chain.length; i++) {
    const placed = chain[i];
    const dbl = isDouble(placed);
    
    if (placed.position === 'right') {
      // Determinar si debemos rotar 90 o -90 para que los números coincidan
      let rot = 0;
      if (dbl) {
        rot = 0; // Dobles siempre verticales
      } else {
        // Necesitamos que el número que coincide con currentRightValue esté a la izquierda
        if (placed.tile.left === currentRightValue) {
          rot = -90; // Left (top) goes to left
        } else {
          rot = 90; // Right (bottom) goes to left
        }
      }
      
      const width = dbl ? TILE_W : TILE_H;
      const x = currentRightX + width / 2;
      result.push({ x, y: 0, rotation: rot, tile: placed });
      currentRightX = x + width / 2 + GAP;
      currentRightValue = placed.tile.left === currentRightValue ? placed.tile.right : placed.tile.left;
      
    } else if (placed.position === 'left') {
      let rot = 0;
      if (dbl) {
        rot = 0;
      } else {
        // Necesitamos que el número que coincide con currentLeftValue esté a la derecha
        if (placed.tile.right === currentLeftValue) {
          rot = -90; // Right (bottom) goes to right
        } else {
          rot = 90; // Left (top) goes to right
        }
      }
      
      const width = dbl ? TILE_W : TILE_H;
      const x = currentLeftX - width / 2;
      result.push({ x, y: 0, rotation: rot, tile: placed });
      currentLeftX = x - width / 2 - GAP;
      currentLeftValue = placed.tile.right === currentLeftValue ? placed.tile.left : placed.tile.right;
    }
  }

  return result;
}

export default function Board({
  chain,
  boardState,
  isLocalTurn = false,
  highlightEnds = false,
}: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layout = getChainLayout(chain);
  const boardEmpty = isFirstMove(boardState);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-2xl select-none border border-white/5"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(27, 115, 64, 0.8) 0%, rgba(10, 46, 24, 0.9) 100%)',
      }}
    >
      {/* Patrón de puntos decorativo sobre el tablero */}
      <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />

      {/* Indicador de extremos del tablero */}
      <div className="absolute top-3 left-3 z-10 flex gap-2 items-center glass-panel rounded-xl px-3 py-1.5 text-xs font-mono">
        <span className="text-emerald font-bold">←</span>
        <span className="text-white font-bold">{boardState.leftEnd ?? '—'}</span>
        <span className="text-white/20 mx-0.5">│</span>
        <span className="text-white font-bold">{boardState.rightEnd ?? '—'}</span>
        <span className="text-emerald font-bold">→</span>
      </div>

      {/* Número de fichas en mesa */}
      <div className="absolute top-3 right-3 z-10 glass-panel rounded-xl px-3 py-1.5 text-[10px] text-white/40 font-mono">
        {chain.length} ficha{chain.length !== 1 ? 's' : ''}
      </div>

      {/* Área de drag y zoom para mover el tablero */}
      <motion.div
        drag
        dragConstraints={containerRef}
        dragElastic={0.05}
        dragMomentum={false}
        className="absolute inset-0"
        style={{ cursor: 'grab' }}
        whileTap={{ cursor: 'grabbing' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <div className="relative" style={{ width: 0, height: 0 }}>
            {chain.length === 0 ? (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: 0, top: 0 }}
              >
                <motion.div
                  animate={
                    isLocalTurn
                      ? { scale: [1, 1.03, 1], opacity: [0.5, 0.8, 0.5] }
                      : { opacity: 0.3 }
                  }
                  transition={
                    isLocalTurn
                      ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
                      : { duration: 0.3 }
                  }
                  id="drop-zone-center"
                  className="w-44 h-60 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center gap-3"
                >
                  <motion.span
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-4xl"
                  >
                    🎯
                  </motion.span>
                  <span className="text-white/40 text-xs font-medium text-center px-6 leading-relaxed">
                    {isLocalTurn
                      ? 'Arrastra o toca una ficha para comenzar'
                      : 'Esperando al primer jugador...'}
                  </span>
                </motion.div>
              </div>
            ) : (
              layout.map((item, i) => (
                <motion.div
                  key={item.tile.tile.id}
                  initial={{ scale: 0, opacity: 0, rotate: item.rotation + 180 }}
                  animate={{
                    x: item.x,
                    y: item.y,
                    rotate: item.rotation,
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 280,
                    damping: 24,
                    delay: Math.min(i * 0.02, 0.4),
                  }}
                  className="absolute bg-tile rounded-lg border-2 border-tile-border tile-shadow tile-3d-edge"
                  style={{
                    width: TILE_W,
                    height: TILE_H,
                    marginLeft: -TILE_W / 2,
                    marginTop: -TILE_H / 2,
                  }}
                >
                  <TileFace tile={item.tile.tile} />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Indicadores animados de extremos jugables */}
      <AnimatePresence>
        {highlightEnds && isLocalTurn && !boardEmpty && (
          <>
            <EndHighlight position="left" value={boardState.leftEnd} x="8%" />
            <EndHighlight position="right" value={boardState.rightEnd} x="92%" />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * EndHighlight — Indicador visual de un extremo jugable.
 * Muestra un pulso animado con el valor del extremo.
 */
function EndHighlight({
  position,
  value,
  x,
}: {
  position: 'left' | 'right';
  value: number | null;
  x: string;
}) {
  return (
    <motion.div
      id={`drop-zone-${position}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
      style={{ left: x, transform: 'translate(-50%, -50%)' }}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="w-14 h-24 sm:w-16 sm:h-28 rounded-xl border-2 border-dashed border-emerald/60 bg-emerald/10 flex items-center justify-center backdrop-blur-sm"
      >
        <span className="text-emerald text-2xl font-bold drop-shadow-lg">
          {value ?? '?'}
        </span>
      </motion.div>
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] text-emerald font-bold whitespace-nowrap glass-panel px-2.5 py-0.5 rounded-lg">
        {position === 'left' ? '← IZQ' : 'DER →'}
      </div>
    </motion.div>
  );
}
