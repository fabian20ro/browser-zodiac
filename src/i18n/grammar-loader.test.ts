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

  it('preserves Unicode entries (zodiac symbols + Romanian diacritics)', () => {
    // Horoscope data uses zodiac symbols and Romanian text with diacritics;
    // these must roundtrip through the parser without corruption.
    const content = `♈ Aries
♋ Cancer
⚠️  Prigoană
Mâine va ploua`;
    expect(parseEntriesFile(content)).toEqual([
      '♈ Aries',
      '♋ Cancer',
      '⚠️  Prigoană',
      'Mâine va ploua',
    ]);
  });

  it('skips indented comments (// after whitespace)', () => {
    // parseEntriesFile uses trimStart() for comment detection — lines whose
    // leading content begins with // must be skipped regardless of indentation.
    const content = `unicorn
  // indented comment
dragon`;
    expect(parseEntriesFile(content)).toEqual(['unicorn', 'dragon']);
  });

  it('handles CRLF line endings without corrupting entries', () => {
    // Grammar files authored on Windows use \r\n; trimEnd must strip the \r so
    // that entries roundtrip cleanly through parseEntriesFile.
    const content = 'unicorn\r\ndragon\r\nphoenix';
    expect(parseEntriesFile(content)).toEqual(['unicorn', 'dragon', 'phoenix']);
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

    it('accumulates entries when a section header is repeated', () => {
      // Re-entering an existing section appends to that section rather than
      // resetting or erroring — the parser only creates the array on first
      // encounter (grammar-loader.ts line 32).
      const content = `=== creature ===
unicorn

=== food ===
toast

=== creature ===
dragon`;
      const result = parseGrammarText(content);
      expect(result.sections.creature).toEqual(['unicorn', 'dragon']);
      expect(result.sections.food).toEqual(['toast']);
    });

    it('handles an empty file gracefully', () => {
      const content = '';
      const result = parseGrammarText(content);
      expect(result.sections).toEqual({});
      expect(result.imports).toEqual([]);
    });

    it('treats @from directives inside a section as imports, not entries', () => {
      const content = `=== food ===
toast
@from creatures.txt import *
dragon`;
      const result = parseGrammarText(content);
      expect(result.sections.food).toEqual(['toast', 'dragon']);
      expect(result.imports).toContain('creatures.txt');
    });

    it('collects @from directives from multiple sections separately', () => {
      const content = `@from a.txt import *
=== food ===
toast
=== drink ===
beer`;
      const result = parseGrammarText(content);
      expect(result.sections.food).toEqual(['toast']);
      expect(result.sections.drink).toEqual(['beer']);
      expect(result.imports).toEqual(['a.txt']);
    });

    it('handles a file with only @from directives', () => {
      const content = `@from x.txt import *
@from y.txt import *`;
      const result = parseGrammarText(content);
      expect(result.sections).toEqual({});
      expect(result.imports).toEqual(['x.txt', 'y.txt']);
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
    ).rejects.toThrow('Failed to load http://test/data/en/missing.txt: 404');
  });

  it('tolerates missing @from files in non-strict mode by warning and continuing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = mockFetch({
      'http://test/data/en.txt': `@from ghost.txt import *\n\n=== food ===\ntoast`,
    });

    const grammar = await loadGrammar('en', 'http://test/data/', fetch, false);
    expect(grammar.food).toEqual(['toast']);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      `Failed to load http://test/data/en/ghost.txt: 404`,
    );

    warnSpy.mockRestore();
  });

  it('throws when the main grammar file is missing', async () => {
    const fetch = mockFetch({});
    await expect(
      loadGrammar('en', 'http://test/data/', fetch),
    ).rejects.toThrow('Failed to load http://test/data/en.txt');
  });

  it('throws with full URL when the main grammar file fails in strict mode', async () => {
    const fetch = mockFetch({});
    await expect(
      loadGrammar('en', 'http://test/data/', fetch, true),
    ).rejects.toThrow('Failed to load http://test/data/en.txt: 404');
  });

  it('throws when fetch itself throws in strict mode (network failure)', async () => {
    // Network-level failures (DNS, timeout, etc.) throw before a Response object
    // is created. safeFetchText must surface these as URL-prefixed errors in
    // strict mode so callers see the problematic URL instead of a raw TypeError.
    const fetch = vi.fn(() => Promise.reject(new Error('Network request failed'))) as FetchFn;

    await expect(
      loadGrammar('en', 'http://test/data/', fetch, true),
    ).rejects.toThrow(/Failed to load http:\/\/test\/data\/en\.txt/);
  });

  it('deduplicates fetch calls when multiple @from point to the same file', async () => {
    const fetchCalls: string[] = [];
    const fetch = vi.fn(async (url: string) => {
      fetchCalls.push(url);
      return Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            `=== creature ===\nunicorn`,
          ),
      } as Response);
    }) as FetchFn;

    await loadGrammar('en', 'http://test/data/', fetch);
    const uniqueUrls = [...new Set(fetchCalls)];
    expect(uniqueUrls).toEqual(fetchCalls);
  });

  it('throws on non-200 @from response in strict mode with URL', async () => {
    const fetch = mockFetch({
      'http://test/data/en.txt': `@from bad.txt import *`,
    });

    await expect(
      loadGrammar('en', 'http://test/data/', fetch, true),
    ).rejects.toThrow(
      'Failed to load http://test/data/en/bad.txt: 404',
    );
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

  it('recursively resolves @from directives in imported files', async () => {
    // Per docstring: imported files may contain their own @from directives;
    // they are loaded and merged into the main grammar.
    const fetch = mockFetch({
      'http://test/data/en.txt': `@from pack.txt import *`,
      'http://test/data/en/pack.txt': `=== creature ===
unicorn
@from extras.txt import *`,
      'http://test/data/en/extras.txt': `=== food ===
ghost sandwich`,
    });

    const grammar = await loadGrammar('en', 'http://test/data/', fetch);
    expect(grammar.creature).toContain('unicorn');
    expect(grammar.food).toContain('ghost sandwich');
  });

  it('passes through an import-only intermediary file in the chain', async () => {
    // An imported file that contains only @from directives (no sections)
    // must not break the recursive chain — downstream files' sections still
    // get merged into the grammar.
    const fetch = mockFetch({
      'http://test/data/en.txt': `@from bridge.txt import *`,
      'http://test/data/en/bridge.txt': `@from payload.txt import *`,
      'http://test/data/en/payload.txt': `=== creature ===\nunicorn\n=== food ===\ntoast`,
    });

    const grammar = await loadGrammar('en', 'http://test/data/', fetch);
    expect(grammar.creature).toEqual(['unicorn']);
    expect(grammar.food).toEqual(['toast']);
  });

  it('handles circular @from imports without infinite recursion', async () => {
    // The visitedUrls deduplication must prevent infinite loops when files
    // import each other cyclically.
    const fetch = mockFetch({
      'http://test/data/en.txt': `@from b.txt import *`,
      'http://test/data/en/b.txt': `=== creature ===\nunicorn\n@from a.txt import *\n@from en.txt import *`,
      'http://test/data/en/a.txt': `=== food ===\ntoast`,
    });

    const grammar = await loadGrammar('en', 'http://test/data/', fetch);
    expect(grammar.creature).toContain('unicorn');
    expect(grammar.food).toEqual(['toast']);
  });
});
