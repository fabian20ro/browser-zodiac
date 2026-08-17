import type { Horoscope } from '../horoscope/generator.ts';
import type { DivinationProfile } from '../divination/browser-oracle.ts';
import type { UIStrings } from '../i18n/types.ts';
import type { LocalePack } from '../i18n/types.ts';
import { createActionButton, copyToClipboard, buildGoogleAIUrl } from './actions.ts';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function appendDetailRow(parent: HTMLElement, label: string, value: string): void {
  const row = el('div', 'detail-row');
  row.appendChild(el('span', 'detail-row__label', label));
  row.appendChild(el('span', 'detail-row__value', value));
  parent.appendChild(row);
}

const LANG_FLAGS: Record<string, string> = {
  en: '\u{1F1EC}\u{1F1E7}',
  ro: '\u{1F1F7}\u{1F1F4}',
};

export function createTopBar(
  locales: LocalePack[],
  currentLangId: string,
  ui: UIStrings,
  onLanguageChange: (id: string) => void,
  isDark: boolean,
  onThemeToggle: () => void,
): HTMLElement {
  const bar = el('div', 'top-bar');

  // Language toggle button (shows both flags: current → target)
  const otherLocale = locales.find((l) => l.id !== currentLangId) ?? locales[0];
  const currentFlag = LANG_FLAGS[currentLangId] ?? '';
  const otherFlag = LANG_FLAGS[otherLocale.id] ?? otherLocale.name;
  const langBtn = el('button', 'top-bar__btn', currentFlag ? `${currentFlag} → ${otherFlag}` : otherFlag);
  langBtn.type = 'button';
  langBtn.setAttribute(
    'aria-label',
    ui.switchToLanguageLabel.replace('{language}', otherLocale.name),
  );
  langBtn.addEventListener('click', () => onLanguageChange(otherLocale.id));

  // Theme toggle button
  const themeBtn = el('button', 'top-bar__btn', isDark ? '\u2600\uFE0F' : '\u{1F319}');
  themeBtn.type = 'button';
  themeBtn.setAttribute('aria-label', isDark ? ui.switchToLightTheme : ui.switchToDarkTheme);
  themeBtn.addEventListener('click', onThemeToggle);

  bar.append(langBtn, themeBtn);
  return bar;
}

export function createHeader(ui: UIStrings): HTMLElement {
  const header = el('header', 'header');
  const deco = el('div', 'header__stars', '\u2726 \u263D \u2727 \u2726');
  const title = el('h1', 'header__title', ui.title);
  const subtitle = el('p', 'header__subtitle', ui.subtitle);
  header.append(deco, title, subtitle);
  return header;
}

export function createSignCard(
  horoscope: Horoscope,
  ui: UIStrings,
  onRandomize: () => void,
): HTMLElement {
  const card = el('section', 'card sign-card');
  const label = el('div', 'sign-card__label', ui.yourSign);

  const nameRow = el('div', 'sign-card__name-row');
  const symbol = el('span', 'sign-card__symbol', `${horoscope.signSymbol}\uFE0E`);
  const name = el('span', 'sign-card__name', ui.signNames[horoscope.sign]);
  const diceBtn = el('button', 'sign-card__randomize', '\u{1F3B2}');
  diceBtn.type = 'button';
  diceBtn.setAttribute('aria-label', ui.randomizeSign);
  diceBtn.addEventListener('click', onRandomize);
  nameRow.append(symbol, name, diceBtn);

  card.append(label, nameRow);
  return card;
}

export function createHoroscopeCard(
  horoscope: Horoscope,
  ui: UIStrings,
): HTMLElement {
  const card = el('article', 'card horoscope-card');

  const headingRow = el('div', 'horoscope-card__heading-row');
  const heading = el('h2', 'horoscope-card__heading', ui.dailyHoroscope);

  const copyBtn = createActionButton({
    icon: '\u29C9',
    feedbackIcon: '\u2713',
    ariaLabel: ui.copyHoroscope,
    onClick: () => copyToClipboard(horoscope.text),
  });

  const aiBtn = createActionButton({
    icon: '→',
    ariaLabel: ui.interpretWithAI,
    onClick: () => {
      const url = buildGoogleAIUrl(ui.aiInterpretQuery + horoscope.text);
      window.open(url, '_blank', 'noopener');
    },
  });

  headingRow.append(copyBtn, heading, aiBtn);

  const text = el('p', 'horoscope-card__text', horoscope.text);

  const details = el('div', 'horoscope-card__details');

  for (const [labelKey, value] of [
    [ui.luckyNumber, String(horoscope.luckyNumber)],
    [ui.luckyColor, horoscope.luckyColor],
    [ui.cosmicWarning, horoscope.warning],
    [ui.compatibility, horoscope.compatibility],
  ]) {
    appendDetailRow(details, labelKey, value);
  }

  card.append(headingRow, text, details);
  return card;
}

export function createRegenerateButton(
  ui: UIStrings,
  onRegenerate: () => void,
): HTMLElement {
  const btn = el('button', 'regen-btn', ui.regenerate);
  btn.type = 'button';
  btn.addEventListener('click', onRegenerate);
  return btn;
}

export function createDivinationPanel(
  divination: DivinationProfile,
  ui: UIStrings,
): HTMLElement {
  const section = el('section', 'card divination-card');
  const heading = el('h3', 'divination-card__heading', ui.browserDivination);

  const toggle = el('button', 'divination-card__toggle', '\u25BC');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Show ' + ui.toggleDivinationDetails);
  heading.appendChild(toggle);

  const list = el('div', 'divination-card__list');
  list.id = 'divination-card__list';
  list.classList.add('divination-card__list--collapsed');
  toggle.setAttribute('aria-controls', list.id);

  for (const reading of divination.readings) {
    const label = ui.divinationLabels[reading.key] ?? reading.key;
    appendDetailRow(list, label, reading.raw);
  }

  toggle.addEventListener('click', () => {
    const expanded = list.classList.toggle('divination-card__list--collapsed');
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded ? '\u25BC' : '\u25B2';
  });

  section.append(heading, list);
  return section;
}

export function createFooter(ui: UIStrings): HTMLElement {
  const footer = el('footer', 'footer');
  const gen = el('p', 'footer__generated', `✧ ${ui.generatedBy} ✧`);
  const disc = el('p', 'footer__disclaimer', ui.footer);

  const badgeLink = el('a', 'footer__badge');
  badgeLink.href = 'https://github.com/fabian20ro/browser-zodiac';
  badgeLink.target = '_blank';
  badgeLink.rel = 'noopener noreferrer';
  const badgeImg = el('img') as HTMLImageElement;
  badgeImg.src =
    'https://github.com/fabian20ro/browser-zodiac/actions/workflows/deploy.yml/badge.svg';
  badgeImg.alt = 'Deploy to GitHub Pages';
  badgeLink.appendChild(badgeImg);

  footer.append(gen, disc, badgeLink);
  return footer;
}
