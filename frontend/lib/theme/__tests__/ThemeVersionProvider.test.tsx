import {describe, it, expect, beforeEach, vi} from 'vitest';
import {render, screen, act} from '@testing-library/react';
import {ThemeVersionProvider, useThemeVersion, useThemeVersionControls} from '../ThemeVersionProvider';

// Install a minimal in-memory localStorage shim; the project's vitest setup
// does not provide one by default.
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => Array.from(mem.keys())[i] ?? null,
  get length() {
    return mem.size;
  },
});

function Probe() {
  const v = useThemeVersion();
  const {toggleVersion} = useThemeVersionControls();
  return (
    <div>
      <span data-testid="version">{v}</span>
      <button onClick={toggleVersion}>toggle</button>
    </div>
  );
}

describe('ThemeVersionProvider', () => {
  beforeEach(() => {
    mem.clear();
    document.documentElement.classList.remove('theme-v2');
  });

  it('defaults to v1 and does not set html.theme-v2', () => {
    render(
      <ThemeVersionProvider>
        <Probe/>
      </ThemeVersionProvider>
    );
    expect(screen.getByTestId('version').textContent).toBe('v1');
    expect(document.documentElement.classList.contains('theme-v2')).toBe(false);
  });

  it('reads v2 from localStorage and applies class', () => {
    localStorage.setItem('nu-aura-theme-version', 'v2');
    render(
      <ThemeVersionProvider>
        <Probe/>
      </ThemeVersionProvider>
    );
    expect(screen.getByTestId('version').textContent).toBe('v2');
    expect(document.documentElement.classList.contains('theme-v2')).toBe(true);
  });

  it('toggleVersion flips html.theme-v2 class', () => {
    render(
      <ThemeVersionProvider>
        <Probe/>
      </ThemeVersionProvider>
    );
    expect(document.documentElement.classList.contains('theme-v2')).toBe(false);
    act(() => {
      screen.getByText('toggle').click();
    });
    expect(document.documentElement.classList.contains('theme-v2')).toBe(true);
    expect(localStorage.getItem('nu-aura-theme-version')).toBe('v2');
  });
});
