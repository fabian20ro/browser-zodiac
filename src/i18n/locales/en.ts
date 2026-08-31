import type { LocalePack } from '../types.ts';
import { ZODIAC_SIGNS, getSignDisplayName } from '../../horoscope/zodiac.ts';

// Runtime invariant: every ZodiacSign must have a corresponding UI string.
// Catches locale drift when new signs are added without updating the pack.
for (const sign of ZODIAC_SIGNS) {
  const displayName = getSignDisplayName(sign);
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
    throw new Error(
      `Locale invariant failed: no display name for ZodiacSign '${sign}'`,
    );
  }
}

export const en: LocalePack = {
  id: 'en',
  name: 'English',
  ui: {
    title: 'Browser Zodiac',
    subtitle: 'Your Browser Knows Your Destiny',
    yourSign: 'Your sign for today',
    dailyHoroscope: "Today's Horoscope",
    luckyNumber: 'Lucky Number',
    luckyColor: 'Lucky Color',
    cosmicWarning: 'Cosmic Warning',
    compatibility: 'Compatibility',
    browserDivination: 'What Your Browser Revealed',
    randomizeSign: 'Randomize Sign',
    regenerate: 'Consult the Cosmos Again',
    copyHoroscope: 'Copy horoscope text',
    copiedHoroscope: 'Copied!',
    interpretWithAI: 'Interpret with AI',
    aiInterpretQuery: 'interpret this horoscope prediction for today: ',
    switchToLanguageLabel: 'Switch to {language}',
    switchToLightTheme: 'Switch to light theme',
    switchToDarkTheme: 'Switch to dark theme',
    toggleDivinationDetails: 'Toggle divination details',
    generatedBy: 'Divined from ancient browser APIs',
    footer:
      'No actual celestial bodies were consulted. Your browser gave you up voluntarily.',
    signNames: {
      aries: 'Aries',
      taurus: 'Taurus',
      gemini: 'Gemini',
      cancer: 'Cancer',
      leo: 'Leo',
      virgo: 'Virgo',
      libra: 'Libra',
      scorpio: 'Scorpio',
      sagittarius: 'Sagittarius',
      capricorn: 'Capricorn',
      aquarius: 'Aquarius',
      pisces: 'Pisces',
    },
    signElement: {
      fire: 'Fire',
      earth: 'Earth',
      air: 'Air',
      water: 'Water',
    },
    divinationLabels: {
      spirit_browser: 'Spirit Browser',
      elemental_os: 'Elemental OS',
      life_resolution: 'Life Resolution',
      soul_window: 'Window to Your Soul',
      cultural_destiny: 'Cultural Destiny',
      soul_alignment: 'Soul Alignment',
      parallel_lives: 'Parallel Lives',
      cosmic_platform: 'Cosmic Platform',
      social_connectivity: 'Social Connectivity',
      cosmic_timezone: 'Cosmic Timezone',
      tactile_sensibility: 'Tactile Sensibility',
      cosmic_mood: 'Cosmic Mood',
      vibration_intensity: 'Vibration Intensity',
      network_speed: 'Network Speed',
      cosmic_latency: 'Cosmic Latency',
      cosmic_resonance: 'Cosmic Resonance',
      cosmic_luck: 'Cosmic Luck',
      cosmic_noise: 'Cosmic Noise',
      cosmic_focus: 'Cosmic Focus',
      pixel_density: 'Pixel Density',
      cosmic_timezone_offset: 'Cosmic Timezone Offset',
      cosmic_thriftiness: 'Cosmic Thriftiness',
    },
  },
  grammar: {
    origin: ['A #signName# awaits you.'],
    warning: ['Beware of #chaos#.'],
    luckyColor: ['#color#'],
    compatibility: ['#comp#'],
    chaos: ['chaos', 'the void', 'shadows'],
    color: ['Red', 'Blue', 'Gold', 'Silver', 'Violet'],
    comp: ['Excellent', 'Good', 'Average', 'Poor'],
  },
};

// Runtime invariant: every divination label must be a non-empty string.
for (const key of Object.keys(en.ui.divinationLabels as Record<string, unknown>)) {
  const value = en.ui.divinationLabels[key as keyof typeof en.ui.divinationLabels];
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Locale invariant failed: divination label '${key}' is not a non-empty string`,
    );
  }
}

// Runtime invariant: every grammar array (templates and data) must have at least one non-empty string entry. Catches empty arrays added without corresponding template updates.
// Each value name corresponds 1:1 with its grammar data array (e.g. 'chaos' → en.grammar.chaos).
const GRAMMAR_PLACEHOLDERS: string[] = ['chaos', 'color', 'comp'];
const GRAMMAR_TEMPLATES: string[] = ['origin', 'warning', 'luckyColor', 'compatibility'];

for (const symbol of [...GRAMMAR_PLACEHOLDERS, ...GRAMMAR_TEMPLATES]) {
  const dataArray = en.grammar[symbol as keyof typeof en.grammar] as string[] | undefined;
  if (!dataArray || !Array.isArray(dataArray) || dataArray.length === 0) {
    throw new Error(
      `Locale invariant failed: grammar array '${symbol}' is missing or empty`,
    );
  }

  // Verify each data entry is non-empty.
  for (let i = 0; i < dataArray.length; i++) {
    const item = dataArray[i];
    if (!item || typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(
        `Locale invariant failed: grammar data entry #${i} for '${symbol}' is empty`,
      );
    }
  }
}
