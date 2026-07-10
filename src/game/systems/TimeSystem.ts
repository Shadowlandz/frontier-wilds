// ═══════════════════════════════════════════════════════════════════
// Farm Survival - Time System
// Manages day/night cycle with configurable speed, smooth lighting
// transitions, time-specific events, NPC schedules, and sleep.
// ═══════════════════════════════════════════════════════════════════

import { Season, Weather, TILE_SIZE } from '../core/Types';
import { lerp, clamp } from '../core/Utils';

// ── Time Speed Config ─────────────────────────────────────────────

export const TimeSpeedMode = {
  Casual: 90,   // 90 min real = 1 day
  Normal: 60,   // 60 min real = 1 day
  Hard: 45,     // 45 min real = 1 day
} as const;
export type TimeSpeedMode = typeof TimeSpeedMode[keyof typeof TimeSpeedMode];

/** Seconds of real time per in-game minute (Normal = 60 min/ 1440 game-min) */
const REAL_SECONDS_PER_GAME_MINUTE: Record<TimeSpeedMode, number> = {
  [TimeSpeedMode.Casual]: (90 * 60) / 1440, // 3.75
  [TimeSpeedMode.Normal]: (60 * 60) / 1440, // 2.5
  [TimeSpeedMode.Hard]: (45 * 60) / 1440,   // 1.875
};

// ── Time Periods ──────────────────────────────────────────────────

export const TimePeriod = {
  Madrugada: 'madrugada', // 00:00-04:59
  Amanhecer: 'amanhecer', // 05:00-06:59
  Manha: 'manha',         // 07:00-11:59
  MeioDia: 'meioDia',     // 12:00-13:59
  Tarde: 'tarde',         // 14:00-17:59
  PorDoSol: 'porDoSol',   // 18:00-18:59
  Noite: 'noite',         // 19:00-23:59
} as const;
export type TimePeriod = typeof TimePeriod[keyof typeof TimePeriod];

/** Display labels in Portuguese */
export const PERIOD_LABELS: Record<TimePeriod, string> = {
  [TimePeriod.Madrugada]: 'Madrugada',
  [TimePeriod.Amanhecer]: 'Amanhecer',
  [TimePeriod.Manha]: 'Manhã',
  [TimePeriod.MeioDia]: 'Meio-Dia',
  [TimePeriod.Tarde]: 'Tarde',
  [TimePeriod.PorDoSol]: 'Pôr do Sol',
  [TimePeriod.Noite]: 'Noite',
};

export const PERIOD_ICONS: Record<TimePeriod, string> = {
  [TimePeriod.Madrugada]: '🌙',
  [TimePeriod.Amanhecer]: '🌅',
  [TimePeriod.Manha]: '☀️',
  [TimePeriod.MeioDia]: '☀️',
  [TimePeriod.Tarde]: '⛅',
  [TimePeriod.PorDoSol]: '🌇',
  [TimePeriod.Noite]: '🌙',
};

/** Detailed color per period for the lighting overlay */
export const PERIOD_COLORS: Record<TimePeriod, string> = {
  [TimePeriod.Madrugada]: '#0B1020',   // Deep dark blue
  [TimePeriod.Amanhecer]: '#F4C16A',   // Warm orange-gold
  [TimePeriod.Manha]: '#FFFFFF',       // Full daylight
  [TimePeriod.MeioDia]: '#FFFFFF',     // Full daylight
  [TimePeriod.Tarde]: '#FFFFFF',       // Full daylight
  [TimePeriod.PorDoSol]: '#FF9E57',    // Golden orange
  [TimePeriod.Noite]: '#1B2545',       // Night blue
};

export const PERIOD_AMBIENT_DESCS: Record<TimePeriod, string> = {
  [TimePeriod.Madrugada]: 'Escuridão profunda... tenha cuidado.',
  [TimePeriod.Amanhecer]: 'O sol está nascendo no horizonte.',
  [TimePeriod.Manha]: 'Um belo dia para explorar!',
  [TimePeriod.MeioDia]: 'O sol está a pino. Horas quentes.',
  [TimePeriod.Tarde]: 'A tarde tranquila convida à exploração.',
  [TimePeriod.PorDoSol]: 'O céu se tinge de laranja.',
  [TimePeriod.Noite]: 'A noite caiu. Criaturas noturnas surgem.',
};

