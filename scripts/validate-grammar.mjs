import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '../public/data');
const locales = ['en', 'ro'];
const minEntriesPerSymbol = 5;
const sectionRe = /^===\s*(.+?)\s*===$/;
const fromRe = /^@from\s+(\S+)\s+import\s+\*$/;
const symbolRefRe = /#([^#.]+)(?:\.[^#]+)?#/g;
const hashRe = /#/g;

// Add schema validation for loaded grammars and create a CLI audit script for the data directory.
let globalTotalEntries = 0;
const runtimeSymbols = new Set([
  'signName',
  'spirit_browser',
  'elemental_os',
  'life_resolution',
  'soul_window',
  'cultural_destiny',
  'soul_alignment',
  'temporal_energy',
  'astrological_period',
  'parallel_lives',
  'cosmic_platform',
  'social_connectivity',
  'cosmic_timezone',
]);

function parseSections(content) {
  const sections = new Map();
  const imports = [];
  let current = null;

  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;

    const fromMatch = line.match(fromRe);
    if (fromMatch) {
      imports.push(fromMatch[1]);
      continue;
    }

    const sectionMatch = line.match(sectionRe);
    if (sectionMatch) {
      current = sectionMatch[1];
      if (!sections.has(current)) {
        sections.set(current, []);
      }
      continue;
    }

    if (!current) continue;
    sections.get(current).push(line);
  }

  return { sections, imports };
}

function loadLocaleGrammar(locale) {
  const mainPath = resolve(dataDir, `${locale}.txt`);
  const { sections, imports } = parseSections(readFileSync(mainPath, 'utf8'));
  const grammar = new Map();

  // Add sections from main file
  for (const [symbol, entries] of sections.entries()) {
    if (!grammar.has(symbol)) grammar.set(symbol, []);
    grammar.get(symbol).push(...entries);
  }

  // Load and merge all @from imports
  for (const importFile of imports) {
    const importPath = resolve(dataDir, locale, importFile);
    let importContent;
    try {
      importContent = readFileSync(importPath, 'utf8');
    } catch {
      throw new Error(`Missing @from import for ${locale}: ${importFile}`);
    }
    const { sections: importSections } = parseSections(importContent);
    for (const [symbol, entries] of importSections.entries()) {
      if (!grammar.has(symbol)) grammar.set(symbol, []);
      grammar.get(symbol).push(...entries);
    }
  }

  return grammar;
}

function extractRefs(entry) {
  const refs = [];
  let match;
  // We need to use a fresh regex for each entry or reset the lastIndex
  const re = new RegExp(symbolRefRe, 'g');
  while ((match = re.exec(entry)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

function validateEntrySyntax(locale, symbol, entry, entryIndex) {
  const hashCount = (entry.match(hashRe) ?? []).length;
  if (hashCount % 2 !== 0) {
    throw new Error(
      `Locale ${locale}: symbol "${symbol}" entry ${entryIndex + 1} has an unmatched "#" delimiter: ${entry}`,
    );
  }
}

function validateLocale(locale) {
  const grammar = loadLocaleGrammar(locale);
  let totalEntries = 0;
  let symbolCount = 0;

  for (const [symbol, entries] of grammar.entries()) {
    symbolCount++;
    totalEntries += entries.length;
    if (entries.length < minEntriesPerSymbol) {
      throw new Error(
        `Locale ${locale}: symbol "${symbol}" has ${entries.length} entries (min ${minEntriesPerSymbol})`,
      );
    }
  }

  const roots = ['origin', 'warning', 'luckyColor', 'compatibility'];

  const seen = new Set();
  const queue = [...roots];

  while (queue.length > 0) {
    const symbol = queue.shift();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);

    const entries = grammar.get(symbol);
    if (!entries) {
      if (runtimeSymbols.has(symbol)) {
        continue;
      }
      throw new Error(`Locale ${locale}: missing referenced symbol "${symbol}"`);
    }

    if (entries.length < minEntriesPerSymbol) {
      throw new Error(
        `Locale ${locale}: referenced symbol "${symbol}" has ${entries.length} entries (min ${minEntriesPerSymbol})`,
      );
    }

    const seenEntriesInSymbol = new Set();
    for (const [entryIndex, entry] of entries.entries()) {
      validateEntrySyntax(locale, symbol, entry, entryIndex);
      if (seenEntriesInSymbol.has(entry)) {
        throw new Error(`Locale ${locale}: duplicate entry in symbol "${symbol}": ${entry}`);
      }
      seenEntriesInSymbol.add(entry);
      for (const ref of extractRefs(entry)) {
        queue.push(ref);
      }
    }
  }

  console.log(`Grammar validation passed for ${locale}: checked ${symbolCount} symbols and ${totalEntries} entries.`);
  globalTotalEntries += totalEntries;
}

for (const locale of locales) {
  validateLocale(locale);
}

console.log(`Grammar validation passed for locales: ${locales.join(', ')}`);
console.log(`Grand total entries checked across all locales: ${globalTotalEntries}`);
