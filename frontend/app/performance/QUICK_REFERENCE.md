# Performance Pages - Quick Reference Guide

## File Locations

```
/frontend/app/performance/
├── pip/
│   └── page.tsx                          # 837 lines
├── calibration/
│   └── page.tsx                          # 698 lines
├── 9box/
│   └── page.tsx                          # 643 lines
├── PERFORMANCE_PAGES_DOCS.md            # Full documentation
└── QUICK_REFERENCE.md                    # This file
```

## Key Imports (All Three Pages)

```typescript
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  // Lucide React icons
  Plus,
  Download,
  Eye,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  FileText,
  TrendingUp,
  Users,
  Target,
  // ... more icons as needed
} from 'lucide-react';

// For calibration & 9-box pages only
import { reviewCycleService, reviewService } from '@/lib/services/performance.service';
import type { ReviewCycle, PerformanceReview } from '@/lib/types/performance';
```

## PIP Page API Reference

### Create PIP
```typescript
const createMutation = useMutation({
  mutationFn: (data: CreatePIPRequest) => createPIP(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['pips'] });
  },
});

// Usage
createMutation.mutate({
  employeeId: string,
  managerId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  reason: string,
  goals: string,
  checkInFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
});
```

### Add Check-In
```typescript
const checkInMutation = useMutation({
  mutationFn: (data: PIPCheckInRequest) => addCheckIn(pip.id, data),
  onSuccess: () => onUpdated(),
});

// Usage
checkInMutation.mutate({
  checkInDate: string, // YYYY-MM-DD
  progressNotes: string,
  managerComments: string,
});
```

### Close/Update PIP Status
```typescript
const closeMutation = useMutation({
  mutationFn: () => closePIP(pipId, status, notes),
});

// Status options: 'COMPLETED' | 'EXTENDED' | 'TERMINATED'
```

## Calibration Page API Reference

### Fetch Review Cycles
```typescript
const { data: cycles, isLoading } = useQuery({
  queryKey: ['cycles'],
  queryFn: () => reviewCycleService.getAll(0, 100),
});
```

### Fetch Reviews for Cycle
```typescript
const { data: reviews } = useQuery({
  queryKey: ['reviews', selectedCycleId],
  queryFn: () => reviewService.getAllReviews(0, 500),
});

// Filter by cycle
const filtered = reviews.filter(r => 
  (r.reviewCycleId || r.cycleId) === selectedCycleId
);
```

### Update Final Rating
```typescript
const handleSaveFinal = async (row: EmployeeRatingRow) => {
  const managerReview = reviews.find(
    r => r.employeeId === row.employeeId && r.reviewType === 'MANAGER'
  );
  
  if (managerReview) {
    await reviewService.update(managerReview.id, {
      ...managerReview,
      overallRating: finalVal, // 1-5
    });
  }
};
```

### Export CSV
```typescript
const exportCsv = () => {
  const header = ['Employee', 'Department', 'Self Rating', 'Manager Rating', 'Final Rating'];
  const rows = data.map(r => [
    r.employeeName,
    r.department,
    r.selfRating ?? '',
    r.managerRating ?? '',
    r.finalRating ?? '',
  ]);
  
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `calibration-${cycleId}.csv`;
  link.click();
};
```

## 9-Box Page API Reference

### Calculate Performance & Potential
```typescript
const points = useMemo<EmployeePoint[]>(() => {
  const map = new Map();
  
  // Group reviews by employee
  for (const r of reviews) {
    if (!r.employeeId || !r.overallRating) continue;
    
    if (!map.has(r.employeeId)) {
      map.set(r.employeeId, {
        name: r.employeeName,
        selfRating: null,
        managerRating: null,
      });
    }
    
    const entry = map.get(r.employeeId);
    if (r.reviewType === 'SELF') entry.selfRating = r.overallRating;
    else if (r.reviewType === 'MANAGER') entry.managerRating = r.overallRating;
  }
  
  // Calculate performance vs potential
  const result: EmployeePoint[] = [];
  for (const [empId, entry] of map.entries()) {
    const performance = entry.managerRating ?? entry.selfRating;
    
    let potential = potentialOverrides[empId];
    if (!potential) {
      if (entry.selfRating && entry.managerRating) {
        const delta = entry.selfRating - entry.managerRating;
        potential = Math.min(5, Math.max(1, performance + delta * 0.5 + 0.5));
      } else {
        potential = 3; // default
      }
    }
    
    result.push({ employeeId: empId, employeeName: entry.name, performance, potential });
  }
  
  return result;
}, [reviews, potentialOverrides]);
```

### Map to 9-Box Categories
```typescript
function toBand(value: number): 1 | 2 | 3 {
  if (value <= 2.33) return 1; // Low
  if (value <= 3.66) return 2; // Medium
  return 3; // High
}

function boxKey(performance: number, potential: number): string {
  return `${toBand(performance)}-${toBand(potential)}`;
}

// Usage
const byBox = useMemo(() => {
  const groups: Record<string, EmployeePoint[]> = {};
  for (const p of points) {
    const key = boxKey(p.performance, p.potential);
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return groups;
}, [points]);
```

