'use client';

/**
 * Export utilities for DataTable — CSV and Excel export.
 * Uses ExcelJS (already in package.json) for Excel export with fallback to CSV.
 */

interface ExportColumn {
  key: string;
  label: string;
  visible?: boolean;
}

/**
 * Escape a CSV cell value — wraps in quotes if it contains commas, quotes, or newlines.
 */
function escapeCsvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Resolve a nested key path (e.g. "department.name") from an object.
 */
function resolveKey(row: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let current: unknown = row;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return '';
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Generate a CSV string from columns and data, then trigger a download.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  columns: ExportColumn[],
  data: T[],
  filename: string
): void {
  const visibleColumns = columns.filter((col) => col.visible !== false);

  const headerRow = visibleColumns.map((col) => escapeCsvCell(col.label)).join(',');

  const dataRows = data.map((row) =>
    visibleColumns.map((col) => escapeCsvCell(resolveKey(row, col.key))).join(',')
  );

  const csvContent = [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Generate an Excel file using ExcelJS and trigger a download.
 * Falls back to CSV if ExcelJS is not available at runtime.
 */
export async function exportToExcel<T extends Record<string, unknown>>(
  columns: ExportColumn[],
  data: T[],
  filename: string
): Promise<void> {
  const visibleColumns = columns.filter((col) => col.visible !== false);

  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NU-AURA';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Export');

    // Add header row with styling
    const headerRowData = visibleColumns.map((col) => col.label);
    const headerRow = worksheet.addRow(headerRowData);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0369A1' }, // sky-700
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Add data rows
    data.forEach((row) => {
      const rowValues = visibleColumns.map((col) => {
        const val = resolveKey(row, col.key);
        return val == null ? '' : String(val);
      });
      worksheet.addRow(rowValues);
    });

    // Auto-fit column widths (approximate)
    visibleColumns.forEach((col, idx) => {
      const maxContentLength = Math.max(
        col.label.length,
        ...data.map((row) => String(resolveKey(row, col.key) ?? '').length)
      );
      const column = worksheet.getColumn(idx + 1);
      column.width = Math.min(Math.max(maxContentLength + 2, 10), 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerDownload(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  } catch {
    // Fallback to CSV with .xlsx-compatible name
    exportToCsv(columns, data, filename.replace(/\.xlsx$/, '.csv'));
  }
}

/**
 * Trigger a browser file download from a Blob.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
