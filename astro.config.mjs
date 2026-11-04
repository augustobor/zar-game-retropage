import { defineConfig } from 'astro/config';

// Sitio 100% estático: los datos de Steam y RetroAchievements se piden
// en tiempo de build, así las API keys nunca llegan al navegador.
export default defineConfig({
  output: 'static',
  build: {
    // Con miles de páginas de logro, copiar el CSS dentro de cada HTML pesaba ~48 MB.
    // En archivos compartidos el navegador lo descarga una vez y lo reutiliza.
    inlineStylesheets: 'never',
  },
});
