export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: Array<{ value: string; label: string }>;
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number | null;
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

export interface AdvancedFilterPanelProps {
  fields: FilterField[];
  onApply: (conditions: FilterCondition[], logic: 'AND' | 'OR') => void;
  onClear: () => void;
  tableId: string;
}

export const OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
  text: [
    {value: 'equals', label: 'Equals'},
    {value: 'contains', label: 'Contains'},
    {value: 'startsWith', label: 'Starts With'},
    {value: 'isEmpty', label: 'Is Empty'},
    {value: 'isNotEmpty', label: 'Is Not Empty'},
  ],
  number: [
    {value: 'equals', label: 'Equals'},
    {value: 'greaterThan', label: 'Greater Than'},
    {value: 'lessThan', label: 'Less Than'},
    {value: 'between', label: 'Between'},
    {value: 'isEmpty', label: 'Is Empty'},
    {value: 'isNotEmpty', label: 'Is Not Empty'},
  ],
  date: [
    {value: 'equals', label: 'Equals'},
    {value: 'greaterThan', label: 'After'},
    {value: 'lessThan', label: 'Before'},
    {value: 'between', label: 'Between'},
    {value: 'isEmpty', label: 'Is Empty'},
    {value: 'isNotEmpty', label: 'Is Not Empty'},
  ],
  select: [
    {value: 'equals', label: 'Equals'},
    {value: 'isEmpty', label: 'Is Empty'},
    {value: 'isNotEmpty', label: 'Is Not Empty'},
  ],
};

export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export const getPresetStorageKey = (tableId: string): string =>
  `filter-presets-${tableId}`;

export function loadSavedPresets(tableId: string): SavedFilterPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(getPresetStorageKey(tableId));
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveSavedPresets(tableId: string, presets: SavedFilterPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getPresetStorageKey(tableId), JSON.stringify(presets));
  } catch {
    // localStorage quota exceeded or disabled
  }
}
