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
      expect(results.has('b')).toBe(false);
      expect(results.has('c')).toBe(false);
      expect(results.has('d')).toBe(true);
    });

    it('returns the first item if total weight is zero', () => {
      const engine = makeEngine({ item: ['a~~0', 'b~~0'] });
      expect(engine.expand('#item#')).toBe('a');
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
      expect(engine.expand('#word.uppercase.snake_case#')).toBe('hello_world');
    });

    it('applies reverse modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.reverse#')).toBe('olleh');
    });

    it('applies reverse modifier with unicode', () => {
      const engine = makeEngine({ word: ['hello 🌍'] });
      expect(engine.expand('#word.reverse#')).toBe('🌍 olleh');
    });

    it('applies case-flip modifier', () => {
      const engine = makeEngine({ word: ['Hello World'] });
      expect(engine.expand('#word.case-flip#')).toBe('hELLO wORLD');
    });

    it('applies sentencecase modifier', () => {
      const engine = makeEngine({ word: ['HELLO WORLD'] });
      expect(engine.expand('#word.sentencecase#')).toBe('Hello world');
    });

    it('allows adding custom modifiers', () => {
      const engine = makeEngine({ word: ['hello'] });
      engine.addModifier('shrug', (s) => `${s} ¯\\\\_(ツ)_/¯`);
      expect(engine.expand('#word.shrug#')).toBe('hello ¯\\\\_(ツ)_/¯');
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
      const engine = makeEngine({ a: ['#b#'], b: ['#a#'] }, 42, 1);
      expect(engine.expand('#a#')).toBe('#b#');
    });

    it('respects a maxDepth of 0', () => {
      const engine = makeEngine({ a: ['#b#'], b: ['#a#'] }, 42, 0);
      expect(engine.expand('#a#')).toBe('#a#');
    });

    it('does not apply modifiers if maxDepth is reached', () => {
      const engine = makeEngine({ a: ['hello'] }, 42, 0);
      expect(engine.expand('#a.uppercase#')).toBe('#a.uppercase#');
    });

    it('handles unquote with mixed quotes', () => {
      const engine = makeEngine({ word: ['"hello\''] }, 42);
      expect(engine.expand('#word.unquote#')).toBe('hello');
    });

    it('handles case-flip with unicode', () => {
      const engine = makeEngine({ word: ['ß'] }, 42);
      expect(engine.expand('#word.case-flip#')).toBe('SS');
    });

    it('applies celebrate modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.celebrate#')).toBe('🎉 hello 🎉');
    });

    it('applies titlecase modifier', () => {
      const engine = makeEngine({ word: ['hello world'] });
      expect(engine.expand('#word.titlecase#')).toBe('Hello World');
    });

    it('applies mystic modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.mystic#')).toBe('✧ hello ✧');
    });

    it('applies wrap-emoji modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.wrap-emoji#')).toBe('✨ hello ✨');
    });

    it('applies glitch modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.glitch#')).toBe('h§ll§');
    });

    it('handles slugify and snake_case edge cases', () => {
      const engine = makeEngine({ word: [' Hello! World_ '] });
      // slugify: hello-world
      expect(engine.expand('#word.slugify#')).toBe('hello-world');
      // snake_case: hello_world_
      expect(engine.expand('#word.snake_case#')).toBe('hello_world_');
    });

    it('applies void and echo modifiers', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.void.echo#')).toBe('h·ll· h·ll·');
    });

    it('applies capitalize modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.capitalize#')).toBe('Hello');
    });

    it('applies trim modifiers', () => {
      const engine = makeEngine({ word: ['  hello  '] });
      expect(engine.expand('#word.trim#')).toBe('hello');
      expect(engine.expand('#word.trim-start#')).toBe('hello  ');
      expect(engine.expand('#word.trim-end#')).toBe('  hello');
    });

    it('applies trim-all modifier', () => {
      const engine = makeEngine({ word: ['  he llo  '] });
      expect(engine.expand('#word.trim-all#')).toBe('hello');
      expect(engine.expand('#word.trim-all.uppercase#')).toBe('HELLO');
    });

    it('applies glitch modifier standalone', () => {
      const engine = makeEngine({ word: ['submarine'] });
      expect(engine.expand('#word.glitch#')).toBe('s§bm§r§n§');
    });

    it('applies echo modifier standalone', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.echo#')).toBe('hello hello');
    });

    it('handles mixed quotes with unquote modifier', () => {
      const engine = makeEngine({ word: ['"hello\''] }, 42);
      expect(engine.expand('#word.unquote#')).toBe('hello');
    });

    it('applies lowercase modifier standalone', () => {
      const engine = makeEngine({ word: ['HELLO WORLD'] });
      expect(engine.expand('#word.lowercase#')).toBe('hello world');
    });

    it('applies shout modifier', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(engine.expand('#word.shout#')).toBe('HELLO!');
    });

    it('handles complex nested expansions with multiple modifiers', () => {
      const engine = makeEngine({
        a: ['#b.uppercase#'],
        b: ['#c.slugify#'],
        c: ['Hello World']
      }, 42, 3);
      expect(engine.expand('#a#')).toBe('HELLO-WORLD');
    });

    it('throws on empty symbol name', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(() => engine.expand('##.uppercase#')).toThrow(/empty or malformed/);
    });

    it('throws on empty rule entry in grammar', () => {
      expect(() => makeEngine({ word: ['', 'valid'] })).toThrow(/Empty rule entry/);
      expect(() => makeEngine({ word: ['   '] })).toThrow(/Empty rule entry/);
    });

    it('returns [?symbol] for an existing but empty rule array', () => {
      const engine = makeEngine({ word: [] });
      expect(engine.expand('#word#')).toBe('[?word]');
    });

    it('throws on rule entries containing the grammar delimiter #', () => {
      expect(() => makeEngine({ word: ['hello #world'] })).toThrow(/contains unbalanced '#'/);
    });

    it('throws on invalid symbol name in grammar', () => {
      expect(() => makeEngine({ '123bad': ['hello'] })).toThrow(/Invalid grammar symbol/);
    });

    it('throws on empty modifier between dots', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(() => engine.expand('#word..uppercase#')).toThrow(/malformed name/);
    });

    it('throws on symbol with invalid characters', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(() => engine.expand('#123abc#')).toThrow(/empty or malformed/);
    });

    // NEW TESTS - uncovered edge cases
    it('throws on modifier containing special characters (@)', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(() => engine.expand('#word.hello@world#')).toThrow(/malformed name 'hello@world'/);
    });

    it('throws on modifier starting with a number', () => {
      const engine = makeEngine({ word: ['hello'] });
      expect(() => engine.expand('#word.123bad#')).toThrow(/malformed name '123bad'/);
    });

    it('returns [?symbol] when grammar symbol value is non-array (null)', () => {
      const engine = makeEngine({ word: null as any });
      expect(engine.expand('#word#')).toBe('[?word]');
    });

    it('returns [?symbol] when grammar symbol value is a string', () => {
      const engine = makeEngine({ word: 'hello' as any });
      expect(engine.expand('#word#')).toBe('[?word]');
    });

    it('validates valid symbol names with underscores and hyphens', () => {
      const engine = makeEngine({ _leading_underscore: ['ok'], 'hyphen-ated': ['ok'] });
      expect(engine.expand('#_leading_underscore#')).toBe('ok');
      expect(engine.expand('#hyphen-ated#')).toBe('ok');
    });

  });
});
