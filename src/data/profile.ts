// ✏️ Todo el contenido "a mano" del sitio vive acá. Editalo libremente.

export const profile = {
  handle: 'ZAR',
  tagline: 'Achivement Hunter · retro & moderno',
  location: 'Argentina',

  // Cada texto es un párrafo. Links con la sintaxis de Markdown: [texto](https://…)
  bio: [
    'Soy Zar. Arranqué en 2006 con una PS1 heredada de mi primo jugando Crash Bash; después vinieron Crash Twinsanity, Indiana Jones a la salida del cole y tardes de Battlefront y Guitar Hero III con mi bro de toda la vida Fede.',
    'En 2023 volví a lo retro con [RetroAchievements](https://retroachievements.org/user/ElZar): nostalgia y la excusa perfecta para jugar lo que nunca tuve. 100% Hardcore.',
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
    { year: '2006', title: 'Insert coin y PS1', text: 'Una PS1 heredada de mi primo y Crash Bash como primer juego.' },
    { year: '2009', title: 'PS2', text: 'jugar Indiana Jones y Crash Twinsanity después del cole.' },
    { year: '2012', title: 'Player 2: Fede', text: 'Battlefront y Guitar Hero hasta tarde.' },
    { year: '2015', title: 'Llega Steam', text: 'La locura es total.' },
    { year: '2023', title: 'Llega RetroAchievements', text: 'Nostalgia y la excusa para jugar lo que nunca tuve: platinarlo.' },
    { year: 'Hoy', title: 'Cazador de logros', text: "Siempre en hardcore. La maestría más sufrida: Kirby's Dream Land." },
  ],

  /**
   * Steam sin API key solo expone los juegos "jugados recientemente".
   * Agregá acá los appid de los juegos que quieras mostrar siempre
   * (el appid es el número en store.steampowered.com/app/<appid>).
   */
  steamGames: [] as (string | number)[],
};
