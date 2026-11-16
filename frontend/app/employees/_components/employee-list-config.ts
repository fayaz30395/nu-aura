import type {FilterCondition, FilterField} from '@/components/ui/AdvancedFilterPanel';
import type {ToggleableColumn} from '@/components/ui/ColumnVisibilityToggle';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import type {Employee} from '@/lib/types/hrms/employee';
import {formatMonthYear} from '@/lib/utils/format/date';

export type SortKey = 'createdAt' | 'designation' | 'departmentName' | 'joiningDate';

export const SORT_ORDER: SortKey[] = ['createdAt', 'designation', 'departmentName', 'joiningDate'];

export const SORT_LABELS: Record<SortKey, string> = {
  createdAt: 'Date added',
  designation: 'Role',
  departmentName: 'Department',
  joiningDate: 'Joining date',
};

export const EMPLOYEE_LIST_PAGE_SIZE = 20;

export const EMPLOYEE_TABLE_ID = 'employees-directory';

/** Display "Month YYYY" from a YYYY-MM-DD string. */
export function joinedShort(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatMonthYear(d);
}

export const EMPLOYEE_FILTER_FIELDS: FilterField[] = [
  {key: 'designation', label: 'Designation', type: 'text'},
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: Object.entries(EMPLOYEE_LIFECYCLE_STATUS).map(([value, meta]) => ({value, label: meta.label})),
  },
  {key: 'joiningDate', label: 'Joining Date', type: 'date'},
  {key: 'city', label: 'Location (City)', type: 'text'},
];

export const EMPLOYEE_TABLE_COLUMNS: ToggleableColumn[] = [
  {key: 'employee', label: 'Employee', locked: true},
  {key: 'role', label: 'Role'},
  {key: 'department', label: 'Department'},
  {key: 'location', label: 'Location'},
  {key: 'joined', label: 'Joined'},
  {key: 'status', label: 'Status', locked: true},
];

function filterFieldValue(employee: Employee, field: string): string {
  switch (field) {
    case 'designation':
      return employee.designation ?? '';
    case 'status':
      return employee.status;
    case 'joiningDate':
      return employee.joiningDate ?? '';
    case 'city':
      return employee.city ?? '';
    default:
      return '';
  }
}

/** Evaluate one FilterCondition against an employee row using AdvancedFilterPanel's operator set. */
function matchesFilterCondition(employee: Employee, condition: FilterCondition): boolean {
  const raw = filterFieldValue(employee, condition.field);
  const value = condition.value;

  switch (condition.operator) {
    case 'isEmpty':
      return raw === '';
    case 'isNotEmpty':
      return raw !== '';
    case 'equals':
      return raw.toLowerCase() === String(value ?? '').toLowerCase();
    case 'contains':
      return raw.toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'startsWith':
      return raw.toLowerCase().startsWith(String(value ?? '').toLowerCase());
    case 'greaterThan':
      return raw > String(value ?? '');
    case 'lessThan':
      return raw < String(value ?? '');
    case 'between': {
      const [start, end] = String(value ?? '').split('|');
      return (!start || raw >= start) && (!end || raw <= end);
    }
    default:
      return true;
  }
}

/** Apply the active AdvancedFilterPanel conditions to the employee list (AND/OR combined). */
export function applyAdvancedFilters(
  employees: Employee[],
  conditions: FilterCondition[],
  logic: 'AND' | 'OR',
): Employee[] {
  if (conditions.length === 0) return employees;
  return employees.filter((employee) =>
    logic === 'AND'
      ? conditions.every((c) => matchesFilterCondition(employee, c))
      : conditions.some((c) => matchesFilterCondition(employee, c))
  );
}

/** Map a list-query error to a user-safe message. */
export function employeeListErrorMessage(error: unknown): string {
  const fallback = 'Failed to load employees. Please try again.';
  if (!(error instanceof Error)) return fallback;
  const message = error.message;
  if (message.includes('403')) return 'You do not have permission to view employees. Contact your administrator.';
  if (message.includes('401')) return 'Your session has expired. Please log in again.';
  if (message.includes('500')) return 'The server encountered an error. Please try again in a moment.';
  if (message.includes('Network Error')) return 'Unable to reach the server. Please check your connection.';
  return fallback;
}
