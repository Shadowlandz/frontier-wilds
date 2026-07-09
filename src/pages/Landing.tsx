// ═══════════════════════════════════════════════════════════════════
// Farm Survival — Premium Pixel-Art Landing Page
// ═══════════════════════════════════════════════════════════════════
// Built with: CSS gradients, clip-paths, keyframes, box-shadows
// Font: Press Start 2P (Google Fonts)
// All visuals are CSS-only — no external images.
// ═══════════════════════════════════════════════════════════════════

import { useNavigate } from 'react-router';

/* ── CSS Variables ── */
const CSS_VARS = {
  '--green-dark': '#2a4a1a',
  '--green-mid': '#4d7c45',
  '--green-light': '#6da34d',
  '--wood-dark': '#4a2a10',
  '--wood-mid': '#6b4325',
  '--wood-light': '#8b5a2b',
  '--stone': '#5a5a5a',
  '--stone-light': '#7a7a7a',
  '--gold': '#d8b44a',
  '--gold-light': '#f0d97a',
  '--fire-orange': '#ff7a00',
  '--fire-amber': '#ffb347',
  '--fire-yellow': '#ffd966',
  '--pixel-font': "'Press Start 2P', monospace",
  '--frame-color': '#2a1a0a',
} as const;

/* ── Animations ── */

// Keyframes are injected via the animation class strings below
const ANIMATIONS = `
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes float-reverse { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
@keyframes twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
@keyframes fire-flicker {
  0% { transform: scale(1) rotate(0deg); opacity: 0.9; }
  25% { transform: scale(1.08) rotate(-2deg); opacity: 1; }
  50% { transform: scale(0.95) rotate(1deg); opacity: 0.85; }
  75% { transform: scale(1.05) rotate(-1deg); opacity: 0.95; }
  100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
}
@keyframes fire-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 120, 0, 0.4), 0 0 40px rgba(255, 80, 0, 0.2); }
  50% { box-shadow: 0 0 30px rgba(255, 180, 50, 0.6), 0 0 60px rgba(255, 120, 0, 0.3); }
}
@keyframes spark-rise { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-60px) scale(0); opacity: 0; } }
@keyframes smoke-rise { 0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.3; } 100% { transform: translateY(-80px) translateX(20px) scale(3); opacity: 0; } }
@keyframes firefly {
  0%, 100% { opacity: 0; transform: translate(0, 0); }
  25% { opacity: 0.8; transform: translate(15px, -10px); }
  50% { opacity: 0.9; transform: translate(-8px, -20px); }
  75% { opacity: 0.6; transform: translate(10px, -8px); }
}
@keyframes leaf-fall {
  0% { transform: translateX(0) rotate(0deg); opacity: 0.6; }
  50% { transform: translateX(30px) rotate(180deg); opacity: 0.4; }
  100% { transform: translateX(60px) rotate(360deg); opacity: 0; }
}
@keyframes river-flow { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
@keyframes logo-glow { 0%, 100% { filter: brightness(1) drop-shadow(0 0 20px rgba(216,180,74,0.2)); } 50% { filter: brightness(1.1) drop-shadow(0 0 30px rgba(216,180,74,0.4)); } }
@keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.01); } }
@keyframes slide-up {
  0% { opacity: 0; transform: translateY(12px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-12px); }
}
@keyframes border-pulse { 0%, 100% { border-color: rgba(180,140,60,0.3); } 50% { border-color: rgba(180,140,60,0.6); } }
`;

