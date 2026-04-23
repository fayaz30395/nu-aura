/**
 * FOUC Prevention Script — Theme Version (v1 / v2)
 *
 * Runs synchronously in <head> before React hydrates. Reads the preferred
 * design-system version from the URL (?v2=1 / ?v2=0) or localStorage and
 * applies `.theme-v2` to <html> immediately so the first paint matches.
 *
 * Priority: 1) URL query (?v2=1|0)  2) localStorage  3) v1 (default)
 */

const STORAGE_KEY = 'nu-aura-theme-version';

export function getThemeVersionScript(): string {
  return `
(function(){
  try {
    var d = document.documentElement;
    var version = null;

    // 1) URL query overrides (and persists)
    var search = window.location.search;
    if (search) {
      var m = search.match(/[?&]v2=([01])(?:&|$)/);
      if (m) {
        version = m[1] === '1' ? 'v2' : 'v1';
        try { localStorage.setItem('${STORAGE_KEY}', version); } catch(e) {}
      }
    }

    // 2) localStorage
    if (!version) {
      var s = localStorage.getItem('${STORAGE_KEY}');
      if (s === 'v2' || s === 'v1') version = s;
    }

    // 3) default
    if (!version) version = 'v1';

    if (version === 'v2') {
      d.classList.add('theme-v2');
    } else {
      d.classList.remove('theme-v2');
    }
  } catch(e) {}
})();
`.trim();
}
