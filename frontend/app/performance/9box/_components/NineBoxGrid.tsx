'use client';

import {cn} from '@/lib/utils';
import {BOX_CONFIG, type EmployeePoint} from './nineBoxModel';

const GRID_ROWS = [
  {potBand: 3, label: 'High Potential'},
  {potBand: 2, label: 'Medium Potential'},
  {potBand: 1, label: 'Low Potential'},
];

const GRID_COLS = [
  {perfBand: 1, label: 'Low (1.0–2.3)'},
  {perfBand: 2, label: 'Medium (2.4–3.7)'},
  {perfBand: 3, label: 'High (3.8–5.0)'},
];

const MAX_CHIPS = 8;

const initials = (name: string) =>
  name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

interface NineBoxGridProps {
  byBox: Record<string, EmployeePoint[]>;
  selectedBox: string | null;
  onSelectBox: (box: string | null) => void;
}

export function NineBoxGrid({byBox, selectedBox, onSelectBox}: NineBoxGridProps) {
  return (
    <section className="overflow-x-auto rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex min-w-max gap-4">
        <div className="flex w-6 shrink-0 flex-col items-center justify-start">
          <span className="mt-2 rotate-180 text-xs font-semibold text-text-3 [writing-mode:vertical-rl]">
            POTENTIAL ↑
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          {GRID_ROWS.map(({potBand, label: potLabel}) => (
            <div key={potBand} className="flex gap-4">
              <div className="flex w-28 shrink-0 items-center justify-end pr-4">
                <span className="text-right text-xs font-medium text-text-2">{potLabel}</span>
              </div>

              {GRID_COLS.map(({perfBand}) => {
                const key = `${perfBand}-${potBand}`;
                const meta = BOX_CONFIG[key];
                const cellPoints = byBox[key] || [];
                const isSelected = selectedBox === key;

                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${meta.label}: ${cellPoints.length} employees`}
                    onClick={() => onSelectBox(isSelected ? null : key)}
                    className={cn(
                      'flex min-h-36 min-w-36 flex-1 flex-col rounded-lg border-2 p-4 text-left hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2',
                      meta.bg,
                      meta.border,
                      isSelected && 'ring-2 ring-accent-500 ring-offset-2',
                    )}
                  >
                    <div className="mb-2 flex w-full items-start justify-between">
                      <span className={cn('flex-1 text-xs font-bold leading-tight', meta.text)}>{meta.label}</span>
                      <span className={cn('ml-1 text-lg font-bold tabular-nums', meta.text)}>{cellPoints.length}</span>
                    </div>
                    <div className="flex flex-1 flex-wrap content-start gap-1">
                      {cellPoints.slice(0, MAX_CHIPS).map(p => (
                        <span
                          key={p.employeeId}
                          className={cn('whitespace-nowrap rounded-full border px-1.5 py-0.5 text-xs font-semibold', meta.bg, meta.border, meta.text)}
                          title={`${p.employeeName}: Perf ${p.performance.toFixed(1)}, Pot ${p.potential.toFixed(1)}`}
                        >
                          {initials(p.employeeName)}
                        </span>
                      ))}
                      {cellPoints.length > MAX_CHIPS && (
                        <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-semibold opacity-60', meta.text)}>
                          +{cellPoints.length - MAX_CHIPS}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          <div className="flex gap-4">
            <div className="w-28 shrink-0"/>
            {GRID_COLS.map(({perfBand, label}) => (
              <div key={perfBand} className="flex-1 text-center text-xs font-medium text-text-2">
                {label}
              </div>
            ))}
          </div>
          <div className="text-center text-xs font-bold text-text-3">PERFORMANCE →</div>
        </div>
      </div>
    </section>
  );
}
