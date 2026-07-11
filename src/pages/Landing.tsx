// ═══════════════════════════════════════════════════════════════════
// Farm Survival — Premium Pixel-Art Landing Page (v2)
// ═══════════════════════════════════════════════════════════════════
// Display face: Press Start 2P (titles, keycaps, eyebrows only)
// Body face:    VT323 (panel copy, tips, labels — legible at small sizes)
// Background:   CSS-only landscape with sky, mountains, forest, grass
// Signature:    A campfire on a stone ring — the game's "safe zone" motif,
//               grounded instead of a floating decorative torch.
// ═══════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { getAudioEngine } from '@/game/core/AudioEngine';

const ANIMS = `
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes twinkle { 0%,100%{opacity:0.1} 50%{opacity:0.8} }
@keyframes fire-flicker {
  0%{transform:scale(1) rotate(0deg);opacity:0.95}
  25%{transform:scale(1.07) rotate(-2deg);opacity:1}
  50%{transform:scale(0.95) rotate(1.5deg);opacity:0.9}
  75%{transform:scale(1.05) rotate(-1deg);opacity:1}
  100%{transform:scale(1) rotate(0deg);opacity:0.95}
}
@keyframes fire-glow {
  0%,100%{box-shadow:0 0 30px rgba(255,120,0,0.35),0 0 70px rgba(255,80,0,0.18)}
  50%{box-shadow:0 0 45px rgba(255,180,50,0.55),0 0 100px rgba(255,120,0,0.28)}
}
@keyframes spark-rise { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-70px) scale(0);opacity:0} }
@keyframes smoke-rise { 0%{transform:translateY(0) translateX(0) scale(1);opacity:0.18} 100%{transform:translateY(-100px) translateX(18px) scale(3.2);opacity:0} }
@keyframes firefly { 0%,100%{opacity:0;transform:translate(0,0)} 25%{opacity:0.7;transform:translate(12px,-8px)} 50%{opacity:0.9;transform:translate(-6px,-18px)} 75%{opacity:0.5;transform:translate(8px,-6px)} }
@keyframes logo-glow { 0%,100%{filter:brightness(1) drop-shadow(0 0 22px rgba(216,180,74,0.22))} 50%{filter:brightness(1.1) drop-shadow(0 0 34px rgba(216,180,74,0.4))} }
@keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.006)} }
@keyframes slide-up { 0%{opacity:0;transform:translateY(12px)} 10%{opacity:1;transform:translateY(0)} 88%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-12px)} }
@keyframes crystal-glow { 0%,100%{opacity:0.45} 50%{opacity:0.95} }
@keyframes gold-shine { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.35)} }
@keyframes ember-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
`;

