import type { Achievement, GameDetail, GameProgress, SourceData } from './types';
import { getRetroGameDetail } from './retroachievements';
import { getSteamGameDetail } from './steam';
import { errorMessage } from './http';

/**
 * Ficha completa de un juego (una llamada extra a la API).
 * Si la fuente está en demo o la API falla, se arma con lo que ya había.
 */
export async function buildGameDetail(source: SourceData, game: GameProgress): Promise<GameDetail> {
  const unlocked = source.achievements.filter((a) => a.gameId === game.id);
  if (source.demo) return fallbackDetail(game, unlocked);
  try {
    return await (game.source === 'retro' ? getRetroGameDetail(game) : getSteamGameDetail(game));
  } catch (err) {
    console.warn(`[detalle] ${game.title}: ${errorMessage(err)}`);
    return fallbackDetail(game, unlocked);
  }
}

function fallbackDetail(game: GameProgress, unlocked: Achievement[]): GameDetail {
  return {
    id: game.id,
    source: game.source,
    title: game.title,
    platform: game.platform,
    icon: game.image,
    cover: game.image,
    genres: [],
    hours: game.hours,
    screenshots: [],
    unlocked: game.unlocked,
    total: game.total,
    award: game.award,
    externalUrl: game.url,
    achievements: game.achievementList ?? unlocked,
  };
}
