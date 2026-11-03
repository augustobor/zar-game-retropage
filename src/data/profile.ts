// ✏️ Todo el contenido "a mano" del sitio vive acá. Editalo libremente.

export const profile = {
  handle: 'ZAR',
  tagline: 'Cazador de logros · retro & moderno',
  location: 'Argentina',

  bio: [
    'Jugador de los que soplan el cartucho antes de ponerlo. Crecí entre consolas de 16 bits, fichines y partidas que duraban hasta que alguien gritaba "¡a cenar!".',
    'Hoy reparto el tiempo entre los clásicos —persiguiendo cada logro en RetroAchievements— y los juegos modernos de Steam. La meta es siempre la misma: el 100%.',
  ],

  // Hoja de personaje estilo RPG (0–100)
  stats: [
    { label: 'Paciencia', value: 88 },
    { label: 'Reflejos', value: 74 },
    { label: 'Completismo', value: 95 },
    { label: 'Nostalgia', value: 100 },
    { label: 'Rage quit', value: 23 },
  ],

  platforms: ['PC', 'SNES', 'Mega Drive', 'PlayStation', 'Game Boy', 'N64'],

  favorites: ['Super Mario World', 'Castlevania: SotN', 'Chrono Trigger', 'STAR WARS Jedi'],

  timeline: [
    { year: '199X', title: 'Insert coin', text: 'Primer joystick en mano. Empieza la leyenda.' },
    { year: '2018', title: 'Llega Steam', text: 'Se abre la cuenta y la biblioteca no para de crecer.' },
    { year: 'Hoy', title: 'Cazador de logros', text: 'Retro y moderno, todo suma al marcador.' },
  ],

  /**
   * Steam sin API key solo expone los juegos "jugados recientemente".
   * Agregá acá los appid de los juegos que quieras mostrar siempre
   * (el appid es el número en store.steampowered.com/app/<appid>).
   */
  steamGames: [] as (string | number)[],
};
