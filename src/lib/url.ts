const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Respeta `base` de astro.config (p. ej. GitHub Pages en /<repo>/). */
export const url = (path: string) => `${BASE}${path}`;
