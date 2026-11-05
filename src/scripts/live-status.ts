/**
 * Status en vivo: cada 60 s pide /partials/cuentas/ (función de Vercel que consulta
 * RA y Steam con la key del lado del servidor) y reemplaza las tarjetas de cuenta.
 * Si la función no existe (preview local, otro hosting) queda la versión del build.
 */
const REFRESH_MS = 60_000;

const section = document.querySelector<HTMLElement>('[data-live-src]');

async function refresh() {
  if (!section?.dataset.liveSrc || document.hidden) return;
  try {
    const res = await fetch(section.dataset.liveSrc);
    if (!res.ok) return;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const fresh = doc.querySelector('[data-live-src]');
    if (fresh) section.replaceChildren(...fresh.childNodes);
  } catch {
    // Sin conexión o función caída: se mantienen los datos que ya están en pantalla
  }
}

if (section) {
  refresh();
  setInterval(refresh, REFRESH_MS);
  // Al volver a la pestaña se actualiza enseguida, sin esperar el próximo intervalo
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
}
