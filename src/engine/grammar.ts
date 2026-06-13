import type { Grammar, Modifier, SeededRandom } from './types.ts';

const MAX_DEPTH = 20;
const EXPANSION_RE = /#([^#]+)#/g;
const WEIGHT_SEPARATOR = '~~';

export function createGrammarEngine(grammar: Grammar, rng: SeededRandom, options: { maxDepth?: number } = {}) {
  const maxDepth = options.maxDepth ?? MAX_DEPTH;
  const modifiers: Record<string, Modifier> = {};

  function pickWeighted(options: string[]): string {
    const entries: { text: string; weight: number }[] = options.map((opt) => {
      const sepIdx = opt.lastIndexOf(WEIGHT_SEPARATOR);
      if (sepIdx !== -1) {
        const weightStr = opt.slice(sepIdx + WEIGHT_SEPARATOR.length);
        const weight = parseInt(weightStr, 10);
        if (!isNaN(weight) && weight > 0) {
          return { text: opt.slice(0, sepIdx), weight };
        }
        // If invalid weight, strip the separator and treat as weight 1
        return { text: opt.slice(0, sepIdx), weight: 1 };
      }
      return { text: opt, weight: 1 };
    });

    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = rng() * totalWeight;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry.text;
    }
    return entries[entries.length - 1].text;
  }

  function applyModifiers(text: string, mods: string[]): string {
    let result = text;
    for (const mod of mods) {
      const fn = modifiers[mod];
      if (fn) result = fn(result);
    }
    return result;
  }

  function expandOnce(template: string, depth: number): string {
    if (depth >= maxDepth) return template;

    return template.replace(EXPANSION_RE, (_match, expr: string) => {
      const parts = expr.split('.');
      const symbol = parts[0];
      const mods = parts.slice(1);

      const rules = grammar[symbol];
      if (!rules || rules.length === 0) return `[?${symbol}]`;

      const chosen = pickWeighted(rules);
      const expanded = expandOnce(chosen, depth + 1);
      return applyModifiers(expanded, mods);
    });
  }

  function expand(rule: string): string {
    return expandOnce(rule, 0);
  }

  function addModifier(name: string, fn: Modifier) {
    modifiers[name] = fn;
  }

  // Register default modifiers
  addModifier('capitalize', (s) => s.charAt(0).toUpperCase() + s.slice(1));
  addModifier('uppercase', (s) => s.toUpperCase());
  addModifier('lowercase', (s) => s.toLowerCase());
  addModifier('shout', (s) => s.toUpperCase() + '!');
  addModifier('trim', (s) => s.trim());
  addModifier('trim-start', (s) => s.trimStart());
  addModifier('trim-end', (s) => s.trimEnd());
  addModifier('trim-all', (s) => s.replace(/\s/g, ''));
  addModifier('collapse-spaces', (s) => s.replace(/\s+/g, ' ').trim());
  addModifier('slugify', (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  addModifier('reverse', (s) => s.split('').reverse().join(''));
  addModifier('unquote', (s) => s.replace(/^["']|["']$/g, ''));
  addModifier('scrub', (s) => s.replace(/[aeiou]/gi, ''));
  addModifier('void', (s) => s.replace(/[aeiou]/gi, '·'));
  addModifier('bang', (s) => `${s}!`);
  addModifier('titlecase', (s) => {
    const words = s.trim().split(/\s+/).filter(Boolean);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  });
  addModifier('echo', (s) => `${s} ${s}`);
  addModifier('mystic', (s) => `✧ ${s} ✧`);
  addModifier('wrap-emoji', (s) => `✨ ${s} ✨`);

  return { expand, addModifier };
}
