// ✏️ Todo el contenido "a mano" del sitio vive acá. Editalo libremente.

export const profile = {
  handle: 'ZAR',
  tagline: 'Achivement Hunter · retro & moderno',
  location: 'Argentina',

  // Oculta por ahora en el Brief (ver comentario en components/home/Brief.astro)
  bio: [
    'Jugador de los que soplan el cartucho antes de ponerlo. Crecí entre consolas de 16 bits, fichines y partidas que duraban hasta que alguien gritaba "¡a cenar!".',
    'Hoy reparto el tiempo entre los clásicos —persiguiendo cada logro en RetroAchievements— y los juegos modernos de Steam. La meta es siempre la misma: el 100%.',
  ],

  /**
   * Las plataformas se arman solas en cada build: "PC · Steam" + las consolas con
   * progreso en RetroAchievements (con su icono).
   * Acá solo van extras que no salgan de las APIs, p. ej. ['Arcade', 'Nintendo Switch'].
   */
  platforms: [] as string[],

  /**
   * Plataformas que no se muestran en el Brief ni como botón de filtro
   * (nombre tal cual lo da RetroAchievements). Sus juegos siguen en "Todos".
   */
  hiddenPlatforms: ['Genesis/Mega Drive', 'SNES/Super Famicom'],

  favorites: ['Crash Bandicoot 2', 'The Legend Of Zelda', 'Kirby', 'Solstice', 'Star Wars: Jedi Fallen Order'],

  timeline: [
    { year: '2006', title: 'Insert coin', text: 'Primer joystick en mano con PS1.' },
    { year: '2015', title: 'Llega Steam', text: 'La locura es total.' },
    { year: '2023', title: 'Llega Retroarchivements', text: 'Lo retro llega al dia de hoy.' },
    { year: 'Hoy', title: 'Cazador de logros', text: 'Retro y moderno, todo suma al marcador.' },
  ],

  /**
   * Steam sin API key solo expone los juegos "jugados recientemente".
   * Agregá acá los appid de los juegos que quieras mostrar siempre
   * (el appid es el número en store.steampowered.com/app/<appid>).
   */
  steamGames: [] as (string | number)[],
};
