// ═══════════════════════════════════════════════════════════════════
// Farm Survival — PREMIUM Landing Page v3
// ═══════════════════════════════════════════════════════════════════
// Design Direction:
//   - Living isometric diorama (farm being built in real-time)
//   - Dynamic parallax reacting to mouse movement
//   - Bold typography with perspective distortion
//   - Epic entrance animation (world dissolving)
//   - High interactivity: hover causes visual feedback
//   - Vibrant but elegant color palette
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { getAudioEngine } from '@/game/core/AudioEngine';

const ANIMATIONS = `
@keyframes construct-pop { 
  0% { transform: scale(0) rotate(180deg); opacity: 0; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes float-gentle { 
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes glow-pulse { 
  0%, 100% { filter: brightness(1) drop-shadow(0 0 8px rgba(255, 215, 0, 0.2)); }
  50% { filter: brightness(1.08) drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)); }
}
@keyframes shimmer { 
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
@keyframes slide-in-left { 
  0% { opacity: 0; transform: translateX(-40px) skewX(10deg); }
  100% { opacity: 1; transform: translateX(0) skewX(0); }
}
@keyframes slide-in-right { 
  0% { opacity: 0; transform: translateX(40px) skewX(-10deg); }
  100% { opacity: 1; transform: translateX(0) skewX(0); }
}
@keyframes fade-in-up { 
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes grow-from-center {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes pixel-shake { 
  0%, 100% { transform: translateY(0) translateX(0); }
  25% { transform: translateY(-2px) translateX(1px); }
  50% { transform: translateY(1px) translateX(-1px); }
  75% { transform: translateY(-1px) translateX(2px); }
}
@keyframes world-implode {
  0% { transform: scale(1) perspective(800px) rotateX(0) rotateY(0); opacity: 1; }
  50% { transform: scale(0.95) perspective(800px) rotateX(8deg) rotateY(-8deg); opacity: 0.9; }
  100% { transform: scale(0) perspective(800px) rotateX(45deg) rotateY(45deg); opacity: 0; }
}
@keyframes button-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(90, 200, 70, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.05); }
  50% { box-shadow: 0 0 40px rgba(90, 200, 70, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.12); }
}
@keyframes text-glow {
  0%, 100% { text-shadow: 2px 2px 0 #4a2a00, 4px 4px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 200, 0, 0.3); }
  50% { text-shadow: 2px 2px 0 #4a2a00, 4px 4px 8px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 200, 0, 0.6); }
}
@keyframes rotate-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes float-up-fade {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-60px); }
}
@keyframes boss-appear {
  0% { opacity: 0; transform: scale(1.3) rotateZ(-15deg); }
  50% { opacity: 0.7; }
  100% { opacity: 1; transform: scale(1) rotateZ(0); }
}
`;

