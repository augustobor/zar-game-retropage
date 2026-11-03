import { XMLParser } from 'fast-xml-parser';
import type { Achievement, AchievementDetail, GameDetail, GameProgress, LastGame, SourceData, SourceProfile } from './types';
import { get, asArray, errorMessage, decodeEntities } from './http';
import { demoSteam } from './demo';
import { profile as siteProfile } from '../data/profile';

const API = 'https://api.steampowered.com';
const COMMUNITY = 'https://steamcommunity.com';
const STORE = 'https://store.steampowered.com';
const ASSETS = 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps';
const MAX_GAMES = 15;
const MAX_SCREENSHOTS = 6;

// parseTagValue: false → el SteamID64 (17 dígitos) no pierde precisión al parsearse como número
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false });

const headerImage = (appid: string | number) => `${ASSETS}/${appid}/header.jpg`;
const coverImage = (appid: string | number) => `${ASSETS}/${appid}/library_600x900.jpg`;

/** id apto para URL: steam-<appid>-<apiname> */
export const steamAchievementId = (appid: string, apiname: string) =>
  `steam-${appid}-${apiname.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;

interface GameRef {
  appid: string;
  name?: string;
  hours?: number;
}

/** Logro crudo de cualquiera de las dos fuentes de Steam, ya normalizado */
interface RawAchievement {
  apiname: string;
  title: string;
  description: string;
  icon?: string;
  unlockTime?: number;
}

export async function getSteamData(): Promise<SourceData> {
  const id = import.meta.env.STEAM_ID;
  const key = import.meta.env.STEAM_API_KEY;
  if (!id) return demoSteam('Falta STEAM_ID');
  try {
    return key ? await fromWebApi(id, key) : await fromPublicProfile(id);
  } catch (err) {
    return demoSteam(`Steam: ${errorMessage(err)}`);
  }
}

/** Con API key: lista completa de juegos y logros vía Steam Web API. */
async function fromWebApi(id: string, key: string): Promise<SourceData> {
  const api = (path: string, params: Record<string, string | number>) =>
    get(`${API}/${path}?${new URLSearchParams({ key, ...stringify(params) })}`).then((r) => r.json());

  let steamid = id;
  if (!/^\d{17}$/.test(id)) {
    const r = await api('ISteamUser/ResolveVanityURL/v1/', { vanityurl: id });
    if (r.response?.success !== 1) throw new Error(`no se pudo resolver el usuario "${id}"`);
    steamid = r.response.steamid;
  }

  const [summary, owned] = await Promise.all([
    api('ISteamUser/GetPlayerSummaries/v2/', { steamids: steamid }),
    api('IPlayerService/GetOwnedGames/v1/', { steamid, include_appinfo: 1, include_played_free_games: 1 }),
  ]);
  const player = summary.response?.players?.[0];
  if (!player) throw new Error('perfil no encontrado');

  const ownedGames: any[] = owned.response?.games ?? [];
  const lastPlayed = ownedGames.reduce((a, b) => ((b.rtime_last_played ?? 0) > (a?.rtime_last_played ?? 0) ? b : a), null);

  const refs: GameRef[] = ownedGames
    .filter((g: any) => g.playtime_forever > 0)
    .sort((a: any, b: any) => b.playtime_forever - a.playtime_forever)
    .slice(0, MAX_GAMES)
    .map((g: any) => ({ appid: String(g.appid), name: g.name, hours: Math.round(g.playtime_forever / 6) / 10 }));

  const results = await Promise.all(
    mergeExtraGames(refs).map(async (ref) => {
      try {
        const [stats, schema] = await Promise.all([
          api('ISteamUserStats/GetPlayerAchievements/v1/', { steamid, appid: ref.appid, l: 'spanish' }),
          api('ISteamUserStats/GetSchemaForGame/v2/', { appid: ref.appid, l: 'spanish' }),
        ]);
        const icons = new Map<string, string>(
          asArray(schema.game?.availableGameStats?.achievements).map((a: any) => [a.name, a.icon]),
        );
        const name = ref.name ?? stats.playerstats?.gameName ?? `App ${ref.appid}`;
        const raw: RawAchievement[] = (stats.playerstats?.achievements ?? []).map((a: any) => ({
          apiname: a.apiname,
          title: a.name ?? a.apiname,
          description: a.description ?? '',
          icon: icons.get(a.apiname),
          unlockTime: a.achieved === 1 ? a.unlocktime : undefined,
        }));
        return buildGame(ref, name, raw);
      } catch {
        // Juegos sin logros devuelven 400: se muestran igual, sin progreso
        return buildGame(ref, ref.name ?? `App ${ref.appid}`, []);
      }
    }),
  );

  const prof: SourceProfile = {
    username: player.personaname,
    avatar: player.avatarfull,
    url: player.profileurl,
    memberSince: player.timecreated ? new Date(player.timecreated * 1000).toISOString() : undefined,
    lastGame: player.gameextrainfo
      ? { title: player.gameextrainfo, image: player.gameid && headerImage(player.gameid), platform: 'PC · Steam', playingNow: true }
      : lastPlayed?.rtime_last_played
        ? {
            title: lastPlayed.name,
            image: headerImage(lastPlayed.appid),
            platform: 'PC · Steam',
            playedAt: new Date(lastPlayed.rtime_last_played * 1000).toISOString(),
          }
        : undefined,
  };
  return build(prof, results);
}

/**
 * Sin API key: perfil público XML. Steam solo expone los juegos "más jugados
 * recientemente" sin login, así que se suman los de `steamGames` en src/data/profile.ts.
 */
async function fromPublicProfile(id: string): Promise<SourceData> {
  const base = /^\d{17}$/.test(id) ? `${COMMUNITY}/profiles/${id}` : `${COMMUNITY}/id/${id}`;
  const xml = (url: string) => get(url).then((r) => r.text()).then((t) => parser.parse(t));

  const { profile } = await xml(`${base}/?xml=1`);
  if (!profile) throw new Error('perfil no encontrado');
  if (profile.privacyState !== 'public') throw new Error('el perfil no es público');

  const refs: GameRef[] = asArray<any>(profile.mostPlayedGames?.mostPlayedGame)
    .map((g) => ({
      appid: String(g.gameLink).match(/app\/(\d+)/)?.[1] ?? '',
      name: g.gameName,
      hours: parseFloat(String(g.hoursOnRecord ?? '0').replace(/,/g, '')) || undefined,
    }))
    .filter((g) => g.appid);

  const results = await Promise.all(
    mergeExtraGames(refs).map(async (ref) => {
      try {
        const data = await xml(`${base}/stats/${ref.appid}/achievements/?xml=1&l=spanish`);
        const name = ref.name ?? data.playerstats?.game?.gameName ?? `App ${ref.appid}`;
        const raw: RawAchievement[] = asArray<any>(data.playerstats?.achievements?.achievement).map((a) => ({
          apiname: a.apiname,
          title: a.name,
          description: a.description ?? '',
          icon: a.iconClosed,
          unlockTime: a['@_closed'] === '1' ? Number(a.unlockTimestamp) : undefined,
        }));
        return buildGame(ref, name, raw);
      } catch {
        return buildGame(ref, ref.name ?? `App ${ref.appid}`, []);
      }
    }),
  );

  const prof: SourceProfile = {
    username: profile.steamID,
    avatar: profile.avatarFull,
    url: base,
    memberSince: profile.memberSince,
    status: profile.onlineState === 'in-game' ? 'En partida' : profile.stateMessage?.replace(/<[^>]+>/g, ' ').trim() || undefined,
    lastGame: lastGameFromXml(profile),
  };
  return build(prof, results);
}

/** Ficha de la tienda + rareza global de cada logro. Ninguno de los dos necesita API key. */
export async function getSteamGameDetail(game: GameProgress): Promise<GameDetail> {
  const appid = game.id.replace('steam-', '');
  const [store, global] = await Promise.all([
    get(`${STORE}/api/appdetails?appids=${appid}&l=spanish`)
      .then((r) => r.json())
      .then((j) => j?.[appid]?.data)
      .catch(() => undefined),
    get(`${API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appid}`)
      .then((r) => r.json())
      .catch(() => undefined),
  ]);

  const rarity = new Map<string, number>(
    asArray<any>(global?.achievementpercentages?.achievements).map((a) => [String(a.name).toLowerCase(), Number(a.percent)]),
  );
  const achievements = (game.achievementList ?? []).map((a) => ({ ...a, rarity: a.key ? rarity.get(a.key) : undefined }));

  return {
    id: game.id,
    source: 'steam',
    title: store?.name ?? game.title,
    platform: game.platform,
    icon: game.image,
    cover: coverImage(appid),
    coverFallback: headerImage(appid),
    description: store?.short_description ? decodeEntities(store.short_description) : undefined,
    developer: store?.developers?.join(', '),
    publisher: store?.publishers?.join(', '),
    genres: asArray<any>(store?.genres).map((g) => g.description),
    released: store?.release_date?.date,
    metacritic: store?.metacritic?.score,
    hours: game.hours,
    screenshots: asArray<any>(store?.screenshots).slice(0, MAX_SCREENSHOTS).map((s) => s.path_thumbnail),
    unlocked: game.unlocked,
    total: game.total,
    award: game.award,
    externalUrl: `${STORE}/app/${appid}`,
    achievements,
  };
}

/**
 * El XML público no trae fecha de última sesión: si está en partida se usa
 * `inGameInfo`; si no, el más jugado de las últimas 2 semanas.
 */
function lastGameFromXml(profile: any): LastGame | undefined {
  const playing = profile.inGameInfo;
  if (playing?.gameName) {
    const appid = String(playing.gameLink).match(/app\/(\d+)/)?.[1];
    return { title: playing.gameName, image: appid && headerImage(appid), platform: 'PC · Steam', playingNow: true };
  }
  const recent = asArray<any>(profile.mostPlayedGames?.mostPlayedGame)[0];
  if (!recent) return undefined;
  const appid = String(recent.gameLink).match(/app\/(\d+)/)?.[1];
  return {
    title: recent.gameName,
    image: appid && headerImage(appid),
    platform: 'PC · Steam',
    detail: `${String(recent.hoursPlayed).replace('.', ',')} h en las últimas 2 semanas`,
  };
}

function mergeExtraGames(refs: GameRef[]): GameRef[] {
  const seen = new Set(refs.map((r) => r.appid));
  const extra = siteProfile.steamGames.map(String).filter((appid) => !seen.has(appid));
  return [...refs, ...extra.map((appid) => ({ appid }))];
}

/** Arma el juego, su lista completa de logros y los desbloqueados para el listado general. */
function buildGame(ref: GameRef, title: string, raw: RawAchievement[]) {
  const gameId = `steam-${ref.appid}`;
  const list: AchievementDetail[] = raw.map((a) => ({
    id: steamAchievementId(ref.appid, a.apiname),
    key: a.apiname.toLowerCase(),
    source: 'steam',
    gameId,
    title: a.title,
    description: a.description,
    icon: a.icon,
    unlockedAt: a.unlockTime ? new Date(a.unlockTime * 1000).toISOString() : undefined,
  }));

  const unlocked: Achievement[] = list
    .filter((a) => a.unlockedAt)
    .map((a) => ({
      id: a.id,
      source: 'steam',
      gameId,
      title: a.title,
      description: a.description,
      game: title,
      platform: 'PC · Steam',
      icon: a.icon,
      unlockedAt: a.unlockedAt!,
    }));

  const game: GameProgress = {
    id: gameId,
    source: 'steam',
    title,
    platform: 'PC · Steam',
    image: headerImage(ref.appid),
    art: 'banner',
    unlocked: unlocked.length,
    total: list.length,
    hours: ref.hours,
    award: list.length > 0 && unlocked.length === list.length ? 'perfect' : undefined,
    url: `${STORE}/app/${ref.appid}`,
    achievementList: list,
  };
  return { game, unlocked };
}

function build(profile: SourceProfile, results: { game: GameProgress; unlocked: Achievement[] }[]): SourceData {
  return {
    source: 'steam',
    profile,
    games: results.map((r) => r.game),
    achievements: results.flatMap((r) => r.unlocked),
    demo: false,
  };
}

const stringify = (params: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
