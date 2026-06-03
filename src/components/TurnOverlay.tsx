/**
 * TurnOverlay.tsx — Overlay de transición de turno premium.
 * Se muestra entre turnos con animaciones suaves, desenfoque
 * y un countdown visual elegante.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Play, Trophy } from 'lucide-react';

interface TurnOverlayProps {
  playerName: string;
  onReady?: () => void;
  show: boolean;
  isFirstPlayer?: boolean;
  autoHide?: boolean;
  autoHideMs?: number;
}

export default function TurnOverlay({
  playerName,
  onReady,
  show,
  isFirstPlayer = false,
  autoHide = false,
  autoHideMs = 1500,
}: TurnOverlayProps) {
  const [countdown, setCountdown] = useState(3);
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (!show) return;

    if (autoHide) {
      const t = setTimeout(() => setVisible(false), autoHideMs);
      return () => clearTimeout(t);
    }

    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 800);
    return () => clearInterval(timer);
  }, [show, autoHide, autoHideMs]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            className="glass-panel-strong rounded-3xl p-8 text-center max-w-sm mx-4"
          >
            {isFirstPlayer ? (
              <>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="inline-block mb-4"
                >
                  <Trophy className="w-12 h-12 text-gold" />
                </motion.div>
                <h2 className="text-white text-2xl font-bold mb-2">¡A jugar!</h2>
                <p className="text-white/50 text-sm mb-5 font-light">
                  Coloca la primera ficha en el tablero
                </p>
                {onReady && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onReady}
                    className="btn-emerald text-lg px-10"
                  >
                    Empezar
                  </motion.button>
                )}
              </>
            ) : (
              <>
                <h2 className="text-white/60 text-sm font-medium uppercase tracking-widest mb-2">
                  Turno de
                </h2>
                <p className="text-gradient-gold text-3xl font-extrabold mb-5">
                  {playerName}
                </p>
                <div className="flex items-center justify-center gap-3 mb-5 text-white/30 text-sm">
                  <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                  <span className="font-light">Preparando turno</span>
                  <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1 }}>
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </div>
                {countdown > 0 ? (
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl font-extrabold text-gradient-emerald"
                  >
                    {countdown}
                  </motion.div>
                ) : (
                  onReady && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onReady}
                      className="btn-emerald text-sm"
                    >
                      Estoy listo
                    </motion.button>
                  )
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
