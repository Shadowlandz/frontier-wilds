// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Landing Page
// ═══════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';

export default function Landing() {
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    { icon: '🌍', title: 'Mundo Aberto', desc: 'Explore florestas, cavernas, ruínas e montanhas em um mapa procedural.' },
    { icon: '⚔️', title: 'Combate em Tempo Real', desc: 'Esquive, ataque, use habilidades e derrote chefes épicos.' },
    { icon: '🔨', title: 'Crafting Completo', desc: 'Forje armas, armaduras, ferramentas e poções com centenas de receitas.' },
    { icon: '🌾', title: 'Agricultura & Pesca', desc: 'Plante, regue, colha e pesque em diferentes biomas.' },
    { icon: '📈', title: 'Progressão Profunda', desc: 'Sistema de níveis, árvore de habilidades e equipamentos raros.' },
    { icon: '🌙', title: 'Ciclo Dia/Noite', desc: 'Esteções, clima e ciclo dia/noite afetam a gameplay.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1a0a] via-[#0d2010] to-[#051005] text-white overflow-hidden relative">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 2 + Math.random() * 4,
              height: 2 + Math.random() * 4,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: ['#4caf50', '#ff9800', '#2196f3', '#ffd700'][i % 4],
              opacity: 0.15 + Math.random() * 0.15,
            }}
            animate={{
              y: [0, -30 - Math.random() * 40, 0],
              opacity: [0.1, 0.4, 0.1],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-4"
        >
          <div className="text-6xl mb-4">🌾⚔️🪓</div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-green-400 via-amber-400 to-red-400 bg-clip-text text-transparent">
              FARM
            </span>
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
              SURVIVAL
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-green-300/60 text-lg mt-4 max-w-md mx-auto"
          >
            Sobreviva. Explore. Forje. Evolua.
          </motion.p>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
          className="mb-12"
        >
          <button
            onClick={() => navigate('/game')}
            className="group relative px-12 py-4 bg-gradient-to-r from-green-600 to-green-500 rounded-2xl text-xl font-black text-white shadow-2xl shadow-green-500/30 hover:shadow-green-400/50 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <span className="relative z-10">🎮 JOGAR</span>
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </button>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto mb-12"
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1, duration: 0.4 }}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-default ${
                hoveredFeature === i
                  ? 'border-green-400/50 bg-green-900/30 scale-105'
                  : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-sm font-bold text-white/90">{f.title}</div>
              <div className="text-[11px] text-white/40 mt-0.5">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Controls hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-white/20 text-xs text-center space-y-1"
        >
          <div>WASD mover · E coletar/interagir · Q/Clique atacar · I inventário · C craft</div>
          <div className="text-white/10">Use tocha nas cavernas • Cuidado à noite!</div>
        </motion.div>
      </div>
    </div>
  );
}
