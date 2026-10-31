import { compileCSS, cssDiagnostic, type Stylesheet } from './css';

const cache = new Map<string, { css: string; sheet: Stylesheet }>();

export function setDictionaryStyles(name: string, css: string): Stylesheet {
  const existing = cache.get(name);
  if (existing?.css === css) return existing.sheet;
  const sheet = compileCSS(css);
  cache.set(name, { css, sheet });
  return sheet;
}

export function getDictionaryStyles(name: string): Stylesheet {
  return cache.get(name)?.sheet ?? [];
}

export function removeDictionaryStyles(name: string) {
  cache.delete(name);
}

export function initializeCssCache(dictionaries: { title: string; css: string | null }[]) {
  cache.clear();
  for (const dictionary of dictionaries) {
    try {
      setDictionaryStyles(dictionary.title, dictionary.css ?? '');
    } catch {
      cssDiagnostic(`Could not parse stylesheet for ${dictionary.title}`);
    }
  }
}
