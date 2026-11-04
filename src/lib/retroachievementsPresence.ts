import type { Presence, PresenceField } from './types';

const SEPARATORS = /\s*(?:\||•|·)\s*/;
const TIME = /\d+h\d+:\d+|\d+:\d{2}(?::\d{2})?/;
const KEY_VALUE = /^([^:[\]]{1,24}):\s*(.+)$/;

const clean = (s: string) => s.replace(/[[\]]/g, '').trim();
/** Saca emojis/símbolos del principio: "⌚[1h54:41.31]" → "[1h54:41.31]" */
const stripLeadingSymbols = (s: string) => s.replace(/^[^\p{L}\p{N}[]+/u, '');

/**
 * Convierte el Rich Presence de RetroAchievements en un titular + campos.
 * "Samus is in Norfair | Normal | Energy: [177/399] • Items: [29%] • ⌚[1h54:41.31]"
 * → headline "Samus is in Norfair", fields Info=Normal, Energy=177/399, Items=29%, Tiempo=1h54:41.31
 */
export function parsePresence(message?: string): Presence | undefined {
  const parts = message?.split(SEPARATORS).map((p) => p.trim()).filter(Boolean) ?? [];
  if (!parts.length) return undefined;

  let headline: string | undefined;
  const fields: PresenceField[] = [];

  parts.forEach((part, i) => {
    const kv = TIME.test(part) ? null : part.match(KEY_VALUE);
    if (kv) {
      fields.push({ label: kv[1].trim(), value: clean(kv[2]) });
    } else if (i === 0) {
      headline = clean(part);
    } else {
      const value = clean(stripLeadingSymbols(part));
      fields.push({ label: TIME.test(value) ? 'Tiempo' : 'Info', value });
    }
  });

  return { headline, fields };
}
