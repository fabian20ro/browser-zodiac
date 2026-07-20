import type { Grammar } from '../engine/types.ts';
import type { LocalePack } from './types.ts';
import { en } from './locales/en.ts';
import { ro } from './locales/ro.ts';
import { loadGrammar } from './grammar-loader.ts';

const STORAGE_KEY = 'horror-scope-lang';

const registry = new Map<string, LocalePack>();
registry.set('en', en);
registry.set('ro', ro);

function getValidLocaleIds(): string[] {
  return Array.from(registry.keys());
}

function normalizeLocaleId(id: string): string {
  return id.trim().toLowerCase();
}

const grammars = new Map<string, Grammar>();

/** Preload grammar data for all registered locales in parallel. */
export async function loadAllGrammars(): Promise<void> {
  await Promise.all(
    Array.from(registry.keys()).map(async (id) => {
      grammars.set(id, await loadGrammar(id));
    }),
  );
}

export function getLocale(id: string): LocalePack {
  const normalizedId = normalizeLocaleId(id);
  const base = registry.get(normalizedId) ?? en;
  const grammar = grammars.get(normalizedId) ?? base.grammar;
  return { ...base, grammar };
}

export function getAvailableLocales(): LocalePack[] {
  return Array.from(registry.values());
}

export function detectLanguage(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const normalizedSaved = normalizeLocaleId(saved);
      if (registry.has(normalizedSaved)) return normalizedSaved;
    }
  } catch {
    // localStorage unavailable
  }
  const browserLang = normalizeLocaleId(navigator.language ?? '').slice(0, 2);
  const candidate = registry.has(browserLang) ? browserLang : 'en';
  if (registry.has(candidate)) return candidate;
  return 'en';
}

export function persistLanguage(id: string): void {
  const normalized = normalizeLocaleId(id);
  if (!getValidLocaleIds().includes(normalized)) return; // reject unknown locales silently
  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // localStorage unavailable
  }
}
