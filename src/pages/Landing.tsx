// ═══════════════════════════════════════════════════════════════════
// Farm Survival — Landing Page Premium
// ═══════════════════════════════════════════════════════════════════
// Hero com parallax: Sky (day/night) → Clouds → Sun → Mountains →
// Forest → River → Ground → House → Windmill → Garden → Player → Campfire
// Seções: Gameplay, Survival, Building, Exploration, Craft, Gallery,
// Roadmap, Download, Footer
// Tudo em CSS/SVG/HTML puro — zero imagens externas
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { getAudioEngine } from '@/game/core/AudioEngine';

// ─── TIPOGRAFIA ──────────────────────────────────────────────────────────
// Press Start 2P → títulos, labels, teclas
// VT323 → corpo, descrições, painéis

// ─── HELPERS ─────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

const PALETTE = {
  grass: '#4CAF50', forest: '#2E7D32', wood: '#8D6E63', stone: '#616161',
  sky: '#64B5F6', water: '#42A5F5', gold: '#FFC107', fire: '#FF7043',
  darkSoil: '#3e2723', leaf: '#66BB6A', path: '#A1887F', roof: '#c62828',
  wall: '#EFEBE9', windowGlow: '#FFF9C4', chimney: '#5D4037',
};

// ─── ANIMAÇÕES GLOBAIS ──────────────────────────────────────────────────

const GLOBAL_ANIMS = `
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes cloud-drift { 0%{transform:translateX(-120%)} 100%{transform:translateX(120vw)} }
@keyframes cloud-drift-slow { 0%{transform:translateX(-100%)} 100%{transform:translateX(110vw)} }
@keyframes cloud-drift-fast { 0%{transform:translateX(-150%)} 100%{transform:translateX(130vw)} }
@keyframes windmill-blade { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes fire-flicker { 0%,100%{transform:scale(1) rotate(0deg);opacity:0.95} 25%{transform:scale(1.08) rotate(-1.5deg);opacity:1} 50%{transform:scale(0.94) rotate(1deg);opacity:0.88} 75%{transform:scale(1.06) rotate(-0.5deg);opacity:1} }
@keyframes fire-glow { 0%,100%{box-shadow:0 0 30px rgba(255,120,0,0.35),0 0 70px rgba(255,80,0,0.18)} 50%{box-shadow:0 0 50px rgba(255,180,50,0.55),0 0 100px rgba(255,120,0,0.28)} }
@keyframes spark-rise { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-70px) scale(0);opacity:0} }
@keyframes smoke-rise { 0%{transform:translateY(0) translateX(0) scale(1);opacity:0.18} 100%{transform:translateY(-100px) translateX(18px) scale(3.2);opacity:0} }
@keyframes twinkle { 0%,100%{opacity:0.1} 50%{opacity:0.9} }
@keyframes firefly { 0%,100%{opacity:0;transform:translate(0,0)} 25%{opacity:0.7;transform:translate(15px,-10px)} 50%{opacity:0.9;transform:translate(-8px,-20px)} 75%{opacity:0.5;transform:translate(10px,-5px)} }
@keyframes logo-glow { 0%,100%{filter:brightness(1) drop-shadow(0 0 22px rgba(216,180,74,0.22))} 50%{filter:brightness(1.12) drop-shadow(0 0 40px rgba(216,180,74,0.43))} }
@keyframes crop-grow { 0%{transform:scaleY(0.3)} 100%{transform:scaleY(1)} }
@keyframes river-flow { 0%{background-position:0 0} 100%{background-position:200px 0} }
@keyframes smoke-chimney { 0%{transform:translateY(0) scale(1);opacity:0.35} 100%{transform:translateY(-60px) scale(2.5);opacity:0} }
@keyframes player-idle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes player-blink { 0%,48%,52%,100%{transform:scaleY(1)} 50%{transform:scaleY(0.1)} }
@keyframes slide-up-fade { 0%{opacity:0;transform:translateY(25px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes gold-shine { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.4)} }
@keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.005)} }
@keyframes star-pulse { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:0.9;transform:scale(1.2)} }
@keyframes day-night-cycle {
  0%{--sky-top:#0b1a2e;--sky-bot:#0d1f0d;--sun-color:rgba(255,200,100,0.08);--moon-color:rgba(200,210,255,0.5)}
  25%{--sky-top:#1a3050;--sky-bot:#0e2a1a;--sun-color:rgba(255,180,80,0.15);--moon-color:rgba(200,210,255,0.3)}
  50%{--sky-top:#4a90d9;--sky-bot:#87CEEB;--sun-color:rgba(255,230,150,0.6);--moon-color:transparent}
  75%{--sky-top:#1a3050;--sky-bot:#0e2a1a;--sun-color:rgba(255,180,80,0.15);--moon-color:rgba(200,210,255,0.3)}
  100%{--sky-top:#0b1a2e;--sky-bot:#0d1f0d;--sun-color:rgba(255,200,100,0.08);--moon-color:rgba(200,210,255,0.5)}
}
`;

// ─── SUBCOMPONENTES ──────────────────────────────────────────────────────

/** Nuvem SVG com velocidade única */
function Cloud({ color = '#fff', opacity = 0.7, width = 120, speed = 20, delay = 0, top = '10%' }: any) {
  return (
    <div className="absolute pointer-events-none" style={{ top, animation: `cloud-drift ${speed}s linear ${delay}s infinite`, zIndex: 2 }}>
      <svg width={width} height={width * 0.5} viewBox="0 0 120 60" fill={color} opacity={opacity}>
        <ellipse cx="40" cy="40" rx="30" ry="18" />
        <ellipse cx="65" cy="35" rx="35" ry="22" />
        <ellipse cx="85" cy="38" rx="25" ry="16" />
        <ellipse cx="55" cy="30" rx="20" ry="14" />
      </svg>
    </div>
  );
}

