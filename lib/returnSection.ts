/**
 * Remembers which landing section the visitor was on when they left for
 * /aderir, so "Voltar ao site" can bring them back to the same place.
 */

const STORAGE_KEY = "tp-return-section";

/** Landing sections in page order (ids double as hash targets). */
const SECTION_IDS = [
  "inicio",
  "produto",
  "produto-features",
  "como-funciona",
  "planos",
  "contacto",
] as const;

function currentSectionId(): string | null {
  // Last section whose top is above mid-viewport.
  const probe = window.innerHeight * 0.5;
  let found: string | null = null;
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= probe) found = id;
  }
  return found;
}

export function rememberSection() {
  const id = currentSectionId();
  try {
    if (id) sessionStorage.setItem(STORAGE_KEY, id);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked — "Voltar ao site" falls back to the top of the page.
  }
}

/** Landing URL that returns to the remembered section ("/" if none). */
export function returnHref(): string {
  try {
    const id = sessionStorage.getItem(STORAGE_KEY);
    if (id && id !== "inicio" && (SECTION_IDS as readonly string[]).includes(id)) {
      return `/#${id}`;
    }
  } catch {
    // ignore
  }
  return "/";
}
