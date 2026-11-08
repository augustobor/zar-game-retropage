import type { Presence, PresenceField } from './types';

const SEPARATORS = /\s*(?:\||•|·)\s*/;
const TIME = /\d+h\d+:\d+|\d+:\d{2}(?::\d{2})?/;
const KEY_VALUE = /^([^:[\]]{1,24}):\s*(.+)$/;
/** Palabras "de verdad" (2+ letras): mide cuánto se parece una parte a una frase */
const WORD = /\p{L}{2,}/gu;

const clean = (s: string) => s.replace(/[[\]]/g, '').trim();
/** Saca emojis/símbolos del principio: "⌚[1h54:41.31]" → "[1h54:41.31]" */
const stripLeadingSymbols = (s: string) => s.replace(/^[^\p{L}\p{N}[]+/u, '');
const wordCount = (s: string) => s.match(WORD)?.length ?? 0;

/**
 * Convierte el Rich Presence de RetroAchievements en un titular + campos.
 * El titular es la parte sin etiqueta que más se parece a una frase; el resto quedan como campos
 * (con etiqueta si la traían, "Clave: valor", o sin etiqueta).
 *
 * "Samus is in Norfair | Normal | Energy: [177/399] • ⌚[1h54:41.31]"
 *   → titular "Samus is in Norfair" · campos: Normal, Energy=177/399, Tiempo=1h54:41.31
 * "Mission: copcar ♥100 | Uzi | Driving the Police Car around Ocean Beach | 8/100 Packages"
 *   → titular "Driving the Police Car around Ocean Beach" · campos: Mission=copcar ♥100, Uzi, 8/100 Packages
 */
export function parsePresence(message?: string): Presence | undefined {
  const parts = message?.split(SEPARATORS).map((p) => p.trim()).filter(Boolean) ?? [];
  if (!parts.length) return undefined;

  const fields = parts.map(toField);
  const headline = pickHeadline(fields);
  return {
    headline: headline?.value,
    fields: fields.filter((field) => field !== headline),
  };
}

function toField(part: string): PresenceField {
  const kv = TIME.test(part) ? null : part.match(KEY_VALUE);
  if (kv) return { label: kv[1].trim(), value: clean(kv[2]) };
  const value = clean(stripLeadingSymbols(part));
  return TIME.test(value) ? { label: 'Tiempo', value } : { value };
}

/**
 * La parte sin etiqueta que más se parece a una frase (3+ palabras, la más larga);
 * si ninguna lo es, la primera sin etiqueta ("Title Screen").
 */
function pickHeadline(fields: PresenceField[]): PresenceField | undefined {
  const unlabeled = fields.filter((field) => !field.label);
  const sentences = unlabeled.filter((field) => wordCount(field.value) >= 3);
  const longest = sentences.reduce<PresenceField | undefined>(
    (best, field) => (!best || wordCount(field.value) > wordCount(best.value) ? field : best),
    undefined,
  );
  return longest ?? unlabeled[0];
}
