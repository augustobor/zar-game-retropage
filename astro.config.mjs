import { defineConfig } from 'astro/config';

// Sitio 100% estático: los datos de Steam y RetroAchievements se piden
// en tiempo de build, así las API keys nunca llegan al navegador.
export default defineConfig({
  output: 'static',
});
