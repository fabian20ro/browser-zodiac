import type { Grammar, Modifier, SeededRandom } from './types.ts';

// Baseline pass
const EXPANSION_RE = /#([^#]+)#/g;
const WEIGHT_SEPARATOR = '~~';
const MAX_DEPTH = 10;

export function validateGrammar(grammar: Grammar): void {
  for (const symbol of Object.keys(grammar)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(symbol)) {
      throw new Error(`Invalid grammar symbol name: '${symbol}'`);
    }
    const rules = grammar[symbol];
    if (Array.isArray(rules)) {
      for (let i = 0; i < rules.length; i++) {
        const entry = rules[i];
        if (typeof entry !== 'string' || !entry.trim()) {
          throw new Error(`Empty rule entry in symbol '${symbol}' at index ${i}`);
        }
        if (entry.includes('#')) {
          const hashCount = (entry.match(/#/g) || []).length;
          if (hashCount % 2 !== 0) {
            throw new Error(`Rule entry in symbol '${symbol}' at index ${i} contains unbalanced '#': must not include the grammar delimiter`);
          }
          // Validate #...# references within rule entries
          const expansionMatches = entry.match(EXPANSION_RE) || [];
          for (const match of expansionMatches) {
            const innerContent = match.slice(1, -1); // remove outer '#'
            const parts = innerContent.split('.');
            const refSymbol = parts[0];
            if (!refSymbol || !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(refSymbol)) {
              throw new Error(`Rule entry in symbol '${symbol}' at index ${i} contains malformed symbol reference '#${refSymbol || ''}#': symbol name must match /^[a-zA-Z_][a-zA-Z0-9_-]*$/`);
            }
          }
        }
      }
    }
  }
}

export function createGrammarEngine(grammar: Grammar, rng: SeededRandom, options: { maxDepth?: number } = {}) {
  validateGrammar(grammar);
  const requested = options.maxDepth;
  const maxDepth =
    typeof requested === 'number' && Number.isFinite(requested) && requested >= 0
      ? requested
      : MAX_DEPTH;

  function pickWeighted(options: string[]): string {
    const entries: { text: string; weight: number }[] = options.map((opt) => {
      const sepIdx = opt.lastIndexOf(WEIGHT_SEPARATOR);
      if (sepIdx !== -1) {
        const weightStr = opt.slice(sepIdx + WEIGHT_SEPARATOR.length);
        const weight = parseInt(weightStr, 10);
        if (!isNaN(weight) && weight > 0) {
          return { text: opt.slice(0, sepIdx), weight };
        }
        // If invalid weight, strip the separator and treat as weight 0
        return { text: opt.slice(0, sepIdx), weight: 0 };
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
      if (!symbol || !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(symbol)) {
        throw new Error(`Invalid grammar expression in '#${expr}#': empty or malformed symbol name`);
      }
      const mods = parts.slice(1);
      for (const mod of mods) {
        if (!mod || !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(mod)) {
          throw new Error(`Invalid modifier in '#${expr}#': malformed name '${mod}'`);
        }
      }

      const rules = grammar[symbol];
      if (!Array.isArray(rules) || rules.length === 0) return `[?${symbol}]`;

      const chosen = pickWeighted(rules);
      const expanded = expandOnce(chosen, depth + 1);
      return applyModifiers(expanded, mods);
    });
  }

  function expand(rule: string): string {
    return expandOnce(rule, 0);
  }

  const MODIFIERS: Record<string, Modifier> = {
    capitalize: (s) => s.charAt(0).toUpperCase() + s.slice(1),
    uppercase: (s) => s.toUpperCase(),
    sentencecase: (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
    lowercase: (s) => s.toLowerCase(),
    shout: (s) => s.toUpperCase() + '!',
    trim: (s) => s.trim(),
    'trim-start': (s) => s.trimStart(),
    'trim-end': (s) => s.trimEnd(),
    'trim-all': (s) => s.trim().replace(/\s+/g, ''),
    slugify: (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    snake_case: (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    reverse: (s) => Array.from(s).reverse().join(''),
    unquote: (s) => s.replace(/^["']|["']$/g, ''),
    scrub: (s) => s.replace(/[aeiou]/gi, ''),
    void: (s) => s.replace(/[aeiou]/gi, '·'),
    bang: (s) => `${s}!`,
    titlecase: (s) => {
      const words = s.trim().split(/\s+/).filter(Boolean);
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    },
    echo: (s) => `${s} ${s}`,
    mystic: (s) => `✧ ${s} ✧`,
    'wrap-emoji': (s) => `✨ ${s} ✨`,
    celebrate: (s) => `🎉 ${s} 🎉`,
    glitch: (s) => s.replace(/[aeiou]/gi, '§'),
    'case-flip': (s) => s.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''),
    'strip-hashes': (s) => s.replace(/#/g, ''),
    creepify: (s) => `\u{1F480} ${s}`, // 👻 emoji prefix for horror theme
  };

  const modifiers: Record<string, Modifier> = { ...MODIFIERS };

  function addModifier(name: string, fn: Modifier) {
    modifiers[name] = fn;
  }

  return { expand, addModifier };
}
