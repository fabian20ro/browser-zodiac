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
  // Accept BCP-47 tags such as "ro-RO" / "en-US" and resolve them to the
  // primary language subtag, mirroring detectLanguage, so regional variants
  // map to their base locale instead of silently falling back to English.
  const normalizedId = normalizeLocaleId(id).split('-')[0];
  const base = registry.get(normalizedId) ?? en;
  const grammar = grammars.get(normalizedId) ?? base.grammar;
  return { ...base, grammar };
}

export function getAvailableLocales(): LocalePack[] {
  return Array.from(registry.values());
}

function matchRegisteredLocale(tag: string): string | null {
  const base = normalizeLocaleId(tag).slice(0, 2);
  return registry.has(base) ? base : null;
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
  if (typeof navigator !== 'undefined' && navigator.language) {
    const primary = matchRegisteredLocale(navigator.language);
    if (primary) return primary;
  }
  if (typeof navigator !== 'undefined' && Array.isArray(navigator.languages)) {
    // Primary language was unregistered: walk the ordered preference list
    // (navigator.languages) for the first registered locale, so users whose
    // first-choice language is unavailable get a matching UI instead of
    // silently falling back to English.
    for (const tag of navigator.languages) {
      const matched = matchRegisteredLocale(tag);
      if (matched) return matched;
    }
  }
  return 'en';
}

export function persistLanguage(id: string): void {
  const normalized = normalizeLocaleId(id);
  if (!getValidLocaleIds().includes(normalized)) {
    console.warn(
      `[browser-zodiac] Attempted to save unsupported locale "${id}". ` +
        `Supported locales: ${getValidLocaleIds().join(', ')}`,
    );
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // localStorage unavailable
  }
}
