import type { Achievement, AchievementDetail, GameDetail, GameProgress, SourceData } from './types';
import { getRetroData } from './retroachievements';
import { getSteamData } from './steam';
import { buildGameDetail } from './details';
import { MAX_ACHIEVEMENTS } from './config';

interface ProfileData {
  retro: SourceData;
  steam: SourceData;
}

export type FullAchievement = Achievement & Partial<AchievementDetail>;

// En dev cada recarga renderiza de nuevo: sin caché, RA responde 429 (rate limit) enseguida.
const DEV_TTL_MS = 5 * 60_000;
const DEV_TTL_ON_ERROR_MS = 60_000;

/**
 * Memoiza una carga async por clave. En el build se ejecuta una sola vez para todas
 * las páginas; en dev se reutiliza unos minutos (menos si el resultado vino degradado).
 */
function cached<T>(load: (key: string) => Promise<T>, isDegraded: (value: T) => boolean = () => false) {
  const entries = new Map<string, { value: Promise<T>; expires: number }>();
  return (key = ''): Promise<T> => {
    const entry = entries.get(key);
    if (entry && (!import.meta.env.DEV || Date.now() < entry.expires)) return entry.value;

    const value = load(key);
    const fresh = { value, expires: import.meta.env.DEV ? Date.now() + DEV_TTL_MS : Infinity };
    entries.set(key, fresh);
    value.then((v) => {
      if (isDegraded(v)) fresh.expires = Date.now() + DEV_TTL_ON_ERROR_MS;
    });
    return value;
  };
}

export const getProfileData = cached<ProfileData>(
  () => Promise.all([getRetroData(), getSteamData()]).then(([retro, steam]) => ({ retro, steam })),
  ({ retro, steam }) => retro.demo || steam.demo,
);

/** Todos los juegos de ambas plataformas (formato del listado). */
export async function getGames(): Promise<GameProgress[]> {
  const { retro, steam } = await getProfileData();
  return [...retro.games, ...steam.games];
}

/** Ficha de un juego, pedida recién cuando una página la necesita (y una sola vez). */
export const getGameDetail = cached<GameDetail | undefined>(async (gameId) => {
  const { retro, steam } = await getProfileData();
  const source = gameId.startsWith('retro-') ? retro : steam;
  const game = source.games.find((g) => g.id === gameId);
  return game && buildGameDetail(source, game);
});

/** Logros desbloqueados de ambas plataformas, del más reciente al más viejo. */
export async function getAchievementList(): Promise<Achievement[]> {
  const { retro, steam } = await getProfileData();
  return [...retro.achievements, ...steam.achievements]
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, MAX_ACHIEVEMENTS);
}

/** Un logro del listado enriquecido con su ficha (rareza, TrueRatio, tipo…) y su juego. */
export async function getAchievementDetail(item: Achievement): Promise<{ achievement: FullAchievement; game?: GameDetail }> {
  const game = await getGameDetail(item.gameId);
  const detail = game?.achievements.find((a) => a.id === item.id);
  return { achievement: { ...item, ...detail, unlockedAt: item.unlockedAt }, game };
}
