/**
 * <img data-fallback="otra.jpg">: si la imagen no existe (p. ej. Steam no tiene portada
 * vertical para ese juego) se reemplaza por la alternativa.
 */
const swap = (img: HTMLImageElement) => {
  const fallback = img.dataset.fallback;
  if (fallback && img.src !== fallback) img.src = fallback;
};

document.querySelectorAll<HTMLImageElement>('img[data-fallback]').forEach((img) => {
  // Puede haber fallado antes de que este módulo (diferido) se ejecute
  if (img.complete && img.naturalWidth === 0) swap(img);
  else img.addEventListener('error', () => swap(img), { once: true });
});
