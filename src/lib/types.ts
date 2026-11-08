export type Source = 'steam' | 'retro';

export interface GameProgress {
  id: string;
  source: Source;
  title: string;
  platform: string;
  image?: string;
  /** 'banner' = imagen apaisada (Steam), 'icon' = icono cuadrado pixel art (RA) */
  art: 'banner' | 'icon';
  unlocked: number;
  total: number;
  hours?: number;
  award?: string;
  url?: string;
  /** Lista completa (desbloqueados + bloqueados) cuando la fuente ya la trajo, p. ej. Steam */
  achievementList?: AchievementDetail[];
}

/** Logro con todo lo que la API permite saber, desbloqueado o no. */
export interface AchievementDetail {
  id: string;
  source: Source;
  /** id del GameProgress/GameDetail al que pertenece */
  gameId: string;
  title: string;
  description: string;
  /** Juego al que pertenece: nombre, icono y plataforma */
  game: string;
  gameIcon?: string;
  platform: string;
  icon?: string;
  iconLocked?: string;
  points?: number;
  /** RA: puntos ponderados por dificultad ("RetroRatio") */
  trueRatio?: number;
  /** % de jugadores del juego que lo tienen */
  rarity?: number;
  /** Cantidad de jugadores que lo tienen */
  awarded?: number;
  /** Fecha ISO de desbloqueo (sin fecha = bloqueado) */
  unlockedAt?: string;
  hardcore?: boolean;
  /** RA: progression | win_condition | missable */
  type?: string;
  /** Steam: apiname en minúsculas, para cruzar con la rareza global */
  key?: string;
}

/** Logro desbloqueado (los del listado): mismo formato, con la fecha garantizada. */
export type Achievement = AchievementDetail & { unlockedAt: string };

export interface GameDetail {
  id: string;
  source: Source;
  title: string;
  platform: string;
  icon?: string;
  cover?: string;
  /** Imagen alternativa si `cover` no existe (Steam no tiene portada vertical para todos los juegos) */
  coverFallback?: string;
  description?: string;
  developer?: string;
  publisher?: string;
  genres: string[];
  released?: string;
  metacritic?: number;
  /** RA: jugadores distintos que lo jugaron */
  players?: number;
  hours?: number;
  screenshots: string[];
  unlocked: number;
  total: number;
  pointsEarned?: number;
  pointsTotal?: number;
  award?: string;
  externalUrl?: string;
  achievements: AchievementDetail[];
}

export interface PresenceField {
  /** Sin etiqueta cuando la parte no venía como "Clave: valor" */
  label?: string;
  value: string;
}

/**
 * Estado actual para la pantalla HUD de cada cuenta.
 * RA: su Rich Presence desarmado ("Samus is in Norfair | Energy: [177/399]").
 * Steam: armado con el estado en línea, los juegos recientes y la antigüedad.
 */
export interface Presence {
  headline?: string;
  fields: PresenceField[];
  /** false = desconectado (punto gris); si no se sabe, se asume activo */
  online?: boolean;
}

export interface LastGame {
  title: string;
  platform?: string;
  image?: string;
  /** Fecha ISO de la última sesión, si la plataforma la expone */
  playedAt?: string;
  playingNow?: boolean;
  /** Texto extra, p. ej. "4,2 h en las últimas 2 semanas" */
  detail?: string;
}

export interface SourceProfile {
  username: string;
  avatar?: string;
  url: string;
  points?: number;
  memberSince?: string;
  status?: string;
  presence?: Presence;
  lastGame?: LastGame;
}

/** Consola o plataforma donde hay juegos con progreso */
export interface Platform {
  id: string;
  name: string;
  icon?: string;
  /** Cantidad de juegos con progreso (si la fuente la conoce completa) */
  games?: number;
}

export interface SourceData {
  source: Source;
  profile: SourceProfile | null;
  achievements: Achievement[];
  games: GameProgress[];
  platforms?: Platform[];
  /** true si se están mostrando datos de demo (faltan keys o falló la API) */
  demo: boolean;
  error?: string;
}
