'use client';

/**
 * Aura Command Palette (⌘K) — 600px centered modal.
 *
 * Grouped results (Navigate / Actions / People) · substring filter ·
 * arrow/enter/esc keyboard nav · scrim + Esc dismiss · transform-based
 * entrance (never rests at opacity:0). Navigation goes through the Next.js
 * router. Fed from the live filtered nav registry so results match the
 * routes the user can actually reach.
 *
 * Token-driven: surface/border/radius/shadow/motion all from the Aura layer.
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {LayoutGrid, Search} from 'lucide-react';
import {motion, useReducedMotion} from 'framer-motion';
import {cn} from '@/lib/utils';
import type {SidebarItem, SidebarSection} from '@/components/ui';
import {MOTION_DURATION, MOTION_EASE} from '@/lib/animation';

export interface CommandItem {
  id: string;
  group: 'Navigate' | 'Actions' | 'People';
  label: string;
  href?: string;
  hint?: string;
  icon?: React.ReactNode;
  onRun?: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Live filtered nav sections — the source of "Navigate" results. */
  sections: SidebarSection[];
  /** Optional extra action/people rows appended to the navigate results. */
  extraItems?: CommandItem[];
}

const DEFAULT_ICON = <LayoutGrid className="h-4 w-4"/>;

/** Flatten the filtered nav registry into navigable command rows. */
function buildNavigateItems(sections: SidebarSection[]): CommandItem[] {
  const out: CommandItem[] = [];
  const seen = new Set<string>();

  const visit = (item: SidebarItem) => {
    if (item.href && !seen.has(item.href)) {
      seen.add(item.href);
      out.push({
        id: item.id,
        group: 'Navigate',
        label: item.label,
        href: item.href,
        icon: item.icon ?? DEFAULT_ICON,
      });
    }
    item.children?.forEach(visit);
  };

  sections.forEach((section) => section.items.forEach(visit));
  return out;
}

export function CommandPalette({open, onClose, sections, extraItems = []}: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion() ?? false;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  // Build the full pool once per section/extra change.
  const allItems = useMemo<CommandItem[]>(
    () => [...buildNavigateItems(sections), ...extraItems],
    [sections, extraItems]
  );

  // Substring filter by label.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((it) => it.label.toLowerCase().includes(q));
  }, [allItems, query]);

  // Preserve group ordering: Navigate → Actions → People.
  const grouped = useMemo(() => {
    const order: CommandItem['group'][] = ['Navigate', 'Actions', 'People'];
    const map = new Map<CommandItem['group'], CommandItem[]>();
    for (const it of filtered) {
      const list = map.get(it.group) ?? [];
      list.push(it);
      map.set(it.group, list);
    }
    return order
      .filter((g) => map.has(g))
      .map((g) => ({group: g, items: map.get(g)!}));
  }, [filtered]);

  // Flat index for keyboard selection mirrors the rendered (grouped) order.
  const flatOrder = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Reset on open + on query change.
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      // Focus on next paint so the modal is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const run = (item?: CommandItem) => {
    if (!item) return;
    if (item.onRun) {
      item.onRun();
    } else if (item.href) {
      router.push(item.href);
    }
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, flatOrder.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flatOrder[selected]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  let flatIdx = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[rgba(8,11,22,0.5)] px-4 pt-[12vh] backdrop-blur-[4px]"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        initial={prefersReduced ? false : {opacity: 0, y: -8, scale: 0.98}}
        animate={{opacity: 1, y: 0, scale: 1}}
        transition={{duration: MOTION_DURATION.base, ease: MOTION_EASE.outExpo}}
        className="w-[600px] max-w-[92vw] overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--sh-pop)]"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-[18px] py-4">
          <Search className="h-[19px] w-[19px] text-[var(--text-3)]"/>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, actions, pages…"
            role="combobox"
            aria-expanded={flatOrder.length > 0}
            aria-controls="command-palette-results"
            aria-autocomplete="list"
            className="flex-1 border-0 bg-transparent text-[16px] text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)]"
          />
          <kbd className="num rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] px-[7px] py-[3px] text-[11px] text-[var(--text-3)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div id="command-palette-results" role="listbox" className="max-h-[380px] overflow-y-auto p-2">
          {flatOrder.length === 0 && (
            <div className="px-8 py-8 text-center text-[13.5px] text-[var(--text-3)]">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {grouped.map(({group, items}) => (
            <div key={group} role="presentation" className="px-2.5 pb-1 pt-1.5">
              <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--text-3)]">
                {group}
              </div>
              {items.map((item) => {
                flatIdx += 1;
                const idx = flatIdx;
                const isActive = selected === idx;
                return (
                  <div
                    key={`${group}-${item.id}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => run(item)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-[9px] px-3 py-[9px] transition-[background-color] duration-[var(--t-fast)] ease-[var(--ease)]',
                      isActive && 'bg-[var(--accent-soft)]'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-[30px] w-[30px] flex-shrink-0 place-items-center rounded-[8px] transition-[background-color,color] duration-[var(--t-fast)] [&_svg]:h-4 [&_svg]:w-4',
                        isActive
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--surface-2)] text-[var(--text-2)]'
                      )}
                    >
                      {item.icon ?? DEFAULT_ICON}
                    </span>
                    <span className="flex-1 text-[13.5px] font-medium text-[var(--text-1)]">
                      {item.label}
                    </span>
                    {item.hint && (
                      <span className="text-[11px] text-[var(--text-3)]">{item.hint}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-2.5 text-[11.5px] text-[var(--text-3)]">
          <span>
            <kbd className="num mr-[3px] rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] px-[5px] py-px">↑↓</kbd>
            navigate
          </span>
          <span>
            <kbd className="num mr-[3px] rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] px-[5px] py-px">↵</kbd>
            select
          </span>
          <span>
            <kbd className="num mr-[3px] rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] px-[5px] py-px">esc</kbd>
            close
          </span>
          <span className="ml-auto">NU-AURA Command</span>
        </div>
      </motion.div>
    </div>
  );
}