/** Árvore CSS pura */
function Tree({ x, y, scale = 1, type = 'pine' }: { x: number | string; y: number | string; scale?: number; type?: 'pine' | 'round' }) {
  const s = scale * (0.7 + Math.random() * 0.6);
  const h = 60 * s;
  const w = 30 * s;
  const trunkW = 6 * s;
  const trunkH = h * 0.3;
  const hue = 100 + Math.random() * 30;
  if (type === 'round') {
    return (
      <div className="absolute pointer-events-none" style={{ left: x, bottom: y, width: w * 2, height: h, zIndex: 5 }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -trunkW / 2, width: trunkW, height: trunkH, background: '#5D4037', borderRadius: '2px' }} />
        <div style={{ position: 'absolute', bottom: trunkH - 5, left: '50%', marginLeft: -w, width: w * 2, height: w * 1.6, borderRadius: '50%', background: `hsl(${hue},50%,35%)`, boxShadow: `0 0 20px hsla(${hue},50%,25%,0.3)` }} />
        <div style={{ position: 'absolute', bottom: trunkH + 5, left: '50%', marginLeft: -w * 0.6, width: w * 1.2, height: w * 1.2, borderRadius: '50%', background: `hsl(${hue},55%,40%)` }} />
      </div>
    );
  }
  // Pine tree
  return (
    <div className="absolute pointer-events-none" style={{ left: x, bottom: y, width: w * 2, height: h, zIndex: 5 }}>
      <div style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -trunkW / 2, width: trunkW, height: trunkH, background: '#4E342E', borderRadius: '2px' }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: 'absolute', bottom: trunkH + i * h * 0.22, left: '50%',
          marginLeft: -(w * (1 - i * 0.2)), width: w * 2 * (1 - i * 0.2),
          height: h * 0.28,
          clipPath: `polygon(50% 0%, 0% 100%, 100% 100%)`,
          background: `hsl(${hue - i * 8},${50 + i * 5}%,${30 + i * 8}%)`,
          boxShadow: i === 0 ? `0 0 12px hsla(${hue},50%,25%,0.3)` : 'none',
        }} />
      ))}
    </div>
  );
}

/** Planta (crop) com 4 estágios */
function Crop({ stage = 0, x, y, color = '#66BB6A' }: { stage: number; x: number; y: number; color?: string }) {
  const heights = [6, 12, 20, 28];
  const h = heights[clamp(stage, 0, 3)];
  const icons = ['🌱', '🌿', '🌾', '🌻'];
  return (
    <div className="absolute pointer-events-none flex items-end justify-center" style={{ left: x, bottom: y, width: 16, height: 32, zIndex: 6 }}>
      <div style={{
        width: 4, height: h * 0.5, background: '#4E342E', borderRadius: '1px',
        transformOrigin: 'bottom', animation: stage >= 2 ? 'crop-grow 0.5s ease-out' : 'none',
      }} />
      {stage < 2 ? (
        <div className="absolute" style={{ bottom: h * 0.4, fontSize: stage === 0 ? '8px' : '10px', filter: 'drop-shadow(0 0 2px rgba(100,200,100,0.3))' }}>
          {icons[stage]}
        </div>
      ) : (
        <div className="absolute" style={{
          bottom: h * 0.3, width: stage === 2 ? 10 : 14, height: stage === 2 ? 14 : 16,
          background: stage === 2 ? `radial-gradient(circle at 40% 30%, ${color}, #2E7D32)` : color,
          borderRadius: stage === 2 ? '50%' : '40% 60% 50% 50%', boxShadow: `0 0 6px ${color}44`,
          animation: stage >= 3 ? 'gold-shine 2s ease-in-out infinite' : 'none',
        }} />
      )}
    </div>
  );
}

/** Personagem pixel CSS */
function PixelPlayer({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = scale;
  return (
    <div className="absolute pointer-events-none" style={{ left: x, bottom: y, width: 20 * s, height: 32 * s, zIndex: 10, animation: 'player-idle 2s ease-in-out infinite' }}>
      {/* Body */}
      <div style={{ position: 'absolute', bottom: 10 * s, left: '50%', marginLeft: -6 * s, width: 12 * s, height: 14 * s, background: '#5D4037', borderRadius: '3px' }} />
      {/* Head */}
      <div style={{ position: 'absolute', bottom: 22 * s, left: '50%', marginLeft: -7 * s, width: 14 * s, height: 12 * s, background: '#FFCCBC', borderRadius: '5px 5px 3px 3px' }} />
      {/* Hat */}
      <div style={{ position: 'absolute', bottom: 30 * s, left: '50%', marginLeft: -8 * s, width: 16 * s, height: 5 * s, background: '#8D6E63', borderRadius: '2px 2px 0 0' }} />
      <div style={{ position: 'absolute', bottom: 33 * s, left: '50%', marginLeft: -6 * s, width: 12 * s, height: 4 * s, background: '#A1887F', borderRadius: '50%' }} />
      {/* Eyes */}
      <div style={{ position: 'absolute', bottom: 26 * s, left: '50%', marginLeft: -5 * s, width: 3 * s, height: 3 * s, background: '#333', borderRadius: '50%', animation: 'player-blink 3s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: 26 * s, left: '50%', marginLeft: 2 * s, width: 3 * s, height: 3 * s, background: '#333', borderRadius: '50%', animation: 'player-blink 3s ease-in-out infinite' }} />
      {/* Legs */}
      <div style={{ position: 'absolute', bottom: 2 * s, left: '50%', marginLeft: -5 * s, width: 4 * s, height: 8 * s, background: '#3E2723', borderRadius: '2px' }} />
      <div style={{ position: 'absolute', bottom: 2 * s, left: '50%', marginLeft: 1 * s, width: 4 * s, height: 8 * s, background: '#3E2723', borderRadius: '2px' }} />
      {/* Tool (hoe) */}
      <div style={{ position: 'absolute', bottom: 16 * s, right: -4 * s, width: 2 * s, height: 14 * s, background: '#8D6E63', borderRadius: '1px', transform: 'rotate(-15deg)', transformOrigin: 'bottom' }} />
      <div style={{ position: 'absolute', bottom: 16 * s, right: -6 * s, width: 6 * s, height: 2 * s, background: '#616161', borderRadius: '1px', transform: 'rotate(-15deg)', transformOrigin: 'bottom' }} />
    </div>
  );
}

/** Moinho com pás girando */
function Windmill({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = scale;
  return (
    <div className="absolute pointer-events-none" style={{ left: x, bottom: y, width: 40 * s, height: 60 * s, zIndex: 6 }}>
      {/* Base */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -12 * s, width: 24 * s, height: 30 * s, background: '#8D6E63', clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }} />
      {/* Roof */}
      <div style={{ position: 'absolute', bottom: 28 * s, left: '50%', marginLeft: -16 * s, width: 32 * s, height: 14 * s, background: '#5D4037', clipPath: 'polygon(10% 100%, 90% 100%, 50% 0%)' }} />
      {/* Blades */}
      <div style={{
        position: 'absolute', bottom: 36 * s, left: '50%', marginLeft: -2 * s,
        width: 4 * s, height: 4 * s, background: '#333', borderRadius: '50%',
        animation: 'windmill-blade 4s linear infinite', transformOrigin: 'center',
      }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            position: 'absolute', top: -16 * s, left: -1 * s, width: 2 * s, height: 18 * s,
            background: '#BCAAA4', borderRadius: '1px',
            transform: `rotate(${i * 90}deg)`, transformOrigin: 'center 20px',
          }} />
        ))}
      </div>
    </div>
  );
}

