export type Grammar = Record<string, string[]>;

export type Modifier = (input: string) => string;

/** A modifier name paired with its transformation function */
export interface ModifierEntry {
  readonly name: string;
  readonly fn: Modifier;
}

/** Built-in modifiers registered by default in the grammar engine */
export const DEFAULT_MODIFIERS: ModifierEntry[] = [
  { name: 'capitalize',   fn: (s) => s.charAt(0).toUpperCase() + s.slice(1) },
  { name: 'uppercase',    fn: (s) => s.toUpperCase() },
  { name: 'sentencecase', fn: (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() },
  { name: 'lowercase',    fn: (s) => s.toLowerCase() },
  { name: 'shout',        fn: (s) => `${s.toUpperCase()}!` },
  { name: 'trim',         fn: (s) => s.trim() },
  { name: 'trim-start',   fn: (s) => s.trimStart() },
  { name: 'trim-end',     fn: (s) => s.trimEnd() },
  { name: 'trim-all',     fn: (s) => s.replace(/\s+/g, '') },
  { name: 'slugify',      fn: (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') },
  { name: 'snake_case',   fn: (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') },
  { name: 'reverse',      fn: (s) => Array.from(s).reverse().join('') },
  { name: 'unquote',      fn: (s) => s.replace(/^['"]|['"]$/g, '') },
  { name: 'scrub',        fn: (s) => s.replace(/[aeiou]/gi, '') },
  { name: 'void',         fn: (s) => s.replace(/[aeiou]/gi, '\u00B7') },
  { name: 'bang',         fn: (s) => `${s}!` },
  { name: 'titlecase',    fn: (s) => s.trim().split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') },
  { name: 'echo',         fn: (s) => `${s} ${s}` },
  { name: 'mystic',       fn: (s) => `✧ ${s} ✧` },
  { name: 'wrap-emoji',   fn: (s) => `✨ ${s} ✨` },
  { name: 'celebrate',    fn: (s) => `🎉 ${s} 🎉` },
  { name: 'glitch',       fn: (s) => s.replace(/[aeiou]/gi, '\xA7') },
  { name: 'case-flip',    fn: (s) => Array.from(s).map((c) => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''), },
];

/** Runtime contract assertion — titlecase must produce canonical output */
const TITLECASE_CONTRACT = DEFAULT_MODIFIERS.find(
  (m) => m.name === 'titlecase'
);
if (TITLECASE_CONTRACT) {
  const sample = 'hello world';
  const expected = 'Hello World';
  if (TITLECASE_CONTRACT.fn(sample) !== expected) {
    throw new Error(
      `titlecase contract violated: ${JSON.stringify(sample)} → ` +
        `${JSON.stringify(TITLECASE_CONTRACT.fn(sample))} (expected ${JSON.stringify(expected)})`
    );
  }
}

export type SeededRandom = () => number; // Returns a float between 0 and 1