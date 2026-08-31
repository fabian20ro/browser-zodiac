import type { LocalePack } from '../types.ts';

export const ro: LocalePack = {
  id: 'ro',
  name: 'Română',
  ui: {
    title: 'Browser Zodiac',
    subtitle: 'Browserul tău îți cunoaște destinul',
    yourSign: 'Zodia ta pentru azi',
    dailyHoroscope: 'Horoscopul de azi',
    luckyNumber: 'Numărul norocos',
    luckyColor: 'Culoarea norocoasă',
    cosmicWarning: 'Avertisment cosmic',
    compatibility: 'Compatibilitate',
    browserDivination: 'Ce a dezvăluit browserul tău',
    randomizeSign: 'Schimbă zodia',
    regenerate: 'Consultă din nou Cosmosul',
    copyHoroscope: 'Copiază textul horoscopului',
    copiedHoroscope: 'Copiat!',
    interpretWithAI: 'Interpretează cu AI',
    aiInterpretQuery: 'interpretează această predicție a horoscopului de azi: ',
    switchToLanguageLabel: 'Schimbă în {language}',
    switchToLightTheme: 'Comută la tema luminoasă',
    switchToDarkTheme: 'Comută la tema întunecată',
    toggleDivinationDetails: 'Comută detaliile divinației',
    generatedBy: 'Ghicit din API-urile ancestrale ale browserului',
    footer:
      'Niciun corp ceresc nu a fost consultat. Browserul tău te-a dat de gol de bunăvoie.',
    signNames: {
      aries: 'Berbec',
      taurus: 'Taur',
      gemini: 'Gemeni',
      cancer: 'Rac',
      leo: 'Leu',
      virgo: 'Fecioară',
      libra: 'Balanță',
      scorpio: 'Scorpion',
      sagittarius: 'Săgetător',
      capricorn: 'Capricorn',
      aquarius: 'Vărsător',
      pisces: 'Pești',
    },
    signElement: {
      fire: 'Foc',
      earth: 'Pământ',
      air: 'Aer',
      water: 'Apă',
    },
    divinationLabels: {
      spirit_browser: 'Browserul spirit',
      elemental_os: 'Sistemul elemental',
      life_resolution: 'Rezoluția vieții',
      soul_window: 'Fereastra sufletului',
      cultural_destiny: 'Destinul cultural',
      soul_alignment: 'Alinierea sufletului',
      parallel_lives: 'Vieți paralele',
      cosmic_platform: 'Platforma cosmică',
      social_connectivity: 'Conectivitate socială',
      cosmic_timezone: 'Fusul orar cosmic',
      cosmic_mood: 'Starea cosmică',
      tactile_sensibility: 'Sensibilitatea tactilă',
      vibration_intensity: 'Intensitatea vibrațiilor',
      network_speed: 'Viteza rețelei',
      cosmic_latency: 'Latența cosmică',
      cosmic_resonance: 'Rezonanța cosmică',
      cosmic_luck: 'Norocul cosmic',
      cosmic_noise: 'Zgomotul cosmic',
      cosmic_focus: 'Focalizarea cosmică',
      pixel_density: 'Densitatea pixelilor',
      cosmic_timezone_offset: 'Decalajul fusului orar cosmic',
      cosmic_thriftiness: 'Cumpătarea cosmică',
    },
  },
  grammar: {
    origin: ['Un #signName# te așteaptă.'],
    warning: ['Atenție la #chaos#.'],
    luckyColor: ['#color#'],
    compatibility: ['#comp#'],
    chaos: ['haos', 'vidul', 'umbre'],
    color: ['Roșu', 'Albastru', 'Aurit', 'Argintiu', 'Violet'],
    comp: ['Excelent', 'Bun', 'Mediu', 'Slab'],
  },
};

// Runtime invariant: every divination label must be a non-empty string.
for (const key of Object.keys(ro.ui.divinationLabels as Record<string, unknown>)) {
  const value = ro.ui.divinationLabels[key as keyof typeof ro.ui.divinationLabels];
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Locale invariant failed: divination label '${key}' is not a non-empty string`,
    );
  }
}

// Runtime invariant: every grammar array (templates and data) must have at least one non-empty string entry.
// Each value name corresponds 1:1 with its grammar data array (e.g. 'chaos' → ro.grammar.chaos).
const GRAMMAR_PLACEHOLDERS: string[] = ['chaos', 'color', 'comp'];
const GRAMMAR_TEMPLATES: string[] = ['origin', 'warning', 'luckyColor', 'compatibility'];

for (const symbol of [...GRAMMAR_PLACEHOLDERS, ...GRAMMAR_TEMPLATES]) {
  const dataArray = ro.grammar[symbol as keyof typeof ro.grammar] as string[] | undefined;
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
