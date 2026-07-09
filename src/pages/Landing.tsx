// ═══════════════════════════════════════════════════════════════════
// Farm Survival — Premium Pixel-Art Landing Page (Simplified)
// ═══════════════════════════════════════════════════════════════════
// Background: CSS-only landscape with sky, mountains, forest, grass
// Ground: rocks, gold ores, crystals (from game world)
// Centerpiece: animated torch
// Actions: single JOGAR button
// ═══════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router';

const ANIMS = `
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes float-reverse { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
@keyframes twinkle { 0%,100%{opacity:0.1} 50%{opacity:0.8} }
@keyframes torch-flicker {
  0%{transform:scale(1) rotate(0deg);opacity:0.9}
  25%{transform:scale(1.06) rotate(-1.5deg);opacity:1}
  50%{transform:scale(0.96) rotate(1deg);opacity:0.85}
  75%{transform:scale(1.04) rotate(-0.5deg);opacity:0.95}
  100%{transform:scale(1) rotate(0deg);opacity:0.9}
}
@keyframes torch-glow {
  0%,100%{box-shadow:0 0 20px rgba(255,120,0,0.3),0 0 50px rgba(255,80,0,0.15)}
  50%{box-shadow:0 0 30px rgba(255,180,50,0.5),0 0 70px rgba(255,120,0,0.25)}
}
@keyframes spark-rise { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-60px) scale(0);opacity:0} }
@keyframes smoke-rise { 0%{transform:translateY(0) translateX(0) scale(1);opacity:0.2} 100%{transform:translateY(-90px) translateX(15px) scale(3);opacity:0} }
@keyframes firefly { 0%,100%{opacity:0;transform:translate(0,0)} 25%{opacity:0.7;transform:translate(12px,-8px)} 50%{opacity:0.9;transform:translate(-6px,-18px)} 75%{opacity:0.5;transform:translate(8px,-6px)} }
@keyframes leaf-fall { 0%{transform:translateX(0) rotate(0deg);opacity:0.5} 100%{transform:translateX(50px) rotate(360deg);opacity:0} }
@keyframes logo-glow { 0%,100%{filter:brightness(1) drop-shadow(0 0 20px rgba(216,180,74,0.2))} 50%{filter:brightness(1.08) drop-shadow(0 0 30px rgba(216,180,74,0.35))} }
@keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.008)} }
@keyframes slide-up { 0%{opacity:0;transform:translateY(12px)} 10%{opacity:1;transform:translateY(0)} 88%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-12px)} }
@keyframes crystal-glow { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
@keyframes gold-shine { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.3)} }
`;

