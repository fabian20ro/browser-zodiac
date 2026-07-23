import type { Grammar } from '../engine/types.ts';
import type { ZodiacSign } from '../horoscope/zodiac.ts';

export interface UIStrings {
  title: string;
  subtitle: string;
  yourSign: string;
  dailyHoroscope: string;
  luckyNumber: string;
  luckyColor: string;
  cosmicWarning: string;
  compatibility: string;
  browserDivination: string;
  randomizeSign: string;
  regenerate: string;
  copyHoroscope: string;
  copiedHoroscope: string;
  interpretWithAI: string;
  aiInterpretQuery: string;
  switchToLanguageLabel: string;
  switchToLightTheme: string;
  switchToDarkTheme: string;
  toggleDivinationDetails: string;
  generatedBy: string;
  footer: string;
  signNames: Record<ZodiacSign, string>;
  divinationLabels: Record<string, string>;
}

export interface LocalePack {
  id: string;
  name: string;
  ui: UIStrings;
  grammar: Grammar;
}

/** Runtime check that a locale pack satisfies the UIStrings contract.
 *  Captures an observable behavior of `types.ts`: every registered locale
 *  must expose all required strings, sign names for each ZodiacSign, and
 *  non-empty divination labels. Imported by tests to verify drift-proofing.
 */
export function validateLocalePack(pack: LocalePack): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!pack.id) errors.push('LocalePack.id is empty');
  if (!pack.name || typeof pack.name !== 'string') errors.push('LocalePack.name missing or not a string');

  const ui = pack.ui;
  const requiredStrings: (keyof UIStrings)[] = [
    'title', 'subtitle', 'yourSign', 'dailyHoroscope', 'luckyNumber',
    'luckyColor', 'cosmicWarning', 'compatibility', 'browserDivination',
    'randomizeSign', 'regenerate', 'copyHoroscope', 'copiedHoroscope',
    'interpretWithAI', 'aiInterpretQuery', 'switchToLanguageLabel',
    'switchToLightTheme', 'switchToDarkTheme', 'toggleDivinationDetails',
    'generatedBy', 'footer',
  ];

  for (const field of requiredStrings) {
    const val = ui[field];
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      errors.push(`UIStrings.${String(field)} missing or empty`);
    }
  }

  // signNames must map every ZodiacSign key to a non-empty string.
  const knownSigns = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ] as const;

  for (const sign of knownSigns) {
    if (!(sign in ui.signNames)) {
      errors.push(`UIStrings.signNames missing key "${sign}"`);
    } else if (!ui.signNames[sign] || typeof ui.signNames[sign] !== 'string') {
      errors.push(`UIStrings.signNames["${sign}"] is not a string`);
    } else if (String(ui.signNames[sign]).trim().length === 0) {
      errors.push(`UIStrings.signNames["${sign}"] is empty`);
    }
  }

  // divinationLabels must be populated.
  const labels = ui.divinationLabels;
  if (!labels || typeof labels !== 'object' || Object.keys(labels).length === 0) {
    errors.push('UIStrings.divinationLabels is missing or empty');
  } else {
    for (const key of Object.keys(labels)) {
      const val = labels[key];
      if (typeof val !== 'string' || String(val).trim().length === 0) {
        errors.push(`UIStrings.divinationLabels["${key}"] is not a non-empty string`);
      }
    }
  }

  // grammar must exist with symbol keys.
  const grammar = pack.grammar;
  if (!grammar || typeof grammar !== 'object') {
    errors.push('LocalePack.grammar missing or not an object');
  } else {
    const symKeys = Object.keys(grammar as Record<string, unknown>);
    if (symKeys.length === 0) {
      errors.push('LocalePack.grammar has no symbol keys');
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
