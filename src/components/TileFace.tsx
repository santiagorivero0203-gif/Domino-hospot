/**
 * TileFace.tsx — Cara visual de una ficha de dominó.
 * Dibuja toda la ficha (ambas caras, línea divisoria y pips) dentro
 * de un único elemento SVG para máxima eficiencia y evitar problemas
 * de cálculo o re-flow del navegador al arrastrarla.
 */
import type { Tile } from '../types';

/** Posiciones de los pips (puntos) en una cuadrícula de 60x50 para cada mitad */
const pipPositions: Record<number, [number, number][]> = {
  0: [],
  1: [[30, 25]],
  2: [
    [16, 13],
    [44, 37],
  ],
  3: [
    [16, 13],
    [30, 25],
    [44, 37],
  ],
  4: [
    [16, 13],
    [44, 13],
    [16, 37],
    [44, 37],
  ],
  5: [
    [16, 13],
    [44, 13],
    [30, 25],
    [16, 37],
    [44, 37],
  ],
  6: [
    [16, 12],
    [44, 12],
    [16, 25],
    [44, 25],
    [16, 38],
    [44, 38],
  ],
};

interface TileFaceProps {
  tile: Tile;
  side?: 'left' | 'right';
  className?: string;
}

export default function TileFace({ tile, side, className = '' }: TileFaceProps) {
  // Pips para la mitad superior (left/top)
  const leftPips = pipPositions[tile.left] ?? [];
  // Pips para la mitad inferior (right/bottom)
  const rightPips = pipPositions[tile.right] ?? [];

  return (
    <svg
      viewBox="0 0 60 100"
      className={`w-full h-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradiente radial premium para puntos 3D */}
        <radialGradient id="pipGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#4a4a60" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </radialGradient>
        {/* Sombra interna para efecto tallado */}
        <filter id="pipInset" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.4" floodColor="#ffffff" floodOpacity="0.3" />
          <feDropShadow dx="0" dy="-0.5" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Renderizado de la mitad superior (izquierda) */}
      {(!side || side === 'left') && (
        <g id="top-half">
          {leftPips.map(([px, py], i) => (
            <circle
              key={`left-${i}`}
              cx={px}
              cy={py}
              r="4.5"
              fill="url(#pipGrad)"
              filter="url(#pipInset)"
            />
          ))}
        </g>
      )}

      {/* Línea divisoria central */}
      {!side && (
        <line
          x1="6"
          y1="50"
          x2="54"
          y2="50"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}

      {/* Renderizado de la mitad inferior (derecha) */}
      {(!side || side === 'right') && (
        <g id="bottom-half">
          {rightPips.map(([px, py], i) => (
            <circle
              key={`right-${i}`}
              cx={px}
              cy={py + 50} // Desplazado a la mitad inferior
              r="4.5"
              fill="url(#pipGrad)"
              filter="url(#pipInset)"
            />
          ))}
        </g>
      )}
    </svg>
  );
}

