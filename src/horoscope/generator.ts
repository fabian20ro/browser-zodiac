import { createGrammarEngine } from '../engine/grammar.ts';
import { mulberry32, dailySeed } from '../engine/random.ts';
import type { Grammar } from '../engine/types.ts';
import type { DivinationProfile } from '../divination/browser-oracle.ts';
import type { LocalePack } from '../i18n/types.ts';
import type { ZodiacSign } from './zodiac.ts';
import { ZODIAC_SYMBOLS } from './zodiac.ts';

export interface Horoscope {
  sign: ZodiacSign;
  signSymbol: string;
  text: string;
  luckyNumber: number;
  luckyColor: string;
  warning: string;
  compatibility: string;
  date: string;
}

export function generateHoroscope(
  sign: ZodiacSign,
  locale: LocalePack,
  divination: DivinationProfile,
  date: Date = new Date(),
  consultation: number = 0,
): Horoscope {
  const dateStr = date.toISOString().slice(0, 10);
  const salt = consultation === 0 ? sign : `${sign}:${consultation}`;
  const seed = dailySeed(dateStr, salt);
  const rng = mulberry32(seed);

  const signName = locale.ui.signNames[sign];
  if (!signName) {
    throw new Error(`Unrecognized zodiac sign key: ${String(sign)}`);
  }

  // Merge locale grammar with divination context symbols; readings overwrite colliding keys.
  const contextGrammar: Grammar = {
    ...locale.grammar,
    signName: [signName],
    ...Object.fromEntries(divination.readings.map((r) => [r.key, [r.raw]])),
  };

  const engine = createGrammarEngine(contextGrammar, rng);

  return {
    sign,
    signSymbol: ZODIAC_SYMBOLS[sign],
    text: engine.expand('#origin#'),
    warning: engine.expand('#warning#'),
    luckyColor: engine.expand('#luckyColor#'),
    compatibility: engine.expand('#compatibility#'),
    luckyNumber: Math.floor(rng() * 99) + 1,
    date: dateStr,
  };
}
