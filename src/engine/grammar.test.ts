import { describe, it, expect } from 'vitest';
import { createGrammarEngine } from './grammar.ts';
import { mulberry32 } from './random.ts';

function makeEngine(grammar: Record<string, string[]>, seed = 42, maxDepth?: number) {
  return createGrammarEngine(grammar, mulberry32(seed), { maxDepth });
}

describe('createGrammarEngine', () => {
  describe('expand', () => {
    it('returns plain text unchanged', () => {
      const engine = makeEngine({});
      expect(engine.expand('hello world')).toBe('hello world');
    });

    it('expands a simple symbol', () => {
      const engine = makeEngine({ greeting: ['hello'] });
      expect(engine.expand('#greeting#')).toBe('hello');
    });

    it('expands nested symbols', () => {
      const engine = makeEngine({
        greeting: ['#word#!'],
        word: ['hi'],
      });
      expect(engine.expand('#greeting#')).toBe('hi!');
    });

    it('returns [?symbol] for missing symbols', () => {
      const engine = makeEngine({});
      expect(engine.expand('#missing#')).toBe('[?missing]');
    });

    it('handles multiple items with mixed valid and invalid weights', () => {
      const engine = makeEngine({ item: ['a~~10', 'b~~invalid', 'c~~-1', 'd'] });
      const results = new Set<string>();
      for (let i = 0; i < 200; i++) {
        results.add(engine.expand('#item#'));
      }
      expect(results.has('a')).toBe(true);
      expect(results.has('b')).toBe(true);
      expect(results.has('c')).toBe(true);
      expect(results.has('d')).toBe(true);
    });

    it('applies unquote modifier', () => {
      const engine = makeEngine({ word: ['"hello"'] }, 42);
      expect(engine.expand('#word.unquote#')).toBe('hello');
    });

    it('applies scrub modifier', () => {
      const engine = makeEngine({ word: ['hello world'] });
      expect(engine.expand('#word.scrub#')).toBe('hll wrld');
    });

    it('handles multiple modifiers in sequence', () => {
      const engine = makeEngine({ word: [' HELLO WORLD '] });
      expect(engine.expand('#word.trim-all.uppercase#')).toBe('HELLOWORLD');
      expect(engine.expand('#word.trim-all.uppercase.slugify#')).toBe('helloworld');
    });

    it('applies reverse modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.reverse#')).toBe('olleh');
    });
    it('applies case-flip modifier', () => {
      const engine = makeEngine({ word: ['Hello World'] });
      expect(engine.expand('#word.case-flip#')).toBe('hELLO wORLD');
    });
    it('applies bang modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.bang#')).toBe('hello!');
    });

    it('handles multiple symbols in one template', () => {
      const engine = makeEngine({
        a: ['X'],
        b: ['Y'],
      });
      expect(engine.expand('#a# and #b#')).toBe('X and Y');
    });

    it('respects the recursion limit', () => {
      // Recursive grammar: a -> #b# -> #a#
      // With maxDepth 1, it should stop after one expansion and return '#b#'
      const engine = makeEngine({ a: ['#b#'], b: ['#a#'] }, 42, 1);
      expect(engine.expand('#a#')).toBe('#b#');
    });

    it('respects a maxDepth of 0', () => {
      const engine = makeEngine({ a: ['#b#'], b: ['#a#'] }, 42, 0);
      expect(engine.expand('#a#')).toBe('#a#');
    });

  });

  describe('weighted selection', () => {
    it('respects weight separator ~~', () => {
      // With a heavily weighted option, it should be selected most of the time
      const grammar = { item: ['rare~~1', 'common~~100'] };
      let commonCount = 0;
      for (let seed = 0; seed < 50; seed++) {
        const engine = makeEngine(grammar, seed);
        if (engine.expand('#item#') === 'common') commonCount++;
      }
      expect(commonCount).toBeGreaterThan(40);
    });

    it('treats invalid weight as weight 1 and strips separator', () => {
      const engine = makeEngine({ item: ['a~~invalid', 'b'] });
      // Both should be selectable (weight 1 each), but we now strip the garbage.
      const result = engine.expand('#item#');
      expect(['a', 'b']).toContain(result);
    });

    it('handles zero total weight by returning the last item', () => {
      const engine = makeEngine({ item: ['a~~0', 'b~~0'] });
      expect(engine.expand('#item#')).toBe('b');
    });
  });

  describe('modifiers', () => {
    it('applies capitalize modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.capitalize#')).toBe('Hello');
    });

    it('applies uppercase modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.uppercase#')).toBe('HELLO');
    });

    it('applies lowercase modifier', () => {
      const engine = makeEngine({ word: ['HELLO'] });
      expect(engine.expand('#word.lowercase#')).toBe('hello');
    });

    it('applies shout modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.shout#')).toBe('HELLO!');
    });

    it('applies trim modifier', () => {
      const engine = makeEngine({ word: [' hello '] });
      expect(engine.expand('#word.trim#')).toBe('hello');
    });

    it('applies trim-start modifier', () => {
      const engine = makeEngine({ word: ['  hello'] });
      expect(engine.expand('#word.trim-start#')).toBe('hello');
    });

    it('applies trim-end modifier', () => {
      const engine = makeEngine({ word: ['hello  '] });
      expect(engine.expand('#word.trim-end#')).toBe('hello');
    });

    it('applies trim-all modifier', () => {
      const engine = makeEngine({ word: [' h e l l o '] });
      expect(engine.expand('#word.trim-all#')).toBe('hello');
    });

    it('applies slugify modifier', () => {
      const engine = makeEngine({ word: ['Hello World!'] });
      expect(engine.expand('#word.slugify#')).toBe('hello-world');
    });

    it('applies reverse modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.reverse#')).toBe('olleh');
    });

    it('applies unquote modifier', () => {
      const engine = makeEngine({ word: ['"hello"'] }, 42);
      expect(engine.expand('#word.unquote#')).toBe('hello');
    });

    it('applies scrub modifier', () => {
      const engine = makeEngine({ word: ['hello world'] });
      expect(engine.expand('#word.scrub#')).toBe('hll wrld');
    });

    it('handles multiple modifiers in sequence', () => {
      const engine = makeEngine({ word: [' HELLO WORLD '] });
      expect(engine.expand('#word.trim-all.uppercase#')).toBe('HELLOWORLD');
      expect(engine.expand('#word.trim-all.uppercase.slugify#')).toBe('helloworld');
    });

    it('applies bang modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.bang#')).toBe('hello!');
    });

    it('applies titlecase modifier', () => {
      const engine = makeEngine({ word: ['hello world'] });
      expect(engine.expand('#word.titlecase#')).toBe('Hello World');
    });

    it('applies mystic modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.mystic#')).toBe('✧ hello ✧');
    });

    it('applies custom modifier', () => {
      const engine = createGrammarEngine({ word: ['hello'] }, mulberry32(42));
      engine.addModifier('custom', (s) => `[${s}]`);
      expect(engine.expand('#word.custom#')).toBe('[hello]');
    });

    it('applies echo modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.echo#')).toBe('hello hello');
    });

    it('handles modifiers with recursion limit', () => {
      const engine = makeEngine({ a: ['#b#'], b: ['#a#'] }, 42, 1);
      expect(engine.expand('#a.uppercase#')).toBe('#B#');
    });
  });
});