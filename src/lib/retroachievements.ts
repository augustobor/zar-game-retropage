import type { Achievement, AchievementDetail, GameDetail, GameProgress, SourceData } from './types';
import { get, errorMessage, createRateLimiter, withRetry } from './http';
import { demoRetro } from './demo';
import { parsePresence } from './presence';
import { RECENT_MINUTES } from './config';

// Docs: https://api-docs.retroachievements.org
const API = 'https://retroachievements.org/API';
const MEDIA = 'https://media.retroachievements.org';
const SITE = 'https://retroachievements.org';
const MAX_GAMES = 100;

/** RA devuelve fechas "YYYY-MM-DD HH:mm:ss" en UTC */
const toIso = (date: string) => new Date(`${date.replace(' ', 'T')}Z`).toISOString();
const badge = (name: string, locked = false) => `${MEDIA}/Badge/${name}${locked ? '_lock' : ''}.png`;

// RA limita pedidos por minuto y, si se pasa, bloquea varios minutos (Retry-After de hasta ~500s).
// Se va a ritmo fijo, con margen: un pedido cada 1,5 segundos.
const limit = createRateLimiter(1500);

function ra(endpoint: string, params: Record<string, string>) {
  const query = new URLSearchParams({ y: import.meta.env.RA_API_KEY ?? '', u: import.meta.env.RA_USERNAME ?? '', ...params });
  return limit(() => withRetry(() => get(`${API}/${endpoint}.php?${query}`).then((r) => r.json())));
}

export async function getRetroData(): Promise<SourceData> {
  if (!import.meta.env.RA_USERNAME || !import.meta.env.RA_API_KEY) return demoRetro('Faltan RA_USERNAME y/o RA_API_KEY');

  try {
    const [profile, recent, progress, recentlyPlayed] = await Promise.all([
      ra('API_GetUserProfile', {}),
      ra('API_GetUserRecentAchievements', { m: String(RECENT_MINUTES) }),
      ra('API_GetUserCompletionProgress', { c: String(MAX_GAMES) }),
      // Opcional: si falla solo se pierde el "último juego", no todo el perfil
      ra('API_GetUserRecentlyPlayedGames', { c: '1' }).catch((err) => {
        console.warn(`[retroachievements] sin último juego → ${errorMessage(err)}`);
        return [];
      }),
    ]);

    // Un logro puede venir dos veces (softcore y hardcore): queda el primero
    const seen = new Set<string>();
    const achievements: Achievement[] = (recent ?? [])
      .map((a: any) => ({
        id: `retro-${a.AchievementID}`,
        source: 'retro',
        gameId: `retro-${a.GameID}`,
        title: a.Title,
        description: a.Description,
        game: a.GameTitle,
        platform: a.ConsoleName,
        icon: `${MEDIA}${a.BadgeURL}`,
        unlockedAt: toIso(a.Date),
        points: Number(a.Points),
        hardcore: Number(a.HardcoreMode) === 1,
      }))
      .filter((a: Achievement) => !seen.has(a.id) && seen.add(a.id));

    const games: GameProgress[] = (progress?.Results ?? []).map((g: any) => ({
      id: `retro-${g.GameID}`,
      source: 'retro',
      title: g.Title,
      platform: g.ConsoleName,
      image: `${MEDIA}${g.ImageIcon}`,
      art: 'icon',
      unlocked: Math.max(Number(g.NumAwarded), Number(g.NumAwardedHardcore)),
      total: Number(g.MaxPossible),
      award: g.HighestAwardKind ?? undefined,
      url: `${SITE}/game/${g.GameID}`,
    }));

    const last = recentlyPlayed?.[0];

    return {
      source: 'retro',
      profile: {
        username: profile.User,
        avatar: `${MEDIA}${profile.UserPic}`,
        url: `${SITE}/user/${profile.User}`,
        points: Number(profile.TotalPoints),
        memberSince: profile.MemberSince,
        status: profile.Motto || undefined,
        presence: parsePresence(profile.RichPresenceMsg),
        lastGame: last && {
          title: last.Title,
          platform: last.ConsoleName,
          image: `${MEDIA}${last.ImageIcon}`,
          playedAt: toIso(last.LastPlayed),
        },
      },
      achievements,
      games,
      demo: false,
    };
  } catch (err) {
    return demoRetro(`RetroAchievements: ${errorMessage(err)}`);
  }
}

/** Ficha completa de un juego + todos sus logros con el progreso del usuario. */
export async function getRetroGameDetail(game: GameProgress): Promise<GameDetail> {
  const raId = game.id.replace('retro-', '');
  const info = await ra('API_GetGameInfoAndUserProgress', { g: raId, a: '1' });
  const players = Number(info.NumDistinctPlayers) || 0;

  const achievements: AchievementDetail[] = Object.values<any>(info.Achievements ?? {})
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder || a.ID - b.ID)
    .map((a) => {
      const earned = a.DateEarnedHardcore || a.DateEarned;
      return {
        id: `retro-${a.ID}`,
        source: 'retro',
        gameId: game.id,
        title: a.Title,
        description: a.Description,
        icon: badge(a.BadgeName),
        iconLocked: badge(a.BadgeName, true),
        points: Number(a.Points),
        trueRatio: Number(a.TrueRatio) || undefined,
        awarded: Number(a.NumAwarded),
        rarity: players ? (Number(a.NumAwarded) / players) * 100 : undefined,
        unlockedAt: earned ? toIso(earned) : undefined,
        hardcore: Boolean(a.DateEarnedHardcore),
        type: a.Type || undefined,
      };
    });

  const unlocked = achievements.filter((a) => a.unlockedAt);
  const sumPoints = (list: AchievementDetail[]) => list.reduce((sum, a) => sum + (a.points ?? 0), 0);

  return {
    id: game.id,
    source: 'retro',
    title: info.Title ?? game.title,
    platform: info.ConsoleName ?? game.platform,
    icon: game.image,
    cover: info.ImageBoxArt ? `${MEDIA}${info.ImageBoxArt}` : game.image,
    developer: info.Developer || undefined,
    publisher: info.Publisher || undefined,
    genres: info.Genre ? String(info.Genre).split(/,\s*/) : [],
    released: info.Released || undefined,
    players: players || undefined,
    hours: info.UserTotalPlaytime ? Math.round(Number(info.UserTotalPlaytime) / 360) / 10 : undefined,
    screenshots: [info.ImageTitle, info.ImageIngame].filter(Boolean).map((p: string) => `${MEDIA}${p}`),
    unlocked: unlocked.length,
    total: achievements.length,
    pointsEarned: sumPoints(unlocked),
    pointsTotal: sumPoints(achievements),
    award: game.award,
    externalUrl: game.url,
    achievements,
  };
}
