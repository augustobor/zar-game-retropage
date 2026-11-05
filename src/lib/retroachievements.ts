import type { Achievement, AchievementDetail, GameDetail, GameProgress, Platform, SourceData, SourceProfile } from './types';
import { get, errorMessage, createRateLimiter, withRetry } from './http';
import { demoRetro } from './demo';
import { parsePresence } from './retroachievementsPresence';
import { RECENT_MINUTES } from './config';

// Docs: https://api-docs.retroachievements.org
const API = 'https://retroachievements.org/API';
const MEDIA = 'https://media.retroachievements.org';
const SITE = 'https://retroachievements.org';
const MAX_GAMES = 100;

/** RA devuelve fechas "YYYY-MM-DD HH:mm:ss" en UTC */
const toIso = (date: string) => new Date(`${date.replace(' ', 'T')}Z`).toISOString();
/** RA devuelve rutas de imagen relativas ("/Images/093574.png") */
const media = (path: string) => `${MEDIA}${path}`;
const badge = (name: string, locked = false) => media(`/Badge/${name}${locked ? '_lock' : ''}.png`);

// RA limita pedidos por minuto y, si se pasa, bloquea varios minutos (Retry-After de hasta ~500s).
// Se va a ritmo fijo, con margen: un pedido cada 1,5 segundos.
const limit = createRateLimiter(1500);

function ra(endpoint: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ y: import.meta.env.RA_API_KEY ?? '', u: import.meta.env.RA_USERNAME ?? '', ...params });
  return limit(() => withRetry(() => get(`${API}/${endpoint}.php?${query}`).then((r) => r.json())));
}

/** Pedido opcional: si falla, se avisa y se sigue con una lista vacía (solo se pierde ese dato). */
function raOptional(endpoint: string, params: Record<string, string>, whatIsLost: string) {
  return ra(endpoint, params).catch((err) => {
    console.warn(`[retroachievements] sin ${whatIsLost} → ${errorMessage(err)}`);
    return [];
  });
}

// ---------------------------------------------------------------------------
// Perfil, logros recientes y progreso
// ---------------------------------------------------------------------------

export async function getRetroData(): Promise<SourceData> {
  if (!import.meta.env.RA_USERNAME || !import.meta.env.RA_API_KEY) return demoRetro('Faltan RA_USERNAME y/o RA_API_KEY');

  try {
    const [profile, recent, progress, recentlyPlayed, consoles] = await Promise.all([
      ra('API_GetUserProfile'),
      ra('API_GetUserRecentAchievements', { m: String(RECENT_MINUTES) }),
      ra('API_GetUserCompletionProgress', { c: String(MAX_GAMES) }),
      raOptional('API_GetUserRecentlyPlayedGames', { c: '1' }, 'último juego'),
      raOptional('API_GetConsoleIDs', { a: '1', g: '1' }, 'iconos de consolas'),
    ]);
    const progressResults: any[] = progress?.Results ?? [];
    const consoleIcons = new Map<number, string>(consoles.map((c: any) => [Number(c.ID), c.IconURL]));

    return {
      source: 'retro',
      profile: toProfile(profile, recentlyPlayed[0]),
      achievements: uniqueById((recent ?? []).map(toAchievement)),
      games: progressResults.map(toGameProgress),
      platforms: toPlatforms(progressResults, consoleIcons),
      demo: false,
    };
  } catch (err) {
    return demoRetro(`RetroAchievements: ${errorMessage(err)}`);
  }
}

/** Solo el perfil (Rich Presence y último juego): 2 pedidos, para el status en vivo. */
export async function getRetroLiveProfile(): Promise<SourceData> {
  if (!import.meta.env.RA_USERNAME || !import.meta.env.RA_API_KEY) return demoRetro('Faltan RA_USERNAME y/o RA_API_KEY');

  try {
    const [profile, recentlyPlayed] = await Promise.all([
      ra('API_GetUserProfile'),
      raOptional('API_GetUserRecentlyPlayedGames', { c: '1' }, 'último juego'),
    ]);
    return { source: 'retro', profile: toProfile(profile, recentlyPlayed[0]), games: [], achievements: [], demo: false };
  } catch (err) {
    return demoRetro(`RetroAchievements: ${errorMessage(err)}`);
  }
}

function toProfile(raw: any, lastPlayed?: any): SourceProfile {
  return {
    username: raw.User,
    avatar: media(raw.UserPic),
    url: `${SITE}/user/${raw.User}`,
    points: Number(raw.TotalPoints),
    memberSince: raw.MemberSince,
    status: raw.Motto || undefined,
    presence: parsePresence(raw.RichPresenceMsg),
    lastGame: lastPlayed && {
      title: lastPlayed.Title,
      platform: lastPlayed.ConsoleName,
      image: media(lastPlayed.ImageIcon),
      playedAt: toIso(lastPlayed.LastPlayed),
    },
  };
}

