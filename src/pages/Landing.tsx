// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Landing Page (Pixel Art Main Menu)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';

export default function Landing() {
  const navigate = useNavigate();
  const [tipIndex, setTipIndex] = useState(0);
  const [fireFrame, setFireFrame] = useState(0);

  const tips = [
    'Explore cavernas para encontrar recursos raros e valiosos.',
    'Use tocha para iluminar cavernas escuras — sem ela, não vê nada!',
    'Combine recursos na bancada de trabalho para criar equipamentos poderosos.',
    'Dentro da zona segura (círculo verde), inimigos não podem atacar.',
    'Regue suas plantações para crescerem mais rápido!',
    'À noite, inimigos são mais agressivos — tenha cuidado!',
    'Derrote inimigos para ganhar XP e ouro.',
    'Visite o ferreiro para melhorar seus equipamentos na forja.',
    'Plante sementes na vila para produzir comida e ingredientes.',
    'Combine diferentes materiais para descobrir novas receitas de craft.',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const anim = setInterval(() => setFireFrame(f => (f + 1) % 8), 120);
    return () => clearInterval(anim);
  }, []);

  const controls = [
    { keys: ['W', 'A', 'S', 'D'], action: 'Movimentar' },
    { keys: ['Mouse'], action: 'Atacar' },
    { keys: ['E'], action: 'Interagir' },
    { keys: ['Espaço'], action: 'Rolar/Esquivar' },
    { keys: ['Shift'], action: 'Correr' },
    { keys: ['I'], action: 'Inventário' },
    { keys: ['C'], action: 'Craft' },
    { keys: ['M'], action: 'Mapa' },
    { keys: ['ESC'], action: 'Menu' },
  ];

  const fireEmojis = ['🔥', '🔥', '🔥', '🔥', '🔥', '🔥', '🔥', '🔥'];

  return (
    <div className="w-screen h-screen overflow-hidden relative select-none" style={{ fontFamily: 'monospace' }}>
      {/* ── Background: Forest/Mountain Landscape ── */}
      <div className="absolute inset-0">
        {/* Sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a3a5c] via-[#2d5a2d] to-[#0d1f0d]" />

        {/* Mountains layer 1 (far) */}
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 400" preserveAspectRatio="none" style={{ height: '70%' }}>
          <polygon points="0,400 0,280 80,200 160,260 240,180 320,240 400,160 480,220 560,140 640,200 720,120 800,180 880,100 960,160 1040,120 1120,180 1200,140 1200,400" fill="#1a4a1a" opacity="0.7" />
          <polygon points="0,400 0,300 100,230 200,280 300,200 400,260 500,190 600,250 700,180 800,230 900,170 1000,220 1100,180 1200,200 1200,400" fill="#1d5a2a" opacity="0.8" />
        </svg>

        {/* Trees layer */}
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 300" preserveAspectRatio="none" style={{ height: '45%' }}>
          {/* Tree trunks and canopies */}
          {[50, 120, 200, 310, 400, 520, 630, 750, 860, 980, 1080, 1150].map((x, i) => {
            const h = 80 + (i % 3) * 30;
            const w = 30 + (i % 2) * 15;
            return (
              <g key={i}>
                <rect x={x + w/2 - 4} y={300 - h} width={8} height={h * 0.4} fill="#3a2010" />
                <polygon points={`${x},${300 - h + 10} ${x + w/2},${300 - h - 20} ${x + w},${300 - h + 10}`} fill="#1a5a1a" />
                <polygon points={`${x + 3},${300 - h + 25} ${x + w/2},${300 - h} ${x + w - 3},${300 - h + 25}`} fill="#2a7a2a" />
              </g>
            );
          })}
        </svg>

        {/* Ground */}
        <div className="absolute bottom-0 w-full h-[35%] bg-gradient-to-t from-[#2a1a0a] via-[#1a3010] to-[#0d2a0d]" />

        {/* Path/Trail */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-[25%] bg-gradient-to-t from-[#8a7a50] via-[#6a5a3a] to-transparent opacity-60" style={{ clipPath: 'polygon(35% 100%, 65% 100%, 55% 0%, 45% 0%)' }} />

        {/* Waterfall on right */}
        <div className="absolute right-[15%] top-[15%] w-1 h-20 bg-gradient-to-b from-[#4a8acc] to-[#2a5a9a] opacity-50" />
        <div className="absolute right-[14.5%] top-[35%] w-3 h-8 bg-[#3a7aba] opacity-30 rounded-full blur-sm" />

        {/* Fireflies */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 3,
              height: 3,
              left: `${10 + (i * 7) % 80}%`,
              bottom: `${10 + (i * 11) % 30}%`,
              backgroundColor: '#aaff44',
              boxShadow: '0 0 6px 2px rgba(170, 255, 68, 0.4)',
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              x: [0, (i % 2 === 0 ? 8 : -8), 0],
              y: [0, -5, 0],
            }}
            transition={{
              duration: 2 + (i % 3),
              repeat: Infinity,
              delay: i * 0.3,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Vine border decorations */}
        <div className="absolute top-0 left-0 w-full h-8 pointer-events-none">
          <div className="flex justify-between px-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="text-green-700 opacity-40" style={{ fontSize: '12px' }}>🌿</span>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-8 pointer-events-none">
          <div className="flex justify-between px-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="text-green-700 opacity-40" style={{ fontSize: '12px' }}>🌿</span>
            ))}
          </div>
        </div>
        <div className="absolute top-0 left-0 h-full w-8 pointer-events-none">
          <div className="flex flex-col justify-between py-2 items-center">
            {Array.from({ length: 15 }).map((_, i) => (
              <span key={i} className="text-green-700 opacity-40" style={{ fontSize: '12px' }}>🌿</span>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 h-full w-8 pointer-events-none">
          <div className="flex flex-col justify-between py-2 items-center">
            {Array.from({ length: 15 }).map((_, i) => (
              <span key={i} className="text-green-700 opacity-40" style={{ fontSize: '12px' }}>🌿</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content Layer ── */}
      <div className="relative z-10 w-full h-full flex flex-col">

        {/* ── Title Area ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pt-4">
          {/* Icon Row */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl mb-2 tracking-widest"
          >
            🌾 ⚔️ 🪓
          </motion.div>

          {/* Game Title */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center mb-2"
          >
            <h1 className="leading-none">
              <span
                className="block text-5xl md:text-7xl font-black tracking-wider"
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#f5c842',
                  textShadow: '3px 3px 0 #8a5a10, 6px 6px 0 rgba(0,0,0,0.3), 0 0 20px rgba(245,200,66,0.3)',
                  letterSpacing: '8px',
                }}
              >
                FARM
              </span>
              <span
                className="block text-6xl md:text-8xl font-black tracking-wider"
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#d4a830',
                  textShadow: '3px 3px 0 #6a4a08, 6px 6px 0 rgba(0,0,0,0.4), 0 0 30px rgba(212,168,48,0.2)',
                  letterSpacing: '10px',
                  marginTop: '-8px',
                }}
              >
                SURVIVAL
              </span>
            </h1>
          </motion.div>

          {/* Tagline on wooden scroll */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mb-6 px-8 py-2 rounded-lg border-2 border-amber-800/60"
            style={{
              background: 'linear-gradient(180deg, #5a3a1a 0%, #3a2a10 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <p className="text-amber-200/80 text-sm md:text-base tracking-[0.25em] font-bold">
              SOBREVIVA. EXPLORE. FORJE. EVOLUA.
            </p>
          </motion.div>

          {/* ── Main Play Button ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
          >
            <button
              onClick={() => navigate('/game')}
              className="group relative px-14 py-4 rounded-xl text-xl font-black text-white transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(180deg, #4a8a2a 0%, #2a6a1a 50%, #1a5a0a 100%)',
                border: '3px solid #3a6a1a',
                boxShadow: '0 4px 0 #1a4a08, 0 6px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              <span className="flex items-center gap-3">
                <span className="text-lg">⚔️</span>
                <span className="tracking-widest">JOGAR</span>
                <span className="text-lg">⚔️</span>
              </span>
            </button>
          </motion.div>
        </div>

        {/* ── Bottom Area: Campfire + Panels ── */}
        <div className="relative w-full pb-0">
          {/* Campfire + Tent Scene */}
          <div className="flex justify-center items-end mb-2 relative">
            {/* Tent */}
            <div className="absolute left-1/2 -translate-x-[140px] bottom-4">
              <div className="relative">
                <div className="w-0 h-0 border-l-[40px] border-r-[40px] border-b-[50px] border-l-transparent border-r-transparent border-b-[#8a7a5a]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-5 bg-[#6a5a3a] rounded-t-lg" />
              </div>
            </div>

            {/* Campfire */}
            <div className="flex flex-col items-center mb-1">
              {/* Fire */}
              <div className="text-3xl mb-0" style={{ filter: 'drop-shadow(0 0 12px rgba(255,150,50,0.6))' }}>
                {fireEmojis[fireFrame]}
              </div>
              {/* Logs */}
              <div className="text-xl -mt-1">🪵</div>
              {/* Sparks */}
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 2,
                    height: 2,
                    backgroundColor: '#ffaa33',
                    bottom: `${60 + i * 5}px`,
                  }}
                  animate={{
                    y: [0, -15 - i * 5],
                    x: [(i - 1.5) * 6, (i - 1.5) * 12],
                    opacity: [0.8, 0],
                  }}
                  transition={{
                    duration: 0.8 + i * 0.2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Side Panels Row ── */}
          <div className="flex w-full items-end px-4 pb-2 gap-4">
            {/* ── Left Panel: Controls ── */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="w-56 flex-shrink-0 rounded-lg p-3 border-2 border-amber-900/60"
              style={{
                background: 'linear-gradient(180deg, #3a2a15 0%, #2a1a0a 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.6)',
              }}
            >
              <h3 className="text-center text-amber-300 font-bold text-sm mb-2 tracking-wider"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                COMANDOS
              </h3>

              <div className="space-y-1.5">
                {controls.map((ctrl, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {ctrl.keys.map((key, ki) => (
                        <span
                          key={ki}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white/90 min-w-[24px] text-center"
                          style={{
                            background: 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 100%)',
                            border: '1px solid #666',
                            boxShadow: '0 2px 0 #222, inset 0 1px 0 rgba(255,255,255,0.15)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                    <span className="text-white/60 text-[10px]">–</span>
                    <span className="text-white/70 text-[10px]">{ctrl.action}</span>
                  </div>
                ))}
              </div>

              {/* Tip at bottom of controls panel */}
              <div className="mt-3 pt-2 border-t border-amber-900/40">
                <p className="text-amber-400/70 text-[9px] leading-tight">
                  <span className="font-bold text-amber-300/80">DICA:</span> Combine recursos para criar itens poderosos!
                </p>
              </div>
            </motion.div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* ── Right Panel: Menu Buttons ── */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="w-48 flex-shrink-0 rounded-lg p-3 border-2 border-amber-900/60 space-y-2"
              style={{
                background: 'linear-gradient(180deg, #3a2a15 0%, #2a1a0a 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.6)',
              }}
            >
              {[
                { icon: '⚙️', label: 'CONFIGURAÇÕES' },
                { icon: '📖', label: 'CRÉDITOS' },
                { icon: '🏆', label: 'SAIR' },
              ].map((btn, i) => (
                <button
                  key={i}
                  className="w-full py-2 px-3 rounded-lg text-left text-white/80 text-xs font-bold tracking-wide flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'linear-gradient(180deg, #5a4a30 0%, #3a2a18 100%)',
                    border: '2px solid #6a5a40',
                    boxShadow: '0 3px 0 #2a1a08, inset 0 1px 0 rgba(255,255,255,0.1)',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  <span className="text-base">{btn.icon}</span>
                  <span>{btn.label}</span>
                </button>
              ))}
            </motion.div>
          </div>

          {/* ── Bottom Tip Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="w-full px-6 pb-4"
          >
            <div
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 border-amber-900/50 max-w-2xl mx-auto"
              style={{
                background: 'linear-gradient(180deg, #3a2a15 0%, #2a1a0a 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              <span className="text-green-400 text-lg">🌱</span>
              <span className="text-amber-400 font-bold text-xs tracking-wide whitespace-nowrap">DICA DO DIA:</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={tipIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-white/60 text-xs flex-1"
                >
                  {tips[tipIndex]}
                </motion.span>
              </AnimatePresence>

              {/* Page dots */}
              <div className="flex gap-1">
                {tips.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                      i === tipIndex ? 'bg-green-500' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>

              {/* Nav arrows */}
              <button
                onClick={() => setTipIndex(prev => (prev - 1 + tips.length) % tips.length)}
                className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                style={{
                  background: 'linear-gradient(180deg, #5a4a30 0%, #3a2a18 100%)',
                  border: '1px solid #6a5a40',
                }}
              >
                ◀
              </button>
              <button
                onClick={() => setTipIndex(prev => (prev + 1) % tips.length)}
                className="w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                style={{
                  background: 'linear-gradient(180deg, #5a4a30 0%, #3a2a18 100%)',
                  border: '1px solid #6a5a40',
                }}
              >
                ▶
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
