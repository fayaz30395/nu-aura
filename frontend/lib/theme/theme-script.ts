/**
 * FOUC (Flash of Unstyled Content) Prevention Script
 *
 * This script runs synchronously in <head> BEFORE React hydrates.
 * It reads the user's theme preference from localStorage and applies
 * the correct `.dark` class to <html> immediately, preventing a flash
 * of the wrong theme on page load.
 *
 * Priority: 1) localStorage  2) system preference  3) light (default)
 */

const STORAGE_KEY = 'nu-aura-theme';

/**
 * Returns a minified inline script string to inject into <head>.
 * Must be self-contained — no imports, no DOM dependencies beyond documentElement.
 */
export function getThemeScript(): string {
  return `
(function(){
  try {
    var s = localStorage.getItem('${STORAGE_KEY}');
    var d = document.documentElement;
    var isDark = false;

    if (s === 'dark') {
      isDark = true;
    } else if (s === 'system' || s === null) {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    // s === 'light' → isDark stays false

    if (isDark) {
      d.classList.add('dark');
    } else {
      d.classList.remove('dark');
    }
  } catch(e) {}
})();
`.trim();
}
