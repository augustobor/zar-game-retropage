import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Sitio estático: los datos de Steam y RetroAchievements se piden en tiempo de build,
// así las API keys nunca llegan al navegador. La única excepción es /partials/cuentas/
// (prerender = false), que Vercel ejecuta como función para el status en vivo.
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  build: {
    // Con miles de páginas de logro, copiar el CSS dentro de cada HTML pesaba ~48 MB.
    // En archivos compartidos el navegador lo descarga una vez y lo reutiliza.
    inlineStylesheets: 'never',
  },
});