/** Casa completa */
function House({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = scale;
  return (
    <div className="absolute pointer-events-none" style={{ left: x, bottom: y, width: 70 * s, height: 55 * s, zIndex: 6 }}>
      {/* Chaminé */}
      <div style={{ position: 'absolute', bottom: 42 * s, right: 8 * s, width: 10 * s, height: 16 * s, background: PALETTE.chimney, borderRadius: '2px' }} />
      <div style={{ position: 'absolute', bottom: 56 * s, right: 6 * s, width: 14 * s, height: 3 * s, background: '#4E342E', borderRadius: '1px' }} />
      {/* Fumaça */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute rounded-full" style={{
          bottom: 57 * s, right: (10 + i * 4) * s, width: (6 + i * 3) * s, height: (6 + i * 3) * s,
          background: 'rgba(200,200,200,0.12)', animation: `smoke-chimney ${2.5 + i * 0.5}s ease-out ${i * 0.4}s infinite`,
        }} />
      ))}
      {/* Paredes */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -30 * s, width: 60 * s, height: 35 * s, background: PALETTE.wall, borderRadius: '3px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)' }} />
      {/* Telhado */}
      <div style={{ position: 'absolute', bottom: 33 * s, left: '50%', marginLeft: -35 * s, width: 70 * s, height: 20 * s, background: PALETTE.roof, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', borderRadius: '3px 3px 0 0' }} />
      {/* Porta */}
      <div style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -6 * s, width: 12 * s, height: 22 * s, background: '#5D4037', borderRadius: '3px 3px 0 0', border: '1px solid #3E2723' }} />
      <div style={{ position: 'absolute', bottom: 10 * s, left: '50%', marginLeft: 2 * s, width: 2 * s, height: 2 * s, background: PALETTE.gold, borderRadius: '50%' }} />
      {/* Janelas */}
      {[-1, 1].map((side) => (
        <div key={side} style={{
          position: 'absolute', bottom: 16 * s, left: `calc(50% + ${side * 16}px)`, marginLeft: -7 * s,
          width: 14 * s, height: 12 * s, background: PALETTE.windowGlow, borderRadius: '2px',
          border: '2px solid #5D4037', boxShadow: '0 0 8px rgba(255,249,196,0.4)',
        }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 2 * s, height: '100%', background: '#5D4037' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 2 * s, background: '#5D4037' }} />
        </div>
      ))}
    </div>
  );
}

/** Planta baixa de casa (para seção Building) */
function MiniHouse({ className }: { className?: string }) {
  return (
    <div className={`relative inline-block ${className || ''}`} style={{ width: 60, height: 50 }}>
      <div style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -25, width: 50, height: 30, background: PALETTE.wall, borderRadius: 3, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)' }} />
      <div style={{ position: 'absolute', bottom: 28, left: '50%', marginLeft: -30, width: 60, height: 18, background: PALETTE.roof, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -5, width: 10, height: 18, background: '#5D4037', borderRadius: '2px 2px 0 0' }} />
      <div style={{ position: 'absolute', bottom: 2, left: 8, width: 10, height: 10, background: PALETTE.windowGlow, borderRadius: 2, border: '1px solid #5D4037' }} />
      <div style={{ position: 'absolute', bottom: 2, right: 8, width: 10, height: 10, background: PALETTE.windowGlow, borderRadius: 2, border: '1px solid #5D4037' }} />
    </div>
  );
}

