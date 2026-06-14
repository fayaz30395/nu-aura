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
const MANTINE_STORAGE_KEY = 'mantine-color-scheme';

/**
 * Returns a minified inline script string to inject into <head>.
 * Must be self-contained — no imports, no DOM dependencies beyond documentElement.
 */
export function getThemeScript(): string {
  return `
(function(){
  try {
    var mode = localStorage.getItem('${STORAGE_KEY}');
    var d = document.documentElement;
    var isDark = false;

    if (mode === 'dark') {
      isDark = true;
    } else if (mode === 'light') {
      isDark = false;
    } else {
      // system or missing value: follow OS preference
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    d.style.colorScheme = isDark ? 'dark' : 'light';
    d.setAttribute('data-mantine-color-scheme', isDark ? 'dark' : 'light');
    localStorage.setItem('${MANTINE_STORAGE_KEY}', isDark ? 'dark' : 'light');

    if (isDark) {
      d.classList.add('dark');
    } else {
      d.classList.remove('dark');
    }
  } catch(e) {}
})();
`.trim();
}