// ── Music Suggestions ──────────────────────────────────────────────
export const PERIOD_MUSIC: Record<TimePeriod, { type: string; desc: string }> = {
  [TimePeriod.Madrugada]: { type: 'sombrio', desc: 'Ambiente sombrio' },
  [TimePeriod.Amanhecer]: { type: 'calmo', desc: 'Piano e cordas' },
  [TimePeriod.Manha]: { type: 'alegre', desc: 'Instrumentos leves' },
  [TimePeriod.MeioDia]: { type: 'alegre', desc: 'Melodia tranquila' },
  [TimePeriod.Tarde]: { type: 'tranquilo', desc: 'Melodia tranquila' },
  [TimePeriod.PorDoSol]: { type: 'calmo', desc: 'Piano e cordas' },
  [TimePeriod.Noite]: { type: 'noturno', desc: 'Sintetizadores suaves' },
};

// ── Time Event Definitions ────────────────────────────────────────
export interface TimeEvent {
  id: string;
  hour: number;
  minute: number;
  name: string;
  description: string;
  icon: string;
  /** If true, repeats every day. If false, one-time. */
  daily: boolean;
  /** Minimum day required (0 = always) */
  minDay?: number;
  /** Minimum player level required (0 = always) */
  minLevel?: number;
  /** Season restriction */
  season?: Season;
}

export const TIME_EVENTS: TimeEvent[] = [
  { id: 'dawn_animals', hour: 5, minute: 30, name: 'Nascimento de Animais', description: 'Animais selvagens dão à luz nesta hora.', icon: '🐣', daily: true },
  { id: 'merchant_arrival', hour: 8, minute: 0, name: 'Mercador na Vila', description: 'O mercador abriu sua loja.', icon: '🧔', daily: true },
  { id: 'festival', hour: 12, minute: 0, name: 'Festival da Cidade', description: 'Os aldeões celebram ao meio-dia!', icon: '🎉', daily: true },
  { id: 'bird_flock', hour: 18, minute: 30, name: 'Bando de Aves', description: 'Aves retornam aos seus ninhos.', icon: '🐦', daily: true },
  { id: 'mysterious_merchant', hour: 20, minute: 0, name: 'Mercador Misterioso', description: 'Um mercador noturno vende itens raros!', icon: '🕵️', daily: true, minLevel: 5 },
  { id: 'magic_portal', hour: 22, minute: 0, name: 'Portal Mágico', description: 'Um portal brilha na floresta à meia-noite.', icon: '🌀', daily: true, minLevel: 10 },
  { id: 'night_market', hour: 23, minute: 0, name: 'Feira Noturna', description: 'Comerciantes noturnos aparecem nas sombras.', icon: '🌙', daily: true, minLevel: 3 },
  { id: 'comet', hour: 3, minute: 0, name: 'Cometa Passageiro', description: 'Um cometa cruza o céu da madrugada.', icon: '☄️', daily: false, minDay: 10 },
];

export interface NPCScheduleEntry {
  hour: number;
  minute: number;
  action: 'wake' | 'work_start' | 'lunch' | 'work_end' | 'home' | 'sleep' | 'wander';
  /** Optional target tile offset relative to NPC home (in tiles) */
  targetTileX?: number;
  targetTileY?: number;
}

// ── Moon Phases ───────────────────────────────────────────────────
export const MOON_PHASES = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'] as const;
export type MoonPhase = typeof MOON_PHASES[number];

export function getMoonPhase(day: number): MoonPhase {
  return MOON_PHASES[day % MOON_PHASES.length];
}

// ── Weather by Time / Season ──────────────────────────────────────
export function getWeatherChances(season: Season, period: TimePeriod): Record<string, number> {
  const base: Record<string, number> = { clear: 60, rain: 20, heavyRain: 5, fog: 10, snow: 2, storm: 3 };

  switch (season) {
    case Season.Spring:
      base.clear = 50; base.rain = 25; base.heavyRain = 8; base.fog = 12; base.snow = 0; base.storm = 5;
      break;
    case Season.Summer:
      base.clear = 65; base.rain = 15; base.heavyRain = 5; base.fog = 5; base.snow = 0; base.storm = 10;
      break;
    case Season.Autumn:
      base.clear = 40; base.rain = 30; base.heavyRain = 10; base.fog = 15; base.snow = 0; base.storm = 5;
      break;
    case Season.Winter:
      base.clear = 35; base.rain = 5; base.heavyRain = 2; base.fog = 20; base.snow = 30; base.storm = 8;
      break;
  }

  // Time-of-day modifiers
  if (period === TimePeriod.Madrugada) { base.fog += 15; base.clear -= 10; }
  if (period === TimePeriod.Noite) { base.rain += 10; base.clear -= 10; }
  if (period === TimePeriod.Manha) { base.fog += 5; }
  if (period === TimePeriod.Tarde) { base.storm += 5; }

  return base;
}

