# EditableCell Component

FIX-018: Inline table cell editing component for NU-AURA.

## Features

- Click to switch between display and edit modes
- Support for text, number, select, and date field types
- Auto-focus input when entering edit mode
- Save on blur or Enter key
- Cancel on Escape key
- Pencil icon indicator on hover
- Loading state with spinner during save
- Error state with red border and error message
- Optimistic UI: updates display immediately, reverts on error
- Compact sizing matching table row density

## Basic Usage

```tsx
import { EditableCell } from '@/components/ui';
import { useState } from 'react';

export function MyTable() {
  const [employeeName, setEmployeeName] = useState('John Doe');

  const handleSaveName = async (newName: string) => {
    const response = await fetch('/api/v1/employees/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!response.ok) throw new Error('Failed to save');
  };

  return (
    <table>
      <tbody>
        <tr>
          <td>
            <EditableCell
              value={employeeName}
              type="text"
              onSave={handleSaveName}
              placeholder="Enter name"
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
```

## Props

```typescript
interface EditableCellProps<T = string | number> {
  /** The current value to display */
  value: T;

  /** Field type: 'text' | 'number' | 'select' | 'date' */
  type: 'text' | 'number' | 'select' | 'date';

  /** Options array for select type */
  options?: Array<{ value: string; label: string }>;

  /** Callback to save the new value. Should throw on error. */
  onSave: (newValue: T) => Promise<void>;

  /** Disable editing */
  disabled?: boolean;

  /** Placeholder text for empty inputs */
  placeholder?: string;

  /** Custom validation function. Return error message or null. */
  validate?: (value: T) => string | null;
}
```

## Examples

### Text Input

```tsx
<EditableCell
  value="Alice Johnson"
  type="text"
  onSave={async (name) => {
    await api.updateEmployee({ name });
  }}
  placeholder="Name"
/>
```

### Number Input

```tsx
<EditableCell
  value={50000}
  type="number"
  onSave={async (salary) => {
    await api.updateEmployee({ salary });
  }}
  placeholder="Enter salary"
/>
```

### Select Input

```tsx
<EditableCell
  value="active"
  type="select"
  options={[
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'on_leave', label: 'On Leave' },
  ]}
  onSave={async (status) => {
    await api.updateEmployee({ status });
  }}
/>
```

### Date Input

```tsx
<EditableCell
  value="2024-03-15"
  type="date"
  onSave={async (dateOfJoining) => {
    await api.updateEmployee({ dateOfJoining });
  }}
/>
```

### With Validation

```tsx
<EditableCell
  value="john@example.com"
  type="text"
  onSave={async (email) => {
    await api.updateEmployee({ email });
  }}
  validate={(email) => {
    if (!email.includes('@')) {
      return 'Invalid email format';
    }
    return null;
  }}
/>
```

## Integration in DataTable

```tsx
import { DataTable, EditableCell } from '@/components/ui';

export function EmployeeTable() {
  const [employees, setEmployees] = useState([...]);

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: Employee) => (
        <EditableCell
          value={row.name}
          type="text"
          onSave={async (name) => {
            await api.updateEmployee(row.id, { name });
            // Update local state after successful save
            setEmployees(prev =>
              prev.map(e => e.id === row.id ? { ...e, name } : e)
            );
          }}
        />
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (row: Employee) => (
        <EditableCell
          value={row.department}
          type="select"
          options={[
            { value: 'eng', label: 'Engineering' },
            { value: 'sales', label: 'Sales' },
            { value: 'hr', label: 'HR' },
          ]}
          onSave={async (department) => {
            await api.updateEmployee(row.id, { department });
            setEmployees(prev =>
              prev.map(e => e.id === row.id ? { ...e, department } : e)
            );
          }}
        />
      ),
    },
  ];

  return <DataTable columns={columns} data={employees} />;
}
```

## Design Notes

- Compact sizing: `px-4 py-2 text-sm` matching table row density
- Color scheme: Uses CSS variables (`--text-primary`, `--border-main`, `--bg-surface`, etc.)
- Icons: Pencil (edit indicator), checkmark (save), X (cancel), spinner (loading)
- Animations: Framer Motion for smooth transitions
- Accessibility: Proper ARIA labels, keyboard support (Enter to save, Escape to cancel)

## Keyboard Shortcuts

- **Enter**: Save changes (outside of text areas)
- **Escape**: Cancel editing and revert to original value
- **Click**: Toggle between display and edit modes
- **Hover**: Show pencil icon (display mode)

## States

1. **Display Mode**: Shows current value with pencil icon on hover
2. **Edit Mode**: Focused input field with save/cancel buttons
3. **Loading**: Spinner in save button, all inputs disabled
4. **Error**: Red border on input, error message below field

## Error Handling

- Custom validation via `validate` prop returns error message
- Promise rejection reverts to original value and shows error message
- Error message displays below input field
- User can retry immediately