export default function Landing() {
  const navigate = useNavigate();

  const tips = [
    'Explore cavernas para encontrar minerios raros e cristais.',
    'Use tochas para iluminar cavernas escuras — essencial!',
    'Combine recursos na bancada de trabalho para criar armas.',
    'Na zona segura (círculo verde), inimigos nao atacam.',
    'Minere ouro e cristais para forjar equipamentos raros.',
    'Arvores, pedras e minerios renovam com o tempo.',
    'Colete cristais azuis para criar itens magicos.',
    'O ouro e usado para comprar itens dos NPCs.',
  ];

  return (
    <>
      <style>{ANIMS}</style>
      <div className="w-screen h-screen overflow-hidden relative select-none bg-[#0a0f05]"
        style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}>

        {/* ================================================================
             BACKGROUND LANDSCAPE
             ================================================================ */}

        {/* Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a2e] via-[#0e2a1a] to-[#0d1f0d]" />

        {/* Stars */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white pointer-events-none"
            style={{
              left: `${(i * 31 + 17) % 100}%`,
              top: `${(i * 19 + 5) % 50}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              opacity: 0.1 + (i % 5) * 0.15,
              animation: `twinkle ${2 + (i % 5)}s ease-in-out ${i * 0.15}s infinite`,
            }} />
        ))}

        {/* Moon */}
        <div className="absolute rounded-full pointer-events-none"
          style={{
            right: '10%', top: '5%',
            width: 'clamp(36px,5vw,52px)', height: 'clamp(36px,5vw,52px)',
            background: 'radial-gradient(circle at 35% 35%, #f5f0d0, #d4c89a)',
            boxShadow: '0 0 40px rgba(245,240,200,0.3), 0 0 80px rgba(245,240,200,0.1)',
            animation: 'float 6s ease-in-out infinite',
          }} />

        {/* Mountains — 3 layers SVG */}
        <svg className="absolute bottom-0 w-full pointer-events-none" viewBox="0 0 1200 500" preserveAspectRatio="none"
          style={{ height: '65%', zIndex: 1 }}>
          <path d="M0,500 L0,330 L60,290 L140,340 L220,270 L300,320 L380,250 L460,300 L540,230 L620,280 L700,210 L780,260 L860,190 L940,240 L1020,180 L1100,230 L1200,200 L1200,500Z" fill="#0d1f0d" opacity="0.4" />
          <path d="M0,500 L0,360 L90,330 L190,380 L290,320 L390,360 L490,300 L590,350 L690,290 L790,340 L890,280 L990,330 L1090,290 L1200,320 L1200,500Z" fill="#142a14" opacity="0.6" />
          <path d="M0,500 L0,400 L100,370 L200,410 L300,350 L400,390 L500,330 L600,370 L700,310 L800,360 L900,310 L1000,360 L1100,320 L1200,360 L1200,500Z" fill="#1a3a1a" opacity="0.75" />
        </svg>

        {/* Forest — tree silhouettes */}
        <svg className="absolute bottom-0 w-full pointer-events-none" viewBox="0 0 1200 400" preserveAspectRatio="none"
          style={{ height: '32%', zIndex: 2 }}>
          {[
            { x: 3, s: 1.1 }, { x: 10, s: 0.9 }, { x: 17, s: 1.3 },
            { x: 24, s: 0.8 }, { x: 32, s: 1.2 }, { x: 40, s: 0.9 },
            { x: 49, s: 1.4 }, { x: 57, s: 0.8 }, { x: 64, s: 1.1 },
            { x: 72, s: 1.3 }, { x: 80, s: 0.9 }, { x: 87, s: 1.0 },
            { x: 93, s: 1.2 },
          ].map((t, i) => {
            const h = 90 * t.s;
            const w = 30 * t.s;
            const cx = (t.x / 100) * 1200;
            return (
              <g key={i}>
                <rect x={cx - 3} y={400 - h} width={6} height={h * 0.35} fill="#1a0d05" />
                <polygon points={`${cx - w/2},${400 - h + 15} ${cx},${400 - h - 15} ${cx + w/2},${400 - h + 15}`} fill="#0d2a0d" />
                <polygon points={`${cx - w/2 + 5},${400 - h + 30} ${cx},${400 - h + 2} ${cx + w/2 - 5},${400 - h + 30}`} fill="#103510" />
              </g>
            );
          })}
          <rect x="0" y="385" width="1200" height="15" fill="#142a10" />
        </svg>

        {/* Ground / Grass */}
        <div className="absolute bottom-0 w-full pointer-events-none"
          style={{
            height: '28%', zIndex: 3,
            background: 'linear-gradient(180deg, #1a4010 0%, #185010 30%, #155008 55%, #104006 80%, #0c2a04 100%)',
          }} />

        {/* Grass texture overlay */}
        <div className="absolute bottom-0 w-full pointer-events-none"
          style={{
            height: '18%', zIndex: 4, opacity: 0.15,
            background: 'repeating-linear-gradient(90deg,transparent 0px,transparent 7px,rgba(60,160,60,0.12) 7px,rgba(60,160,60,0.12) 9px,transparent 9px,transparent 16px), repeating-linear-gradient(0deg,transparent 0px,transparent 5px,rgba(40,120,40,0.08) 5px,rgba(40,120,40,0.08) 6px,transparent 6px,transparent 12px)',
            backgroundSize: '16px 100%, 100% 12px',
          }} />

        {/* ================================================================
             GROUND RESOURCES (game items)
             ================================================================ */}

        {/* Grass tufts */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="absolute z-[5] pointer-events-none text-[6px] sm:text-[8px]"
            style={{
              bottom: `${3 + (i * 3) % 12}%`,
              left: `${4 + (i * 8 + 2) % 92}%`,
              animation: `float ${3 + (i % 3)}s ease-in-out ${i * 0.4}s infinite`,
              opacity: 0.5,
            }}>🌿</div>
        ))}

        {/* Rocks */}
        {[{b:4,l:8,s:6},{b:6,l:22,s:4},{b:3,l:38,s:8},{b:5,l:55,s:5},{b:2,l:72,s:7},{b:7,l:88,s:4},{b:4,l:95,s:6}].map((r, i) => (
          <div key={i} className="absolute z-[5] rounded-full pointer-events-none"
            style={{
              bottom: `${r.b}%`,
              left: `${r.l}%`,
              width: `${r.s}px`, height: `${Math.max(3, r.s - 1)}px`,
              background: '#3a3a3a',
              borderRadius: '40% 60% 50% 50% / 50% 50% 40% 60%',
              boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.3)',
            }} />
        ))}

        {/* Gold ores */}
        {[{b:5,l:18,s:7},{b:6,l:45,s:5},{b:3,l:78,s:6}].map((g, i) => (
          <div key={i} className="absolute z-[5] pointer-events-none text-[10px] sm:text-sm"
            style={{
              bottom: `${g.b}%`,
              left: `${g.l}%`,
              animation: `gold-shine ${2 + i * 0.5}s ease-in-out ${i * 0.8}s infinite`,
              filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.3))',
            }}>🪨✨</div>
        ))}

        {/* Crystals */}
        {[{b:8,l:30,color:'#66ccff'},{b:4,l:62,color:'#9966ff'},{b:6,l:84,color:'#66ccff'}].map((c, i) => (
          <div key={i} className="absolute z-[5] flex items-end pointer-events-none"
            style={{
              bottom: `${c.b}%`,
              left: `${c.l}%`,
              animation: `crystal-glow ${2.5 + i * 0.3}s ease-in-out ${i * 0.6}s infinite`,
            }}>
            {/* Crystal shape */}
            <div style={{
              width: '8px', height: `${12 + i * 3}px`,
              background: `linear-gradient(180deg, ${c.color} 0%, ${c.color}88 100%)`,
              clipPath: 'polygon(50% 0%, 100% 40%, 90% 100%, 10% 100%, 0% 40%)',
              boxShadow: `0 0 8px ${c.color}44`,
            }} />
            {/* Small side crystal */}
            <div style={{
              width: '5px', height: `${7 + i * 2}px`, marginLeft: '-2px',
              background: `linear-gradient(180deg, ${c.color}aa 0%, ${c.color}44 100%)`,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              transform: 'rotate(-15deg)',
            }} />
          </div>
        ))}

        {/* ================================================================
             PIXEL-ART FRAME
             ================================================================ */}
        <div className="absolute inset-0 pointer-events-none z-20"
          style={{
            boxShadow: 'inset 0 0 0 6px #2a1a0a, inset 0 0 0 10px #1a0f05, inset 0 0 0 14px #0d0802',
          }} />
        {/* Corner brackets */}
        {[
          { t: '6px', l: '6px', b: 'unset', r: 'unset', bT: '4px solid #6b4325', bL: '4px solid #6b4325' },
          { t: '6px', r: '6px', b: 'unset', l: 'unset', bT: '4px solid #6b4325', bR: '4px solid #6b4325' },
          { b: '6px', l: '6px', t: 'unset', r: 'unset', bB: '4px solid #6b4325', bL: '4px solid #6b4325' },
          { b: '6px', r: '6px', t: 'unset', l: 'unset', bB: '4px solid #6b4325', bR: '4px solid #6b4325' },
        ].map((corner, i) => (
          <div key={i} className="absolute z-20 pointer-events-none"
            style={{
              width: '28px', height: '28px',
              top: corner.t, left: corner.l, bottom: corner.b, right: corner.r,
              borderTop: corner.bT, borderLeft: corner.bL,
              borderBottom: corner.bB, borderRight: corner.bR,
              borderTopLeftRadius: corner.bL ? '4px' : undefined,
              borderTopRightRadius: corner.bR ? '4px' : undefined,
              borderBottomLeftRadius: corner.bL && corner.bB ? '4px' : undefined,
              borderBottomRightRadius: corner.bR && corner.bB ? '4px' : undefined,
            }} />
        ))}
        {/* Corner vines */}
        <div className="absolute z-20 pointer-events-none text-[11px] opacity-40" style={{ top: '12px', left: '12px' }}>🌿</div>
        <div className="absolute z-20 pointer-events-none text-[11px] opacity-40" style={{ top: '12px', right: '12px', transform: 'scaleX(-1)' }}>🌿</div>
        <div className="absolute z-20 pointer-events-none text-[11px] opacity-40" style={{ bottom: '12px', left: '12px', transform: 'scaleY(-1)' }}>🌿</div>
        <div className="absolute z-20 pointer-events-none text-[11px] opacity-40" style={{ bottom: '12px', right: '12px', transform: 'scale(-1)' }}>🌿</div>

        {/* Frame side lines */}
        <div className="absolute top-8 bottom-8 left-[6px] w-[2px] z-20 pointer-events-none"
          style={{ background: 'linear-gradient(180deg,transparent,rgba(100,160,60,0.15),rgba(100,160,60,0.2),rgba(100,160,60,0.15),transparent)' }} />
        <div className="absolute top-8 bottom-8 right-[6px] w-[2px] z-20 pointer-events-none"
          style={{ background: 'linear-gradient(180deg,transparent,rgba(100,160,60,0.15),rgba(100,160,60,0.2),rgba(100,160,60,0.15),transparent)' }} />
        <div className="absolute left-8 right-8 top-[6px] h-[2px] z-20 pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(100,160,60,0.15),rgba(100,160,60,0.2),rgba(100,160,60,0.15),transparent)' }} />
        <div className="absolute left-8 right-8 bottom-[6px] h-[2px] z-20 pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(100,160,60,0.15),rgba(100,160,60,0.2),rgba(100,160,60,0.15),transparent)' }} />

        {/* ================================================================
             MAIN CONTENT
             ================================================================ */}
        <div className="relative z-30 w-full h-full flex flex-col" style={{ animation: 'breathe 4s ease-in-out infinite' }}>

          {/* ──── CENTER: Logo + Torch + Button ──── */}
          <div className="flex-1 flex flex-col items-center justify-center px-3 pt-8 sm:pt-12">

            {/* ---- LOGO ---- */}
            <div className="text-center mb-3 sm:mb-4" style={{ animation: 'logo-glow 3s ease-in-out infinite' }}>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-[2px] flex-1 max-w-[50px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,180,74,0.3))' }} />
                <span className="text-[10px] opacity-50">⚔️</span>
                <div className="h-[2px] flex-1 max-w-[50px]" style={{ background: 'linear-gradient(90deg, rgba(216,180,74,0.3), transparent)' }} />
              </div>
              <h1 className="text-[clamp(28px,6vw,72px)] font-black tracking-[0.15em] leading-none"
                style={{
                  color: '#f5c842',
                  textShadow: '2px 2px 0 #8a5a10, 4px 4px 0 #6a4a08, 6px 6px 0 rgba(0,0,0,0.4), 0 0 30px rgba(245,200,66,0.2)',
                }}>FARM</h1>
              <div className="h-[3px] mx-auto mt-0 rounded-full" style={{ width: '80%', background: 'linear-gradient(90deg, transparent, rgba(216,180,74,0.25), transparent)' }} />
              <h1 className="text-[clamp(28px,6vw,72px)] font-black tracking-[0.2em] leading-none -mt-1"
                style={{
                  color: '#d4a830',
                  textShadow: '2px 2px 0 #7a4a08, 4px 4px 0 #5a3a06, 6px 6px 0 rgba(0,0,0,0.5), 0 0 25px rgba(212,168,48,0.15)',
                }}>SURVIVAL</h1>
            </div>

            {/* ---- TAGLINE ---- */}
            <div className="mb-5 sm:mb-6 px-4 py-1 rounded border border-amber-800/25"
              style={{ background: 'linear-gradient(180deg, rgba(60,35,12,0.5), rgba(30,15,5,0.5))', boxShadow: 'inset 0 1px 0 rgba(255,200,100,0.05)' }}>
              <p className="text-amber-300/50 text-[7px] sm:text-[9px] tracking-[0.2em] font-bold">
                SOBREVIVA · EXPLORE · FORJE · EVOLUA
              </p>
            </div>

            {/* ---- TORCH (centerpiece) ---- */}
            <div className="relative flex flex-col items-center mb-4 sm:mb-6" style={{ zIndex: 10 }}>
              {/* Torch glow */}
              <div className="absolute rounded-full pointer-events-none"
                style={{
                  width: 'clamp(60px,10vw,100px)',
                  height: 'clamp(60px,10vw,100px)',
                  bottom: '5px',
                  background: 'radial-gradient(circle, rgba(255,120,0,0.12) 0%, transparent 70%)',
                  animation: 'torch-glow 1s ease-in-out infinite',
                }} />

              {/* Smoke */}
              {[0, 1, 2].map(i => (
                <div key={i} className="absolute rounded-full pointer-events-none"
                  style={{
                    width: `${8 + i * 4}px`, height: `${8 + i * 4}px`,
                    bottom: '50px', background: 'rgba(150,130,110,0.1)',
                    animation: `smoke-rise ${2 + i * 0.4}s ease-out ${i * 0.35}s infinite`,
                    left: `${(i - 1) * 6}px`,
                  }} />
              ))}

              {/* Flame */}
              <div className="text-[clamp(28px,5vw,44px)] mb-0 pointer-events-none leading-none"
                style={{
                  filter: 'drop-shadow(0 0 20px rgba(255,160,50,0.5))',
                  animation: 'torch-flicker 0.8s ease-in-out infinite',
                }}>🔥</div>

              {/* Sparks */}
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="absolute rounded-full pointer-events-none"
                  style={{
                    width: '3px', height: '3px',
                    bottom: '28px', left: `${(i - 1.5) * 7}px`,
                    background: '#ffaa33',
                    boxShadow: '0 0 4px 1px rgba(255,170,50,0.4)',
                    animation: `spark-rise ${0.7 + i * 0.15}s ease-out ${i * 0.2}s infinite`,
                  }} />
              ))}

              {/* Torch handle (wooden stick) */}
              <div className="rounded-b-sm pointer-events-none"
                style={{
                  width: '6px',
                  height: 'clamp(28px,4vw,36px)',
                  background: 'linear-gradient(180deg, #5a2a0a 0%, #3a1a05 100%)',
                  boxShadow: '1px 0 0 rgba(0,0,0,0.2)',
                }} />
            </div>

            {/* ---- JOGAR BUTTON ---- */}
            <button
              onClick={() => navigate('/game')}
              className="group relative px-8 sm:px-12 py-2.5 sm:py-3 rounded text-[11px] sm:text-sm font-black text-white tracking-[0.1em] transition-all duration-150 active:translate-y-[3px]"
              style={{
                background: 'linear-gradient(180deg, #5aaa3a 0%, #3a8a22 50%, #2a6a12 100%)',
                border: '3px solid #4a8a2a',
                boxShadow: '0 5px 0 #1a4a08, 0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
              }}
            >
              <span className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)' }} />
              <span className="flex items-center gap-2 sm:gap-3 relative z-10">
                <span className="text-sm sm:text-base group-hover:rotate-12 transition-transform duration-200">⚔️</span>
                <span>▶ JOGAR</span>
                <span className="text-sm sm:text-base group-hover:-rotate-12 transition-transform duration-200">⚔️</span>
              </span>
            </button>
          </div>

          {/* ──── BOTTOM: Tips Bar ──── */}
          <div className="w-full px-2 sm:px-4 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded border border-amber-900/25 max-w-[650px] mx-auto"
              style={{
                background: 'linear-gradient(180deg, rgba(35,18,7,0.8) 0%, rgba(18,8,2,0.8) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 3px 10px rgba(0,0,0,0.4)',
              }}>
              <span className="text-green-400 text-[10px] shrink-0">🌱</span>
              <span className="text-amber-400/70 font-bold text-[7px] sm:text-[8px] tracking-wider whitespace-nowrap shrink-0">DICA:</span>
              <div className="flex-1 min-w-0 h-4 relative overflow-hidden">
                {tips.map((tip, i) => (
                  <span key={i} className="absolute inset-0 text-white/40 text-[7px] sm:text-[8px] leading-tight truncate flex items-center"
                    style={{ animation: `slide-up ${tips.length * 5}s ease-in-out ${i * 5}s infinite`, opacity: 0 }}>
                    {tip}
                  </span>
                ))}
              </div>
              <div className="flex gap-1 shrink-0">
                {tips.map((_, i) => (
                  <div key={i} className="w-[4px] h-[4px] sm:w-[5px] sm:h-[5px] rounded-full transition-all duration-300"
                    style={{
                      background: i === 0 ? '#4d7c45' : 'rgba(255,255,255,0.1)',
                      animation: i === 0 ? `tip-dot ${tips.length * 5}s steps(1) infinite` : 'none',
                    }} />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tip dot animation */}
      <style>{`
        @keyframes tip-dot {
          ${tips.map((_, i) => `
            ${(i / tips.length) * 100}% { background: rgba(255,255,255,0.1); }
            ${(i / tips.length) * 100 + 0.1}% { background: #4d7c45; }
            ${((i + 0.8) / tips.length) * 100}% { background: #4d7c45; }
            ${((i + 0.85) / tips.length) * 100}% { background: rgba(255,255,255,0.1); }
          `).join('')}
        }
      `}</style>
    </>
  );
}