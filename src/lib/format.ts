import type { Source } from './types';

const dateFmt = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' });

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

/** Etiqueta de rareza según el % de jugadores que tienen el logro */
export function rarityLabel(pct?: number) {
  if (pct == null) return undefined;
  if (pct < 1) return 'Legendario';
  if (pct < 5) return 'Épico';
  if (pct < 20) return 'Raro';
  if (pct < 50) return 'Poco común';
  return 'Común';
}

/** Descarta los datos sin valor y los pasa a texto, listos para <StatList> */
export function definedStats(stats: { label: string; value?: string | number | null | false }[]) {
  return stats
    .filter((s) => s.value != null && s.value !== '' && s.value !== false)
    .map((s) => ({ label: s.label, value: String(s.value) }));
}

export interface FilterOption {
  id: string;
  label: string;
  count: number;
}

/** Opciones Todos / Steam / RetroAchievements con sus conteos */
export function sourceOptions(items: { source: Source }[]): FilterOption[] {
  const count = (source: Source) => items.filter((i) => i.source === source).length;
  return [
    { id: 'all', label: 'Todos', count: items.length },
    { id: 'steam', label: SOURCE_LABELS.steam, count: count('steam') },
    { id: 'retro', label: SOURCE_LABELS.retro, count: count('retro') },
  ];
}
