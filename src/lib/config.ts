/** Entero positivo desde una variable de entorno, o el valor por defecto si falta o es inválido. */
const positiveInt = (value: string | undefined, fallback: number) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Cuántos logros como máximo se publican en /logros/ (Steam + RA, los más recientes). */
export const MAX_ACHIEVEMENTS = positiveInt(import.meta.env.MAX_ACHIEVEMENTS, 500);

/** Ventana hacia atrás, en minutos, para pedir logros recientes a RetroAchievements. Default: 2 años. */
export const RECENT_MINUTES = positiveInt(import.meta.env.RECENT_MINUTES, 60 * 24 * 365 * 2);
