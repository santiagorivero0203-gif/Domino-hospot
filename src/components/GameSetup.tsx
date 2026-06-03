import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Bot, Wifi } from 'lucide-react';
import type { GameOptions } from '../types';

interface GameSetupProps {
  onStartSingleplayer: (botCount: number, options: GameOptions) => void;
  onStartMultiplayer: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function GameSetup({ onStartSingleplayer, onStartMultiplayer }: GameSetupProps) {
  const [playerName, setPlayerName] = useState('');
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [targetScore, setTargetScore] = useState<number>(100);

  const scoreOptions = [100, 120, 140, 160, 200];

  const handleStart = () => {
    // Si es modo equipos, forzamos a 3 bots para hacer 4 jugadores (2v2)
    const botCount = isTeamMode ? 3 : 3; 
    onStartSingleplayer(botCount, {
      playerName: playerName.trim() || 'Tú',
      isTeamMode,
      targetScore,
    });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      <div className="absolute inset-0 dot-pattern opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center w-full max-w-sm mt-8 pb-12"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="mb-6 text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-6xl mb-3 drop-shadow-2xl"
          >
            🎲
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1 drop-shadow-lg">
            Dominoes
          </h1>
          <h1 className="text-2xl font-bold text-gradient-gold tracking-widest">
            HOTSPOT
          </h1>
        </motion.div>

        {/* Configuración de Partida */}
        <motion.div variants={itemVariants} className="w-full glass-panel rounded-2xl p-5 mb-6 flex flex-col gap-5">
          
          {/* Nombre */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
              👤 Tu Nombre
            </label>
            <input
              type="text"
              placeholder="Ej: Santiago"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald/50 transition-all"
            />
          </div>

          {/* Modalidad: Individual vs Equipos */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
              <Users className="w-4 h-4" /> Modalidad
            </label>
            <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setIsTeamMode(false)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  !isTeamMode ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/70'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setIsTeamMode(true)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  isTeamMode ? 'bg-emerald/20 text-emerald border border-emerald/30 shadow-neon-green' : 'text-white/40 hover:text-white/70'
                }`}
              >
                Equipos (2v2)
              </button>
            </div>
            {isTeamMode && (
              <p className="text-[10px] text-emerald/80 mt-2 text-center">Jugarás en pareja con el Bot de enfrente.</p>
            )}
          </div>

          {/* Límite de Puntos */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
              🎯 Meta de Puntos
            </label>
            <div className="flex flex-wrap gap-2 justify-center">
              {scoreOptions.map((score) => (
                <button
                  key={score}
                  onClick={() => setTargetScore(score)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    targetScore === score
                      ? 'bg-gold/20 text-gold border border-gold/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                      : 'bg-black/40 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/70'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Botones de Acción */}
        <motion.div variants={itemVariants} className="w-full flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="w-full btn-emerald flex items-center justify-between px-4 py-3 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                <Bot className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-base font-bold leading-tight">Jugar con Bots</p>
                <p className="text-[11px] text-white/60 font-normal">Offline con IA</p>
              </div>
            </div>
            <Play className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartMultiplayer}
            className="w-full btn-indigo flex items-center justify-between px-4 py-3 group opacity-80 hover:opacity-100"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                <Wifi className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-base font-bold leading-tight">LAN P2P</p>
                <p className="text-[11px] text-white/60 font-normal">Multijugador local</p>
              </div>
            </div>
            <Users className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
