import type { Horoscope } from '../horoscope/generator.ts';
import type { DivinationProfile } from '../divination/browser-oracle.ts';
import type { LocalePack } from '../i18n/types.ts';
import { getAvailableLocales } from '../i18n/index.ts';
import {
  createHeader,
  createTopBar,
  createSignCard,
  createHoroscopeCard,
  createRegenerateButton,
  createDivinationPanel,
  createFooter,
} from './components.ts';

export function render(
  container: HTMLElement,
  horoscope: Horoscope,
  divination: DivinationProfile,
  locale: LocalePack,
  onLanguageChange: (id: string) => void,
  onRegenerate: () => void,
  onRandomize: () => void,
  isDark: boolean,
  onThemeToggle: () => void,
): void {
  if (!container || container.nodeType !== Node.ELEMENT_NODE) return;

  container.innerHTML = '';
  container.className = 'app';
  container.setAttribute('aria-live', 'polite');

  // propagate theme to documentElement so page-wide CSS transitions work on toggle
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const wrapper = document.createElement('div');
  wrapper.className = 'app__wrapper';

  wrapper.appendChild(
    createTopBar(getAvailableLocales(), locale.id, locale.ui, onLanguageChange, isDark, onThemeToggle),
  );
  wrapper.appendChild(createHeader(locale.ui));
  wrapper.appendChild(createSignCard(horoscope, locale.ui, onRandomize));
  wrapper.appendChild(createHoroscopeCard(horoscope, locale.ui));
  wrapper.appendChild(createRegenerateButton(locale.ui, onRegenerate));
  wrapper.appendChild(createDivinationPanel(divination, locale.ui));
  wrapper.appendChild(createFooter(locale.ui));

  container.appendChild(wrapper);

  requestAnimationFrame(() => applyStaggerAnimations(wrapper));
}

function applyStaggerAnimations(wrapper: HTMLDivElement): void {
  const cards = wrapper.querySelectorAll('.card');
  cards.forEach((card, i) => {
    (card as HTMLElement).style.animationDelay = `${i * 0.15}s`;
    card.classList.add('card--visible');
  });
}