function toAchievement(raw: any): Achievement {
  return {
    id: `retro-${raw.AchievementID}`,
    source: 'retro',
    gameId: `retro-${raw.GameID}`,
    title: raw.Title,
    description: raw.Description,
    game: raw.GameTitle,
    gameIcon: raw.GameIcon ? media(raw.GameIcon) : undefined,
    platform: raw.ConsoleName,
    icon: media(raw.BadgeURL),
    unlockedAt: toIso(raw.Date),
    points: Number(raw.Points),
    hardcore: Number(raw.HardcoreMode) === 1,
  };
}

/** Un logro puede venir dos veces (softcore y hardcore): queda el primero. */
function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
}

function toGameProgress(raw: any): GameProgress {
  return {
    id: `retro-${raw.GameID}`,
    source: 'retro',
    title: raw.Title,
    platform: raw.ConsoleName,
    image: media(raw.ImageIcon),
    art: 'icon',
    unlocked: Math.max(Number(raw.NumAwarded), Number(raw.NumAwardedHardcore)),
    total: Number(raw.MaxPossible),
    award: raw.HighestAwardKind ?? undefined,
    url: `${SITE}/game/${raw.GameID}`,
  };
}

/** Consolas con progreso (como "Progression Status" en el perfil), de más a menos juegos. */
function toPlatforms(results: any[], icons: Map<number, string>): Platform[] {
  const byConsole = new Map<number, Platform & { games: number }>();
  for (const game of results) {
    const id = Number(game.ConsoleID);
    const entry = byConsole.get(id) ?? { id: `retro-console-${id}`, name: game.ConsoleName, icon: icons.get(id), games: 0 };
    entry.games++;
    byConsole.set(id, entry);
  }
  return [...byConsole.values()].sort((a, b) => b.games - a.games);
}

// ---------------------------------------------------------------------------
// Ficha de un juego
// ---------------------------------------------------------------------------

/** Ficha completa de un juego + todos sus logros con el progreso del usuario. */
export async function getRetroGameDetail(game: GameProgress): Promise<GameDetail> {
  const info = await ra('API_GetGameInfoAndUserProgress', { g: game.id.replace('retro-', ''), a: '1' });
  const players = Number(info.NumDistinctPlayers) || 0;
  const gameInfo = {
    game: info.Title ?? game.title,
    gameIcon: game.image,
    platform: info.ConsoleName ?? game.platform,
  };

  const achievements: AchievementDetail[] = Object.values<any>(info.Achievements ?? {})
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder || a.ID - b.ID)
    .map((raw) => ({ ...toAchievementDetail(raw, game.id, players), ...gameInfo }));

  const unlocked = achievements.filter((a) => a.unlockedAt);
  const sumPoints = (list: AchievementDetail[]) => list.reduce((sum, a) => sum + (a.points ?? 0), 0);

  return {
    id: game.id,
    source: 'retro',
    title: gameInfo.game,
    platform: gameInfo.platform,
    icon: game.image,
    cover: info.ImageBoxArt ? media(info.ImageBoxArt) : game.image,
    developer: info.Developer || undefined,
    publisher: info.Publisher || undefined,
    genres: info.Genre ? String(info.Genre).split(/,\s*/) : [],
    released: info.Released || undefined,
    players: players || undefined,
    // UserTotalPlaytime viene en segundos → horas con un decimal
    hours: info.UserTotalPlaytime ? Math.round(Number(info.UserTotalPlaytime) / 360) / 10 : undefined,
    screenshots: [info.ImageTitle, info.ImageIngame].filter(Boolean).map(media),
    unlocked: unlocked.length,
    total: achievements.length,
    pointsEarned: sumPoints(unlocked),
    pointsTotal: sumPoints(achievements),
    award: game.award,
    externalUrl: game.url,
    achievements,
  };
}

/** Un logro de la ficha (sin los datos del juego, que se agregan aparte). */
function toAchievementDetail(raw: any, gameId: string, players: number): Omit<AchievementDetail, 'game' | 'gameIcon' | 'platform'> {
  const earned = raw.DateEarnedHardcore || raw.DateEarned;
  return {
    id: `retro-${raw.ID}`,
    source: 'retro',
    gameId,
    title: raw.Title,
    description: raw.Description,
    icon: badge(raw.BadgeName),
    iconLocked: badge(raw.BadgeName, true),
    points: Number(raw.Points),
    trueRatio: Number(raw.TrueRatio) || undefined,
    awarded: Number(raw.NumAwarded),
    rarity: players ? (Number(raw.NumAwarded) / players) * 100 : undefined,
    unlockedAt: earned ? toIso(earned) : undefined,
    hardcore: Boolean(raw.DateEarnedHardcore),
    type: raw.Type || undefined,
  };
}
