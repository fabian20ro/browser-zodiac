// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import {
  createRegenerateButton,
  createHoroscopeCard,
  createSignCard,
  createTopBar,
  createDivinationPanel,
  createHeader,
  createFooter,
} from './components.ts';
import type { UIStrings } from '../i18n/types.ts';
import type { Horoscope } from '../horoscope/generator.ts';

const minimalUi: UIStrings = {
  title: 'T',
  subtitle: 'S',
  yourSign: 'Y',
  dailyHoroscope: 'D',
  luckyNumber: 'L',
  luckyColor: 'C',
  cosmicWarning: 'W',
  compatibility: 'Co',
  browserDivination: 'B',
  randomizeSign: 'Randomize',
  regenerate: 'Read Again',
  copyHoroscope: 'Copy',
  copiedHoroscope: 'Copied!',
  interpretWithAI: 'Interpret',
  aiInterpretQuery: 'interpret this: ',
  switchToLanguageLabel: 'Switch to {language}',
  switchToLightTheme: 'Switch to light theme',
  switchToDarkTheme: 'Switch to dark theme',
  toggleDivinationDetails: 'Toggle divination details',
  generatedBy: 'G',
  footer: 'F',
  signNames: {
    aries: 'A', taurus: 'T', gemini: 'G', cancer: 'C', leo: 'L',
    virgo: 'V', libra: 'Li', scorpio: 'Sc', sagittarius: 'Sa',
    capricorn: 'Ca', aquarius: 'Aq', pisces: 'P',
  },
  divinationLabels: {},
};

const locales = [
  { id: 'en', name: 'English', ui: minimalUi, grammar: {} },
  { id: 'ro', name: 'Română', ui: minimalUi, grammar: {} },
];

const minimalHoroscope: Horoscope = {
  sign: 'aries',
  signSymbol: '♈',
  text: 'You will find a mysterious sock.',
  luckyNumber: 42,
  luckyColor: 'purple',
  warning: 'Beware of pigeons.',
  compatibility: 'Leo',
  date: '2026-03-03',
};

