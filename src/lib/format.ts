
const dateFmt = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
// Compacto para que entre en una línea: "19/07/2025, 18:56"
const dateTimeFmt = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const validDate = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export const formatDate = (iso?: string) => {
  const d = validDate(iso);
  return d ? dateFmt.format(d) : (iso ?? '');
};

export const formatDateTime = (iso?: string) => {
  const d = validDate(iso);
  return d ? dateTimeFmt.format(d) : (iso ?? '');
};

/** RA da "2004-02-09"; Steam da texto ya formateado ("27 ABR 2023") */
export const formatRelease = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(`${value}T12:00:00Z`) : value;

export const formatNumber = (n: number) => new Intl.NumberFormat('es-AR').format(Math.round(n));

export const formatPercent = (n: number) =>
  `${n.toLocaleString('es-AR', { maximumFractionDigits: n < 10 ? 1 : 0 })}%`;

export const percent = (unlocked: number, total: number) => (total > 0 ? Math.round((unlocked / total) * 100) : 0);

export const AWARD_LABELS: Record<string, string> = {
  mastered: 'Maestría',
  completed: 'Completado',
  'beaten-hardcore': 'Pasado · HC',
  'beaten-softcore': 'Pasado',
  perfect: '100%',
};

export const SOURCE_LABELS = { steam: 'Steam', retro: 'RetroAchievements' } as const;

export const ACHIEVEMENT_TYPES: Record<string, string> = {
  progression: 'Progresión',
  win_condition: 'Condición de victoria',
  missable: 'Perdible',
};

export type RarityTierId = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

/**
 * Nivel de rareza según el % de jugadores que tienen el logro.
 * El `id` elige el color (variables --rarity-* en global.css).
 */
export function rarityTier(pct?: number): { id: RarityTierId; label: string } | undefined {
  if (pct == null) return undefined;
  if (pct < 1) return { id: 'legendary', label: 'Legendario' };
  if (pct < 5) return { id: 'epic', label: 'Épico' };
  if (pct < 20) return { id: 'rare', label: 'Raro' };
  if (pct < 50) return { id: 'uncommon', label: 'Poco común' };
  return { id: 'common', label: 'Común' };
}

/** Descarta los datos sin valor y los pasa a texto, listos para <StatList> */
export function definedStats(stats: { label: string; value?: string | number | null | false; icon?: string }[]) {
  return stats
    .filter((s) => s.value != null && s.value !== '' && s.value !== false)
    .map((s) => ({ label: s.label, value: String(s.value), icon: s.icon }));
}

export interface FilterOption {
  id: string;
  label: string;
  count: number;
  icon?: string;
}

/**
 * Opciones "Todos" + una por plataforma (consola), de la que más ítems tiene a la que menos.
 * El id es el nombre de la plataforma: coincide con el data-group de cada tarjeta.
 * Las de `hidden` no tienen botón propio (sus ítems siguen apareciendo en "Todos").
 */
export function platformOptions(
  items: { platform: string }[],
  icons: Map<string, string>,
  hidden: string[] = [],
): FilterOption[] {
  const hiddenSet = new Set(hidden.map((name) => name.toLowerCase()));
  const counts = new Map<string, number>();
  for (const { platform } of items) counts.set(platform, (counts.get(platform) ?? 0) + 1);
  const platforms = [...counts]
    .filter(([name]) => !hiddenSet.has(name.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ id: name, label: name, count, icon: icons.get(name) }));
  return [{ id: 'all', label: 'Todos', count: items.length }, ...platforms];
}