/** Card animado de gameplay */
function GameplayCard({ icon, title, desc, color = PALETTE.grass, delay = 0 }: { icon: string; title: string; desc: string; color?: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="flex flex-col items-center text-center p-5 rounded-xl transition-all duration-500 hover:-translate-y-2 cursor-default"
      style={{
        background: 'linear-gradient(180deg, rgba(30,20,10,0.85), rgba(15,8,3,0.95))',
        border: `1px solid ${color}44`, boxShadow: `0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 ${color}22`,
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: `all 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}>
      <div className="text-4xl mb-3" style={{ filter: `drop-shadow(0 0 12px ${color}44)` }}>{icon}</div>
      <h3 className="text-sm font-bold mb-1.5 tracking-wide" style={{ fontFamily: "'Press Start 2P', monospace", color }}>{title}</h3>
      <p className="text-xs leading-relaxed opacity-80" style={{ fontFamily: "'VT323', monospace", fontSize: '15px' }}>{desc}</p>
    </div>
  );
}

/** Slide da galeria */
function GallerySlide({ image, title, desc, active }: { image: string; title: string; desc: string; active: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center transition-all duration-700" style={{ opacity: active ? 1 : 0, transform: active ? 'scale(1)' : 'scale(0.9)' }}>
      <div className="rounded-xl overflow-hidden border border-amber-800/30 max-w-lg w-full mx-4" style={{ background: 'linear-gradient(180deg, rgba(30,20,10,0.9), rgba(15,8,3,0.95))', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div className="h-48 flex items-center justify-center text-7xl" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(100,200,100,0.1), transparent)' }}>{image}</div>
        <div className="p-5">
          <h3 className="text-sm font-bold mb-2" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.gold }}>{title}</h3>
          <p className="text-sm leading-relaxed" style={{ fontFamily: "'VT323', monospace" }}>{desc}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [sfxOn, setSfxOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const audioRef = useRef(getAudioEngine());

  // Parallax scroll
  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  // Galeria slider automático
  useEffect(() => {
    const timer = setInterval(() => setGalleryIndex((i) => (i + 1) % gallerySlides.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Áudio
  useEffect(() => {
    const audio = audioRef.current;
    audio.setSFXVolume(0.7);
    audio.setMusicVolume(0.5);
  }, []);

  const toggleSfx = useCallback(() => { setSfxOn((v) => !v); audioRef.current.setSFXMuted(sfxOn); }, [sfxOn]);
  const toggleMusic = useCallback(() => { setMusicOn((v) => !v); audioRef.current.setMusicMuted(musicOn); }, [musicOn]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const gallerySlides = [
    { image: '🌾', title: 'Plantio & Colheita', desc: 'Cultive trigo, cenoura, batata e abóbora. Cada estação traz novos desafios e recompensas.' },
    { image: '⚔️', title: 'Combate Épico', desc: 'Enfrente lobos, esqueletos, golems e dragões. Derrote chefes lendários como o Shadow Lord.' },
    { image: '🪨', title: 'Mineração', desc: 'Explore cavernas profundas em busca de minérios raros: mitril, rubi e cristais mágicos.' },
    { image: '🏠', title: 'Construção', desc: 'Construa sua casa, fornalha, bancada e baús. Crie seu próprio vilarejo safe zone.' },
    { image: '🎣', title: 'Pesca', desc: 'Pesque em rios e lagos para conseguir alimentos e itens raros como o Peixe do Vácuo.' },
    { image: '🔮', title: 'Craft & Equipamentos', desc: 'Forje espadas, armaduras, anéis e amuletos. Encante seus itens com afixos mágicos.' },
  ];

  const roadmapItems = [
    { phase: 'Alpha 1.0', title: 'Fundações', desc: 'Mundo aberto, biomas, crafting básico, farming, combate simples', done: true },
    { phase: 'Alpha 2.0', title: 'Cavernas & Chefes', desc: 'Sistema de masmorras, chefes lendários, equipamentos raros', done: true },
    { phase: 'Alpha 3.0', title: 'NPCs & Economia', desc: 'Vendedores, ferreiros, alquimistas, sistema de missões', done: true },
    { phase: 'Beta 1.0', title: 'Multiplayer', desc: 'Cooperativo, trading entre jogadores, eventos mundiais', done: false },
    { phase: 'Beta 2.0', title: 'Expansão', desc: 'Novos biomas (vulcânico, gelo, subaquático), montarias', done: false },
    { phase: '1.0', title: 'Lançamento', desc: 'História completa, conquistas, endless mode, workshop', done: false },
  ];

  const navLinks = [
    { id: 'gameplay', label: 'Gameplay' }, { id: 'survival', label: 'Sobrevivência' },
    { id: 'building', label: 'Construção' }, { id: 'craft', label: 'Craft' },
    { id: 'gallery', label: 'Galeria' }, { id: 'roadmap', label: 'Roadmap' },
  ];

  const parallax = (speed: number) => scrollY * speed;

  return (
    <>
      <style>{GLOBAL_ANIMS}</style>

      {/* ─── NAVBAR ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-between"
        style={{
          background: 'linear-gradient(180deg, rgba(10,5,2,0.92), rgba(10,5,2,0.7))',
          borderBottom: '1px solid rgba(180,140,60,0.2)',
          backdropFilter: 'blur(8px)',
          fontFamily: "'Press Start 2P', monospace",
        }}>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="text-lg">🌾</span>
          <span className="text-[10px] tracking-wider hidden sm:inline" style={{ color: PALETTE.gold }}>FARM SURVIVAL</span>
        </div>
        <div className="hidden md:flex items-center gap-5">
          {navLinks.map((l) => (
            <button key={l.id} onClick={() => scrollTo(l.id)}
              className="text-[8px] tracking-wider transition-colors duration-200 hover:text-amber-300"
              style={{ color: '#c8b89a' }}>{l.label}</button>
          ))}
          <button onClick={() => navigate('/auth')}
            className="px-4 py-1.5 rounded text-[8px] font-bold tracking-wider text-white transition-all duration-200 hover:brightness-110"
            style={{ background: 'linear-gradient(180deg, #64bb45, #3e9127)', border: '2px solid #4a8a2a', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            JOGAR
          </button>
        </div>
        <button className="md:hidden text-xl" style={{ color: PALETTE.gold }} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 md:hidden" style={{ background: 'rgba(10,5,2,0.97)', fontFamily: "'Press Start 2P', monospace" }}>
          {navLinks.map((l) => (
            <button key={l.id} onClick={() => scrollTo(l.id)} className="text-sm tracking-wider text-amber-200 hover:text-amber-400">{l.label}</button>
          ))}
          <button onClick={() => navigate('/auth')} className="px-6 py-2 rounded text-xs font-bold text-white"
            style={{ background: 'linear-gradient(180deg, #64bb45, #3e9127)', border: '2px solid #4a8a2a' }}>
            JOGAR
          </button>
          <button onClick={() => setMenuOpen(false)} className="text-white/40 text-xs mt-4">✕ Fechar</button>
        </div>
      )}

      {/* ─── HERO ───────────────────────────────────────────────────── */}
      <section id="hero" className="relative w-full overflow-hidden" style={{ height: '100vh', minHeight: '600px', fontFamily: "'VT323', monospace" }}>
        {/* Sky day/night */}
        <div className="absolute inset-0 transition-colors duration-[2000ms]" style={{
          background: `linear-gradient(180deg,
            hsl(${210 + Math.sin(scrollY * 0.002) * 20}, ${50 + Math.sin(scrollY * 0.001) * 20}%, ${10 + Math.sin(scrollY * 0.002) * 20}%),
            hsl(${200 + Math.sin(scrollY * 0.001) * 15}, ${40 + Math.sin(scrollY * 0.001) * 20}%, ${15 + Math.sin(scrollY * 0.002) * 30}%)
          )`,
        }}>
          {/* Stars (visible at night) */}
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none" style={{
              left: `${(i * 29 + 13) % 100}%`, top: `${(i * 17 + 7) % 55}%`,
              width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`,
              background: '#fff', opacity: `${0.1 + Math.sin(i) * 0.3}`,
              animation: `star-pulse ${2 + (i % 4)}s ease-in-out ${i * 0.2}s infinite`,
              filter: `brightness(${1.5 - Math.abs(Math.sin(scrollY * 0.001)) * 1.2})`,
            }} />
          ))}
        </div>

        {/* Sol / Lua */}
        <div className="absolute rounded-full pointer-events-none transition-all duration-[3000ms]" style={{
          right: '12%', top: `${8 + parallax(0.02)}%`,
          width: 'clamp(40px,6vw,65px)', height: 'clamp(40px,6vw,65px)',
          background: `radial-gradient(circle at 35% 35%, ${Math.sin(scrollY * 0.002) > 0 ? '#f5f0d0,#d4c89a' : '#e8e8f0,#a0a0c0'})`,
          boxShadow: `0 0 ${Math.max(10, 40 + Math.sin(scrollY * 0.002) * 30)}px rgba(245,240,200,${Math.max(0.05, Math.sin(scrollY * 0.002) * 0.3)})`,
          animation: 'float 6s ease-in-out infinite',
        }} />

        {/* Nuvens (3 camadas com velocidades diferentes) */}
        <Cloud color="#f0f4f8" opacity={0.6} width={140} speed={35} delay={0} top="6%" />
        <Cloud color="#e8edf2" opacity={0.4} width={180} speed={50} delay={8} top="12%" />
        <Cloud color="#dce4ec" opacity={0.3} width={100} speed={25} delay={3} top="4%" />
        <Cloud color="#eef2f6" opacity={0.5} width={160} speed={42} delay={15} top="18%" />
        <Cloud color="#f5f8fa" opacity={0.35} width={120} speed={30} delay={5} top="8%" />

        {/* Montanhas — 3 camadas SVG (parallax em velocidade) */}
        <div className="absolute bottom-0 w-full pointer-events-none" style={{ height: '60%', transform: `translateY(${parallax(0.05)}px)`, zIndex: 1 }}>
          <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 500" preserveAspectRatio="none" style={{ height: '70%' }}>
            <path d="M0,500 L0,380 L80,350 L180,400 L280,330 L380,370 L480,290 L580,340 L680,270 L780,320 L880,250 L980,300 L1080,260 L1200,310 L1200,500Z" fill="#1a2a1a" opacity="0.35" />
            <path d="M0,500 L0,400 L100,360 L220,410 L320,340 L440,380 L540,310 L640,360 L740,290 L840,340 L940,280 L1040,330 L1140,290 L1200,340 L1200,500Z" fill="#1d301d" opacity="0.5" />
            <path d="M0,500 L0,430 L120,390 L240,440 L360,360 L480,410 L580,340 L680,390 L780,320 L880,380 L980,310 L1080,360 L1200,330 L1200,500Z" fill="#2a402a" opacity="0.65" />
          </svg>
        </div>

        {/* Floresta — dezenas de árvores posicionadas por JS */}
        <div className="absolute bottom-0 w-full pointer-events-none" style={{ height: '50%', transform: `translateY(${parallax(0.12)}px)`, zIndex: 3 }}>
          {Array.from({ length: 48 }).map((_, i) => {
            const col = i % 12;
            const row = Math.floor(i / 12);
            const x = (col / 12) * 100 + (Math.random() - 0.5) * 8;
            const y = 5 + row * 12 + Math.random() * 6;
            return <Tree key={i} x={`${x}%`} y={`${y}%`} scale={0.6 + Math.random() * 0.5} type={i % 3 === 0 ? 'round' : 'pine'} />;
          })}
        </div>

        {/* Rio */}
        <div className="absolute bottom-0 w-full pointer-events-none" style={{ height: '22%', zIndex: 4, overflow: 'hidden' }}>
          {/* Rio — ondas CSS */}
          <div className="absolute bottom-0 w-[200%] h-full" style={{
            background: `repeating-linear-gradient(90deg,
              rgba(66,165,245,0.25) 0px, rgba(66,165,245,0.15) 40px,
              rgba(100,181,246,0.2) 80px, rgba(66,165,245,0.1) 120px,
              rgba(66,165,245,0.25) 160px
            )`,
            backgroundSize: '200px 100%',
            animation: 'river-flow 4s linear infinite',
            maskImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 20%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.8) 100%)',
          }} />
          {/* Espuma/brilho */}
          <div className="absolute" style={{ bottom: '30%', left: '20%', width: '30px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', animation: 'float 3s ease-in-out infinite' }} />
          <div className="absolute" style={{ bottom: '20%', right: '30%', width: '20px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '50%', animation: 'float 4s ease-in-out infinite 1s' }} />
        </div>

        {/* Gramado */}
        <div className="absolute bottom-0 w-full pointer-events-none" style={{ height: '30%', zIndex: 5 }}>
          <div className="absolute bottom-0 w-full h-full" style={{
            background: 'linear-gradient(180deg, #1a4010 0%, #185010 25%, #155008 50%, #104006 75%, #0c2a04 100%)',
          }} />
          {/* Textura da grama */}
          <div className="absolute bottom-0 w-full h-1/2" style={{
            background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 8px, rgba(60,160,60,0.08) 8px, rgba(60,160,60,0.08) 10px, transparent 10px, transparent 18px)',
            backgroundSize: '18px 100%',
          }} />
          {/* Flores */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="absolute text-xs" style={{
              left: `${3 + (i * 7 + 2) % 94}%`, bottom: `${3 + (i * 5 + 1) % 15}%`,
              animation: `float ${2.5 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
              opacity: 0.6, zIndex: 5,
            }}>
              {['🌸', '🌼', '🌺', '🌷', '🌻'][i % 5]}
            </div>
          ))}
          {/* Pedras */}
          {[{ l: 8, b: 4, s: 6 }, { l: 22, b: 6, s: 4 }, { l: 38, b: 3, s: 8 }, { l: 55, b: 5, s: 5 }, { l: 72, b: 2, s: 7 }, { l: 88, b: 7, s: 4 }].map((r, i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: `${r.l}%`, bottom: `${r.b}%`, width: r.s, height: Math.max(3, r.s - 1),
              background: '#3a3a3a', borderRadius: '40% 60% 50% 50% / 50% 50% 40% 60%',
              boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.3)', zIndex: 5,
            }} />
          ))}
          {/* Arbustos */}
          {[{ l: 15, b: 8, s: 12 }, { l: 48, b: 6, s: 10 }, { l: 82, b: 9, s: 14 }].map((b, i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: `${b.l}%`, bottom: `${b.b}%`, width: b.s, height: b.s * 0.7,
              background: '#2E7D32', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 5,
              opacity: 0.7,
            }} />
          ))}
        </div>

        {/* Casa */}
        <div className="absolute" style={{ left: '15%', bottom: '2%', transform: `translateY(${parallax(0.2)}px)`, zIndex: 7 }}>
          <House x={0} y={0} scale={1.1} />
        </div>

        {/* Moinho */}
        <div className="absolute" style={{ right: '20%', bottom: '3%', transform: `translateY(${parallax(0.15)}px)`, zIndex: 6 }}>
          <Windmill x={0} y={0} scale={1.2} />
        </div>

        {/* Plantação */}
        <div className="absolute" style={{ left: '35%', bottom: '3%', zIndex: 7, transform: `translateY(${parallax(0.18)}px)` }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[2, 3, 1, 3, 0, 2].map((stage, i) => (
              <Crop key={i} stage={stage} x={i * 18} y={0} color={['#66BB6A', '#FFC107', '#8D6E63', '#FF7043', '#AB47BC', '#66BB6A'][i]} />
            ))}
          </div>
        </div>

        {/* Personagem */}
        <div className="absolute" style={{ left: '52%', bottom: '4%', zIndex: 10, transform: `translateY(${parallax(0.25)}px)` }}>
          <PixelPlayer x={0} y={0} scale={1.3} />
        </div>

        {/* Fogueira */}
        <div className="absolute" style={{ left: '73%', bottom: '3.5%', zIndex: 8, transform: `translateY(${parallax(0.2)}px)` }}>
          <div className="relative flex flex-col items-center">
            <div className="absolute rounded-full pointer-events-none" style={{
              width: 'clamp(60px,8vw,90px)', height: 'clamp(60px,8vw,90px)', bottom: '2px',
              background: 'radial-gradient(circle, rgba(255,120,0,0.15) 0%, transparent 70%)',
              animation: 'fire-glow 1s ease-in-out infinite',
            }} />
            {[0, 1, 2].map((i) => (
              <div key={i} className="absolute rounded-full pointer-events-none" style={{
                width: `${6 + i * 3}px`, height: `${6 + i * 3}px`, bottom: '38px',
                background: 'rgba(150,130,110,0.12)',
                animation: `smoke-rise ${2 + i * 0.4}s ease-out ${i * 0.35}s infinite`,
                left: `${(i - 1) * 5}px`,
              }} />
            ))}
            <div className="text-[clamp(22px,3.5vw,34px)] pointer-events-none leading-none"
              style={{ filter: 'drop-shadow(0 0 18px rgba(255,160,50,0.45))', animation: 'fire-flicker 0.8s ease-in-out infinite' }}>
              🔥
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="absolute rounded-full pointer-events-none" style={{
                width: '2px', height: '2px', bottom: '24px', left: `${(i - 1) * 6}px`,
                background: '#ffaa33', boxShadow: '0 0 3px 1px rgba(255,170,50,0.5)',
                animation: `spark-rise ${0.6 + i * 0.15}s ease-out ${i * 0.2}s infinite`,
              }} />
            ))}
            {/* Círculo de pedras */}
            <div className="flex items-end justify-center" style={{ width: '44px', height: '12px' }}>
              {[-18, -9, 0, 9, 18].map((x, i) => (
                <div key={i} className="absolute rounded-full" style={{
                  left: `calc(50% + ${x}px)`, bottom: 0, width: '11px', height: '8px',
                  background: 'radial-gradient(circle at 35% 30%, #6a6a6a, #333)',
                  boxShadow: 'inset 0 -2px 2px rgba(0,0,0,0.4)',
                }} />
              ))}
            </div>
            <div style={{ width: '50px', height: '4px', marginTop: '-1px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,140,40,0.35), transparent 70%)' }} />
          </div>
        </div>

        {/* Vagalumes */}
        {[{ l: 20, b: 18 }, { l: 55, b: 22 }, { l: 38, b: 16 }, { l: 80, b: 20 }, { l: 65, b: 14 }].map((f, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            left: `${f.l}%`, bottom: `${f.b}%`, width: 3, height: 3,
            background: '#d9f57a', boxShadow: '0 0 6px 2px rgba(217,245,122,0.6)',
            animation: `firefly ${3.5 + i}s ease-in-out ${i * 0.6}s infinite`, zIndex: 8,
          }} />
        ))}

        {/* Overlay Hero — título + CTA sobreposto à cena */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none" style={{ transform: `translateY(${parallax(0.3)}px)` }}>
          <div className="pointer-events-auto" style={{ animation: 'logo-glow 3s ease-in-out infinite' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-[2px] flex-1 max-w-[40px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(216,180,74,0.4))' }} />
              <div className="w-[5px] h-[5px] rotate-45" style={{ background: '#caa04c', boxShadow: '0 0 6px rgba(216,180,74,0.6)' }} />
              <div className="h-[2px] flex-1 max-w-[40px]" style={{ background: 'linear-gradient(90deg, rgba(216,180,74,0.4), transparent)' }} />
            </div>
            <h1 className="text-[clamp(24px,5vw,60px)] font-black tracking-[0.12em] leading-none text-center"
              style={{ fontFamily: "'Press Start 2P', monospace", color: '#f5c842',
                textShadow: '2px 2px 0 #8a5a10, 4px 4px 0 #6a4a08, 6px 6px 0 rgba(0,0,0,0.4), 0 0 30px rgba(245,200,66,0.25)' }}>
              FARM<br />SURVIVAL
            </h1>
          </div>
          <div className="mt-3 px-4 py-1.5 rounded-sm pointer-events-auto" style={{ background: 'rgba(20,10,3,0.6)', border: '1px solid rgba(180,140,60,0.2)' }}>
            <p className="text-[15px] tracking-[0.2em] font-bold" style={{ color: '#d9c79a' }}>SOBREVIVA · EXPLORE · FORJE · EVOLUA</p>
          </div>
          <div className="mt-5 flex gap-4 pointer-events-auto">
            <button onClick={() => navigate('/auth')}
              className="group relative px-8 py-3 rounded text-white font-bold transition-all duration-150 active:translate-y-[3px]"
              style={{ fontFamily: "'Press Start 2P', monospace", background: 'linear-gradient(180deg, #64bb45, #3e9127, #2a6a12)', border: '3px solid #4a8a2a', boxShadow: '0 5px 0 #1a4a08, 0 10px 24px rgba(0,0,0,0.5)', fontSize: 'clamp(10px,1.4vw,13px)' }}>
              ▶ JOGAR AGORA
            </button>
            <button onClick={() => scrollTo('gameplay')}
              className="px-6 py-3 rounded text-white/80 font-bold transition-all duration-150 hover:text-white"
              style={{ fontFamily: "'Press Start 2P', monospace", border: '2px solid rgba(180,140,60,0.3)', fontSize: 'clamp(8px,1.2vw,11px)' }}>
              SAIBA MAIS
            </button>
          </div>
          {/* Scroll indicator */}
          <div className="absolute bottom-6 pointer-events-auto animate-bounce">
            <div className="w-5 h-8 rounded-full border-2 border-white/20 flex justify-center pt-1.5">
              <div className="w-1 h-2 rounded-full bg-white/40" />
            </div>
          </div>
        </div>

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none z-15" style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.4) 100%)' }} />
      </section>

      {/* ─── GAMEPLAY ──────────────────────────────────────────────── */}
      <section id="gameplay" className="relative py-24 px-4" style={{ background: 'linear-gradient(180deg, #0d1f0d, #0a150a)', fontFamily: "'VT323', monospace" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-4xl mb-3 block">🎮</span>
            <h2 className="text-xl font-bold tracking-wider" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.gold }}>GAMEPLAY</h2>
            <div className="w-16 h-1 mx-auto mt-3 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${PALETTE.gold}88, transparent)` }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <GameplayCard icon="🌾" title="FARM" desc="Cultive alimentos, gerencie plantações e colha os frutos do seu trabalho em 4 estações." color={PALETTE.grass} delay={0} />
            <GameplayCard icon="⛏️" title="MINING" desc="Explore cavernas geradas proceduralmente em busca de minérios raros e cristais mágicos." color={PALETTE.stone} delay={0.1} />
            <GameplayCard icon="🎣" title="FISHING" desc="Pesque em rios e lagos. Use iscas especiais para pegar espécies lendárias." color={PALETTE.water} delay={0.2} />
            <GameplayCard icon="🔨" title="CRAFT" desc="Forje ferramentas, armas, armaduras e itens mágicos na bancada e fornalha." color={PALETTE.fire} delay={0.3} />
            <GameplayCard icon="🏗️" title="BUILDING" desc="Construa sua casa, celeiro, fornalha e crie sua própria zona segura." color={PALETTE.wood} delay={0.4} />
            <GameplayCard icon="⚔️" title="COMBAT" desc="Enfrente inimigos e chefes épicos. Evolua suas armas e domine o combate." color="#ff4444" delay={0.5} />
          </div>
        </div>
      </section>

      {/* ─── SOBREVIVÊNCIA ─────────────────────────────────────────── */}
      <section id="survival" className="relative py-24 px-4" style={{ background: 'linear-gradient(180deg, #0a150a, #0d1a0d)', fontFamily: "'VT323', monospace" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <span className="text-5xl mb-4 block">🏕️</span>
            <h2 className="text-lg font-bold tracking-wider mb-4" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.grass }}>SOBREVIVÊNCIA</h2>
            <p className="text-base leading-relaxed mb-4 opacity-80">Gerencie sua fome, energia e vida enquanto explora um mundo aberto. Cada bioma oferece recursos únicos e desafios diferentes.</p>
            <div className="space-y-3">
              {[
                { icon: '❤️', label: 'Vida & Fome', desc: 'Mantenha seus status para não morrer' },
                { icon: '🌡️', label: 'Clima & Estações', desc: 'Primavera, verão, outono e inverno afetam o jogo' },
                { icon: '🌙', label: 'Ciclo Dia/Noite', desc: 'Monstros mais fortes aparecem à noite' },
                { icon: '🏠', label: 'Zona Segura', desc: 'Sua base é protegida contra inimigos' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg transition-all hover:-translate-y-0.5 cursor-default" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-xl">{s.icon}</span>
                  <div><div className="text-sm font-bold" style={{ color: PALETTE.gold }}>{s.label}</div><div className="text-xs opacity-60">{s.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-64 h-64 rounded-2xl overflow-hidden border border-green-900/30" style={{ background: 'linear-gradient(135deg, #1a3a1a, #0d1f0d)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">🌙</div>
                  <div className="text-4xl">☀️</div>
                  <div className="mt-3 text-xs opacity-60">Ciclo dia/noite dinâmico</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONSTRUÇÃO ────────────────────────────────────────────── */}
      <section id="building" className="relative py-24 px-4" style={{ background: 'linear-gradient(180deg, #0d1a0d, #0f1a0a)', fontFamily: "'VT323', monospace" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-4xl mb-3 block">🏗️</span>
            <h2 className="text-xl font-bold tracking-wider" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.wood }}>CONSTRUÇÃO</h2>
            <div className="w-16 h-1 mx-auto mt-3 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${PALETTE.wood}88, transparent)` }} />
          </div>
          {/* Vila em CSS */}
          <div className="flex flex-wrap items-end justify-center gap-6 mb-12 px-4 py-8 rounded-xl" style={{ background: 'linear-gradient(180deg, rgba(30,20,10,0.5), rgba(10,5,2,0.5))', border: '1px solid rgba(180,140,60,0.15)' }}>
            <div className="flex flex-col items-center gap-2">
              <MiniHouse />
              <span className="text-[10px] opacity-60">Casa</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-14 rounded-t-lg" style={{ background: 'linear-gradient(180deg, #5D4037, #3E2723)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <div className="w-full h-3 rounded-t-lg" style={{ background: '#FF7043' }} />
              </div>
              <div className="w-12 h-2 rounded" style={{ background: '#4E342E' }} />
              <span className="text-[10px] opacity-60 mt-1">Fornalha</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-14 h-10 rounded" style={{ background: 'linear-gradient(180deg, #8D6E63, #5D4037)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', borderTop: '3px solid #A1887F' }}>
                <div className="flex justify-center mt-1 gap-1">
                  <div className="w-4 h-3 rounded-sm" style={{ background: '#A1887F' }} />
                  <div className="w-4 h-3 rounded-sm" style={{ background: '#A1887F' }} />
                </div>
              </div>
              <span className="text-[10px] opacity-60 mt-1">Bancada</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full" style={{ background: 'radial-gradient(circle at 40% 30%, #8D6E63, #5D4037)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <div className="w-full h-1 mt-3" style={{ background: '#BCAAA4' }} />
              </div>
              <span className="text-[10px] opacity-60 mt-1">Baú</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-10 rounded" style={{ background: '#4CAF50', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <div className="flex flex-wrap justify-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ background: i % 2 === 0 ? '#66BB6A' : '#388E3C' }} />)}
                </div>
              </div>
              <span className="text-[10px] opacity-60 mt-1">Plantação</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-6 h-12 rounded-b-full" style={{ background: 'linear-gradient(180deg, #8D6E63, #5D4037)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <div className="w-full h-2 rounded-full mt-1" style={{ background: '#BCAAA4', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
              </div>
              <span className="text-[10px] opacity-60 mt-1">Poço</span>
            </div>
          </div>
          <p className="text-center text-sm opacity-70 max-w-xl mx-auto">Construa, organize e personalize sua base. Cada estrutura tem uma função única no seu progresso.</p>
        </div>
      </section>

      {/* ─── EXPLORAÇÃO ────────────────────────────────────────────── */}
      <section id="exploration" className="relative py-24 px-4" style={{ background: 'linear-gradient(180deg, #0f1a0a, #0a150a)', fontFamily: "'VT323', monospace" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="flex-1">
            <span className="text-5xl mb-4 block">🗺️</span>
            <h2 className="text-lg font-bold tracking-wider mb-4" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.sky }}>EXPLORAÇÃO</h2>
            <p className="text-base leading-relaxed mb-4 opacity-80">Descubra 13+ biomas únicos, desde florestas densas até desertos áridos. Encontre cavernas, ruínas e masmorras escondidas.</p>
            <div className="flex flex-wrap gap-2">
              {['🌲 Floresta', '🏜️ Deserto', '⛰️ Montanhas', '🌊 Lago', '🏚️ Ruínas', '🏡 Vila', '🧊 Tundra'].map((b, i) => (
                <span key={i} className="px-2.5 py-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>{b}</span>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-64 h-64 rounded-2xl overflow-hidden border border-blue-900/30" style={{ background: 'linear-gradient(135deg, #0d2137, #0a1525)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-7xl mb-2">🏔️</div>
                  <div className="text-xs opacity-60">Mundo 200×200 tiles</div>
                  <div className="flex justify-center gap-1 mt-2">
                    {['🌲', '🏜️', '⛰️', '🌊', '🏚️'].map((e, i) => <span key={i} className="text-lg">{e}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CRAFT ─────────────────────────────────────────────────── */}
      <section id="craft" className="relative py-24 px-4" style={{ background: 'linear-gradient(180deg, #0a150a, #0d1a0d)', fontFamily: "'VT323', monospace" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-4xl mb-3 block">🔨</span>
            <h2 className="text-xl font-bold tracking-wider" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.fire }}>CRAFT</h2>
            <div className="w-16 h-1 mx-auto mt-3 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${PALETTE.fire}88, transparent)` }} />
          </div>
          {/* Árvore tecnológica visual */}
          <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto">
            {[
              { label: '🌲 Madeira → Ferramentas Básicas', color: '#8D6E63', level: 1 },
              { label: '🪨 Pedra → Ferramentas Reforçadas', color: '#9E9E9E', level: 3 },
              { label: '⛓️ Ferro → Armaduras & Armas', color: '#B0BEC5', level: 5 },
              { label: '✨ Ouro → Itens Encantados', color: PALETTE.gold, level: 8 },
              { label: '💎 Cristal → Equipamentos Mágicos', color: '#CE93D8', level: 12 },
              { label: '🌑 Vácuo → Arsenal Lendário', color: '#7E57C2', level: 15 },
            ].map((tier, i) => (
              <div key={i} className="w-full group">
                <div className="flex items-center gap-3 p-3 rounded-lg transition-all duration-300 group-hover:-translate-y-0.5 cursor-default" style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`,
                  border: `1px solid ${tier.color}33`, boxShadow: `0 2px 8px rgba(0,0,0,0.2)`,
                }}>
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${tier.color}22`, border: `2px solid ${tier.color}66`, color: tier.color }}>{tier.level}</div>
                  <div className="flex-1 text-sm">{tier.label}</div>
                  <div className="text-[10px] opacity-40">Nv. {tier.level}+</div>
                </div>
                {i < 5 && <div className="w-0.5 h-4 mx-auto opacity-20" style={{ background: tier.color }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GALERIA ───────────────────────────────────────────────── */}
      <section id="gallery" className="relative py-24 px-4" style={{ background: 'linear-gradient(180deg, #0d1a0d, #0a150a)', fontFamily: "'VT323', monospace" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-4xl mb-3 block">📸</span>
            <h2 className="text-xl font-bold tracking-wider" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.gold }}>GALERIA</h2>
            <div className="w-16 h-1 mx-auto mt-3 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${PALETTE.gold}88, transparent)` }} />
          </div>
          {/* Slider nativo (CSS + React, sem bibliotecas) */}
          <div className="relative h-72 sm:h-80 overflow-hidden rounded-xl" style={{ background: 'linear-gradient(180deg, rgba(20,15,8,0.8), rgba(10,5,2,0.95))', border: '1px solid rgba(180,140,60,0.15)' }}>
            {gallerySlides.map((slide, i) => (
              <GallerySlide key={i} {...slide} active={i === galleryIndex} />
            ))}
            {/* Navegação */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {gallerySlides.map((_, i) => (
                <button key={i} onClick={() => setGalleryIndex(i)} className="w-2 h-2 rounded-full transition-all duration-300" style={{
                  background: i === galleryIndex ? PALETTE.gold : 'rgba(255,255,255,0.15)',
                  transform: i === galleryIndex ? 'scale(1.3)' : 'scale(1)',
                }} />
              ))}
            </div>
            {/* Setas */}
            <button onClick={() => setGalleryIndex((i) => (i - 1 + gallerySlides.length) % gallerySlides.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl z-10 transition-all hover:scale-110 opacity-60 hover:opacity-100" style={{ color: PALETTE.gold }}>
              ◀
            </button>
            <button onClick={() => setGalleryIndex((i) => (i + 1) % gallerySlides.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl z-10 transition-all hover:scale-110 opacity-60 hover:opacity-100" style={{ color: PALETTE.gold }}>
              ▶
            </button>
          </div>
        </div>
      </section>

      {/* ─── ROADMAP ───────────────────────────────────────────────── */}
      <section id="roadmap" className="relative py-24 px-4" style={{ background: 'linear-gradient(180deg, #0a150a, #0d1f0d)', fontFamily: "'VT323', monospace" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-4xl mb-3 block">🗺️</span>
            <h2 className="text-xl font-bold tracking-wider" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.grass }}>ROADMAP</h2>
            <div className="w-16 h-1 mx-auto mt-3 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${PALETTE.grass}88, transparent)` }} />
          </div>
          <div className="relative">
            {/* Linha do tempo */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 opacity-20" style={{ background: `linear-gradient(180deg, ${PALETTE.grass}, ${PALETTE.gold})` }} />
            <div className="space-y-8">
              {roadmapItems.map((item, i) => (
                <div key={i} className="relative flex items-start gap-5 pl-14">
                  <div className={`absolute left-4 w-4 h-4 rounded-full border-2 -translate-x-1/2 mt-1 ${item.done ? '' : ''}`} style={{
                    background: item.done ? PALETTE.grass : 'rgba(255,255,255,0.05)',
                    borderColor: item.done ? PALETTE.grass : 'rgba(255,255,255,0.15)',
                    boxShadow: item.done ? `0 0 10px ${PALETTE.grass}44` : 'none',
                  }} />
                  <div className="flex-1 p-3 rounded-lg transition-all hover:-translate-y-0.5 cursor-default" style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                    opacity: item.done ? 1 : 0.5,
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: item.done ? `${PALETTE.grass}22` : 'rgba(255,255,255,0.05)', color: item.done ? PALETTE.grass : '#888' }}>{item.phase}</span>
                      <span className="text-sm font-bold" style={{ color: item.done ? '#fff' : '#888' }}>{item.title}</span>
                      {item.done && <span className="text-xs">✅</span>}
                    </div>
                    <p className="text-xs opacity-60">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── DOWNLOAD CTA ──────────────────────────────────────────── */}
      <section className="relative py-24 px-4" style={{ background: 'linear-gradient(180deg, #0d1f0d, #0a150a)', fontFamily: "'VT323', monospace" }}>
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-5xl mb-4 block">🎮</span>
          <h2 className="text-xl font-bold tracking-wider mb-4" style={{ fontFamily: "'Press Start 2P', monospace", color: PALETTE.gold }}>PRONTO PARA JOGAR?</h2>
          <p className="text-base mb-8 opacity-70 max-w-lg mx-auto">Entre no mundo de Farm Survival. Sobreviva, explore, construa e forje seu destino.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate('/auth')}
              className="group relative px-10 py-4 rounded text-white font-bold transition-all duration-150 active:translate-y-[3px]"
              style={{ fontFamily: "'Press Start 2P', monospace", background: 'linear-gradient(180deg, #64bb45, #3e9127, #2a6a12)', border: '3px solid #4a8a2a', boxShadow: '0 5px 0 #1a4a08, 0 10px 24px rgba(0,0,0,0.5)', fontSize: 'clamp(11px,1.5vw,14px)' }}>
              ▶ JOGAR DE GRAÇA
            </button>
            <button onClick={() => scrollTo('gameplay')}
              className="px-8 py-4 rounded text-white/70 font-bold transition-all duration-150 hover:text-white"
              style={{ fontFamily: "'Press Start 2P', monospace", border: '2px solid rgba(180,140,60,0.2)', fontSize: 'clamp(9px,1.2vw,12px)' }}>
              VER MAIS
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="relative py-10 px-4" style={{ background: 'linear-gradient(180deg, #0a150a, #050a05)', borderTop: '1px solid rgba(180,140,60,0.1)', fontFamily: "'Press Start 2P', monospace" }}>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌾</span>
            <span className="text-[10px] tracking-wider" style={{ color: PALETTE.gold }}>FARM SURVIVAL</span>
          </div>
          <div className="flex gap-4">
            {[
              { icon: '💬', label: 'Discord', href: '#' },
              { icon: '🐙', label: 'GitHub', href: '#' },
              { icon: '📷', label: 'Instagram', href: '#' },
            ].map((s, i) => (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[8px] transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#c8b89a' }}>
                <span>{s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </a>
            ))}
          </div>
          <p className="text-[8px] opacity-40">© 2026 Farm Survival. Feito com 🌾 e código.</p>
        </div>
      </footer>
    </>
  );
}
