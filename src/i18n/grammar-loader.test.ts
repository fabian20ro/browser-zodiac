import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseGrammarText,
  parseEntriesFile,
  loadGrammar,
} from './grammar-loader.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe('parseGrammarText', () => {
  it('parses a single section with entries', () => {
    const content = `=== creature ===
unicorn
dragon
phoenix`;
    const result = parseGrammarText(content);
    expect(result.sections.creature).toEqual(['unicorn', 'dragon', 'phoenix']);
    expect(result.imports).toEqual([]);
  });

  it('parses multiple sections', () => {
    const content = `=== creature ===
unicorn
dragon

=== food ===
toast
sushi`;
    const result = parseGrammarText(content);
    expect(result.sections.creature).toEqual(['unicorn', 'dragon']);
    expect(result.sections.food).toEqual(['toast', 'sushi']);
  });

  it('skips blank lines and comments', () => {
    const content = `=== creature ===
// comment
unicorn

// another comment
dragon`;
    const
      result = parseGrammarText(content);
    expect(result.sections.creature).toEqual(['unicorn', 'dragon']);
  });

  it('detects @from import directives', () => {
    const content = `@from creatures.txt import *

=== food ===
toast`;
    const result = parseGrammarText(content);
    expect(result.imports).toEqual(['creatures.txt']);
  });

  it('preserves entries with #markers#', () => {
    const content = `=== origin ===
#opening.capitalize# #prediction#`;
    const result = parseGrammarText(content);
    expect(result.sections.origin).toEqual(['#opening.capitalize# #prediction#']);
  });
});

describe('parseEntriesFile', () => {
  it('parses lines into entries', () => {
    const content = `unicorn
dragon
phoenix`;
    expect(parseEntriesFile(content)).toEqual(['unicorn', 'dragon', 'phoenix']);
  });

  it('skips blank lines and comments', () => {
    const content = `unicorn

// comment
dragon`;
    expect(parseEntriesFile(content)).toEqual(['unicorn', 'dragon']);
  });
});

describe('parseGrammarText', () => {
  describe('edge cases', () => {
    it('drops orphan lines before any section header', () => {
      const content = `orphan line one
another orphan

=== creature ===
unicorn`;
      const result = parseGrammarText(content);
      expect(result.sections.creature).toEqual(['unicorn']);
      expect(Object.keys(result.sections).length).toBe(1);
    });

    it('handles an empty file gracefully', () => {
      const content = '';
      const result = parseGrammarText(content);
      expect(result.sections).toEqual({});
      expect(result.imports).toEqual([]);
    });
  });
});

describe('loadGrammar', () => {
  function mockFetch(files: Record<string, string>): FetchFn {
    return vi.fn((url: string) => {
      const content = files[url];
      if (content !== undefined) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(content),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        status: 404,
      } as Response);
    });
  }

  it('loads and parses a grammar file', async () => {
    const fetch = mockFetch({
      'http://test/data/en.txt': `=== creature ===
unicorn`,
    });
    const grammar = await loadGrammar('en', 'http://test/data/', fetch);
    expect(grammar.creature).toEqual(['unicorn']);
  });

  it('resolves @from import directives', async () => {
    const fetch = mockFetch({
      'http://test/data/en.txt': `@from creatures.txt import *`,
      'http://test/data/en/creatures.txt': `=== creature ===
unicorn`,
    });
    const grammar = await loadGrammar('en', 'http://test/data/', fetch);
    expect(grammar.creature).toEqual(['unicorn']);
  });

  it('throws when an @from file is missing in strict mode', async () => {
    const fetch = mockFetch({
      'http://test/data/en.txt': `@from missing.txt import *`,
    });

    await expect(
      loadGrammar('en', 'http://test/data/', fetch, true),
    ).rejects.toThrow('Failed to load @from missing.txt: 404');
  });

  it('throws when the main grammar file is missing', async () => {
    const fetch = mockFetch({});
    await expect(
      loadGrammar('en', 'http://test/data/', fetch),
    ).rejects.toThrow('Failed to load grammar');
  });

  it('loads multiple @from files in parallel', async () => {
    const fetch = vi.fn((url: string) => {
      const files: Record<string, string> = {
        'http://test/data/en.txt': `@from a.txt import *
@from b.txt import *`,
        'http://test/data/en/a.txt': `=== alpha ===
alpha entry`,
        'http://test/data/en/b.txt': `=== beta ===
beta entry`,
      };
      const content = files[url];
      return Promise.resolve(
        content !== undefined
          ? ({ ok: true, text: () => Promise.resolve(content) } as Response)
          : ({ ok: false, status: 404 } as Response),
      );
    }) as FetchFn;

    const grammar = await loadGrammar('en', 'http://test/data/', fetch);
    expect(grammar.alpha).toContain('alpha entry');
    expect(grammar.beta).toContain('beta entry');
  });
});
