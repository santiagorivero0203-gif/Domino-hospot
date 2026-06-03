/**
 * Tile.tsx — Ficha de dominó interactiva premium.
 * Soporta drag & drop con snap a extremos, tap para jugar,
 * e indicadores visuales de jugabilidad con micro-animaciones.
 */
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Tile as TileType, BoardState } from '../types';
import { canPlay, isFirstMove, getPlayableEnds } from '../engine/DominoEngine';
import TileFace from './TileFace';

interface TileProps {
  tile: TileType;
  isDraggable?: boolean;
  isInHand?: boolean;
  boardState?: BoardState;
  onPlay?: (tileId: string, position: 'left' | 'right') => void;
  onDragEnd?: (
    info: {
      point: { x: number; y: number };
      offset: { x: number; y: number };
    },
    tile: TileType
  ) => void;
  onTap?: (tileId: string) => void;
  style?: React.CSSProperties;
}

/** Umbral mínimo de desplazamiento para registrar un drag */
const DRAG_THRESHOLD = 60;

export default function Tile({
  tile,
  isDraggable = false,
  isInHand = false,
  boardState,
  onPlay,
  onDragEnd,
  onTap,
  style,
}: TileProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragOriginRef = useRef({ x: 0, y: 0 });

  /* Cálculos de jugabilidad */
  const boardEmpty = !boardState || isFirstMove(boardState);
  const canPlayLeft = boardState?.leftEnd != null && canPlay(tile, boardState.leftEnd);
  const canPlayRight = boardState?.rightEnd != null && canPlay(tile, boardState.rightEnd);
  const canPlayAny = boardEmpty || canPlayLeft || canPlayRight;

  /** Maneja el final del drag para determinar dónde se juega la ficha */
  const handleDragEnd = (
    _: unknown,
    info: {
      point: { x: number; y: number };
      offset: { x: number; y: number };
    },
  ) => {
    setIsDragging(false);
    if (onDragEnd) {
      onDragEnd(info, tile);
      return;
    }
    if (!boardState || !onPlay) return;

    const { x, y } = info.point;

    if (boardEmpty) {
      const centerElem = document.getElementById('drop-zone-center');
      if (centerElem) {
        const rect = centerElem.getBoundingClientRect();
        const margin = 40;
        if (
          x >= rect.left - margin &&
          x <= rect.right + margin &&
          y >= rect.top - margin &&
          y <= rect.bottom + margin
        ) {
          onPlay(tile.id, 'left');
          return;
        }
      }
      onPlay(tile.id, 'left');
      return;
    }

    const leftElem = document.getElementById('drop-zone-left');
    const rightElem = document.getElementById('drop-zone-right');

    let droppedLeft = false;
    let droppedRight = false;
    const margin = 50;

    if (leftElem && canPlayLeft) {
      const rect = leftElem.getBoundingClientRect();
      if (
        x >= rect.left - margin &&
        x <= rect.right + margin &&
        y >= rect.top - margin &&
        y <= rect.bottom + margin
      ) {
        droppedLeft = true;
      }
    }

    if (rightElem && canPlayRight) {
      const rect = rightElem.getBoundingClientRect();
      if (
        x >= rect.left - margin &&
        x <= rect.right + margin &&
        y >= rect.top - margin &&
        y <= rect.bottom + margin
      ) {
        droppedRight = true;
      }
    }

    if (droppedLeft && droppedRight) {
      const leftRect = leftElem!.getBoundingClientRect();
      const rightRect = rightElem!.getBoundingClientRect();
      const distLeft = Math.hypot(x - (leftRect.left + leftRect.width / 2), y - (leftRect.top + leftRect.height / 2));
      const distRight = Math.hypot(x - (rightRect.left + rightRect.width / 2), y - (rightRect.top + rightRect.height / 2));
      if (distLeft < distRight) {
        onPlay(tile.id, 'left');
      } else {
        onPlay(tile.id, 'right');
      }
    } else if (droppedLeft) {
      onPlay(tile.id, 'left');
    } else if (droppedRight) {
      onPlay(tile.id, 'right');
    } else {
      const dx = info.offset.x;
      if (Math.abs(dx) > DRAG_THRESHOLD) {
        if (dx < 0 && canPlayLeft) onPlay(tile.id, 'left');
        else if (dx > 0 && canPlayRight) onPlay(tile.id, 'right');
      }
    }
  };

  /** Maneja el click/tap para jugar directamente */
  const handleClick = () => {
    if (!isDraggable || !onTap || !canPlayAny) return;
    onTap(tile.id);
  };

  return (
    <motion.div
      layout
      drag={isDraggable && canPlayAny}
      dragElastic={0.12}
      dragMomentum={false}
      onDragStart={(_, info) => {
        dragOriginRef.current = { x: info.point.x, y: info.point.y };
        setIsDragging(true);
      }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.15, zIndex: 100, cursor: 'grabbing' }}
      whileHover={isDraggable && canPlayAny ? { y: -10, scale: 1.05 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      className={`
        relative w-14 h-24 sm:w-16 sm:h-28 bg-tile rounded-xl border-2
        ${isDraggable && canPlayAny ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isDragging
          ? 'border-gold shadow-[0_0_25px_rgba(251,191,36,0.6)] z-50'
          : isDraggable && canPlayAny
            ? 'border-emerald/60 shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:border-emerald hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]'
            : isDraggable 
              ? 'border-white/10 opacity-60 hover:opacity-80' // Fichas en mano no jugables
              : 'border-tile-border/60' // Fichas en el tablero
        }
        tile-shadow tile-3d-edge flex-shrink-0
      `}
      style={style}
    >
      <TileFace tile={tile} />

      {/* Indicadores de jugabilidad */}
      {isDraggable && canPlayAny && !isDragging && (
        <div className="absolute -top-2.5 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {boardEmpty ? (
            <motion.span
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-[8px] bg-emerald text-white px-2 py-0.5 rounded-full font-bold shadow-neon-green"
            >
              JUGAR
            </motion.span>
          ) : (
            <>
              {canPlayLeft && (
                <motion.span
                  animate={{ x: [-1, 1, -1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="text-[9px] bg-emerald/80 text-white w-5 h-5 rounded-full font-bold flex items-center justify-center shadow-neon-green"
                >
                  ←
                </motion.span>
              )}
              {canPlayRight && (
                <motion.span
                  animate={{ x: [1, -1, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="text-[9px] bg-emerald/80 text-white w-5 h-5 rounded-full font-bold flex items-center justify-center shadow-neon-green"
                >
                  →
                </motion.span>
              )}
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
