import type { Grammar, Modifier, SeededRandom } from './types.ts';

const MAX_DEPTH = 20;
const EXPANSION_RE = /#([^#]+)#/g;
const WEIGHT_SEPARATOR = '~~';

export function createGrammarEngine(grammar: Grammar, rng: SeededRandom) {
  const modifiers: Record<string, Modifier> = {};

  function pickWeighted(options: string[]): string {
    const entries: { text: string; weight: number }[] = options.map((opt) => {
      const sepIdx = opt.lastIndexOf(WEIGHT_SEPARATOR);
      if (sepIdx !== -1) {
        const weight = parseInt(opt.slice(sepIdx + WEIGHT_SEPARATOR.length), 10);
        if (!isNaN(weight) && weight > 0) {
          return { text: opt.slice(0, sepIdx), weight };
        }
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
    if (depth > MAX_DEPTH) return template;

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
  addModifier('trim', (s) => s.trim());
  addModifier('collapse-spaces', (s) => s.replace(/\s+/g, ' ').trim());
  addModifier('titlecase', (s) => {
    const words = s.trim().split(/\s+/).filter(Boolean);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  });

  return { expand, addModifier };
}
