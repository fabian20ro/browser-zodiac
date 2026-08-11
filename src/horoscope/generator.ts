import { createGrammarEngine } from '../engine/grammar.ts';
import { mulberry32, dailySeed } from '../engine/random.ts';
import type { DivinationProfile } from '../divination/browser-oracle.ts';
import type { LocalePack } from '../i18n/types.ts';
import type { ZodiacSign } from './zodiac.ts';
import { ZODIAC_SYMBOLS } from './zodiac.ts';

export interface Horoscope {
  sign: ZodiacSign;
  signSymbol: string;
  text: string;
  luckyNumber: number;
  mood: string;
  luckyColor: string;
  warning: string;
  compatibility: string;
  date: string;
  signElement: 'fire' | 'earth' | 'air' | 'water';
}

/** Standard tropical element assignment per zodiac sign. */
const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
};

/** Merge locale grammar with divination readings — signName symbol + reading keys as symbols. */
function buildContextGrammar(
  localeGrammar: LocalePack['grammar'],
  signName: string,
  readings: DivinationProfile['readings'],
  signSymbol?: string,
): Record<string, string[]> {
  return {
    ...localeGrammar,
    signName: [signName],
    ...(signSymbol ? { signSymbol: [signSymbol] } : {}),
    ...Object.fromEntries(readings.map((r) => [r.key, [r.raw]])),
  };
}

export function generateHoroscope(
  sign: ZodiacSign,
  locale: LocalePack,
  divination: DivinationProfile,
  date: Date = new Date(),
  consultation: number = 0,
  localDateStr?: string,
): Horoscope {
  const dateStr = localDateStr ?? date.toISOString().slice(0, 10);
  const salt = consultation === 0 ? sign : `${sign}:${consultation}`;
  const seed = dailySeed(dateStr, salt);
  const rng = mulberry32(seed);

  const signName = locale.ui.signNames[sign];
  if (!signName) {
    throw new Error(`Unrecognized zodiac sign key: ${String(sign)}`);
  }

  const contextGrammar = buildContextGrammar(locale.grammar, signName, divination.readings, ZODIAC_SYMBOLS[sign]);

  const engine = createGrammarEngine(contextGrammar, rng);

  const text = engine.expand('#origin#');
  const warning = engine.expand('#warning#');
  const luckyColor = engine.expand('#luckyColor#');
  const compatibility = engine.expand('#compatibility#');
  const luckyNumber = Math.floor(rng() * 99) + 1;
  const mood = luckyNumber <= 30 ? 'turbulent' : luckyNumber <= 70 ? 'balanced' : 'radiant';

  const signElement = SIGN_ELEMENTS[sign];

  return {
    sign,
    signSymbol: ZODIAC_SYMBOLS[sign],
    text,
    warning,
    mood,
    luckyColor,
    compatibility,
    luckyNumber,
    date: dateStr,
    signElement,
  };
}