// ── Fishing & Resource Time Bonuses ───────────────────────────────
export function getFishingTimeMultiplier(period: TimePeriod): number {
  switch (period) {
    case TimePeriod.Amanhecer: return 1.3;  // Best fishing at dawn
    case TimePeriod.Manha: return 1.1;
    case TimePeriod.Noite: return 1.2;       // Night fishing for rare fish
    case TimePeriod.Madrugada: return 0.6;   // Worst
    default: return 1.0;
  }
}

export function getRareResourceChance(period: TimePeriod): number {
  switch (period) {
    case TimePeriod.Amanhecer: return 0.08;  // Rare plants at dawn
    case TimePeriod.Noite: return 0.15;      // Rare ores/chests at night
    case TimePeriod.Madrugada: return 0.20;  // Best rare finds (but dangerous)
    default: return 0.03;
  }
}

/** Get TimePeriod from hour (standalone, for UI use without class instance) */
export function getPeriodForHour(hour: number): TimePeriod {
  if (hour < 5) return TimePeriod.Madrugada;
  if (hour < 7) return TimePeriod.Amanhecer;
  if (hour < 12) return TimePeriod.Manha;
  if (hour < 14) return TimePeriod.MeioDia;
  if (hour < 18) return TimePeriod.Tarde;
  if (hour < 19) return TimePeriod.PorDoSol;
  return TimePeriod.Noite;
}

