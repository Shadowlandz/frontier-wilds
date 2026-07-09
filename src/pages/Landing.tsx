// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Landing Page (Professional Pixel Art Menu)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';

const PIXEL_FRAME = 'inset 0 0 0 6px #2a1a0a, inset 0 0 0 10px #1a0f05, inset 0 0 0 14px #0d0802';

export default function Landing() {
  const navigate = useNavigate();
  const [tipIndex, setTipIndex] = useState(0);
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

  const tips = [
    'Explore cavernas para encontrar minérios raros e valiosos.',
    'Use tochas para iluminar cavernas escuras — essencial para sobreviver!',
    'Combine recursos na bancada para criar equipamentos poderosos.',
    'Na zona segura (círculo verde), inimigos não podem atacar você.',
    'Regue suas plantações para colher mais rápido!',
    'À noite os inimigos ficam mais agressivos — fique atento.',
    'Derrote inimigos para ganhar XP, ouro e itens raros.',
    'Visite o ferreiro na vila para melhorar seus equipamentos.',
    'Cultive alimentos para manter sua fome e stamina sempre altas.',
    'Descubra receitas novas combinando materiais inusitados.',
  ];

  useEffect(() => {
    const t = setInterval(() => setTipIndex(p => (p + 1) % tips.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Fireplace sparks
  useEffect(() => {
    const spawn = () => {
      setSparks(prev => [
        ...prev.slice(-10),
        { id: Date.now() + Math.random(), x: (Math.random() - 0.5) * 40, y: 0, delay: Math.random() * 0.3 },
      ]);
    };
    const i = setInterval(spawn, 400);
    return () => clearInterval(i);
  }, []);

  const controls = [
    { keys: ['W', 'A', 'S', 'D'], action: 'Movimentar' },
    { keys: ['E'], action: 'Interagir / Colher' },
    { keys: ['Q'], action: 'Atacar' },
    { keys: ['Espaço'], action: 'Rolar / Esquivar' },
    { keys: ['Shift'], action: 'Correr' },
    { keys: ['I'], action: 'Inventário' },
    { keys: ['C'], action: 'Crafting' },
    { keys: ['P'], action: 'Plantar / Cultivar' },
    { keys: ['M'], action: 'Mapa-múndi' },
    { keys: ['K'], action: 'Habilidades' },
    { keys: ['H'], action: 'Salvar / Carregar' },
  ];

  return (
    <div className="w-screen h-screen overflow-hidden relative select-none bg-[#0a0f05] font-mono">
      {/* ================================================================
           FULLSCREEN BACKGROUND — MOUNTAIN LANDSCAPE
           ================================================================ */}
      <div className="absolute inset-0">
        {/* Deep sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a2e] via-[#0e2a1a] to-[#0d1f0d]" />

        {/* Stars */}
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 23 + 7) % 55}%`,
              width: 1 + (i % 3),
              height: 1 + (i % 3),
              backgroundColor: '#fff',
              opacity: 0.3 + (i % 4) * 0.15,
            }}
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 2 + (i % 5), repeat: Infinity, delay: i * 0.2 }}
          />
        ))}

        {/* Moon */}
        <motion.div
          className="absolute rounded-full"
          style={{
            right: '12%',
            top: '8%',
            width: 50,
            height: 50,
            background: 'radial-gradient(circle at 35% 35%, #f5f0d0, #d4c89a)',
            boxShadow: '0 0 40px rgba(245,240,200,0.3), 0 0 80px rgba(245,240,200,0.1)',
          }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Mountain silhouettes */}
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 500" preserveAspectRatio="none" style={{ height: '65%' }}>
          {/* Far mountains */}
          <path d="M0,500 L0,340 L80,280 L170,330 L250,260 L340,310 L420,230 L510,290 L600,210 L700,270 L790,190 L880,250 L960,170 L1050,230 L1150,190 L1200,220 L1200,500 Z" fill="#111d11" opacity="0.6" />
          <path d="M0,500 L0,360 L100,300 L190,350 L280,280 L370,330 L460,260 L550,310 L640,240 L730,290 L820,220 L910,270 L1000,210 L1090,260 L1200,230 L1200,500 Z" fill="#132213" opacity="0.7" />
          {/* Mid mountains */}
          <path d="M0,500 L0,380 L120,320 L220,370 L320,300 L420,350 L520,280 L620,330 L720,260 L820,310 L920,250 L1020,300 L1120,260 L1200,290 L1200,500 Z" fill="#162a16" opacity="0.8" />
          <path d="M0,500 L0,400 L80,350 L180,390 L280,340 L380,380 L480,320 L580,360 L680,300 L780,340 L880,290 L980,340 L1080,300 L1200,340 L1200,500 Z" fill="#1a3a1a" opacity="0.85" />
          {/* Forest canopy layer */}
          <path d="M0,500 L0,420 L60,400 L140,410 L220,390 L300,405 L380,380 L460,395 L540,370 L620,390 L700,365 L780,385 L860,360 L940,380 L1020,365 L1100,385 L1200,370 L1200,500 Z" fill="#1d4a1a" opacity="0.9" />
          {/* Ground */}
          <rect x="0" y="430" width="1200" height="70" fill="#1a3010" />
        </svg>

        {/* Ground gradient */}
        <div className="absolute bottom-0 w-full h-[30%] bg-gradient-to-t from-[#0d1a08] via-[#1a3010] to-[#1a3a15]" />

        {/* Tree silhouettes */}
        {[5, 12, 22, 32, 42, 55, 68, 78, 85, 95].map((pct, i) => {
          const h = 60 + (i % 3) * 40;
          const w = 18 + (i % 2) * 12;
          const left = `${pct}%`;
          return (
            <div key={i} className="absolute bottom-[28%]" style={{ left, width: w }}>
              <div className="mx-auto w-2 h-8 bg-[#1a0d05]" style={{ marginTop: `${h - 8}px` }} />
              <div className="mx-auto rounded-full bg-[#0d2a0d] opacity-80" style={{
                width: w + 10,
                height: h * 0.7,
                marginTop: -h * 0.7,
                clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              }} />
            </div>
          );
        })}

        {/* Fireflies */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${8 + (i * 13 + 5) % 84}%`,
              bottom: `${18 + (i * 7) % 25}%`,
              width: 2 + (i % 2),
              height: 2 + (i % 2),
              backgroundColor: '#ccff66',
              boxShadow: '0 0 6px 3px rgba(200,255,100,0.3)',
            }}
            animate={{
              opacity: [0.1, 0.7, 0.1],
              y: [0, -4 - (i % 6), 0],
              x: [0, (i % 2 ? 6 : -6), 0],
            }}
            transition={{
              duration: 3 + (i % 4),
              repeat: Infinity,
              delay: i * 0.35,
            }}
          />
        ))}
      </div>

      {/* ================================================================
           PIXEL-ART BORDER FRAME
           ================================================================ */}
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: PIXEL_FRAME }} />
      {/* Corner decorations */}
      <div className="absolute top-3 left-3 text-xl pointer-events-none opacity-60">🌿</div>
      <div className="absolute top-3 right-3 text-xl pointer-events-none opacity-60 rotate-90 scale-x-[-1]">🌿</div>
      <div className="absolute bottom-3 left-3 text-xl pointer-events-none opacity-60 rotate-[-90deg] scale-y-[-1]">🌿</div>
      <div className="absolute bottom-3 right-3 text-xl pointer-events-none opacity-60 rotate-180">🌿</div>
      {/* Top/Bottom vine borders */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-900 via-green-800 to-green-900 pointer-events-none" />
      <div className="absolute top-2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-600/30 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-green-900 via-green-800 to-green-900 pointer-events-none" />
      <div className="absolute bottom-2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-600/30 to-transparent pointer-events-none" />
      {/* Side borders */}
      <div className="absolute top-0 left-0 h-full w-2 bg-gradient-to-b from-green-900 via-green-800 to-green-900 pointer-events-none" />
      <div className="absolute top-0 right-0 h-full w-2 bg-gradient-to-b from-green-900 via-green-800 to-green-900 pointer-events-none" />

      {/* ================================================================
           CONTENT
           ================================================================ */}
      <div className="relative z-10 w-full h-full flex flex-col">

        {/* ──── MAIN AREA ──── */}
        <div className="flex-1 flex flex-col items-center justify-center px-3 pt-12">
          {/* === LOGO === */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-center mb-0"
          >
            {/* Decorative line above logo */}
            <div className="flex items-center justify-center gap-3 mb-4 opacity-60">
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
              <span className="text-2xl">⚔️</span>
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
            </div>

            {/* FARM — pixel art style */}
            <div className="relative">
              <h1
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.2em] leading-none"
                style={{
                  fontFamily: "'Georgia', serif",
                  color: '#f5c842',
                  textShadow: `
                    2px 2px 0 #8a5a10,
                    4px 4px 0 #6a4a08,
                    6px 6px 0 rgba(0,0,0,0.4),
                    0 0 30px rgba(245,200,66,0.25),
                    0 0 60px rgba(245,200,66,0.1)
                  `,
                  letterSpacing: '0.25em',
                  WebkitFontSmoothing: 'none',
                }}
              >
                FARM
              </h1>
              {/* Underline glow */}
              <div className="h-1 mx-auto mt-1 rounded-full bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" style={{ width: '105%' }} />
              <h1
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.2em] leading-none -mt-2"
                style={{
                  fontFamily: "'Georgia', serif",
                  color: '#d4a830',
                  textShadow: `
                    2px 2px 0 #7a4a08,
                    4px 4px 0 #5a3a06,
                    6px 6px 0 rgba(0,0,0,0.5),
                    0 0 30px rgba(212,168,48,0.2)
                  `,
                  letterSpacing: '0.3em',
                  WebkitFontSmoothing: 'none',
                }}
              >
                SURVIVAL
              </h1>
            </div>

            {/* Decorative line below logo */}
            <div className="flex items-center justify-center gap-3 mt-3 opacity-50">
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
              <span className="text-sm text-amber-500/60 tracking-[0.3em] font-bold">✦</span>
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
            </div>
          </motion.div>

          {/* === TAGLINE === */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-5"
          >
            <div
              className="px-6 py-1.5 rounded border border-amber-800/40"
              style={{
                background: 'linear-gradient(180deg, rgba(80,50,20,0.7) 0%, rgba(40,25,10,0.7) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,200,100,0.08), 0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <p className="text-amber-300/70 text-xs sm:text-sm tracking-[0.3em] font-bold">
                SOBREVIVA · EXPLORE · FORJE · EVOLUA
              </p>
            </div>
          </motion.div>

          {/* === JOGAR BUTTON === */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5, type: 'spring', stiffness: 200 }}
          >
            <button
              onClick={() => navigate('/game')}
              className="group relative px-14 py-3.5 rounded-lg text-lg font-black text-white tracking-[0.15em] transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(180deg, #5aaa3a 0%, #3a8a22 50%, #2a6a12 100%)',
                border: '3px solid #4a8a2a',
                boxShadow: `
                  0 5px 0 #1a4a08,
                  0 8px 20px rgba(0,0,0,0.5),
                  inset 0 1px 0 rgba(255,255,255,0.2)
                `,
                textShadow: '1px 1px 3px rgba(0,0,0,0.6)',
              }}
            >
              {/* Hover shine */}
              <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                }}
              />
              <span className="flex items-center gap-3 relative z-10">
                <span className="text-lg group-hover:rotate-12 transition-transform duration-200">⚔️</span>
                <span>JOGAR</span>
                <span className="text-lg group-hover:-rotate-12 transition-transform duration-200">⚔️</span>
              </span>
            </button>
          </motion.div>
        </div>

        {/* ──── BOTTOM SECTION ──── */}
        <div className="relative w-full pb-2">
          {/* Campfire + Tent scene */}
          <div className="flex justify-center items-end mb-1 relative h-20">
            {/* Tent */}
            <div className="absolute left-1/2 -translate-x-[120px] bottom-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <div className="relative">
                  <div className="w-0 h-0 border-l-[34px] border-r-[34px] border-b-[44px] border-l-transparent border-r-transparent border-b-[#7a6a4a]" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-4 bg-[#5a4a2a] rounded-t" />
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-b-[10px] border-l-transparent border-r-transparent border-b-[#8a7a5a] opacity-60" />
                </div>
              </motion.div>
            </div>

            {/* Campfire */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="relative flex flex-col items-center"
            >
              {/* Fire flame */}
              <motion.div
                className="text-3xl mb-0"
                style={{ filter: 'drop-shadow(0 0 20px rgba(255,160,50,0.5))' }}
                animate={{
                  scale: [1, 1.08, 0.95, 1.05, 1],
                }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                🔥
              </motion.div>
              {/* Logs */}
              <div className="text-lg -mt-1 opacity-80">🪵</div>

              {/* Sparks */}
              {sparks.map(s => (
                <motion.div
                  key={s.id}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 2,
                    height: 2,
                    backgroundColor: '#ffaa33',
                    left: `calc(50% + ${s.x}px)`,
                    bottom: '40px',
                    boxShadow: '0 0 4px 1px rgba(255,170,50,0.4)',
                  }}
                  initial={{ y: 0, opacity: 0.8 }}
                  animate={{ y: -30, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, delay: s.delay }}
                />
              ))}
            </motion.div>
          </div>

          {/* Panels row */}
          <div className="flex w-full items-end px-2 sm:px-4 gap-3">
            {/* ──── LEFT PANEL: CONTROLS ──── */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="w-[200px] flex-shrink-0 rounded-lg border-2 border-amber-900/50 overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #3a2a18 0%, #2a1a0a 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.6)',
              }}
            >
              {/* Header accent */}
              <div className="h-1 bg-gradient-to-r from-amber-700/50 via-amber-500/30 to-amber-700/50" />
              <div className="p-2.5">
                <h3
                  className="text-center text-amber-300 font-bold text-sm mb-2 tracking-wider"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}
                >
                  🎮 COMANDOS
                </h3>
                <div className="space-y-1">
                  {controls.map((ctrl, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {ctrl.keys.map((key, ki) => (
                          <span
                            key={ki}
                            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-white/90 leading-none min-w-[22px] text-center"
                            style={{
                              background: 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 100%)',
                              border: '1px solid #666',
                              boxShadow: '0 2px 0 #222, inset 0 1px 0 rgba(255,255,255,0.12)',
                            }}
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                      <span className="text-white/40 text-[8px]">—</span>
                      <span className="text-white/70 text-[9px] truncate flex-1">{ctrl.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Spacer */}
            <div className="flex-1 min-w-[20px]" />

            {/* ──── RIGHT PANEL: CRÉDITOS ──── */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="w-[160px] flex-shrink-0 rounded-lg border-2 border-amber-900/50 overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #3a2a18 0%, #2a1a0a 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.6)',
              }}
            >
              {/* Header accent */}
              <div className="h-1 bg-gradient-to-r from-amber-700/50 via-amber-500/30 to-amber-700/50" />
              <div className="p-3 space-y-2">
                {[
                  { icon: '📖', label: 'CRÉDITOS' },
                ].map((btn, i) => (
                  <button
                    key={i}
                    className="w-full py-2 px-3 rounded-lg text-left text-white/80 text-xs font-bold tracking-wide flex items-center gap-2 transition-all duration-150 active:scale-95 hover:brightness-110"
                    style={{
                      background: 'linear-gradient(180deg, #5a4a30 0%, #3a2a18 100%)',
                      border: '2px solid #6a5a40',
                      boxShadow: '0 3px 0 #2a1a08, inset 0 1px 0 rgba(255,255,255,0.08)',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    }}
                  >
                    <span className="text-base">{btn.icon}</span>
                    <span>{btn.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ──── BOTTOM TIP BAR ──── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="w-full px-2 sm:px-6 mt-2 pb-2"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-900/40 max-w-2xl mx-auto"
              style={{
                background: 'linear-gradient(180deg, rgba(50,30,15,0.85) 0%, rgba(30,15,5,0.85) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 3px 10px rgba(0,0,0,0.5)',
              }}
            >
              <span className="text-green-400 text-base shrink-0">🌱</span>
              <span className="text-amber-400/80 font-bold text-[10px] tracking-wider whitespace-nowrap shrink-0">DICA:</span>
              <div className="flex-1 min-w-0 h-4 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={tipIndex}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 text-white/50 text-[10px] leading-tight truncate"
                  >
                    {tips[tipIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
              {/* Dots */}
              <div className="flex gap-1 shrink-0">
                {tips.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-1 rounded-full transition-all duration-300 ${
                      i === tipIndex
                        ? 'bg-green-500 scale-125'
                        : 'bg-white/15'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
