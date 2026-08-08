export type InterpretationFn = (raw: string) => string;

const VOWELS = 'aeiou';

/**
 * Returns "a" or "an" based on the first character of raw.
 * Uses phonetic-class heuristic: vowels and silent-h+vowel → "an".
 */
export function indefiniteArticle(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'a';
  const first = trimmed.charAt(0).toLowerCase();
  const second = trimmed.charAt(1).toLowerCase();
  // Silent-h rule: "h" followed by a vowel → treat as vowel sound.
  if (first === 'h' && VOWELS.includes(second)) return 'an';
  return VOWELS.includes(first) ? 'an' : 'a';
}

function article(raw: string, templateA: string, templateAn: string): string {
  return indefiniteArticle(raw) === 'an' ? templateAn.replace('${raw}', raw) : templateA.replace('${raw}', raw);
}

export const readingInterpretations: Record<string, InterpretationFn> = {
  spirit_browser: (raw) => article(raw, `The cosmic lens reveals a ${raw} vessel.`, `The cosmic lens reveals an ${raw} vessel.`),
  elemental_os: (raw) => `The elements manifest through ${raw}.`,
  life_resolution: (raw) => `The physical dimension is ${raw}.`,
  soul_window: (raw) => `The astral window is ${raw}.`,
  cultural_destiny: (raw) => `The currents of destiny flow from ${raw}.`,
  soul_alignment: (raw) => article(raw, `The alignment is set to a ${raw}.`, `The alignment is set to an ${raw}.`),
  cosmic_mood: (raw) => `The cosmic mood is currently ${raw}.`,
  parallel_lives: (raw) => `You exist across ${article(raw, 'a', 'an')} ${raw} threads.`,
  cosmic_platform: (raw) => article(raw, `Rooted in a ${raw} plane.`, `Rooted in an ${raw} plane.`),
  network_speed: (raw) => `The pace of destiny is ${raw}.`,
  social_connectivity: (raw) => `You are ${raw}.`,
  cosmic_timezone: (raw) => `Temporal flow: ${raw}.`,
  cosmic_noise: (raw) => article(raw, `The cosmic echo vibrates at a ${raw}.`, `The cosmic echo vibrates at an ${raw}.`),
  cosmic_focus: (raw) => `Your cosmic focus is ${raw}.`,
  tactile_sensibility: (raw) => `Sensing through ${raw}.`,
  vibration_intensity: (raw) => `Vibration level: ${raw}.`,
  pixel_density: (raw) => `The reality density is ${raw}x.`,
  cosmic_resonance: (raw) => `The cosmic resonance is ${raw}.`,
  cosmic_latency: (raw) => `The temporal delay of fate is ${raw}.`,
  cosmic_luck: (raw) => `Your luck is currently ${raw}.`,
  zodiac_fate: (raw) => `Your celestial path is guided by ${raw}.`,
  cosmic_timezone_offset: (raw) => `The temporal alignment is ${raw} minutes from cosmic noon.`,
  cosmic_thriftiness: (raw) => article(raw, `The cosmos consumes with a ${raw} hand.`, `The cosmos consumes with an ${raw} hand.`),
};