// ── XPReward Multiplier by Time ───────────────────────────────────
export function getXPMultiplier(period: TimePeriod): number {
  switch (period) {
    case TimePeriod.Madrugada: return 1.5;  // High risk, high reward
    case TimePeriod.PorDoSol: return 1.15;
    case TimePeriod.Amanhecer: return 1.2;
    case TimePeriod.Noite: return 1.3;
    default: return 1.0;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TimeSystem Class
// ═══════════════════════════════════════════════════════════════════
export interface TimeState {
  /** Hour of day (0-24 float, e.g. 14.5 = 14:30) */
  hour: number;
  /** Current minute (0-59) */
  minute: number;
  /** Day number (starts at 1) */
  day: number;
  /** Current season */
  season: Season;
  /** Day within current season (0-29) */
  seasonDay: number;
  /** Current weather */
  weather: Weather;
  /** Current time period */
  period: TimePeriod;
  /** Is it currently night? */
  isNight: boolean;
  /** Total hours elapsed since game start */
  totalHours: number;
  /** Moon phase */
  moonPhase: MoonPhase;
  /** Whether time is paused (menus, dialogues) */
  paused: boolean;
  /** Active time events happening right now (updated each tick) */
  activeEvents: TimeEvent[];
  /** Weather transitions (smooth fade) */
  weatherTransition: number; // 0-1, transitioning between weather states
  /** Next scheduled event time (for UI display) */
  nextEvent: TimeEvent | null;
}

export class TimeSystem {
  private speedMode: TimeSpeedMode = TimeSpeedMode.Normal;
  private secondsPerGameMinute: number = REAL_SECONDS_PER_GAME_MINUTE[TimeSpeedMode.Normal];
  private accumulator = 0;
  private _hour = 8;
  private _minute = 0;
  private _day = 1;
  private _season: Season = Season.Spring;
  private _weather: Weather = Weather.Clear;
  private _paused = false;
  private _totalHours = 8;

  /** Events that have been triggered today (for one-time events) */
  private triggeredToday: Set<string> = new Set();
  private lastHourCheck = -1;

  constructor(speedMode: TimeSpeedMode = TimeSpeedMode.Normal, startHour = 8, startDay = 1) {
    this.setSpeedMode(speedMode);
    this._hour = startHour;
    this._minute = 0;
    this._day = startDay;
    this._totalHours = (startDay - 1) * 24 + startHour;
    this._season = this.getSeasonForDay(startDay);
  }

  setSpeedMode(mode: TimeSpeedMode): void {
    this.speedMode = mode;
    this.secondsPerGameMinute = REAL_SECONDS_PER_GAME_MINUTE[mode];
  }

  getSpeedMode(): TimeSpeedMode { return this.speedMode; }

  getHour(): number { return this._hour; }
  getMinute(): number { return this._minute; }
  getDay(): number { return this._day; }
  getSeason(): Season { return this._season; }
  getWeather(): Weather { return this._weather; }
  isPaused(): boolean { return this._paused; }
  setPaused(paused: boolean): void { this._paused = paused; }
  getTotalHours(): number { return this._totalHours; }

  setWeather(weather: Weather): void {
    this._weather = weather;
  }

  /** Update the time by a real-time delta (in seconds) */
  update(dt: number): void {
    if (this._paused) return;

    this.accumulator += dt;

    while (this.accumulator >= this.secondsPerGameMinute) {
      this.accumulator -= this.secondsPerGameMinute;
      this.tickMinute();
    }
  }

  private tickMinute(): void {
    this._minute++;
    this._totalHours += 1 / 60;

    if (this._minute >= 60) {
      this._minute = 0;
      this._hour++;
    }

    if (this._hour >= 24) {
      this._hour = 0;
      this._day++;
      this._season = this.getSeasonForDay(this._day);
      this.triggeredToday.clear(); // Reset one-time events for new day
    }

    // Check for time events once per hour (at the turn of the hour)
    const currentHourInt = Math.floor(this._hour);
    if (currentHourInt !== this.lastHourCheck) {
      this.lastHourCheck = currentHourInt;
      this.checkHourlyEvents();
    }
  }

  private checkHourlyEvents(): void {
    const currentHourInt = Math.floor(this._hour);
    const currentMinuteInt = Math.floor(this._minute);

    for (const event of TIME_EVENTS) {
      // Check if the event time matches exactly
      // We trigger at :00 of the event hour
      if (event.hour === currentHourInt && currentMinuteInt === 0) {
        if (!event.daily && this.triggeredToday.has(event.id)) continue;
        if (event.minDay && this._day < event.minDay) continue;
        this.triggeredToday.add(event.id);
      }
    }
  }

  /** Get the current TimePeriod based on the hour */
  getPeriod(): TimePeriod {
    const h = this._hour;
    if (h < 5) return TimePeriod.Madrugada;
    if (h < 7) return TimePeriod.Amanhecer;
    if (h < 12) return TimePeriod.Manha;
    if (h < 14) return TimePeriod.MeioDia;
    if (h < 18) return TimePeriod.Tarde;
    if (h < 19) return TimePeriod.PorDoSol;
    return TimePeriod.Noite;
  }

  isNight(): boolean {
    const p = this.getPeriod();
    return p === TimePeriod.Noite || p === TimePeriod.Madrugada;
  }

  /** Get the season for a given day (30-day seasons, 120-day year) */
  getSeasonForDay(day: number): Season {
    const cycle = (day - 1) % 120;
    if (cycle < 30) return Season.Spring;
    if (cycle < 60) return Season.Summer;
    if (cycle < 90) return Season.Autumn;
    return Season.Winter;
  }

  /** Get season day (0-29) */
  getSeasonDay(): number {
    return ((this._day - 1) % 120) % 30;
  }

  /** Get moon phase based on day number */
  getMoonPhase(): MoonPhase {
    return getMoonPhase(this._day);
  }

  /** Get the ambient light level (0=dark, 1=bright) with smooth transitions */
  getAmbientLightLevel(inCave: boolean): number {
    if (inCave) return 0.08;

    const h = this._hour;
    // Full night: 0-4
    if (h < 4) return 0.08;
    // Dawn transition: 4-7 (dark → bright)
    if (h < 7) {
      const t = clamp((h - 4) / 3, 0, 1);
      return lerp(0.08, 1.0, this.easeInOut(t));
    }
    // Full day: 7-17
    if (h < 17) return 1.0;
    // Dusk transition: 17-20 (bright → dark)
    if (h < 20) {
      const t = clamp((h - 17) / 3, 0, 1);
      return lerp(1.0, 0.08, this.easeInOut(t));
    }
    // Night: 20-24
    return 0.08;
  }

  /** Get the color overlay for the current time with smooth transitions */
  getAmbientColor(): string {
    const h = this._hour;
    const period = this.getPeriod();

    // Madrugada (00:00-04:59): #0B1020
    if (period === TimePeriod.Madrugada) return '#0B1020';

    // Amanhecer (05:00-06:59): #F4C16A
    if (period === TimePeriod.Amanhecer) {
      const t = clamp((h - 5) / 2, 0, 1);
      // Blend from night blue to dawn gold
      const nightBlue = { r: 11, g: 16, b: 32 };
      const dawnGold = { r: 244, g: 193, b: 106 };
      const eased = this.easeInOut(t);
      const r = Math.round(lerp(nightBlue.r, dawnGold.r, eased));
      const g = Math.round(lerp(nightBlue.g, dawnGold.g, eased));
      const b = Math.round(lerp(nightBlue.b, dawnGold.b, eased));
      return `rgb(${r},${g},${b})`;
    }

    // Manhã → Dia (07:00-17:59): branco (sem overlay)
    if (period === TimePeriod.Manha || period === TimePeriod.MeioDia || period === TimePeriod.Tarde) {
      // During dawn-to-day transition (07:00-08:00), fade from gold to clear
      if (h < 8) {
        const t = clamp((h - 7) / 1, 0, 1);
        const dawnGold = { r: 244, g: 193, b: 106 };
        const white = { r: 255, g: 255, b: 255 };
        const eased = this.easeInOut(t);
        const r = Math.round(lerp(dawnGold.r, white.r, eased));
        const g = Math.round(lerp(dawnGold.g, white.g, eased));
        const b = Math.round(lerp(dawnGold.b, white.b, eased));
        return `rgb(${r},${g},${b})`;
      }
      return '#FFFFFF';
    }

    // Pôr do Sol (18:00-18:59): #FF9E57
    if (period === TimePeriod.PorDoSol) {
      const t = clamp((h - 18) / 1, 0, 1);
      const white = { r: 255, g: 255, b: 255 };
      const sunset = { r: 255, g: 158, b: 87 };
      const eased = this.easeInOut(t);
      const r = Math.round(lerp(white.r, sunset.r, eased));
      const g = Math.round(lerp(white.g, sunset.g, eased));
      const b = Math.round(lerp(white.b, sunset.b, eased));
      return `rgb(${r},${g},${b})`;
    }

    // Noite (19:00-23:59): transição para #1B2545
    // Dusk-to-night transition: 19-21
    if (h >= 19 && h < 21) {
      const t = clamp((h - 19) / 2, 0, 1);
      const sunset = { r: 255, g: 158, b: 87 };
      const night = { r: 27, g: 37, b: 69 };
      const eased = this.easeInOut(t);
      const r = Math.round(lerp(sunset.r, night.r, eased));
      const g = Math.round(lerp(sunset.g, night.g, eased));
      const b = Math.round(lerp(sunset.b, night.b, eased));
      return `rgb(${r},${g},${b})`;
    }
    // Full night: 21-24
    return '#1B2545';
  }

  /** Get the opacity for the ambient color overlay based on time */
  getAmbientOpacity(): number {
    const h = this._hour;
    const period = this.getPeriod();

    if (period === TimePeriod.Madrugada) return 0.45;
    if (period === TimePeriod.Amanhecer) {
      const t = clamp((h - 5) / 2, 0, 1);
      return lerp(0.40, 0.0, this.easeInOut(t));
    }
    if (period === TimePeriod.Manha || period === TimePeriod.MeioDia || period === TimePeriod.Tarde) {
      if (h < 8) {
        const t = clamp((h - 7) / 1, 0, 1);
        return lerp(0.15, 0.0, t);
      }
      return 0;
    }
    if (period === TimePeriod.PorDoSol) return 0.12;
    // Noite: transition
    if (h >= 19 && h < 21) {
      const t = clamp((h - 19) / 2, 0, 1);
      return lerp(0.10, 0.40, this.easeInOut(t));
    }
    return 0.40;
  }

  /** Get the index for "period dot" display (0-6) */
  getPeriodIndex(): number {
    const periodOrder: TimePeriod[] = [
      TimePeriod.Madrugada,
      TimePeriod.Amanhecer,
      TimePeriod.Manha,
      TimePeriod.MeioDia,
      TimePeriod.Tarde,
      TimePeriod.PorDoSol,
      TimePeriod.Noite,
    ];
    return periodOrder.indexOf(this.getPeriod());
  }

  /** Smooth ease-in-out for natural transitions */
  private easeInOut(t: number): number {
    return t * t * (3 - 2 * t);
  }

  /** Get the formatted time string (e.g. "08:35") */
  getFormattedTime(): string {
    const h = Math.floor(this._hour);
    const m = Math.floor(this._minute);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /** Get the player's light radius at night (e.g. torch/campfire) */
  getPlayerLightRadius(inCave: boolean, hasLightSource: boolean): number {
    if (inCave && hasLightSource) return 128; // Torch in cave
    if (inCave) return 0; // Pitch black in cave without light
    if (this.isNight() && hasLightSource) return 96; // Night with torch
    if (this.isNight()) return 0;
    return 0; // Daytime — no light circle needed
  }

  /** Get active time events for the current hour */
  getActiveEvents(): TimeEvent[] {
    const currentHour = Math.floor(this._hour);
    return TIME_EVENTS.filter(e => {
      if (e.minDay && this._day < e.minDay) return false;
      if (e.minLevel) return false; // Level check done externally
      if (!e.daily && this.triggeredToday.has(e.id)) return false;
      return e.hour === currentHour;
    });
  }

  /** Get the next upcoming event (for UI display) */
  getNextEvent(): TimeEvent | null {
    const currentHour = this._hour;
    let nextEvent: TimeEvent | null = null;
    let nearestHour = 25;

    for (const event of TIME_EVENTS) {
      if (event.minDay && this._day < event.minDay) continue;
      if (!event.daily && this.triggeredToday.has(event.id)) continue;

      const eventHour = event.hour + event.minute / 60;
      // Find the next event later today, or wrap to tomorrow
      let hoursUntil = eventHour - currentHour;
      if (hoursUntil <= 0) hoursUntil += 24; // Next day

      if (hoursUntil < nearestHour) {
        nearestHour = hoursUntil;
        nextEvent = event;
      }
    }

    return nextEvent;
  }

  /** Get the formatted time until the next event */
  getTimeUntilNextEvent(): string {
    const currentHour = this._hour;
    let nearestHour = 25;

    for (const event of TIME_EVENTS) {
      if (event.minDay && this._day < event.minDay) continue;
      if (!event.daily && this.triggeredToday.has(event.id)) continue;

      const eventHour = event.hour + event.minute / 60;
      let hoursUntil = eventHour - currentHour;
      if (hoursUntil <= 0) hoursUntil += 24;

      if (hoursUntil < nearestHour) {
        nearestHour = hoursUntil;
      }
    }

    if (nearestHour >= 25) return '';
    const h = Math.floor(nearestHour);
    const m = Math.floor((nearestHour - h) * 60);
    if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`;
    return `${m}m`;
  }

  /** Advance time by a specified number of hours (used for sleeping) */
  advanceHours(hours: number): void {
    this._hour += hours;
    this._totalHours += hours;

    while (this._hour >= 24) {
      this._hour -= 24;
      this._day++;
      this._season = this.getSeasonForDay(this._day);
      this.triggeredToday.clear();
    }

    this._minute = 0;
    this.lastHourCheck = -1; // Force re-check events
    this.checkHourlyEvents();
  }

  /** Snap to a specific hour (for sleeping) */
  snapToHour(targetHour: number): void {
    if (targetHour < 0 || targetHour >= 24) return;
    this._hour = targetHour;
    this._minute = 0;
    this.lastHourCheck = -1;
    this.checkHourlyEvents();
  }

  /** Serialize for save game */
  serialize(): TimeState {
    return {
      hour: this._hour,
      minute: Math.floor(this._minute),
      day: this._day,
      season: this._season,
      seasonDay: this.getSeasonDay(),
      weather: this._weather,
      period: this.getPeriod(),
      isNight: this.isNight(),
      totalHours: this._totalHours,
      moonPhase: this.getMoonPhase(),
      paused: this._paused,
      activeEvents: this.getActiveEvents(),
      weatherTransition: 0,
      nextEvent: this.getNextEvent(),
    };
  }

  /** Deserialize from save data */
  deserialize(data: TimeState): void {
    this._hour = data.hour;
    this._minute = data.minute;
    this._day = data.day;
    this._season = data.season;
    this._weather = data.weather;
    this._totalHours = data.totalHours;
    this._paused = data.paused;
    this.lastHourCheck = -1;
  }
}
