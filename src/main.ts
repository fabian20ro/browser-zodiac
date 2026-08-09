import { readBrowserOracle } from './divination/browser-oracle.ts';
import { assignSign } from './divination/sign-assigner.ts';
import { generateHoroscope } from './horoscope/generator.ts';
import { randomSign } from './horoscope/zodiac.ts';
import type { ZodiacSign } from './horoscope/zodiac.ts';
import {
  getLocale,
  detectLanguage,
  persistLanguage,
  loadAllGrammars,
} from './i18n/index.ts';
import { render } from './ui/renderer.ts';
import { scheduleMidnightGmt } from './engine/scheduler.ts';
import './style.css';

const THEME_KEY = 'horror-scope-theme';

const ERROR_TEMPLATE = `
  <main style="min-height:100vh;display:grid;place-items:center;padding:1.5rem;">
    <section style="max-width:38rem;text-align:center;font-family:Georgia, serif;">
      <h1>Cosmic connection interrupted</h1>
      <p>We couldn't load the horoscope grammar files. Please retry.</p>
      <button id="retry-init" style="margin-top:1rem;padding:0.6rem 1.1rem;cursor:pointer;">Retry</button>
    </section>
  </main>
`;

export function detectTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // localStorage unavailable
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage unavailable
  }
}

async function initApp(): Promise<void> {
  const container = document.getElementById('app')!;

  // Prevent stacked error UIs on rapid retry clicks.
  if (container.innerHTML.trim() !== '') {
    container.innerHTML = '';
  }

  // Brief loading feedback while grammars are fetched — prevents blank white flash.
  const LOADING_TEMPLATE = `\
  <main style="min-height:100vh;display:grid;place-items:center;padding:1.5rem;">
    <section style="max-width:38rem;text-align:center;font-family:Georgia, serif;color:#aaa;">
      <p>Cosmic connection being established…</p>
    </section>
  </main>`;
  container.innerHTML = LOADING_TEMPLATE;

  try {
    await loadAllGrammars();
  } catch (error) {
    handleInitError(container);
    console.error('Failed to load grammar files during startup', error);
    return;
  }

function handleInitError(container: HTMLElement): void {
  container.innerHTML = ERROR_TEMPLATE;
  const retryBtn = document.getElementById('retry-init');
  retryBtn?.addEventListener('click', () => {
    void initApp();
  });
}


  let langId = detectLanguage();
  let consultation = 0;
  let signOverride: ZodiacSign | null = null;
  let theme = detectTheme();
  applyTheme(theme);

  function renderApp(): void {
    const divination = readBrowserOracle();
    const sign = signOverride ?? assignSign(divination.fingerprint);
    const locale = getLocale(langId);
    const horoscope = generateHoroscope(sign, locale, divination, new Date(), consultation);
    render(
      container,
      horoscope,
      divination,
      locale,
      (newLangId) => {
        langId = newLangId;
        persistLanguage(newLangId);
        renderApp();
      },
      () => {
        consultation++;
        renderApp();
      },
      () => {
        signOverride = randomSign(sign);
        consultation = 0;
        renderApp();
      },
      theme === 'dark',
      () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(theme);
        renderApp();
      },
    );
  }

  renderApp();
  scheduleMidnightGmt(renderApp);
}

initApp();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  });
}
