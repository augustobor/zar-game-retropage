import type { SourceData } from './types';

// Datos de relleno para cuando faltan las keys o la API falla: el build nunca se rompe.
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export function demoRetro(error: string): SourceData {
  console.warn(`[retroachievements] usando datos de demo → ${error}`);
  return {
    source: 'retro',
    demo: true,
    error,
    profile: { username: 'ElZar', url: 'https://retroachievements.org/user/ElZar', points: 1337 },
    games: [
      { id: 'retro-d1', source: 'retro', title: 'Super Mario World', platform: 'SNES', art: 'icon', unlocked: 96, total: 96, award: 'mastered' },
      { id: 'retro-d2', source: 'retro', title: 'Castlevania: Symphony of the Night', platform: 'PlayStation', art: 'icon', unlocked: 41, total: 72 },
      { id: 'retro-d3', source: 'retro', title: 'Sonic the Hedgehog 2', platform: 'Mega Drive', art: 'icon', unlocked: 12, total: 38 },
    ],
    achievements: [
      { id: 'retro-a1', source: 'retro', gameId: 'retro-d1', title: 'Star Road', description: 'Encontrá el camino de las estrellas', game: 'Super Mario World', platform: 'SNES', unlockedAt: daysAgo(2), points: 10, hardcore: true },
      { id: 'retro-a2', source: 'retro', gameId: 'retro-d2', title: 'Lo que es un hombre', description: 'Derrotá a Drácula en el castillo', game: 'Castlevania: Symphony of the Night', platform: 'PlayStation', unlockedAt: daysAgo(9), points: 25, hardcore: true },
      { id: 'retro-a3', source: 'retro', gameId: 'retro-d3', title: 'Gotta Go Fast', description: 'Terminá Emerald Hill en menos de 40 segundos', game: 'Sonic the Hedgehog 2', platform: 'Mega Drive', unlockedAt: daysAgo(20), points: 5 },
    ],
  };
}

export function demoSteam(error: string): SourceData {
  console.warn(`[steam] usando datos de demo → ${error}`);
  return {
    source: 'steam',
    demo: true,
    error,
    profile: { username: 'Zar', url: 'https://steamcommunity.com/profiles/76561198851163602' },
    games: [
      { id: 'steam-d1', source: 'steam', title: 'STAR WARS Jedi: Survivor™', platform: 'PC · Steam', art: 'banner', unlocked: 12, total: 53, hours: 28 },
      { id: 'steam-d2', source: 'steam', title: 'War Thunder', platform: 'PC · Steam', art: 'banner', unlocked: 8, total: 70, hours: 19.4 },
    ],
    achievements: [
      { id: 'steam-a1', source: 'steam', gameId: 'steam-d1', title: 'Rooftop Duel', description: 'Defeat an Inquisitor', game: 'STAR WARS Jedi: Survivor™', platform: 'PC · Steam', unlockedAt: daysAgo(4) },
      { id: 'steam-a2', source: 'steam', gameId: 'steam-d2', title: 'Primera sangre', description: 'Destruí tu primer vehículo enemigo', game: 'War Thunder', platform: 'PC · Steam', unlockedAt: daysAgo(15) },
    ],
  };
}
