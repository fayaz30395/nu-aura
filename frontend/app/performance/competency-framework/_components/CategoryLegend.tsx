'use client';

import {Card} from '@/components/ui/Card';
import type {CompetencyCategory} from '@/lib/types/grow/performance';
import {CATEGORY_COLORS, CATEGORY_OPTIONS} from './competencyFrameworkConfig';

interface CategoryLegendProps {
  value: CompetencyCategory | '';
  onChange: (value: CompetencyCategory | '') => void;
}

export function CategoryLegend({value, onChange}: CategoryLegendProps) {
  return (
    <Card as="section" className="flex flex-col gap-4 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-3">Categories</p>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? '' : opt.value)}
              className={`flex h-8 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ${
                CATEGORY_COLORS[opt.value]
              } ${active ? 'ring-2 ring-accent-500' : 'opacity-70 hover:opacity-100'}`}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
