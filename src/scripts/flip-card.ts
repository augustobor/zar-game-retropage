/**
 * Tarjetas que se dan vuelta ([data-flip], ver FloatCard.astro).
 * Click, Enter o Espacio alternan aria-pressed (que dispara el giro en CSS) y
 * agregan .is-spinning mientras dura el giro, para el destello en degradé.
 */
const SPIN_MS = 600; // igual que la transición y el destello en FloatCard.astro

document.querySelectorAll<HTMLElement>('[data-flip]').forEach((card) => {
  let spinTimer: number | undefined;

  const flip = () => {
    const flipped = card.getAttribute('aria-pressed') === 'true';
    card.setAttribute('aria-pressed', String(!flipped));

    // Reiniciar el destello aunque se haga click varias veces seguidas
    card.classList.remove('is-spinning');
    void card.offsetWidth;
    card.classList.add('is-spinning');
    clearTimeout(spinTimer);
    spinTimer = window.setTimeout(() => card.classList.remove('is-spinning'), SPIN_MS);
  };

  card.addEventListener('click', flip);
  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    flip();
  });
});
