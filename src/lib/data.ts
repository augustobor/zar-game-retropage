import type { Achievement, AchievementDetail, GameDetail, GameProgress, Platform, SourceData } from './types';
import { profile } from '../data/profile';
import { getRetroData } from './retroachievements';
import { getSteamData } from './steam';
import { buildGameDetail } from './details';
import { MAX_ACHIEVEMENTS } from './config';

interface ProfileData {
  retro: SourceData;
  steam: SourceData;
}

// En dev cada recarga renderiza de nuevo: sin caché, RA responde 429 (rate limit) enseguida.
const DEV_TTL_MS = 5 * 60_000;
const DEV_TTL_ON_ERROR_MS = 60_000;
// Las fichas cambian poco y pedirlas todas lleva ~2 min (ritmo de RA): duran más en dev
const DEV_DETAIL_TTL_MS = 30 * 60_000;

/**
 * Memoiza una carga async por clave. En el build se ejecuta una sola vez para todas
 * las páginas; en dev se reutiliza un rato (menos si el resultado vino degradado).
 */
function cached<T>(
  load: (key: string) => Promise<T>,
  isDegraded: (value: T) => boolean = () => false,
  devTtlMs = DEV_TTL_MS,
) {
  const entries = new Map<string, { value: Promise<T>; expires: number }>();
  return (key = ''): Promise<T> => {
    const entry = entries.get(key);
    if (entry && (!import.meta.env.DEV || Date.now() < entry.expires)) return entry.value;

    const value = load(key);
    const fresh = { value, expires: import.meta.env.DEV ? Date.now() + devTtlMs : Infinity };
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

/**
 * Plataformas para el Brief: PC (Steam), las consolas con progreso en RA
 * (menos las de `hiddenPlatforms`) y, al final, las extras escritas a mano en profile.ts.
 */
export async function getPlatforms(): Promise<Platform[]> {
  const { retro, steam } = await getProfileData();
  const hidden = new Set(profile.hiddenPlatforms.map((name) => name.toLowerCase()));
  const fromApis = [...(steam.platforms ?? []), ...(retro.platforms ?? [])].filter(
    (p) => !hidden.has(p.name.toLowerCase()),
  );
  const known = new Set(fromApis.map((p) => p.name.toLowerCase()));
  const extras = profile.platforms
    .filter((name) => !known.has(name.toLowerCase()))
    .map((name) => ({ id: `extra-${name}`, name }));
  return [...fromApis, ...extras];
}

/** Icono de cada plataforma por nombre (incluye las ocultas del Brief), para los filtros. */
export async function getPlatformIcons(): Promise<Map<string, string>> {
  const { retro, steam } = await getProfileData();
  const all = [...(steam.platforms ?? []), ...(retro.platforms ?? [])];
  return new Map(all.filter((p) => p.icon).map((p) => [p.name, p.icon!]));
}

/** Todos los juegos de ambas plataformas (formato del listado). */
export async function getGames(): Promise<GameProgress[]> {
  const { retro, steam } = await getProfileData();
  return [...retro.games, ...steam.games];
}

/** Ficha de un juego, pedida recién cuando una página la necesita (y una sola vez). */
export const getGameDetail = cached<GameDetail | undefined>(
  async (gameId) => {
    const { retro, steam } = await getProfileData();
    const source = gameId.startsWith('retro-') ? retro : steam;
    const game = source.games.find((g) => g.id === gameId);
    return game && buildGameDetail(source, game);
  },
  undefined,
  DEV_DETAIL_TTL_MS,
);

/** Logros desbloqueados de ambas plataformas, del más reciente al más viejo. */
export async function getAchievementList(): Promise<Achievement[]> {
  const { retro, steam } = await getProfileData();
  return [...retro.achievements, ...steam.achievements]
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
    .slice(0, MAX_ACHIEVEMENTS);
}

/**
 * Rutas de /logros/:id/: TODOS los logros de todos los juegos (desbloqueados o no),
 * así cualquier tarjeta de logro —en el listado o dentro de un juego— abre su detalle.
 * Las fichas ya se piden para las páginas de juego: acá salen de la caché.
 */
export async function getAchievementRoutes(): Promise<{ id: string; gameId: string }[]> {
  const [games, list] = await Promise.all([getGames(), getAchievementList()]);
  const details = await Promise.all(games.map((game) => getGameDetail(game.id)));
  const routes = new Map<string, string>();
  for (const detail of details) for (const a of detail?.achievements ?? []) routes.set(a.id, a.gameId);
  // Logros del listado cuyo juego no tiene ficha (p. ej. fuera del progreso de RA)
  for (const a of list) if (!routes.has(a.id)) routes.set(a.id, a.gameId);
  return [...routes].map(([id, gameId]) => ({ id, gameId }));
}

/** Un logro con su ficha (rareza, TrueRatio, tipo…) y su juego. */
export async function getAchievementDetail(
  id: string,
  gameId: string,
): Promise<{ achievement?: AchievementDetail; game?: GameDetail }> {
  const [game, { retro, steam }] = await Promise.all([getGameDetail(gameId), getProfileData()]);
  const detail = game?.achievements.find((a) => a.id === id);
  const unlocked = [...retro.achievements, ...steam.achievements].find((a) => a.id === id);

  // La ficha trae rareza, tipo, etc.; el listado, la fecha y el modo exactos del desbloqueo
  const achievement =
    detail && unlocked ? { ...detail, unlockedAt: unlocked.unlockedAt, hardcore: unlocked.hardcore } : (detail ?? unlocked);
  return { achievement, game };
}