// Small inline pixel-icon set — replaces emoji for a consistent, higher-quality look
function Icon({ name, size = 10 }: { name: 'controls' | 'gear' | 'leaf' | 'sprout'; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 16 16', shapeRendering: 'crispEdges' as const };
  if (name === 'controls') {
    return (
      <svg {...common}>
        <rect x="1" y="6" width="14" height="6" fill="#caa04c" />
        <rect x="3" y="4" width="10" height="2" fill="#caa04c" />
        <rect x="3" y="7" width="2" height="2" fill="#3a2a18" />
        <rect x="6" y="7" width="2" height="2" fill="#3a2a18" />
        <rect x="10" y="7" width="2" height="2" fill="#3a2a18" />
      </svg>
    );
  }
  if (name === 'gear') {
    return (
      <svg {...common}>
        <rect x="6" y="1" width="4" height="2" fill="#caa04c" />
        <rect x="6" y="13" width="4" height="2" fill="#caa04c" />
        <rect x="1" y="6" width="2" height="4" fill="#caa04c" />
        <rect x="13" y="6" width="2" height="4" fill="#caa04c" />
        <rect x="3" y="3" width="2" height="2" fill="#caa04c" />
        <rect x="11" y="3" width="2" height="2" fill="#caa04c" />
        <rect x="3" y="11" width="2" height="2" fill="#caa04c" />
        <rect x="11" y="11" width="2" height="2" fill="#caa04c" />
        <rect x="5" y="5" width="6" height="6" fill="#2a1a0a" />
        <rect x="6" y="6" width="4" height="4" fill="#caa04c" />
      </svg>
    );
  }
  if (name === 'sprout') {
    return (
      <svg {...common}>
        <rect x="7" y="9" width="2" height="6" fill="#7a9a4a" />
        <rect x="4" y="6" width="5" height="3" fill="#5aaa3a" />
        <rect x="8" y="4" width="5" height="3" fill="#3a8a22" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="2" width="8" height="2" fill="#6a9a4a" />
      <rect x="2" y="4" width="12" height="2" fill="#5a8a3a" />
      <rect x="3" y="6" width="10" height="2" fill="#4a7a2a" />
      <rect x="7" y="8" width="2" height="7" fill="#5a3a1a" />
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [sfxOn, setSfxOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(70);
  const [musicVolume, setMusicVolume] = useState(50);
  const audioRef = useRef(getAudioEngine());
  const [audioInitialized, setAudioInitialized] = useState(false);

  const tips = [
    'Explore cavernas para encontrar minérios raros e cristais.',
    'Use tochas para iluminar cavernas escuras — essencial!',
    'Combine recursos na bancada de trabalho para criar armas.',
    'Na zona segura perto da fogueira, inimigos não atacam.',
    'Minere ouro e cristais para forjar equipamentos raros.',
    'Árvores, pedras e minérios se renovam com o tempo.',
    'Colete cristais azuis para criar itens mágicos.',
    'O ouro é usado para comprar itens dos NPCs.',
  ];

  const handleFirstInteraction = useCallback(() => {
    if (!audioInitialized) {
      const audio = audioRef.current;
      audio.setSFXVolume(sfxVolume / 100);
      audio.setMusicVolume(musicVolume / 100);
      audio.setSFXMuted(!sfxOn);
      audio.setMusicMuted(!musicOn);
      audio.startMusic();
      setAudioInitialized(true);
    }
  }, [audioInitialized, sfxVolume, musicVolume, sfxOn, musicOn]);

  const toggleSfx = useCallback(() => {
    const audio = audioRef.current;
    const newOn = !sfxOn;
    setSfxOn(newOn);
    audio.setSFXMuted(!newOn);
    audio.playUIClick();
    if (!audioInitialized) handleFirstInteraction();
  }, [sfxOn, audioInitialized, handleFirstInteraction]);

  const toggleMusic = useCallback(() => {
    const audio = audioRef.current;
    const newOn = !musicOn;
    setMusicOn(newOn);
    audio.setMusicMuted(!newOn);
    audio.playUIClick();
    if (!audioInitialized) handleFirstInteraction();
  }, [musicOn, audioInitialized, handleFirstInteraction]);

  const changeSfxVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setSfxVolume(v);
    audioRef.current.setSFXVolume(v / 100);
  }, []);

  const changeMusicVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setMusicVolume(v);
    audioRef.current.setMusicVolume(v / 100);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    audio.setSFXVolume(sfxVolume / 100);
    audio.setMusicVolume(musicVolume / 100);
  }, []);

  // Shared wood-panel styling (nameplate look)
  const woodPanel: React.CSSProperties = {
    background: 'linear-gradient(180deg, #3f2c18 0%, #2a1b0d 55%, #23160a 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,210,140,0.08), inset 0 0 0 1px rgba(0,0,0,0.4), 0 6px 18px rgba(0,0,0,0.55)',
  };
  const woodGrain: React.CSSProperties = {
    backgroundImage:
      'repeating-linear-gradient(180deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(180deg, rgba(255,200,140,0.03) 0px, rgba(255,200,140,0.03) 2px, transparent 2px, transparent 9px)',
  };

  return (
    <>
      <style>{ANIMS}</style>
      <div
        className="w-screen h-screen overflow-hidden relative select-none bg-[#0a0f05]"
        style={{ fontFamily: "'VT323', 'Courier New', monospace" }}
      >
        {/* ================================================================
             BACKGROUND LANDSCAPE
             ================================================================ */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1a2e] via-[#0e2a1a] to-[#0d1f0d]" />

        {Array.from({ length: 45 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white pointer-events-none"
            style={{
              left: `${(i * 31 + 17) % 100}%`,
              top: `${(i * 19 + 5) % 50}%`,
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              opacity: 0.1 + (i % 5) * 0.15,
              animation: `twinkle ${2 + (i % 5)}s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}

        {/* Fireflies drifting near the grass line — adds life without clutter */}
        {[{ l: 14, b: 22 }, { l: 68, b: 26 }, { l: 40, b: 20 }, { l: 82, b: 24 }].map((f, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${f.l}%`,
              bottom: `${f.b}%`,
              width: '3px',
              height: '3px',
              background: '#d9f57a',
              boxShadow: '0 0 6px 2px rgba(217,245,122,0.6)',
              animation: `firefly ${4 + i}s ease-in-out ${i * 0.7}s infinite`,
            }}
          />
        ))}

        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            right: '10%',
            top: '5%',
            width: 'clamp(36px,5vw,52px)',
            height: 'clamp(36px,5vw,52px)',
            background: 'radial-gradient(circle at 35% 35%, #f5f0d0, #d4c89a)',
            boxShadow: '0 0 40px rgba(245,240,200,0.3), 0 0 80px rgba(245,240,200,0.1)',
            animation: 'float 6s ease-in-out infinite',
          }}
        />

        <svg
          className="absolute bottom-0 w-full pointer-events-none"
          viewBox="0 0 1200 500"
          preserveAspectRatio="none"
          style={{ height: '65%', zIndex: 1 }}
        >
          <path d="M0,500 L0,330 L60,290 L140,340 L220,270 L300,320 L380,250 L460,300 L540,230 L620,280 L700,210 L780,260 L860,190 L940,240 L1020,180 L1100,230 L1200,200 L1200,500Z" fill="#0d1f0d" opacity="0.4" />
          <path d="M0,500 L0,360 L90,330 L190,380 L290,320 L390,360 L490,300 L590,350 L690,290 L790,340 L890,280 L990,330 L1090,290 L1200,320 L1200,500Z" fill="#142a14" opacity="0.6" />
          <path d="M0,500 L0,400 L100,370 L200,410 L300,350 L400,390 L500,330 L600,370 L700,310 L800,360 L900,310 L1000,360 L1100,320 L1200,360 L1200,500Z" fill="#1a3a1a" opacity="0.75" />
        </svg>

        <svg
          className="absolute bottom-0 w-full pointer-events-none"
          viewBox="0 0 1200 400"
          preserveAspectRatio="none"
          style={{ height: '32%', zIndex: 2 }}
        >
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
                <polygon points={`${cx - w / 2},${400 - h + 15} ${cx},${400 - h - 15} ${cx + w / 2},${400 - h + 15}`} fill="#0d2a0d" />
                <polygon points={`${cx - w / 2 + 5},${400 - h + 30} ${cx},${400 - h + 2} ${cx + w / 2 - 5},${400 - h + 30}`} fill="#103510" />
              </g>
            );
          })}
          <rect x="0" y="385" width="1200" height="15" fill="#142a10" />
        </svg>

        <div
          className="absolute bottom-0 w-full pointer-events-none"
          style={{
            height: '28%',
            zIndex: 3,
            background: 'linear-gradient(180deg, #1a4010 0%, #185010 30%, #155008 55%, #104006 80%, #0c2a04 100%)',
          }}
        />
        <div
          className="absolute bottom-0 w-full pointer-events-none"
          style={{
            height: '18%',
            zIndex: 4,
            opacity: 0.15,
            background:
              'repeating-linear-gradient(90deg,transparent 0px,transparent 7px,rgba(60,160,60,0.12) 7px,rgba(60,160,60,0.12) 9px,transparent 9px,transparent 16px), repeating-linear-gradient(0deg,transparent 0px,transparent 5px,rgba(40,120,40,0.08) 5px,rgba(40,120,40,0.08) 6px,transparent 6px,transparent 12px)',
            backgroundSize: '16px 100%, 100% 12px',
          }}
        />

        {/* Ground resources — using pixel icon for grass tufts, kept emoji only for the most "natural" ones */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute z-[5] pointer-events-none"
            style={{
              bottom: `${3 + (i * 3) % 12}%`,
              left: `${4 + (i * 8 + 2) % 92}%`,
              animation: `float ${3 + (i % 3)}s ease-in-out ${i * 0.4}s infinite`,
              opacity: 0.55,
            }}
          >
            <Icon name="leaf" size={9} />
          </div>
        ))}

        {[{ b: 4, l: 8, s: 6 }, { b: 6, l: 22, s: 4 }, { b: 3, l: 38, s: 8 }, { b: 5, l: 55, s: 5 }, { b: 2, l: 72, s: 7 }, { b: 7, l: 88, s: 4 }, { b: 4, l: 95, s: 6 }].map((r, i) => (
          <div
            key={i}
            className="absolute z-[5] rounded-full pointer-events-none"
            style={{
              bottom: `${r.b}%`,
              left: `${r.l}%`,
              width: `${r.s}px`,
              height: `${Math.max(3, r.s - 1)}px`,
              background: '#3a3a3a',
              borderRadius: '40% 60% 50% 50% / 50% 50% 40% 60%',
              boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.3)',
            }}
          />
        ))}

        {[{ b: 5, l: 18, s: 7 }, { b: 6, l: 45, s: 5 }, { b: 3, l: 78, s: 6 }].map((g, i) => (
          <div
            key={i}
            className="absolute z-[5] pointer-events-none rounded-sm"
            style={{
              bottom: `${g.b}%`,
              left: `${g.l}%`,
              width: `${g.s + 3}px`,
              height: `${g.s}px`,
              background: 'linear-gradient(135deg,#8a8a8a,#4a4a4a)',
              animation: `gold-shine ${2 + i * 0.5}s ease-in-out ${i * 0.8}s infinite`,
              boxShadow: '0 0 5px rgba(255,215,0,0.35), inset 2px 2px 0 rgba(255,215,90,0.5)',
            }}
          />
        ))}

        {[{ b: 8, l: 30, color: '#66ccff' }, { b: 4, l: 62, color: '#9966ff' }, { b: 6, l: 84, color: '#66ccff' }].map((c, i) => (
          <div
            key={i}
            className="absolute z-[5] flex items-end pointer-events-none"
            style={{ bottom: `${c.b}%`, left: `${c.l}%`, animation: `crystal-glow ${2.5 + i * 0.3}s ease-in-out ${i * 0.6}s infinite` }}
          >
            <div
              style={{
                width: '8px',
                height: `${12 + i * 3}px`,
                background: `linear-gradient(180deg, ${c.color} 0%, ${c.color}88 100%)`,
                clipPath: 'polygon(50% 0%, 100% 40%, 90% 100%, 10% 100%, 0% 40%)',
                boxShadow: `0 0 8px ${c.color}44`,
              }}
            />
            <div
              style={{
                width: '5px',
                height: `${7 + i * 2}px`,
                marginLeft: '-2px',
                background: `linear-gradient(180deg, ${c.color}aa 0%, ${c.color}44 100%)`,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                transform: 'rotate(-15deg)',
              }}
            />
          </div>
        ))}

        {/* ================================================================
             PIXEL-ART FRAME — hammered iron border with corner rivets
             ================================================================ */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{ boxShadow: 'inset 0 0 0 5px #1a0f05, inset 0 0 0 8px #2e1c0c, inset 0 0 0 9px #120a03' }}
        />
        {/* Vignette for depth */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)' }}
        />
        {[
          { t: '10px', l: '10px' }, { t: '10px', r: '10px' },
          { b: '10px', l: '10px' }, { b: '10px', r: '10px' },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute z-20 pointer-events-none rounded-full"
            style={{
              width: '10px',
              height: '10px',
              top: pos.t,
              left: (pos as any).l,
              right: (pos as any).r,
              bottom: (pos as any).b,
              background: 'radial-gradient(circle at 35% 30%, #d9b872, #6b4325 70%, #3a2410)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
            }}
          />
        ))}

        {/* ================================================================
             MAIN CONTENT
             ================================================================ */}
        <div className="relative z-30 w-full h-full flex flex-col" style={{ animation: 'breathe 4s ease-in-out infinite' }}>
          <div className="flex-1 flex items-center justify-center px-2 sm:px-4 gap-3 sm:gap-6">

            {/* ──── LEFT PANEL: CONTROLS ──── */}
            <div
              className="hidden md:block w-[180px] sm:w-[210px] flex-shrink-0 self-center rounded-sm overflow-hidden border border-black/40"
              style={woodPanel}
            >
              <div className="relative h-[26px] flex items-center justify-center gap-2 border-b border-black/40"
                style={{ background: 'linear-gradient(180deg, #4a3420, #2f2010)' }}>
                <Icon name="controls" size={11} />
                <h3
                  className="text-amber-300 font-bold text-[10px] tracking-[0.15em]"
                  style={{ fontFamily: "'Press Start 2P', monospace", textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}
                >
                  COMANDOS
                </h3>
              </div>
              <div className="p-2.5 relative" style={woodGrain}>
                <div className="space-y-[6px]">
                  {[
                    { keys: ['W', 'A', 'S', 'D'], action: 'Movimentar' },
                    { keys: ['Mouse'], action: 'Atacar / Coletar' },
                    { keys: ['E'], action: 'Interagir' },
                    { keys: ['Espaço'], action: 'Rolar / Esquivar' },
                    { keys: ['Shift'], action: 'Correr' },
                    { keys: ['I'], action: 'Inventário' },
                    { keys: ['C'], action: 'Craft' },
                    { keys: ['P'], action: 'Plantar' },
                    { keys: ['M'], action: 'Mapa' },
                    { keys: ['Esc'], action: 'Menu' },
                  ].map((ctrl, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="flex gap-[3px] shrink-0">
                        {ctrl.keys.map((key, ki) => (
                          <span
                            key={ki}
                            className="inline-block px-[5px] py-[2px] rounded text-white/95 leading-none text-center font-bold"
                            style={{
                              background: 'linear-gradient(180deg, #5a5a5a 0%, #333 100%)',
                              border: '1px solid #6e6e6e',
                              boxShadow: '0 2px 0 #1a1a1a, inset 0 1px 0 rgba(255,255,255,0.15)',
                              fontFamily: "'Press Start 2P', monospace",
                              fontSize: '7px',
                              minWidth: key === 'Espaço' || key === 'Mouse' ? 'auto' : key === 'Esc' ? '24px' : '16px',
                            }}
                          >
                            {key}
                          </span>
                        ))}
                      </div>
                      <span className="text-[15px] leading-none" style={{ color: '#e8dcc0' }}>
                        {ctrl.action}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ──── CENTER: Logo → Button → Campfire ──── */}
            <div className="flex-1 flex flex-col items-center max-w-[520px]">
              <div className="flex-[1] min-h-0" />

              <div className="shrink-0 text-center" style={{ animation: 'logo-glow 3s ease-in-out infinite' }}>
                <div className="flex items-center justify-center gap-2 mb-2 sm:mb-3">
                  <div className="h-[2px] flex-1 max-w-[50px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,180,74,0.4))' }} />
                  <div className="w-[6px] h-[6px] rotate-45" style={{ background: '#caa04c', boxShadow: '0 0 6px rgba(216,180,74,0.6)' }} />
                  <div className="h-[2px] flex-1 max-w-[50px]" style={{ background: 'linear-gradient(90deg, rgba(216,180,74,0.4), transparent)' }} />
                </div>
                <h1
                  className="text-[clamp(28px,5.5vw,68px)] font-black tracking-[0.15em] leading-none"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    color: '#f5c842',
                    textShadow: '2px 2px 0 #8a5a10, 4px 4px 0 #6a4a08, 6px 6px 0 rgba(0,0,0,0.4), 0 0 30px rgba(245,200,66,0.25)',
                  }}
                >
                  FARM
                </h1>
                <div className="h-[2px] mx-auto mt-1 rounded-full" style={{ width: '70%', background: 'linear-gradient(90deg, transparent, rgba(216,180,74,0.3), transparent)' }} />
                <h1
                  className="text-[clamp(28px,5.5vw,68px)] font-black tracking-[0.2em] leading-none mt-1"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    color: '#d4a830',
                    textShadow: '2px 2px 0 #7a4a08, 4px 4px 0 #5a3a06, 6px 6px 0 rgba(0,0,0,0.5), 0 0 25px rgba(212,168,48,0.18)',
                  }}
                >
                  SURVIVAL
                </h1>
              </div>

              <div
                className="shrink-0 mt-3 sm:mt-4 px-4 py-1.5 rounded-sm border border-amber-800/30"
                style={{ background: 'linear-gradient(180deg, rgba(60,35,12,0.55), rgba(30,15,5,0.55))', boxShadow: 'inset 0 1px 0 rgba(255,200,100,0.06)' }}
              >
                <p className="tracking-[0.25em] font-bold" style={{ color: '#d9c79a', fontSize: '13px' }}>
                  SOBREVIVA · EXPLORE · FORJE · EVOLUA
                </p>
              </div>

              <div className="flex-[0.5] min-h-[14px]" />

              <button
                onClick={() => navigate('/game')}
                className="group relative shrink-0 px-9 sm:px-14 py-3 sm:py-3.5 rounded text-white transition-all duration-150 active:translate-y-[3px]"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  background: 'linear-gradient(180deg, #64bb45 0%, #3e9127 50%, #2a6a12 100%)',
                  border: '3px solid #4a8a2a',
                  boxShadow: '0 5px 0 #1a4a08, 0 10px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
                  fontSize: 'clamp(11px, 1.6vw, 14px)',
                  letterSpacing: '0.1em',
                }}
              >
                <span
                  className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)' }}
                />
                <span className="flex items-center gap-3 relative z-10">
                  <span className="group-hover:rotate-12 transition-transform duration-200">▶</span>
                  <span>JOGAR</span>
                </span>
              </button>

              <div className="flex-[0.5] min-h-[14px]" />

              {/* ---- CAMPFIRE (grounded signature element, replaces floating torch) ---- */}
              <div className="relative shrink-0 flex flex-col items-center" style={{ zIndex: 10 }}>
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 'clamp(70px,10vw,100px)',
                    height: 'clamp(70px,10vw,100px)',
                    bottom: '2px',
                    background: 'radial-gradient(circle, rgba(255,120,0,0.15) 0%, transparent 70%)',
                    animation: 'fire-glow 1s ease-in-out infinite',
                  }}
                />
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: `${7 + i * 3}px`,
                      height: `${7 + i * 3}px`,
                      bottom: '46px',
                      background: 'rgba(150,130,110,0.12)',
                      animation: `smoke-rise ${2.2 + i * 0.4}s ease-out ${i * 0.35}s infinite`,
                      left: `${(i - 1) * 5}px`,
                    }}
                  />
                ))}
                <div
                  className="text-[clamp(26px,4.2vw,38px)] pointer-events-none leading-none"
                  style={{ filter: 'drop-shadow(0 0 18px rgba(255,160,50,0.45))', animation: 'fire-flicker 0.8s ease-in-out infinite' }}
                >
                  🔥
                </div>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: '2px',
                      height: '2px',
                      bottom: '30px',
                      left: `${(i - 1) * 7}px`,
                      background: '#ffaa33',
                      boxShadow: '0 0 3px 1px rgba(255,170,50,0.5)',
                      animation: `spark-rise ${0.7 + i * 0.15}s ease-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
                {/* Stone ring base — grounds the fire, echoes the game's "safe zone" campfire */}
                <div className="relative flex items-end justify-center" style={{ width: '54px', height: '14px' }}>
                  {[-20, -10, 0, 10, 20].map((x, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        bottom: 0,
                        width: '13px',
                        height: '9px',
                        background: 'radial-gradient(circle at 35% 30%, #6a6a6a, #333)',
                        boxShadow: 'inset 0 -2px 2px rgba(0,0,0,0.4)',
                        animation: i === 2 ? 'ember-pulse 1.6s ease-in-out infinite' : undefined,
                      }}
                    />
                  ))}
                </div>
                <div
                  className="pointer-events-none"
                  style={{
                    width: '60px',
                    height: '5px',
                    marginTop: '-2px',
                    borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(255,140,40,0.35), transparent 70%)',
                  }}
                />
              </div>

              <div className="flex-[1] min-h-0" />
            </div>

            {/* ──── RIGHT PANEL: QUICK SETTINGS ──── */}
            <div
              className="hidden lg:block w-[180px] sm:w-[210px] flex-shrink-0 self-center rounded-sm overflow-hidden border border-black/40"
              style={woodPanel}
            >
              <div className="relative h-[26px] flex items-center justify-center gap-2 border-b border-black/40"
                style={{ background: 'linear-gradient(180deg, #4a3420, #2f2010)' }}>
                <Icon name="gear" size={11} />
                <h3
                  className="text-amber-300 font-bold text-[10px] tracking-[0.15em]"
                  style={{ fontFamily: "'Press Start 2P', monospace", textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}
                >
                  CONFIG
                </h3>
              </div>

              <div className="p-2.5 space-y-3 relative" style={woodGrain}>
                <div className="flex items-center justify-between gap-1">
                  <span style={{ color: '#e8dcc0', fontSize: '15px' }}>Efeitos (SFX)</span>
                  <button
                    onClick={toggleSfx}
                    className="relative w-[38px] h-[20px] rounded-full transition-all duration-200 cursor-pointer shrink-0"
                    style={{ background: sfxOn ? '#4d7c45' : '#3a3a3a', border: '2px solid #5a5a5a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    <div
                      className="absolute top-[1px] w-[14px] h-[14px] rounded-full transition-all duration-200"
                      style={{ left: sfxOn ? '19px' : '2px', background: sfxOn ? '#aadd88' : '#888', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                    />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between" style={{ color: '#b8a888', fontSize: '13px' }}>
                    <span>Volume</span>
                    <span>{sfxVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sfxVolume}
                    onChange={changeSfxVolume}
                    className="w-full h-[7px] rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(90deg, #4d7c45 ${sfxVolume}%, #3a3a3a ${sfxVolume}%)`, border: '1px solid #4a4a4a', accentColor: '#6da34d' }}
                  />
                </div>

                <div className="h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(180,140,60,0.25), transparent)' }} />

                <div className="flex items-center justify-between gap-1">
                  <span style={{ color: '#e8dcc0', fontSize: '15px' }}>Música</span>
                  <button
                    onClick={toggleMusic}
                    className="relative w-[38px] h-[20px] rounded-full transition-all duration-200 cursor-pointer shrink-0"
                    style={{ background: musicOn ? '#4d7c45' : '#3a3a3a', border: '2px solid #5a5a5a', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    <div
                      className="absolute top-[1px] w-[14px] h-[14px] rounded-full transition-all duration-200"
                      style={{ left: musicOn ? '19px' : '2px', background: musicOn ? '#aadd88' : '#888', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                    />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between" style={{ color: '#b8a888', fontSize: '13px' }}>
                    <span>Volume</span>
                    <span>{musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={musicVolume}
                    onChange={changeMusicVolume}
                    className="w-full h-[7px] rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(90deg, #4d7c45 ${musicVolume}%, #3a3a3a ${musicVolume}%)`, border: '1px solid #4a4a4a', accentColor: '#6da34d' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ──── BOTTOM: Tips Bar ──── */}
          <div className="w-full px-2 sm:px-4 pb-3 sm:pb-4">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-sm border border-amber-900/30 max-w-[680px] mx-auto"
              style={{ background: 'linear-gradient(180deg, rgba(35,18,7,0.85) 0%, rgba(18,8,2,0.85) 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 3px 10px rgba(0,0,0,0.4)' }}
            >
              <Icon name="sprout" size={12} />
              <span
                className="font-bold tracking-wider whitespace-nowrap shrink-0"
                style={{ fontFamily: "'Press Start 2P', monospace", color: '#caa04c', fontSize: '9px' }}
              >
                DICA
              </span>
              <div className="flex-1 min-w-0 h-5 relative overflow-hidden">
                {tips.map((tip, i) => (
                  <span
                    key={i}
                    className="absolute inset-0 leading-tight truncate flex items-center"
                    style={{ color: '#d9c79a', fontSize: '15px', animation: `slide-up ${tips.length * 5}s ease-in-out ${i * 5}s infinite`, opacity: 0 }}
                  >
                    {tip}
                  </span>
                ))}
              </div>
              <div className="flex gap-1 shrink-0">
                {tips.map((_, i) => (
                  <div
                    key={i}
                    className="w-[5px] h-[5px] rounded-full transition-all duration-300"
                    style={{ background: i === 0 ? '#4d7c45' : 'rgba(255,255,255,0.15)', animation: i === 0 ? `tip-dot ${tips.length * 5}s steps(1) infinite` : 'none' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tip-dot {
          ${tips.map((_, i) => `
            ${(i / tips.length) * 100}% { background: rgba(255,255,255,0.15); }
            ${(i / tips.length) * 100 + 0.1}% { background: #4d7c45; }
            ${((i + 0.8) / tips.length) * 100}% { background: #4d7c45; }
            ${((i + 0.85) / tips.length) * 100}% { background: rgba(255,255,255,0.15); }
          `).join('')}
        }
      `}</style>
    </>
  );
}