export default function Landing() {
  const navigate = useNavigate();

  // ── Dicas do ciclo ──
  const tips = [
    'Explore cavernas para encontrar minerios raros.',
    'Construa sua base antes da primeira noite.',
    'Plante sementes para garantir alimento.',
    'Pesque para obter recursos rapidamente.',
    'Construa tochas para explorar cavernas.',
    'Craft equipamentos para enfrentar chefes.',
    'Colete madeira e pedra para construir.',
    'Faca pocoes para curar e ganhar buffs.',
  ];

  return (
    <>
      {/* Inject keyframes into the document */}
      <style>{ANIMATIONS}</style>

      {/* ================================================================
           FULLSCREEN BACKGROUND LAYERS
           ================================================================ */}
      <div className="w-screen h-screen overflow-hidden relative font-mono bg-[#0a0f05] select-none"
        style={{ fontFamily: "'Press Start 2P', monospace" }}>

        {/* ──── SKY ──── */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a2e] via-[#0e2a1a] to-[#0d1f0d]" />

        {/* Stars */}
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 31 + 17) % 100}%`,
              top: `${(i * 19 + 5) % 55}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              opacity: 0.15 + (i % 5) * 0.15,
              animation: `twinkle ${2 + (i % 5)}s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}

        {/* Moon */}
        <div
          className="absolute rounded-full"
          style={{
            right: '10%',
            top: '6%',
            width: '52px',
            height: '52px',
            background: 'radial-gradient(circle at 35% 35%, #f5f0d0, #d4c89a)',
            boxShadow: '0 0 40px rgba(245,240,200,0.3), 0 0 80px rgba(245,240,200,0.1)',
            animation: 'float 6s ease-in-out infinite',
          }}
        />

        {/* Clouds */}
        <div
          className="absolute rounded-full opacity-[0.06]"
          style={{
            left: '20%',
            top: '12%',
            width: '180px',
            height: '30px',
            background: '#aaccee',
            filter: 'blur(20px)',
            animation: 'float-reverse 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full opacity-[0.04]"
          style={{
            left: '55%',
            top: '10%',
            width: '220px',
            height: '25px',
            background: '#aaccee',
            filter: 'blur(25px)',
            animation: 'float 15s ease-in-out infinite',
          }}
        />

        {/* ──── MOUNTAINS (3 layers using clip-path) ──── */}
        {/* Far mountains */}
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 500" preserveAspectRatio="none" style={{ height: '68%', zIndex: 1 }}>
          <path d="M0,500 L0,330 L60,290 L140,340 L220,270 L300,320 L380,250 L460,300 L540,230 L620,280 L700,210 L780,260 L860,190 L940,240 L1020,180 L1100,230 L1200,200 L1200,500 Z" fill="#0d1f0d" opacity="0.4" />
          <path d="M0,500 L0,350 L80,310 L170,360 L260,290 L350,340 L440,270 L530,320 L620,250 L710,300 L800,240 L890,290 L980,230 L1070,280 L1200,250 L1200,500 Z" fill="#112211" opacity="0.5" />
        </svg>
        {/* Mid mountains */}
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 500" preserveAspectRatio="none" style={{ height: '62%', zIndex: 2 }}>
          <path d="M0,500 L0,370 L90,340 L190,380 L290,320 L390,360 L490,300 L590,350 L690,290 L790,340 L890,280 L990,330 L1090,290 L1200,320 L1200,500 Z" fill="#142a14" opacity="0.6" />
          <path d="M0,500 L0,390 L100,360 L200,400 L300,350 L400,390 L500,330 L600,370 L700,310 L800,360 L900,310 L1000,360 L1100,320 L1200,360 L1200,500 Z" fill="#1a3a1a" opacity="0.7" />
        </svg>
        {/* Near mountains */}
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 500" preserveAspectRatio="none" style={{ height: '55%', zIndex: 3 }}>
          <path d="M0,500 L0,410 L60,390 L130,420 L210,380 L290,410 L370,370 L450,400 L530,360 L610,390 L690,350 L770,380 L850,340 L930,370 L1010,340 L1090,370 L1200,350 L1200,500 Z" fill="#1d4a1d" opacity="0.8" />
        </svg>

        {/* ──── FOREST (tree silhouettes) ──── */}
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 400" preserveAspectRatio="none" style={{ height: '35%', zIndex: 4 }}>
          {/* Trees */}
          {[
            { x: 2, s: 1.0 }, { x: 8, s: 0.8 }, { x: 14, s: 1.2 },
            { x: 20, s: 0.9 }, { x: 27, s: 1.1 }, { x: 33, s: 0.7 },
            { x: 40, s: 1.3 }, { x: 48, s: 0.9 }, { x: 55, s: 1.1 },
            { x: 62, s: 0.8 }, { x: 70, s: 1.2 }, { x: 77, s: 0.9 },
            { x: 83, s: 1.0 }, { x: 90, s: 1.1 }, { x: 96, s: 0.8 },
          ].map((t, i) => {
            const h = 90 * t.s;
            const w = 30 * t.s;
            const cx = (t.x / 100) * 1200;
            return (
              <g key={i}>
                <rect x={cx - 3} y={400 - h} width={6} height={h * 0.35} fill="#1a0d05" />
                <polygon points={`${cx - w/2},${400 - h + 15} ${cx},${400 - h - 15} ${cx + w/2},${400 - h + 15}`} fill="#0d2a0d" />
                <polygon points={`${cx - w/2 + 5},${400 - h + 30} ${cx},${400 - h + 2} ${cx + w/2 - 5},${400 - h + 30}`} fill="#0f320f" />
                <polygon points={`${cx - w/2 + 8},${400 - h + 45} ${cx},${400 - h + 18} ${cx + w/2 - 8},${400 - h + 45}`} fill="#123a12" />
              </g>
            );
          })}
          {/* Ground fill */}
          <rect x="0" y="390" width="1200" height="10" fill="#1a3010" />
        </svg>

        {/* ──── RIVER ──── */}
        <div
          className="absolute bottom-0 z-[5] opacity-40"
          style={{
            left: '15%',
            width: '18%',
            height: '30%',
            background: 'linear-gradient(135deg, transparent 0%, #1a4a7a 20%, #2a6a9a 50%, #1a4a7a 80%, transparent 100%)',
            backgroundSize: '200% 100%',
            clipPath: 'polygon(30% 0%, 70% 0%, 65% 20%, 75% 40%, 60% 60%, 70% 80%, 55% 100%, 45% 100%, 35% 80%, 45% 60%, 30% 40%, 40% 20%)',
            animation: 'river-flow 3s linear infinite',
          }}
        />

        {/* River glow */}
        <div
          className="absolute bottom-0 z-[5]"
          style={{
            left: '15%',
            width: '18%',
            height: '30%',
            background: 'linear-gradient(135deg, transparent 0%, rgba(100,200,255,0.08) 30%, transparent 70%)',
            clipPath: 'polygon(30% 0%, 70% 0%, 65% 20%, 75% 40%, 60% 60%, 70% 80%, 55% 100%, 45% 100%, 35% 80%, 45% 60%, 30% 40%, 40% 20%)',
            animation: 'river-flow 4s linear infinite',
          }}
        />

        {/* ──── GRASS / GROUND ──── */}
        <div
          className="absolute bottom-0 w-full z-[6]"
          style={{
            height: '28%',
            background: `
              linear-gradient(180deg, #1a3a10 0%, #1d4d12 20%, #1a5510 40%, #164808 60%, #0f3a06 80%, #0d2a04 100%)
            `,
          }}
        />

        {/* Grass texture overlay */}
        <div
          className="absolute bottom-0 w-full z-[7] opacity-20 pointer-events-none"
          style={{
            height: '15%',
            background: `
              repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 8px,
                rgba(50,150,50,0.15) 8px,
                rgba(50,150,50,0.15) 10px,
                transparent 10px,
                transparent 18px
              ),
              repeating-linear-gradient(
                0deg,
                transparent 0px,
                transparent 6px,
                rgba(30,100,30,0.1) 6px,
                rgba(30,100,30,0.1) 7px,
                transparent 7px,
                transparent 13px
              )
            `,
            backgroundSize: '18px 100%, 100% 13px',
          }}
        />

        {/* Small flowers / bushes */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute z-[8] text-xs pointer-events-none opacity-50"
            style={{
              bottom: `${4 + (i * 3) % 12}%`,
              left: `${5 + (i * 11 + 3) % 90}%`,
              animation: `float ${3 + (i % 4)}s ease-in-out ${i * 0.5}s infinite`,
            }}
          >
            {i % 3 === 0 ? '🌼' : i % 3 === 1 ? '🌺' : '🌿'}
          </div>
        ))}

        {/* Small rocks */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="absolute z-[8] rounded-full pointer-events-none"
            style={{
              bottom: `${3 + (i * 5) % 10}%`,
              left: `${8 + (i * 17) % 80}%`,
              width: `${4 + (i % 4)}px`,
              height: `${3 + (i % 3)}px`,
              background: '#3a3a3a',
              borderRadius: '40% 60% 50% 50%',
            }}
          />
        ))}

        {/* ──── FIREFLIES ──── */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute z-[9] rounded-full pointer-events-none"
            style={{
              left: `${8 + (i * 9 + 7) % 84}%`,
              bottom: `${20 + (i * 7) % 20}%`,
              width: '4px',
              height: '4px',
              background: '#ccff66',
              boxShadow: '0 0 8px 4px rgba(200,255,100,0.3)',
              animation: `firefly ${4 + (i % 3)}s ease-in-out ${i * 0.6}s infinite`,
            }}
          />
        ))}

        {/* ──── FALLING LEAVES ──── */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute z-[9] pointer-events-none text-[8px]"
            style={{
              left: `${10 + (i * 15) % 80}%`,
              top: `${-5}%`,
              animation: `leaf-fall ${6 + (i % 4)}s linear ${i * 1.2}s infinite`,
              color: ['#4d7c45', '#6da34d', '#8a5a2b', '#d8b44a'][i % 4],
            }}
          >
            🍃
          </div>
        ))}

        {/* ================================================================
             PIXEL-ART BORDER FRAME
             ================================================================ */}
        {/* Outer frame */}
        <div className="absolute inset-0 pointer-events-none z-20"
          style={{
            boxShadow: `
              inset 0 0 0 8px #2a1a0a,
              inset 0 0 0 12px #1a0f05,
              inset 0 0 0 16px #0d0802,
              0 0 0 2px rgba(180,140,60,0.15)
            `,
          }}
        />

        {/* Corner decorations */}
        <div className="absolute z-20 pointer-events-none"
          style={{
            top: '6px', left: '6px',
            width: '32px', height: '32px',
            borderTop: '4px solid #6b4325',
            borderLeft: '4px solid #6b4325',
            borderTopLeftRadius: '4px',
          }}
        />
        <div className="absolute z-20 pointer-events-none"
          style={{
            top: '6px', right: '6px',
            width: '32px', height: '32px',
            borderTop: '4px solid #6b4325',
            borderRight: '4px solid #6b4325',
            borderTopRightRadius: '4px',
          }}
        />
        <div className="absolute z-20 pointer-events-none"
          style={{
            bottom: '6px', left: '6px',
            width: '32px', height: '32px',
            borderBottom: '4px solid #6b4325',
            borderLeft: '4px solid #6b4325',
            borderBottomLeftRadius: '4px',
          }}
        />
        <div className="absolute z-20 pointer-events-none"
          style={{
            bottom: '6px', right: '6px',
            width: '32px', height: '32px',
            borderBottom: '4px solid #6b4325',
            borderRight: '4px solid #6b4325',
            borderBottomRightRadius: '4px',
          }}
        />

        {/* Corner icons */}
        <div className="absolute z-20 pointer-events-none text-sm opacity-50" style={{ top: '10px', left: '12px' }}>🌿</div>
        <div className="absolute z-20 pointer-events-none text-sm opacity-50" style={{ top: '10px', right: '12px', transform: 'scaleX(-1)' }}>🌿</div>
        <div className="absolute z-20 pointer-events-none text-sm opacity-50" style={{ bottom: '10px', left: '12px', transform: 'scaleY(-1)' }}>🌿</div>
        <div className="absolute z-20 pointer-events-none text-sm opacity-50" style={{ bottom: '10px', right: '12px', transform: 'scale(-1)' }}>🌿</div>

        {/* Top/Bottom vine line */}
        <div className="absolute top-[6px] left-[40px] right-[40px] h-[2px] z-20 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(100,160,60,0.2), rgba(100,160,60,0.3), rgba(100,160,60,0.2), transparent)',
          }}
        />
        <div className="absolute bottom-[6px] left-[40px] right-[40px] h-[2px] z-20 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(100,160,60,0.2), rgba(100,160,60,0.3), rgba(100,160,60,0.2), transparent)',
          }}
        />
        {/* Left/Right vine line */}
        <div className="absolute top-[40px] bottom-[40px] left-[6px] w-[2px] z-20 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(100,160,60,0.15), rgba(100,160,60,0.2), rgba(100,160,60,0.15), transparent)',
          }}
        />
        <div className="absolute top-[40px] bottom-[40px] right-[6px] w-[2px] z-20 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(100,160,60,0.15), rgba(100,160,60,0.2), rgba(100,160,60,0.15), transparent)',
          }}
        />

        {/* ================================================================
             MAIN CONTENT
             ================================================================ */}
        <div className="relative z-30 w-full h-full flex flex-col" style={{ animation: 'breathe 4s ease-in-out infinite' }}>

          {/* ──── CENTER AREA: Logo + Button ──── */}
          <div className="flex-1 flex flex-col items-center justify-center px-3 pt-12">

            {/* --- PIXEL LOGO --- */}
            <div
              className="text-center mb-2"
              style={{ animation: 'logo-glow 3s ease-in-out infinite' }}
            >
              {/* Decorative line */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="h-[2px] flex-1 max-w-[60px]" style={{
                  background: 'linear-gradient(90deg, transparent, rgba(216,180,74,0.4))',
                }} />
                <span className="text-xs opacity-60">⚔️</span>
                <div className="h-[2px] flex-1 max-w-[60px]" style={{
                  background: 'linear-gradient(90deg, rgba(216,180,74,0.4), transparent)',
                }} />
              </div>

              {/* FARM */}
              <h1
                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-[0.15em] leading-none"
                style={{
                  color: '#f5c842',
                  textShadow: `
                    3px 3px 0 #8a5a10,
                    6px 6px 0 #6a4a08,
                    9px 9px 0 rgba(0,0,0,0.4),
                    0 0 30px rgba(245,200,66,0.25),
                    0 0 60px rgba(245,200,66,0.1)
                  `,
                  letterSpacing: '0.2em',
                }}
              >
                FARM
              </h1>

              {/* Underline glow */}
              <div className="h-[3px] mx-auto mt-0 rounded-full" style={{
                width: '90%',
                background: 'linear-gradient(90deg, transparent, rgba(216,180,74,0.3), transparent)',
              }} />

              {/* SURVIVAL */}
              <h1
                className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-[0.15em] leading-none -mt-2"
                style={{
                  color: '#d4a830',
                  textShadow: `
                    3px 3px 0 #7a4a08,
                    6px 6px 0 #5a3a06,
                    9px 9px 0 rgba(0,0,0,0.5),
                    0 0 30px rgba(212,168,48,0.2)
                  `,
                  letterSpacing: '0.25em',
                }}
              >
                SURVIVAL
              </h1>

              {/* Bottom decorative line */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <div className="h-[2px] flex-1 max-w-[40px]" style={{
                  background: 'linear-gradient(90deg, transparent, rgba(216,180,74,0.3))',
                }} />
                <span className="text-[8px] opacity-40 tracking-[0.3em]">✦</span>
                <div className="h-[2px] flex-1 max-w-[40px]" style={{
                  background: 'linear-gradient(90deg, rgba(216,180,74,0.3), transparent)',
                }} />
              </div>
            </div>

            {/* --- SUBTITLE --- */}
            <div
              className="mb-4 px-5 py-1.5 rounded border border-amber-800/30"
              style={{
                background: 'linear-gradient(180deg, rgba(60,35,12,0.6) 0%, rgba(30,15,5,0.6) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,200,100,0.06), 0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <p className="text-amber-300/60 text-[8px] sm:text-[10px] tracking-[0.25em] font-bold">
                SOBREVIVA · EXPLORE · FORJE · EVOLUA
              </p>
            </div>

            {/* --- MAIN BUTTON: JOGAR --- */}
            <button
              onClick={() => navigate('/game')}
              className="group relative px-10 py-3 sm:px-14 sm:py-3.5 rounded text-base sm:text-lg font-black text-white tracking-[0.12em] transition-all duration-150 active:translate-y-[3px]"
              style={{
                background: 'linear-gradient(180deg, #5aaa3a 0%, #3a8a22 50%, #2a6a12 100%)',
                border: '3px solid #4a8a2a',
                boxShadow: `
                  0 6px 0 #1a4a08,
                  0 10px 24px rgba(0,0,0,0.5),
                  inset 0 1px 0 rgba(255,255,255,0.2)
                `,
                textShadow: '1px 1px 3px rgba(0,0,0,0.6)',
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '14px',
              }}
            >
              {/* Hover shine overlay */}
              <span className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                }}
              />
              <span className="flex items-center gap-3 relative z-10">
                <span className="text-base group-hover:rotate-12 transition-transform duration-200">⚔️</span>
                <span className="text-[10px] sm:text-sm">▶ JOGAR</span>
                <span className="text-base group-hover:-rotate-12 transition-transform duration-200">⚔️</span>
              </span>
            </button>
          </div>

          {/* ──── BOTTOM SECTION ──── */}
          <div className="relative w-full pb-1">

            {/* ──── CAMPFIRE ──── */}
            <div className="flex justify-center items-end mb-0 relative h-[70px] sm:h-[90px]">
              {/* Tent silhouette (behind fire) */}
              <div
                className="absolute"
                style={{
                  left: 'calc(50% - 90px)',
                  bottom: '5px',
                }}
              >
                <div className="relative" style={{ animation: 'float-reverse 5s ease-in-out infinite' }}>
                  {/* Tent body */}
                  <div className="w-0 h-0"
                    style={{
                      borderLeft: '28px solid transparent',
                      borderRight: '28px solid transparent',
                      borderBottom: '36px solid #6a5a3a',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                    }}
                  />
                  {/* Tent opening */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-4 bg-[#4a3a1a] rounded-t" />
                </div>
              </div>

              {/* Campfire */}
              <div className="relative flex flex-col items-center" style={{ zIndex: 10 }}>
                {/* Glow behind fire */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: '80px',
                    height: '80px',
                    bottom: '10px',
                    background: 'radial-gradient(circle, rgba(255,120,0,0.15) 0%, transparent 70%)',
                    animation: 'fire-glow 1s ease-in-out infinite',
                  }}
                />

                {/* Smoke particles */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: `${10 + i * 5}px`,
                      height: `${10 + i * 5}px`,
                      bottom: '50px',
                      background: 'rgba(150,130,110,0.15)',
                      animation: `smoke-rise ${2 + i * 0.5}s ease-out ${i * 0.4}s infinite`,
                      left: `${(i - 1) * 8}px`,
                    }}
                  />
                ))}

                {/* Fire flame (main) */}
                <div
                  className="text-[28px] sm:text-[34px] mb-0 pointer-events-none"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(255,160,50,0.5))',
                    animation: 'fire-flicker 0.8s ease-in-out infinite',
                    lineHeight: 1,
                  }}
                >
                  🔥
                </div>

                {/* Sparks */}
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: '3px',
                      height: '3px',
                      bottom: '35px',
                      left: `${(i - 1.5) * 8}px`,
                      background: '#ffaa33',
                      boxShadow: '0 0 4px 1px rgba(255,170,50,0.4)',
                      animation: `spark-rise ${0.8 + i * 0.15}s ease-out ${i * 0.25}s infinite`,
                    }}
                  />
                ))}

                {/* Logs */}
                <div
                  className="flex gap-0 -mt-[2px] text-[16px] sm:text-[18px] opacity-80 pointer-events-none"
                  style={{ lineHeight: 1 }}
                >
                  <span style={{ transform: 'rotate(-15deg)' }}>🪵</span>
                  <span style={{ transform: 'rotate(15deg) translateX(-2px)' }}>🪵</span>
                </div>
              </div>
            </div>

            {/* ──── SIDE PANELS ROW ──── */}
            <div className="flex w-full items-end px-2 sm:px-4 gap-3 flex-wrap sm:flex-nowrap">
              {/* ──── LEFT PANEL: CONTROLS ──── */}
              <div
                className="w-full sm:w-[220px] flex-shrink-0 rounded border-2 border-amber-900/40 overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #3a2a18 0%, #2a1a0a 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.5)',
                  animation: 'border-pulse 4s ease-in-out infinite',
                }}
              >
                {/* Header accent */}
                <div className="h-[3px]" style={{
                  background: 'linear-gradient(90deg, rgba(180,140,60,0.4), rgba(180,140,60,0.2), rgba(180,140,60,0.4))',
                }} />
                <div className="p-2.5">
                  <h3 className="text-center text-amber-300 font-bold text-[9px] mb-2 tracking-[0.15em]"
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>
                    🎮 COMANDOS
                  </h3>
                  <div className="space-y-[5px]">
                    {[
                      { keys: ['W','A','S','D'], action: 'Movimentar' },
                      { keys: ['Mouse'], action: 'Atacar' },
                      { keys: ['E'], action: 'Interagir' },
                      { keys: ['Espaço'], action: 'Rolar / Esquivar' },
                      { keys: ['Shift'], action: 'Correr' },
                      { keys: ['I'], action: 'Inventário' },
                      { keys: ['C'], action: 'Craft' },
                      { keys: ['M'], action: 'Mapa' },
                      { keys: ['Esc'], action: 'Menu' },
                    ].map((ctrl, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="flex gap-[3px]">
                          {ctrl.keys.map((key, ki) => (
                            <span
                              key={ki}
                              className="inline-block px-[5px] py-[3px] rounded text-[7px] font-bold text-white/90 leading-none text-center"
                              style={{
                                background: 'linear-gradient(180deg, #5a5a5a 0%, #3a3a3a 100%)',
                                border: '1px solid #666',
                                boxShadow: '0 2px 0 #222, inset 0 1px 0 rgba(255,255,255,0.12)',
                                minWidth: key.length > 3 ? 'auto' : '22px',
                                fontSize: key === 'Espaço' ? '6px' : '7px',
                                padding: key === 'Espaço' ? '3px 4px' : '3px 5px',
                              }}
                            >
                              {key}
                            </span>
                          ))}
                        </div>
                        <span className="text-white/30 text-[6px]">—</span>
                        <span className="text-white/60 text-[7px] truncate flex-1">{ctrl.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Spacer */}
              <div className="hidden sm:block flex-1 min-w-[20px]" />

              {/* ──── RIGHT PANEL: MENU ──── */}
              <div
                className="w-full sm:w-[170px] flex-shrink-0 rounded border-2 border-amber-900/40 overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #3a2a18 0%, #2a1a0a 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.5)',
                }}
              >
                <div className="h-[3px]" style={{
                  background: 'linear-gradient(90deg, rgba(180,140,60,0.4), rgba(180,140,60,0.2), rgba(180,140,60,0.4))',
                }} />
                <div className="p-2.5">
                  {[
                    { icon: '▶', label: 'JOGAR', primary: true },
                    { icon: '⚙️', label: 'CONFIG' },
                    { icon: '📖', label: 'CRÉDITOS' },
                    { icon: '✕', label: 'SAIR' },
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={btn.primary ? () => navigate('/game') : undefined}
                      className="w-full py-2 px-2.5 rounded text-left text-white/80 text-[8px] font-bold tracking-wide flex items-center gap-2 transition-all duration-100 active:translate-y-[2px] mb-[6px] last:mb-0"
                      style={{
                        background: btn.primary
                          ? 'linear-gradient(180deg, #5aaa3a 0%, #3a8a22 50%, #2a6a12 100%)'
                          : 'linear-gradient(180deg, #5a4a30 0%, #3a2a18 100%)',
                        border: btn.primary ? '2px solid #4a8a2a' : '2px solid #6a5a40',
                        boxShadow: btn.primary
                          ? '0 3px 0 #1a4a08, inset 0 1px 0 rgba(255,255,255,0.15)'
                          : '0 3px 0 #2a1a08, inset 0 1px 0 rgba(255,255,255,0.08)',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '8px',
                      }}
                      onMouseEnter={(e) => {
                        if (!btn.primary) {
                          e.currentTarget.style.filter = 'brightness(1.15)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = 'brightness(1)';
                      }}
                    >
                      <span className="text-[10px]">{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ──── BOTTOM TIPS BAR ──── */}
            <div className="w-full px-2 sm:px-4 mt-2 pb-3">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded border border-amber-900/30 max-w-[700px] mx-auto overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(40,20,8,0.85) 0%, rgba(20,10,3,0.85) 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 3px 10px rgba(0,0,0,0.4)',
                }}
              >
                <span className="text-green-400 text-[10px] shrink-0">🌱</span>
                <span className="text-amber-400/70 font-bold text-[7px] tracking-wider whitespace-nowrap shrink-0">DICA:</span>

                {/* Animated tips container */}
                <div className="flex-1 min-w-0 h-[16px] relative overflow-hidden">
                  {tips.map((tip, i) => (
                    <span
                      key={i}
                      className="absolute inset-0 text-white/45 text-[7px] leading-tight truncate flex items-center"
                      style={{
                        animation: `slide-up ${tips.length * 5}s ease-in-out ${i * 5}s infinite`,
                        opacity: 0,
                      }}
                    >
                      {tip}
                    </span>
                  ))}
                </div>

                {/* Tip dots */}
                <div className="flex gap-1 shrink-0">
                  {tips.map((_, i) => (
                    <div
                      key={i}
                      className="w-[5px] h-[5px] rounded-full transition-all duration-300"
                      style={{
                        background: i === 0 ? '#4d7c45' : 'rgba(255,255,255,0.12)',
                        animation: i === 0 ? `tip-dot ${tips.length * 5}s steps(1) infinite` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Inject dot animation */}
      <style>{`
        @keyframes tip-dot {
          ${tips.map((_, i) => `
            ${(i / tips.length) * 100}% { background: rgba(255,255,255,0.12); }
            ${(i / tips.length) * 100 + 0.1}% { background: #4d7c45; }
            ${((i + 0.8) / tips.length) * 100}% { background: #4d7c45; }
            ${((i + 0.9) / tips.length) * 100}% { background: rgba(255,255,255,0.12); }
          `).join('')}
        }
      `}</style>
    </>
  );
}
