/**
 * Filtro + búsqueda + paginación para listas que ya vienen renderizadas del build.
 * Se inicializa solo al importarse: `<script>import '…/scripts/collection';</script>`
 *
 * Marcado esperado:
 *   <section data-collection data-page-size="12">
 *     <button data-filter="all|<grupo>">…</button>
 *     <input data-search />
 *     <ul data-items> <li data-group="<grupo>">…</li> … </ul>
 *     <p data-empty hidden>…</p>
 *     <nav data-pager></nav>
 *   </section>
 */
function setup(root: HTMLElement) {
  root.dataset.ready = '';
  const items = [...root.querySelectorAll<HTMLElement>('[data-items] > [data-group]')];
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const search = root.querySelector<HTMLInputElement>('[data-search]');
  const pager = root.querySelector<HTMLElement>('[data-pager]');
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const size = Number(root.dataset.pageSize) || 12;
  // Texto de cada ítem normalizado una sola vez (sin tildes, minúsculas)
  const haystack = new Map(items.map((el) => [el, normalize(el.textContent ?? '')]));

  let filter = 'all';
  let query = '';
  let page = 1;

  const render = () => {
    const matching = items.filter(
      (el) => (filter === 'all' || el.dataset.group === filter) && (!query || haystack.get(el)!.includes(query)),
    );
    const pages = Math.max(1, Math.ceil(matching.length / size));
    page = Math.min(page, pages);

    const visible = new Set(matching.slice((page - 1) * size, page * size));
    items.forEach((el) => (el.hidden = !visible.has(el)));
    if (empty) empty.hidden = matching.length > 0;
    if (pager) renderPager(pager, page, pages, goTo);
  };

  const goTo = (target: number) => {
    if (target === page) return;
    // Las páginas tienen distinta altura: se compensa el scroll para que el
    // paginador quede exactamente donde estaba (bajo el cursor).
    const before = pager?.getBoundingClientRect().top ?? 0;
    page = target;
    render();
    const after = pager?.getBoundingClientRect().top ?? 0;
    window.scrollBy({ top: after - before, behavior: 'instant' });
  };

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter ?? 'all';
      page = 1;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    }),
  );

  search?.addEventListener('input', () => {
    query = normalize(search.value.trim());
    page = 1;
    render();
  });

  render();
}

function renderPager(nav: HTMLElement, page: number, pages: number, goTo: (p: number) => void) {
  nav.replaceChildren();
  nav.hidden = pages <= 1;
  if (pages <= 1) return;

  const button = (label: string, target: number, ariaLabel: string, isPageNumber = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pager__button';
    b.textContent = label;
    b.setAttribute('aria-label', ariaLabel);
    if (isPageNumber && target === page) b.setAttribute('aria-current', 'page');
    b.disabled = target < 1 || target > pages;
    b.addEventListener('click', () => goTo(target));
    return b;
  };

  nav.append(button('◀', page - 1, 'Página anterior'));
  for (const p of pageList(page, pages)) {
    if (p === '…') {
      const gap = document.createElement('span');
      gap.className = 'pager__gap';
      gap.textContent = '…';
      nav.append(gap);
    } else {
      nav.append(button(String(p), p, `Página ${p}`, true));
    }
  }
  nav.append(button('▶', page + 1, 'Página siguiente'));
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

/** 1 … 4 5 6 … 12 */
function pageList(page: number, pages: number): (number | '…')[] {
  const wanted = [...new Set([1, page - 1, page, page + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  wanted.forEach((p, i) => {
    if (i > 0 && p - wanted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

document.querySelectorAll<HTMLElement>('[data-collection]:not([data-ready])').forEach(setup);