describe('createRegenerateButton', () => {
  it('returns a button element', () => {
    const btn = createRegenerateButton(minimalUi, () => {});
    expect(btn.tagName).toBe('BUTTON');
  });

  it('defaults to type button', () => {
    const btn = createRegenerateButton(minimalUi, () => {}) as HTMLButtonElement;
    expect(btn.type).toBe('button');
  });

  it('has the regen-btn CSS class', () => {
    const btn = createRegenerateButton(minimalUi, () => {});
    expect(btn.className).toBe('regen-btn');
  });

  it('displays the regenerate label from UIStrings', () => {
    const btn = createRegenerateButton(minimalUi, () => {});
    expect(btn.textContent).toBe('Read Again');
  });

  it('calls the callback when clicked', () => {
    const onRegenerate = vi.fn();
    const btn = createRegenerateButton(minimalUi, onRegenerate);
    btn.click();
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('does not call callback before click', () => {
    const onRegenerate = vi.fn();
    createRegenerateButton(minimalUi, onRegenerate);
    expect(onRegenerate).not.toHaveBeenCalled();
  });
});

describe('createSignCard', () => {
  it('renders a dice randomize button', () => {
    const card = createSignCard(minimalHoroscope, minimalUi, () => {});
    const btn = card.querySelector('.sign-card__randomize');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe('\u{1F3B2}');
    expect(btn!.getAttribute('aria-label')).toBe('Randomize');
    expect((btn as HTMLButtonElement).type).toBe('button');
  });

  it('calls onRandomize when dice button is clicked', () => {
    const onRandomize = vi.fn();
    const card = createSignCard(minimalHoroscope, minimalUi, onRandomize);
    const btn = card.querySelector('.sign-card__randomize') as HTMLElement;
    btn.click();
    expect(onRandomize).toHaveBeenCalledTimes(1);
  });

  it('displays the sign name next to the dice button', () => {
    const card = createSignCard(minimalHoroscope, minimalUi, () => {});
    const nameRow = card.querySelector('.sign-card__name-row');
    expect(nameRow).not.toBeNull();
    const name = nameRow!.querySelector('.sign-card__name');
    expect(name!.textContent).toBe('A');
  });
});

describe('createHoroscopeCard', () => {
  it('contains a heading row with two action buttons and a heading', () => {
    const card = createHoroscopeCard(minimalHoroscope, minimalUi);
    const headingRow = card.querySelector('.horoscope-card__heading-row');
    expect(headingRow).not.toBeNull();
    const buttons = headingRow!.querySelectorAll('.action-btn');
    expect(buttons.length).toBe(2);
    const heading = headingRow!.querySelector('.horoscope-card__heading');
    expect(heading).not.toBeNull();
  });

  it('places the copy button before the heading', () => {
    const card = createHoroscopeCard(minimalHoroscope, minimalUi);
    const headingRow = card.querySelector('.horoscope-card__heading-row')!;
    const firstChild = headingRow.children[0] as HTMLElement;
    expect(firstChild.textContent).toBe('⧉');
    expect(firstChild.getAttribute('aria-label')).toBe('Copy');
  });

  it('places the interpret button after the heading', () => {
    const card = createHoroscopeCard(minimalHoroscope, minimalUi);
    const headingRow = card.querySelector('.horoscope-card__heading-row')!;
    const lastChild = headingRow.children[2] as HTMLElement;
    expect(lastChild.textContent).toBe('→');
    expect(lastChild.getAttribute('aria-label')).toBe('Interpret');
  });

  it('displays the horoscope text', () => {
    const card = createHoroscopeCard(minimalHoroscope, minimalUi);
    const text = card.querySelector('.horoscope-card__text');
    expect(text?.textContent).toBe('You will find a mysterious sock.');
  });

  it('renders all four detail rows with correct labels and values', () => {
    const card = createHoroscopeCard(minimalHoroscope, minimalUi);
    const details = card.querySelector('.horoscope-card__details');
    expect(details).not.toBeNull();
    const rows = details!.querySelectorAll('.detail-row');
    expect(rows.length).toBe(4);

    // Row 0: lucky number
    expect((rows[0].querySelector('.detail-row__label') as HTMLElement).textContent).toBe('L');
    expect((rows[0].querySelector('.detail-row__value') as HTMLElement).textContent).toBe('42');

    // Row 1: lucky color
    expect((rows[1].querySelector('.detail-row__label') as HTMLElement).textContent).toBe('C');
    expect((rows[1].querySelector('.detail-row__value') as HTMLElement).textContent).toBe('purple');

    // Row 2: cosmic warning
    expect((rows[2].querySelector('.detail-row__label') as HTMLElement).textContent).toBe('W');
    expect((rows[2].querySelector('.detail-row__value') as HTMLElement).textContent).toBe('Beware of pigeons.');

    // Row 3: compatibility
    expect((rows[3].querySelector('.detail-row__label') as HTMLElement).textContent).toBe('Co');
    expect((rows[3].querySelector('.detail-row__value') as HTMLElement).textContent).toBe('Leo');
  });
});

describe('createTopBar', () => {
  it('shows sun icon and switches-to-dark label when starting in dark mode', () => {
    const bar = createTopBar(locales, 'en', minimalUi, () => {}, true, () => {});
    const buttons = bar.querySelectorAll('button');
    const languageButton = buttons[0] as HTMLButtonElement;
    const themeButton = buttons[1] as HTMLButtonElement;

    expect(languageButton.getAttribute('aria-label')).toBe('Switch to Română');
    expect(themeButton.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(languageButton.type).toBe('button');
    expect(themeButton.type).toBe('button');
    expect(themeButton.textContent).toBe('\u2600\uFE0F'); // ☀️ for dark mode starting point
  });

  it('shows moon icon and switches-to-dark label when starting in light mode', () => {
    const bar = createTopBar(locales, 'en', minimalUi, () => {}, false, () => {});
    const buttons = bar.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const themeButton = buttons[1];

    expect(themeButton.textContent).toBe('\u{1F319}'); // 🌙 for light mode starting point
    expect(themeButton.getAttribute('aria-label')).toBe('Switch to dark theme');
  });

  it('shows both flags (current → target) on the language button', () => {
    const bar = createTopBar(locales, 'en', minimalUi, () => {}, true, () => {});
    const languageButton = bar.querySelector('.top-bar__btn') as HTMLElement;
    expect(languageButton.textContent).toBe('\u{1F1EC}\u{1F1E7} → \u{1F1F7}\u{1F1F4}'); // 🇬🇧 → 🇷🇴
  });

  it('falls back to otherLocale.name when current locale has no flag entry', () => {
    const bar = createTopBar(locales, 'xx', minimalUi, () => {}, true, () => {});
    const languageButton = bar.querySelector('.top-bar__btn') as HTMLElement;
    // xx not in LANG_FLAGS → empty string (falsy) → only other flag shown (no arrow separator)
    expect(languageButton.textContent).toBe('\u{1F1EC}\u{1F1E7}'); // 🇬🇧 (otherLocale is 'en' since it's first non-'xx')
  });

  it('calls onThemeToggle when the theme button is clicked', () => {
    const onThemeToggle = vi.fn();
    const bar = createTopBar(locales, 'en', minimalUi, () => {}, true, onThemeToggle);
    const buttons = bar.querySelectorAll('button');
    (buttons[1] as HTMLButtonElement).click();
    expect(onThemeToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onLanguageChange with the other locale id when the language button is clicked', () => {
    const onLangChange = vi.fn();
    const bar = createTopBar(locales, 'en', minimalUi, onLangChange, true, () => {});
    const buttons = bar.querySelectorAll('button');
    (buttons[0] as HTMLButtonElement).click();
    expect(onLangChange).toHaveBeenCalledWith('ro');
  });

  it('shows moon icon and switches-to-dark label when starting in light mode', () => {
    const bar = createTopBar(locales, 'en', minimalUi, () => {}, false, () => {});
    const buttons = bar.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const themeButton = buttons[1];

    expect(themeButton.textContent).toBe('\u{1F319}');
    expect(themeButton.getAttribute('aria-label')).toBe('Switch to dark theme');
  });
});

describe('createDivinationPanel', () => {
  it('uses localized aria label for details toggle', () => {
    const panel = createDivinationPanel({ readings: [], fingerprint: 'f' }, minimalUi);
    const toggle = panel.querySelector('.divination-card__toggle');
    const list = panel.querySelector('.divination-card__list');
    expect(toggle?.getAttribute('aria-label')).toBe('Toggle divination details');
    expect(toggle?.getAttribute('aria-controls')).toBe('divination-card__list');
    expect(list?.id).toBe('divination-card__list');
    expect((toggle as HTMLButtonElement).type).toBe('button');
  });

  it('renders reading rows with localized labels and raw values', () => {
    const ui: UIStrings = { ...minimalUi, divinationLabels: { moonsign: 'Moon Sign' } };
    const panel = createDivinationPanel(
      { readings: [{ key: 'moonsign', raw: 'Cancer' }, { key: 'unknown_key', raw: 'N/A' }], fingerprint: 'f' },
      ui,
    );
    const list = panel.querySelector('.divination-card__list');
    expect(list).not.toBeNull();
    const rows = list!.querySelectorAll('.detail-row');
    expect(rows.length).toBe(2);

    expect((rows[0].querySelector('.detail-row__label') as HTMLElement).textContent).toBe('Moon Sign');
    expect((rows[0].querySelector('.detail-row__value') as HTMLElement).textContent).toBe('Cancer');

    // Unmapped key falls back to raw key string (not the localized label)
    expect((rows[1].querySelector('.detail-row__label') as HTMLElement).textContent).toBe('unknown_key');
    expect((rows[1].querySelector('.detail-row__value') as HTMLElement).textContent).toBe('N/A');
  });

  it('toggles aria-expanded and collapsed class when toggle is clicked', () => {
    const panel = createDivinationPanel({ readings: [], fingerprint: 'f' }, minimalUi);
    const toggle = panel.querySelector('.divination-card__toggle') as HTMLButtonElement;
    const list = panel.querySelector('.divination-card__list')!;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(list.classList.contains('divination-card__list--collapsed')).toBe(true);

    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(list.classList.contains('divination-card__list--collapsed')).toBe(false);
    expect(toggle.textContent).toBe('\u25B2');

    toggle.click(); // collapse again
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(list.classList.contains('divination-card__list--collapsed')).toBe(true);
  });

  it('returns a section element with both card and divination-card classes', () => {
    const panel = createDivinationPanel({ readings: [], fingerprint: 'f' }, minimalUi);
    expect(panel.tagName).toBe('SECTION');
    expect(panel.className).toBe('card divination-card');
  });
});

describe('createHeader', () => {
  it('returns a header element with the correct CSS class', () => {
    const header = createHeader(minimalUi);
    expect(header.tagName).toBe('HEADER');
    expect(header.className).toBe('header');
  });

  it('renders title and subtitle from uiStrings', () => {
    const header = createHeader(minimalUi);
    const titleEl = header.querySelector('.header__title');
    const subtitleEl = header.querySelector('.header__subtitle');
    expect(titleEl?.textContent).toBe('T');
    expect(subtitleEl?.textContent).toBe('S');
  });

  it('renders decorative stars', () => {
    const header = createHeader(minimalUi);
    const deco = header.querySelector('.header__stars');
    expect(deco).not.toBeNull();
    expect(deco!.textContent).toBe('\u2726 \u263D \u2727 \u2726');
  });

  it('has the expected child order: stars, title, subtitle', () => {
    const header = createHeader(minimalUi);
    expect(header.children.length).toBe(3);
    expect(header.children[0].className).toBe('header__stars');
    expect(header.children[1].tagName).toBe('H1');
    expect(header.children[2].tagName).toBe('P');
  });
});

describe('createFooter', () => {
  it('returns a footer element with the correct CSS class', () => {
    const footer = createFooter(minimalUi);
    expect(footer.tagName).toBe('FOOTER');
    expect(footer.className).toBe('footer');
  });

  it('renders generated-by and disclaimer text from uiStrings', () => {
    const footer = createFooter(minimalUi);
    const genEl = footer.querySelector('.footer__generated');
    const discEl = footer.querySelector('.footer__disclaimer');
    expect(genEl?.textContent).toBe('\u2727 G \u2727');
    expect(discEl?.textContent).toBe('F');
  });

  it('renders a GitHub badge link with correct target attributes', () => {
    const footer = createFooter(minimalUi);
    const badgeLink = footer.querySelector('.footer__badge') as HTMLAnchorElement;
    expect(badgeLink).not.toBeNull();
    expect(badgeLink!.target).toBe('_blank');
    expect(badgeLink!.rel).toContain('noopener');
    expect(badgeLink!.href).toContain('fabian20ro/horror-scope');
  });

  it('has the expected child order: generated, disclaimer, badge', () => {
    const footer = createFooter(minimalUi);
    expect(footer.children.length).toBe(3);
    expect(footer.children[0].className).toBe('footer__generated');
    expect(footer.children[1].className).toBe('footer__disclaimer');
    expect(footer.children[2].className).toBe('footer__badge');
  });
});