// Isometric pixel art components
function IsometricFarm({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const farmRef = useRef<HTMLDivElement>(null);
  const [constructed, setConstructed] = useState(false);

  useEffect(() => {
    setConstructed(true);
  }, []);

  const paralaxOffset = {
    x: (mouseX - 50) * 0.08,
    y: (mouseY - 50) * 0.08,
  };

  return (
    <div
      ref={farmRef}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{
        transform: `perspective(1200px) rotateX(${paralaxOffset.y}deg) rotateY(${-paralaxOffset.x}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      <svg
        viewBox="0 0 600 400"
        className="w-[95%] h-[95%] drop-shadow-2xl"
        style={{
          filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.4))',
          animation: constructed ? 'grow-from-center 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
        }}
      >
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a4d8c" />
            <stop offset="100%" stopColor="#88c5ff" />
          </linearGradient>
          <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a8a3a" />
            <stop offset="100%" stopColor="#2a5a1a" />
          </linearGradient>
          <filter id="pixelFilter" x="0%" y="0%" width="100%" height="100%">
            <feFlood floodColor="white" result="neutral" />
            <feComposite in="SourceGraphic" in2="neutral" operator="arithmetic" k2="0.5" />
          </filter>
        </defs>

        <rect width="600" height="400" fill="url(#skyGrad)" />

        {/* Ground (isometric) */}
        <polygon
          points="100,250 300,100 500,250 300,400"
          fill="url(#groundGrad)"
          stroke="#1a4a0a"
          strokeWidth="2"
          style={{ animation: constructed ? 'fade-in-up 1s 0.1s backwards' : 'none' }}
        />

        {/* Grass grid pattern (subtle) */}
        {Array.from({ length: 8 }).map((_, i) =>
          Array.from({ length: 6 }).map((_, j) => {
            const startX = 100 + (i * 50);
            const startY = 250 - (i * 25) + (j * 25);
            return (
              <line
                key={`h-${i}-${j}`}
                x1={startX - (j * 25)}
                y1={startY}
                x2={startX + 50 - (j * 25)}
                y2={startY}
                stroke="rgba(0,100,0,0.2)"
                strokeWidth="1"
              />
            );
          })
        )}

        {/* Trees (left back) */}
        {[{ x: 200, y: 200, s: 1 }, { x: 350, y: 180, s: 0.8 }].map((tree, i) => (
          <g
            key={`tree-${i}`}
            style={{
              animation: constructed ? `construct-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + i * 0.2}s backwards` : 'none',
            }}
          >
            {/* Trunk */}
            <polygon points={`${tree.x},${tree.y + 40} ${tree.x + 10 * tree.s},${tree.y + 30} ${tree.x + 10 * tree.s},${tree.y + 60} ${tree.x},${tree.y + 70}`} fill="#5a3a1a" />
            {/* Foliage */}
            <polygon points={`${tree.x},${tree.y} ${tree.x + 30 * tree.s},${tree.y - 10} ${tree.x + 50 * tree.s},${tree.y + 10} ${tree.x + 20 * tree.s},${tree.y + 40}`} fill="#2a6a2a" />
            <polygon points={`${tree.x - 10},${tree.y + 15} ${tree.x + 20 * tree.s},${tree.y + 5} ${tree.x + 40 * tree.s},${tree.y + 25} ${tree.x + 10 * tree.s},${tree.y + 45}`} fill="#3a8a3a" />
          </g>
        ))}

        {/* Farm Building (small wooden house) */}
        <g
          style={{
            animation: constructed ? `construct-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s backwards` : 'none',
          }}
        >
          {/* Base */}
          <polygon points="240,280 300,250 360,280 300,310" fill="#8b5a2b" stroke="#5a3a1a" strokeWidth="2" />
          {/* Left wall */}
          <polygon points="240,280 240,220 300,190 300,250" fill="#a0522d" stroke="#5a3a1a" strokeWidth="2" />
          {/* Right wall */}
          <polygon points="300,250 300,190 360,220 360,280" fill="#8b5a2b" stroke="#5a3a1a" strokeWidth="2" />
          {/* Roof left */}
          <polygon points="240,220 270,180 300,190 300,220" fill="#6a4a1a" stroke="#3a2a0a" strokeWidth="1" />
          {/* Roof right */}
          <polygon points="300,190 330,180 360,220 300,220" fill="#5a3a1a" stroke="#3a2a0a" strokeWidth="1" />
          {/* Door */}
          <rect x="285" y="250" width="20" height="30" fill="#4a2a0a" stroke="#2a1a00" strokeWidth="1" />
          {/* Window */}
          <rect x="310" y="235" width="15" height="15" fill="#5ac8ff" stroke="#1a4a8a" strokeWidth="1" />
        </g>

        {/* Crops (left field) */}
        {Array.from({ length: 6 }).map((_, i) =>
          Array.from({ length: 4 }).map((_, j) => (
            <g
              key={`crop-${i}-${j}`}
              style={{
                animation: constructed ? `construct-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.7 + (i + j) * 0.08}s backwards` : 'none',
              }}
            >
              {/* Plant */}
              <polygon points={`${130 + i * 25},${265 - j * 20} ${125 + i * 25},${275 - j * 20} ${130 + i * 25},${280 - j * 20} ${135 + i * 25},${275 - j * 20}`} fill="#6aaa3a" />
            </g>
          ))
        )}

        {/* Player character (right, center) */}
        <g
          style={{
            animation: constructed ? `construct-pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1s backwards` : 'none',
          }}
        >
          {/* Body */}
          <polygon points="420,270 440,260 445,290 425,300" fill="#ff8c42" stroke="#d46a2a" strokeWidth="1" />
          {/* Head */}
          <circle cx="432" cy="255" r="8" fill="#ffcaa0" stroke="#d46a2a" strokeWidth="1" />
          {/* Axe */}
          <line x1="445" y1="270" x2="465" y2="240" stroke="#5a3a1a" strokeWidth="2" />
          <polygon points="465,240 468,235 472,242 469,247" fill="#8a6a4a" />
        </g>

        {/* Enemy (distant, scary) */}
        <g
          style={{
            animation: constructed ? `boss-appear 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s backwards` : 'none',
            opacity: 0.7,
          }}
        >
          {/* Body */}
          <polygon points="500,180 530,160 535,200 505,220" fill="#d41f51" stroke="#8a0a2a" strokeWidth="2" />
          {/* Head (menacing) */}
          <circle cx="517" cy="155" r="12" fill="#c41f51" stroke="#8a0a2a" strokeWidth="2" />
          {/* Eyes */}
          <circle cx="512" cy="152" r="2" fill="#ffff00" />
          <circle cx="522" cy="152" r="2" fill="#ffff00" />
        </g>

        {/* Crystals scattered (right bottom) */}
        {[{ x: 480, y: 340, h: 25, c: '#66ccff' }, { x: 520, y: 350, h: 20, c: '#9966ff' }].map((crystal, i) => (
          <g
            key={`crystal-${i}`}
            style={{
              animation: constructed ? `construct-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${1.4 + i * 0.15}s backwards` : 'none',
            }}
          >
            <polygon points={`${crystal.x},${crystal.y} ${crystal.x + 12},${crystal.y - 8} ${crystal.x + 10},${crystal.y + crystal.h} ${crystal.x - 2},${crystal.y + 8}`} fill={crystal.c} stroke={crystal.c} strokeWidth="1" opacity="0.9" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function LandingPremium() {
  const navigate = useNavigate();
  const [mouseX, setMouseX] = useState(50);
  const [mouseY, setMouseY] = useState(50);
  const [hoveredControl, setHoveredControl] = useState<string | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const audioRef = useRef(getAudioEngine());
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMouseX((e.clientX - rect.left) / rect.width * 100);
      setMouseY((e.clientY - rect.top) / rect.height * 100);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const handlePlayClick = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    audioRef.current.playUIClick?.();
    setTimeout(() => navigate('/game'), 800);
  }, [navigate, isTransitioning]);

  const initAudio = useCallback(() => {
    if (!audioInitialized) {
      audioRef.current.setSFXVolume(0.7);
      audioRef.current.setMusicVolume(0.5);
      audioRef.current.startMusic?.();
      setAudioInitialized(true);
    }
  }, [audioInitialized]);

  const controls = [
    { key: 'W/A/S/D', desc: 'Mover' },
    { key: 'Mouse', desc: 'Atacar' },
    { key: 'E', desc: 'Interagir' },
    { key: 'Espaço', desc: 'Rolar' },
  ];

  return (
    <>
      <style>{ANIMATIONS}</style>
      <div
        ref={containerRef}
        className="relative w-screen h-screen overflow-hidden bg-black select-none"
        style={{ fontFamily: "'Press Start 2P', 'Courier New', monospace" }}
        onClick={initAudio}
      >
        {/* Animated background stars */}
        <div className="absolute inset-0 z-0">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${1 + (i % 2)}px`,
                height: `${1 + (i % 2)}px`,
                left: `${(i * 23 + 17) % 100}%`,
                top: `${(i * 31 + 7) % 100}%`,
                opacity: 0.1 + (i % 6) * 0.12,
                animation: `float-gentle ${3 + (i % 4)}s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Main content container */}
        <div className="relative w-full h-full flex flex-col">
          {/* Hero: Isometric farm scene + centered text overlay */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden"
            style={{
              animation: isTransitioning ? 'world-implode 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'none',
            }}>
            <IsometricFarm mouseX={mouseX} mouseY={mouseY} />

            {/* Text overlay (centered, bold, glowing) */}
            <div className="absolute z-20 text-center pointer-events-none">
              {/* Main title with massive scale and glow */}
              <div style={{
                animation: 'slide-in-left 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s backwards',
              }}>
                <h1
                  className="text-[clamp(32px, 8vw, 96px)] font-black tracking-[0.3em] leading-none mb-3"
                  style={{
                    color: '#ffd700',
                    animation: 'text-glow 2s ease-in-out infinite',
                    textShadow: '2px 2px 0 #4a2a00, 4px 4px 8px rgba(0,0,0,0.6), 0 0 30px rgba(255, 215, 0, 0.3)',
                    transform: 'perspective(600px) rotateX(2deg)',
                  }}>
                  FARM
                </h1>
              </div>

              <div style={{
                animation: 'slide-in-right 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s backwards',
              }}>
                <h1
                  className="text-[clamp(32px, 8vw, 96px)] font-black tracking-[0.4em] leading-none"
                  style={{
                    color: '#ffaa00',
                    animation: 'text-glow 2s ease-in-out 0.3s infinite',
                    textShadow: '2px 2px 0 #3a1a00, 4px 4px 8px rgba(0,0,0,0.6), 0 0 25px rgba(255, 170, 0, 0.25)',
                  }}>
                  SURVIVAL
                </h1>
              </div>

              {/* Subtitle with energy */}
              <div
                className="mt-6 text-[clamp(9px, 1.2vw, 14px)] tracking-[0.2em] font-bold"
                style={{
                  color: '#88ff44',
                  textShadow: '0 0 15px rgba(136, 255, 68, 0.4)',
                  animation: 'fade-in-up 1.2s ease-out 0.8s backwards',
                }}>
                ► CONSTRUA • SOBREVIVA • DOMINE ◄
              </div>
            </div>
          </div>

          {/* Bottom bar: Controls + Button + Settings */}
          <div className="relative z-30 h-auto bg-gradient-to-t from-black via-black/80 to-transparent px-4 py-6">
            <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
              {/* Left: Quick controls */}
              <div
                className="hidden md:flex gap-3 text-[clamp(8px, 1vw, 11px)]"
                style={{
                  animation: 'slide-in-left 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s backwards',
                }}
              >
                {controls.map((ctrl, i) => (
                  <div
                    key={i}
                    className="group cursor-pointer transition-all duration-200 px-3 py-2 rounded-sm border border-amber-700/40 hover:border-amber-500/60 hover:bg-amber-900/20"
                    onMouseEnter={() => { setHoveredControl(ctrl.key); initAudio(); }}
                    onMouseLeave={() => setHoveredControl(null)}
                    style={{
                      background: hoveredControl === ctrl.key ? 'rgba(180, 130, 40, 0.15)' : 'rgba(60, 40, 15, 0.4)',
                      animation: `fade-in-up 1s ease-out ${1.3 + i * 0.1}s backwards`,
                    }}
                  >
                    <div
                      className="font-bold"
                      style={{
                        color: hoveredControl === ctrl.key ? '#ffd700' : '#d4a84a',
                        textShadow: hoveredControl === ctrl.key ? '0 0 8px rgba(255, 215, 0, 0.6)' : 'none',
                        transition: 'all 0.2s',
                      }}>
                      {ctrl.key}
                    </div>
                    <div className="text-[7px] opacity-50 group-hover:opacity-100 transition-opacity">
                      {ctrl.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Center: PLAY button - HUGE and dominant */}
              <div
                className="flex-1 flex justify-center"
                style={{
                  animation: 'grow-from-center 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1s backwards',
                }}
              >
                <button
                  onClick={handlePlayClick}
                  disabled={isTransitioning}
                  className="group relative px-12 py-4 rounded text-[clamp(12px, 2vw, 18px)] font-black tracking-[0.15em] text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #5ac842 0%, #3a8a22 50%, #1a5a08 100%)',
                    border: '4px solid #7acc44',
                    animation: 'button-glow 2s ease-in-out infinite',
                    boxShadow: '0 8px 0 #0a2a00, 0 12px 40px rgba(90, 200, 66, 0.3)',
                    cursor: isTransitioning ? 'not-allowed' : 'pointer',
                    perspective: '600px',
                  }}
                  onMouseEnter={initAudio}
                >
                  <span className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%)',
                    }} />
                  <span className="relative flex items-center gap-4">
                    <span className="text-xl group-hover:animate-bounce">▶</span>
                    <span className="group-hover:tracking-wider transition-all">JOGAR AGORA</span>
                    <span className="text-xl group-hover:animate-pulse">⚔️</span>
                  </span>
                </button>
              </div>

              {/* Right: Tip or easter egg text */}
              <div
                className="hidden lg:block text-right text-[clamp(7px, 0.9vw, 10px)] opacity-60 hover:opacity-100 transition-opacity"
                style={{
                  color: '#88ff44',
                  animation: 'slide-in-right 1s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s backwards',
                }}
              >
                <div className="font-bold">💡 DICA</div>
                <div>Explore cavernas</div>
                <div>para cristais raros</div>
              </div>
            </div>
          </div>
        </div>

        {/* Vignette effect (frame) */}
        <div className="absolute inset-0 z-40 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 100%)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.8)',
          }} />
      </div>
    </>
  );
}
