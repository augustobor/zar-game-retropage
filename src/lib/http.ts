const TIMEOUT_MS = 15_000;

/** Espera máxima aceptable ante un 429: si el servidor pide más, se abandona ese pedido. */
const MAX_RETRY_WAIT_S = 10;

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Segundos indicados por el header Retry-After, si vino */
    public retryAfter?: number,
  ) {
    super(message);
  }
}

/** fetch con timeout que nunca filtra la API key en los mensajes de error. */
export async function get(url: string): Promise<Response> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const safe = url.replace(/([?&](?:key|y)=)[^&]+/g, '$1***');
    const retryAfter = Number(res.headers.get('retry-after')) || undefined;
    const hint = retryAfter ? ` (Retry-After: ${retryAfter}s)` : '';
    throw new HttpError(res.status, `HTTP ${res.status}${hint} en ${safe}`, retryAfter);
  }
  return res;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Deja pasar como máximo una tarea cada `intervalMs` (las demás esperan su turno). */
export function createRateLimiter(intervalMs: number) {
  let nextSlot = 0;
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + intervalMs;
    if (wait) await sleep(wait);
    return task();
  };
}

/** Reintenta ante 429 respetando Retry-After (o 1s, 2s, 4s…), salvo que pida esperar demasiado. */
export async function withRetry<T>(task: () => Promise<T>, tries = 4): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await task();
    } catch (err) {
      const rateLimited = err instanceof HttpError && err.status === 429;
      const waitS = rateLimited ? (err.retryAfter ?? 2 ** i) : 0;
      if (!rateLimited || i >= tries - 1 || waitS > MAX_RETRY_WAIT_S) throw err;
      await sleep(waitS * 1000);
    }
  }
}

export const asArray = <T>(v: T | T[] | undefined | null): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Entidades HTML comunes en textos de la tienda de Steam */
export const decodeEntities = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
