export type Grammar = Record<string, string[]>;

export type Modifier = (input: string) => string;

/** Runtime contract assertion — titlecase must produce canonical output */
const TITLECASE_FN: Modifier = (s) =>
  s.trim().split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const SAMPLES: Record<string, string> = {
  'hello world': 'Hello World',
  'the quick brown fox': 'The Quick Brown Fox',
  'already Titlecased': 'Already Titlecased',
  'multiple   spaces': 'Multiple Spaces',
  '  leading-trailing ': 'Leading Trailing',
};
for (const [input, expected] of Object.entries(SAMPLES)) {
  const actual = TITLECASE_FN(input);
  if (actual !== expected) {
    console.error(
      `titlecase contract violated: ${JSON.stringify(input)} → ` +
        `${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`
    );
  }
}

export type SeededRandom = () => number; // Returns a float between 0 and 1