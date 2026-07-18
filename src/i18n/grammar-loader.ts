import type { Grammar } from '../engine/types.ts';

const SECTION_RE = /^===\s*(.+?)\s*===$/;
const FROM_RE = /^@from\s+(\S+)\s+import\s+\*$/;

/** Result of parsing a grammar text file. */
export interface ParsedGrammar {
  imports: string[];
  sections: Record<string, string[]>;
}

/** Parse a section-based grammar text file into sections and top-level imports. */
export function parseGrammarText(content: string): ParsedGrammar {
  const sections: Record<string, string[]> = {};
  const imports: string[] = [];
  let current: string | null = null;

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('//')) continue;

    // Top-level @from directives (before or between sections)
    const fromMatch = line.match(FROM_RE);
    if (fromMatch) {
      imports.push(fromMatch[1]);
      continue;
    }

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      current = sectionMatch[1];
      if (!sections[current]) sections[current] = [];
      continue;
    }

    if (current === null) continue;
    sections[current].push(line);
  }

  return { imports, sections };
}

/** Parse a plain text file into a list of entries (one per non-blank line). */
export function parseEntriesFile(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line !== '' && !line.trimStart().startsWith('//'));
}

/**
 * Load grammar data for a locale from external text files.
 *
 * The main file at `{basePath}{localeId}.txt` uses a section-based format:
 *
 *   @from a-c.txt import *
 *   @from d-g.txt import *
 *
 *   === symbolName ===
 *   entry one
 *   entry two with #markers#
 *
 * Import files are full section-based files (same format, may also contain
 * @from directives) loaded from `{basePath}{localeId}/{filename}`.
 * All imported sections are merged into the main grammar. Files are
 * fetched in parallel for optimal performance.
 */
export async function loadGrammar(
  localeId: string,
  basePath?: string,
  fetchFn: typeof fetch = fetch,
  strict: boolean = false,
): Promise<Grammar> {
  const base = basePath ?? `${import.meta.env.BASE_URL}data/`;
  const mainUrl = `${base}${localeId}.txt`;

  let response;
  try {
    response = await fetchFn(mainUrl);
  } catch (err) {
    throw new Error(
      `Failed to load grammar from ${mainUrl}: ${(err as Error).message}`,
    );
  }
  if (!response.ok) {
    throw new Error(`Failed to load grammar: ${mainUrl} (${response.status})`);
  }

  let content;
  try {
    content = await response.text();
  } catch (err) {
    throw new Error(
      `Failed to read grammar from ${mainUrl}: ${(err as Error).message}`,
    );
  }
  const parsed = parseGrammarText(content);

  const grammar: Grammar = {};

  // Helper: merge parsed sections into a grammar accumulator.
  function _mergeSections(grammar: Grammar, entriesBySymbol: Record<string, string[]>): void {
    for (const [symbol, entries] of Object.entries(entriesBySymbol)) {
      if (!grammar[symbol]) grammar[symbol] = [];
      grammar[symbol].push(...entries);
    }
  }

  // Initialize grammar from main file sections
  _mergeSections(grammar, parsed.sections);

  // Collect all imports recursively with deduplication to avoid cycles
  const visitedUrls = new Set<string>();
  const importQueue = [...parsed.imports.map((imp) => `${base}${localeId}/${imp}`)];

  while (importQueue.length > 0) {
    const url = importQueue.shift()!;
    if (visitedUrls.has(url)) continue; // avoid infinite recursion on circular imports
    visitedUrls.add(url);

    let res;
    try {
      res = await fetchFn(url);
    } catch (err) {
      const errorMsg = `Failed to load ${url}: ${(err as Error).message}`;
      if (strict) throw new Error(errorMsg);
      console.warn(errorMsg);
      continue;
    }
    if (!res.ok) {
      const errorMsg = `Failed to load ${url}: ${res.status}`;
      if (strict) throw new Error(errorMsg);
      console.warn(errorMsg);
      continue;
    }

    let text: string;
    try {
      text = await res.text();
    } catch (err) {
      const errorMsg = `Failed to read ${url}: ${(err as Error).message}`;
      if (strict) throw new Error(errorMsg);
      console.warn(errorMsg);
      continue;
    }
    const parsedImport = parseGrammarText(text);

    // Queue nested imports for later processing
    for (const nestedImport of parsedImport.imports) {
      importQueue.push(`${base}${localeId}/${nestedImport}`);
    }

    // Merge sections from this imported file into the grammar
    _mergeSections(grammar, parsedImport.sections);
  }

  return grammar;
}