### 9-Box Categories
```typescript
const BOX_CONFIG = {
  '1-1': { label: 'Deadwood',           sublabel: 'Low perf · Low potential' },
  '2-1': { label: 'Dilemma',            sublabel: 'Mid perf · Low potential' },
  '3-1': { label: 'Highly Skilled',     sublabel: 'High perf · Low potential' },
  '1-2': { label: 'Inconsistent Player',sublabel: 'Low perf · Mid potential' },
  '2-2': { label: 'Core Player',        sublabel: 'Mid perf · Mid potential' },
  '3-2': { label: 'High Performer',     sublabel: 'High perf · Mid potential' },
  '1-3': { label: 'Growth Employee',    sublabel: 'Low perf · High potential' },
  '2-3': { label: 'Future Star',        sublabel: 'Mid perf · High potential' },
  '3-3': { label: 'Star',               sublabel: 'High perf · High potential' },
};
```

## Common Utility Functions

### Format Date
```typescript
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
```

### Calculate Days Remaining
```typescript
function calculateDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const today = new Date();
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}
```

### Calculate Progress Percentage
```typescript
function calculateProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  const total = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}
```

## Component Structure Examples

### Modal Pattern
```typescript
function MyModal({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState(initialValues);
  const mutation = useMutation({
    mutationFn: async (data) => { /* API call */ },
    onSuccess: () => {
      onSuccess();
      // Reset form
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-surface-800 rounded-xl shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="border-b p-6 flex justify-between items-center">
          <h2>Modal Title</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(formData); }} className="p-6 space-y-4">
          {/* Form fields */}
          <button type="submit" disabled={mutation.isPending}>
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Stats Card Pattern
```typescript
<div className="bg-white dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
      <Icon className="text-blue-600 dark:text-blue-400" size={20} />
    </div>
    <div>
      <p className="text-xs text-surface-500">Label</p>
      <p className="text-2xl font-bold text-surface-900 dark:text-white">Value</p>
    </div>
  </div>
</div>
```

### Table Pattern
```typescript
<div className="bg-white dark:bg-surface-800 rounded-lg overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-surface-50 dark:bg-surface-700 border-b border-surface-200 dark:border-surface-700">
        <th className="px-4 py-3 text-left font-semibold text-surface-700 dark:text-surface-300">
          Column 1
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-surface-100 dark:divide-surface-700">
      {data.map(row => (
        <tr key={row.id} className="hover:bg-surface-50 dark:hover:bg-surface-700">
          <td className="px-4 py-3">{row.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

## Tailwind Classes Reference

### Dark Mode Variants
```
dark:bg-surface-800   // Dark background
dark:text-white       // Dark text
dark:border-surface-700 // Dark border
dark:hover:bg-surface-700 // Dark hover
```

### Common Spacing
```
p-4     // padding
px-4    // horizontal padding
py-3    // vertical padding
gap-4   // gap between items
mb-3    // margin bottom
mt-1    // margin top
```

### Interactive States
```
hover:bg-surface-50
active:scale-95
disabled:opacity-50
focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
```

## Error Handling Pattern

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['data'],
  queryFn: async () => { /* fetch */ },
});

if (error) {
  return (
    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
      <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
      <div>
        <p className="font-medium text-red-900 dark:text-red-200">Error</p>
        <p className="text-sm text-red-700 dark:text-red-300">Failed to load data</p>
      </div>
    </div>
  );
}
```

## Loading State Pattern

```typescript
{isLoading ? (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
  </div>
) : data.length === 0 ? (
  <div className="text-center py-20 text-surface-500">No data found</div>
) : (
  // Content here
)}
```

## Type Definitions Used

### PIP Types
```typescript
type PIPStatus = 'ACTIVE' | 'COMPLETED' | 'EXTENDED' | 'TERMINATED';
type PIPCheckInFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

interface PIPResponse {
  id: string;
  employeeId: string;
  employeeName?: string;
  managerId: string;
  managerName?: string;
  startDate: string;
  endDate: string;
  reason?: string;
  goals?: string;
  checkInFrequency: PIPCheckInFrequency;
  status: PIPStatus;
  checkIns?: PIPCheckIn[];
}

interface CreatePIPRequest {
  employeeId: string;
  managerId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  goals?: string;
  checkInFrequency?: PIPCheckInFrequency;
}
```

### Performance Review Types
```typescript
interface PerformanceReview {
  id: string;
  employeeId: string;
  employeeName?: string;
  reviewerId: string;
  reviewerName?: string;
  reviewCycleId?: string;
  cycleId?: string;
  reviewType: 'SELF' | 'MANAGER' | 'PEER' | 'THREE_SIXTY';
  status: 'DRAFT' | 'SUBMITTED' | 'COMPLETED';
  overallRating?: number; // 1-5
  strengths?: string;
  areasForImprovement?: string;
}

interface ReviewCycle {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'CALIBRATION' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
}
```

## Running & Testing

### Local Development
```bash
npm run dev
# Visit: http://localhost:3000/performance/pip
#        http://localhost:3000/performance/calibration
#        http://localhost:3000/performance/9box
```

### Build
```bash
npm run build
npm run start
```

### Type Check
```bash
npx tsc --noEmit
```

