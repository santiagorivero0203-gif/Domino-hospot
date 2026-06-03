/**
 * GameSetup.tsx — Pantalla de inicio premium.
 * Muestra el menú principal con opciones de Singleplayer y Multijugador
 * usando glassmorphism, gradientes y micro-animaciones.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Bot, Wifi } from 'lucide-react';

interface GameSetupProps {
  onStartSingleplayer: (botCount: number) => void;
  onStartMultiplayer: () => void;
}

/** Variantes de animación para la entrada escalonada de elementos */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function GameSetup({ onStartSingleplayer, onStartMultiplayer }: GameSetupProps) {
  const [botCount, setBotCount] = useState(3);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Patrón decorativo de puntos en el fondo */}
      <div className="absolute inset-0 dot-pattern opacity-50 pointer-events-none" />

      {/* Resplandor ambiental superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center w-full max-w-sm"
      >
        {/* Logo animado con efecto flotante */}
        <motion.div
          variants={itemVariants}
          className="mb-8 text-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-7xl mb-5 drop-shadow-2xl"
          >
            🎲
          </motion.div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-2 drop-shadow-lg">
            Dominoes
          </h1>
          <h1 className="text-3xl font-bold text-gradient-gold tracking-widest mb-3">
            HOTSPOT
          </h1>
          <p className="text-white/40 text-sm font-light tracking-wider">
            Doble Seis · Offline · P2P
          </p>
        </motion.div>

        {/* Botón de Singleplayer con glassmorphism */}
        <motion.div variants={itemVariants} className="w-full mb-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onStartSingleplayer(botCount)}
            className="w-full btn-emerald flex items-center gap-4 group"
          >
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
              <Bot className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <p className="text-lg font-bold">Singleplayer</p>
              <p className="text-xs text-white/60 font-normal">vs {botCount} bots con IA</p>
            </div>
            <Play className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </motion.div>

        {/* Selector de cantidad de bots */}
        <motion.div variants={itemVariants} className="flex gap-2 justify-center mb-5">
          {[1, 2, 3].map((n) => (
            <motion.button
              key={n}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setBotCount(n)}
              className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                botCount === n
                  ? 'bg-emerald/20 text-emerald border border-emerald/40 shadow-neon-green'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {n} Bot{n > 1 ? 's' : ''}
            </motion.button>
          ))}
        </motion.div>

        {/* Botón de Multijugador LAN con glassmorphism */}
        <motion.div variants={itemVariants} className="w-full mb-6">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartMultiplayer}
            className="w-full btn-indigo flex items-center gap-4 group"
          >
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="text-left flex-1">
              <p className="text-lg font-bold">Multijugador LAN</p>
              <p className="text-xs text-white/60 font-normal">P2P vía WebRTC + QR</p>
            </div>
            <Users className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </motion.div>

        {/* Footer con badges de tecnología */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 text-white/20 text-[10px] uppercase tracking-widest"
        >
          <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> Offline</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> PWA</span>
          <span>·</span>
          <span>v0.6</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
