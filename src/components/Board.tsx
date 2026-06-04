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
  /** Si el jugador está arrastrando una ficha — activa el ghost en las zonas */
  isDraggingTile?: boolean;
}

/** Dimensiones de cada ficha en el tablero (px) — reducidas para mayor zoom out */
const TILE_W = 44;
const TILE_H = 68;
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
  isDraggingTile = false,
}: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layout = getChainLayout(chain);
  const boardEmpty = isFirstMove(boardState);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-[24px] sm:rounded-[36px] select-none border-[12px] sm:border-[20px] border-[#3e2723]"
      style={{
        background: '#1b4d3e', // Classic casino green felt
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.5)',
      }}
    >
      {/* Textura de paño (fieltro) */}
      <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />

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

      {/* Indicadores animados de extremos jugables con ghost tile */}
      <AnimatePresence>
        {highlightEnds && isLocalTurn && !boardEmpty && (
          <>
            <EndHighlight position="left" value={boardState.leftEnd} showGhost={isDraggingTile} />
            <EndHighlight position="right" value={boardState.rightEnd} showGhost={isDraggingTile} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * EndHighlight — Indicador visual de un extremo jugable.
 * En modo arrastre muestra un "fantasma" (ghost) de ficha semi-transparente
 * para que el jugador sepa exactamente dónde caerá la pieza.
 */
function EndHighlight({
  position,
  value,
  showGhost = false,
}: {
  position: 'left' | 'right';
  value: number | null;
  showGhost?: boolean;
}) {
  const isLeft = position === 'left';

  return (
    <motion.div
      id={`drop-zone-${position}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${
        isLeft ? 'left-2 sm:left-6' : 'right-2 sm:right-6'
      }`}
    >
      {showGhost ? (
        /* Ghost tile: ficha fantasma semi-transparente con el número del extremo */
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.55, 0.8, 0.55] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
          className="relative flex flex-col items-center justify-around rounded-lg border-2 border-dashed border-emerald bg-white/15 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.5)]"
          style={{ width: TILE_W, height: TILE_H }}
        >
          {/* Línea divisoria central */}
          <div className="absolute left-[15%] right-[15%] h-[2px] bg-emerald/50 top-1/2 -translate-y-1/2 rounded-full" />
          {/* Mitad superior: número del extremo */}
          <span className="text-emerald font-black text-lg drop-shadow-lg z-10" style={{ marginTop: 4 }}>
            {value ?? '?'}
          </span>
          {/* Mitad inferior: punto de interrogación */}
          <span className="text-white/50 font-bold text-lg z-10" style={{ marginBottom: 4 }}>?</span>
        </motion.div>
      ) : (
        /* Estado normal: solo un borde punteado pulsante */
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="rounded-xl border-2 border-dashed border-emerald/60 bg-emerald/8 flex items-center justify-center backdrop-blur-sm"
          style={{ width: TILE_W, height: TILE_H }}
        >
          <span className="text-emerald text-xl font-bold drop-shadow-lg">
            {value ?? '?'}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
