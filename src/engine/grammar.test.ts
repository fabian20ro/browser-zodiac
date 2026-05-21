import { describe, it, expect } from 'vitest';
import { createGrammarEngine } from './grammar.ts';
import { mulberry32 } from './random.ts';

function makeEngine(grammar: Record<string, string[]>, seed = 42) {
  return createGrammarEngine(grammar, mulberry32(seed));
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

    it('returns [?symbol] for empty rule arrays', () => {
      const engine = makeEngine({ empty: [] });
      expect(engine.expand('#empty#')).toBe('[?empty]');
    });

    it('handles multiple symbols in one template', () => {
      const engine = makeEngine({
        a: ['X'],
        b: ['Y'],
      });
      expect(engine.expand('#a# and #b#')).toBe('X and Y');
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

    it('applies trim modifier', () => {
      const engine = makeEngine({ word: ['  hello  '] });
      expect(engine.expand('#word.trim#')).toBe('hello');
    });

    it('applies collapse-spaces modifier', () => {
      const engine = makeEngine({ word: ['  hello   world  '] });
      expect(engine.expand('#word.collapse-spaces#')).toBe('hello world');
    });

    it('applies collapse-spaces to tabs and newlines', () => {
      const engine = makeEngine({ word: ["\t  hello \n\n  world\t"] });
      expect(engine.expand('#word.collapse-spaces#')).toBe('hello world');
    });

    it('applies titlecase modifier', () => {
      const engine = makeEngine({ word: ['hello world'] });
      expect(engine.expand('#word.titlecase#')).toBe('Hello World');
    });

    it('applies sentencecase modifier', () => {
      const engine = makeEngine({ word: ['hello world'] });
      expect(engine.expand('#word.sentencecase#')).toBe('Hello world');
    });

    it('titlecases padded whitespace cleanly', () => {
      const engine = makeEngine({ word: ['  hello   world  '] });
      expect(engine.expand('#word.titlecase#')).toBe('Hello World');
    });

    it('chains multiple modifiers', () => {
      const engine = makeEngine({ word: ['hello world'] });
      // capitalize then uppercase: capitalize first, then uppercase all
      expect(engine.expand('#word.capitalize.uppercase#')).toBe('HELLO WORLD');
    });

    it('ignores unknown modifiers', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.nonexistent#')).toBe('hello');
    });
  });

  describe('custom modifiers', () => {
    it('supports addModifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      engine.addModifier('reverse', (s) => s.split('').reverse().join(''));
      expect(engine.expand('#word.reverse#')).toBe('olleh');
    });
  });

  describe('depth limit', () => {
    it('stops expanding at max depth', () => {
      // Recursive grammar: a → #a# (infinite loop without depth limit)
      const engine = makeEngine({ a: ['#a#'] });
      const result = engine.expand('#a#');
      // Should stop and return the unexpanded template at max depth
      expect(result).toContain('#a#');
    });
  });
});
