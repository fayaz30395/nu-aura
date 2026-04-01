'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Download, FileSpreadsheet, FileText, FileDown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToCsv, exportToExcel } from '@/lib/utils/export';

interface ExportColumn {
  key: string;
  label: string;
  visible?: boolean;
}

interface ExportMenuProps<T extends Record<string, unknown>> {
  /** Column definitions — only visible columns are exported. */
  columns: ExportColumn[];
  /** Data rows to export. */
  data: T[];
  /** Base filename (without extension). */
  filename?: string;
  /** Optional backend PDF export handler. Called when user selects PDF. */
  onExportPdf?: () => void | Promise<void>;
  /** Whether PDF export is available. */
  pdfEnabled?: boolean;
  /** Additional CSS class. */
  className?: string;
  /** Disable the entire menu (e.g. while loading). */
  disabled?: boolean;
}

function ExportMenu<T extends Record<string, unknown>>({
  columns,
  data,
  filename = 'export',
  onExportPdf,
  pdfEnabled = false,
  className,
  disabled = false,
}: ExportMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleCsv = useCallback(() => {
    setOpen(false);
    exportToCsv(columns, data, filename);
  }, [columns, data, filename]);

  const handleExcel = useCallback(async () => {
    setOpen(false);
    setExporting(true);
    try {
      await exportToExcel(columns, data, filename);
    } finally {
      setExporting(false);
    }
  }, [columns, data, filename]);

  const handlePdf = useCallback(async () => {
    if (!onExportPdf) return;
    setOpen(false);
    setExporting(true);
    try {
      await onExportPdf();
    } finally {
      setExporting(false);
    }
  }, [onExportPdf]);

  const isDisabled = disabled || exporting || data.length === 0;

  return (
    <div ref={menuRef} className={cn('relative inline-block', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          'min-h-[44px] min-w-[44px]',
          'border border-[var(--border-main)] bg-[var(--bg-surface)]',
          'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]',
          'focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Export data"
      >
        {exporting ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div
          className={cn(
            'absolute right-0 z-50 mt-2 w-48 rounded-lg border shadow-lg',
            'border-[var(--border-main)] bg-[var(--bg-surface)]',
            'animate-in fade-in-0 zoom-in-95'
          )}
          role="menu"
          aria-label="Export options"
        >
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleCsv}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                'text-[var(--text-primary)] hover:bg-sky-50 dark:hover:bg-sky-900/20',
                'min-h-[44px]'
              )}
            >
              <FileText className="h-4 w-4 text-sky-700" />
              Export as CSV
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={handleExcel}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                'text-[var(--text-primary)] hover:bg-sky-50 dark:hover:bg-sky-900/20',
                'min-h-[44px]'
              )}
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Export as Excel
            </button>

            {pdfEnabled && (
              <button
                type="button"
                role="menuitem"
                onClick={handlePdf}
                disabled={!onExportPdf}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  'text-[var(--text-primary)] hover:bg-sky-50 dark:hover:bg-sky-900/20',
                  'min-h-[44px]',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <FileDown className="h-4 w-4 text-red-600" />
                Export as PDF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { ExportMenu };
export type { ExportMenuProps, ExportColumn };
