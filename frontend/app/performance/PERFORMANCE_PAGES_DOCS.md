# Performance Management Frontend Pages - Documentation

## Overview

Three production-ready performance management pages built with Next.js 14, TypeScript, Tailwind CSS, and Lucide React icons. All pages feature dark mode support and responsive design.

---

## Page 1: Performance Improvement Plans (PIP) Management

**Location:** `/sessions/inspiring-lucid-curie/mnt/nu-aura/frontend/app/performance/pip/page.tsx`

### Features

#### Header & Stats
- Page title with description
- "Create PIP" button (primary action)
- 3-stat dashboard showing:
  - Active PIPs count
  - Completed PIPs count
  - Average PIP duration (in days)

#### Tab Navigation
- 3 tabs: Active | Completed | Cancelled
- Filters by PIP status
- Persistent filter state during navigation

#### Search & Filtering
- Full-text search by employee name
- Department filter dropdown
- Real-time filter application

#### PIP Cards (Grid Layout)
Each card displays:
- Employee name & PIP reason
- Status badge (color-coded)
- Date range (start → end)
- Manager name with icon
- Progress bar (for active PIPs)
- Days remaining counter
- "View Details" button

#### Create PIP Modal
- Employee search/select field
- Manager search/select field
- PIP reason dropdown (Performance, Behavior, Attendance, Quality, Communication, Teamwork, Other)
- Duration presets (30/60/90 days) with quick-set buttons
- Start date & end date inputs
- Goals & objectives textarea
- Check-in frequency selector (Weekly, Bi-weekly, Monthly)
- Cancel & Create buttons with loading state

#### PIP Detail Modal
Shows comprehensive PIP information:
- Employee info (name, title, department)
- Manager name
- Current status
- Date range
- Progress bar with percentage (active only)
- Days remaining indicator
- Reason for PIP
- Goals & objectives (displayed as markdown-style text)

**Check-in History:**
- Timeline of all check-ins
- Each entry shows: date, progress notes, manager comments
- No check-ins message if empty

**Add Check-in Section:**
- Progress notes textarea
- Manager comments textarea
- "Add Check-in" button
- Only visible for active PIPs

**Status Update Section:**
- Status dropdown (Mark Complete, Extend, Terminate)
- Closing notes textarea
- "Update Status" button (red accent)
- Only visible for active PIPs

### Key Functions

```typescript
// API Functions
async function fetchPIPs(filters?: PIPFilter): Promise<PIPResponse[]>
async function createPIP(data: CreatePIPRequest): Promise<PIPResponse>
async function fetchPIPById(id: string): Promise<PIPResponse>
async function addCheckIn(pipId: string, data: PIPCheckInRequest): Promise<PIPResponse>
async function closePIP(pipId: string, status, notes): Promise<PIPResponse>

// Utilities
function calculateDaysRemaining(endDate: string): number
function calculateProgress(startDate: string, endDate: string): number
function formatDate(dateStr: string): string
```

### Component Hierarchy

```
PIPPage (main)
├── Header with Create button
├── Stats grid
├── Tab navigation
├── Search & Filter bar
├── PIP Cards (grid)
│   └── PIPCard (reusable)
├── CreatePIPModal
└── PIPDetailModal
```

### API Endpoints Used

```
GET    /api/v1/performance/pip              (list PIPs with filters)
POST   /api/v1/performance/pip              (create new PIP)
GET    /api/v1/performance/pip/{id}         (get PIP details)
POST   /api/v1/performance/pip/{id}/check-in (add check-in)
PATCH  /api/v1/performance/pip/{id}/status  (update PIP status)
```

### State Management

- Uses React Query for data fetching and caching
- Local state for modals (createOpen, selectedPIP)
- Form state managed with useState
- Memoized stats calculations

---

## Page 2: Performance Calibration & Distribution

**Location:** `/sessions/inspiring-lucid-curie/mnt/nu-aura/frontend/app/performance/calibration/page.tsx`

### Features

#### Header & Actions
- Page title with description
- Export CSV button
- Publish ratings button (publishes to all employees)

#### Cycle Selector
- Dropdown to select review cycle
- Status badge (Active, Calibration, etc.)
- Loading skeleton while cycles load

#### Distribution Overview
Two-column layout:

**Current Distribution Chart**
- Horizontal stacked bar chart
- Shows: Needs Improvement | Below Expectations | Meets Expectations | Exceeds Expectations | Outstanding
- Color-coded by rating level
- Shows counts and percentages
- Total rated employees counter

**Statistics Cards (3 cards)**
- Total Employees in cycle
- Rated employees count with percentage
- Average rating across all employees

#### Bell Curve Warning
- Alert box appears if distribution deviates from target
- Shows specific warnings:
  - If too many outstanding ratings
  - If too many needs improvement ratings
  - If middle band too low
- Orange/amber styling for visibility

#### Search & Filtering
- Employee name search
- Department filter dropdown
- Real-time application

#### Calibration Table
Spreadsheet-like interface with columns:

| Column | Features |
|--------|----------|
| Employee Name | Sortable, text search target |
| Department | Sortable, filterable |
| Self Rating | Badge display (color-coded) |
| Manager Rating | Badge display (color-coded) |
| Final Rating | Editable number input (1-5, 0.5 increments) |
| Action | "Save" button (only when modified) |

Features:
- **Sorting**: Click headers to sort by name, department, or rating
- **Inline Editing**: Change final ratings in-place
- **Dirty State**: Visual highlighting (yellow background) when edited
- **Save Mechanism**: Individual save buttons per row
- **Discrepancy Highlighting**: Left border indicator for large self/manager gaps

### Key Functions

```typescript
// Calculations
function calculateProgress(startDate, endDate): number
function bellCurveWarning(counts, total): string | null

// Components
function RatingBadge({ rating }): JSX.Element
function DistributionChart({ counts, total, label }): JSX.Element
function BellCurveWarning({ counts, total }): string | null
```

### API Endpoints Used

```
GET    /api/v1/performance-cycles              (list cycles)
GET    /api/v1/reviews                          (get all reviews for cycle)
PATCH  /api/v1/reviews/{id}                     (save final rating)
POST   /api/v1/calibration/{cycleId}/publish   (publish ratings)
```

### State Management

- React Query for cycles and reviews
- Local overrides state for final ratings
- Saving state per employee
- Filter/sort state with memoization

---

## Page 3: 9-Box Talent Grid

**Location:** `/sessions/inspiring-lucid-curie/mnt/nu-aura/frontend/app/performance/9box/page.tsx`

### Features

#### Header & Export
- Page title with description
- Export CSV button

#### Cycle Selector
- Dropdown with cycle selection
- Shows total employees plotted

#### Info Banner
- Explains X-axis = Performance, Y-axis = Potential
- Instructions on interaction

#### Statistics Dashboard (4 cards)
- **Total Plotted**: Overall count
- **Stars**: Employees in high performance + high potential
- **High Performers**: Count with performance > 3.5
- **High Potential**: Count with potential > 3.5

#### 9-Box Grid Visualization

**Grid Structure:**
```
                    Low (1.0–2.3)   Medium (2.4–3.7)   High (3.8–5.0)
High Potential   | Growth        | Future Star      | Star
                | Employee      |                  |
-----------+----------+-----------+----------+-----------+
Med Potential   | Inconsistent  | Core Player      | High Performer
                | Player        |                  |
-----------+----------+-----------+----------+-----------+
Low Potential   | Deadwood      | Dilemma          | Highly Skilled
                |               |                  |
```

**Each Cell Contains:**
- Category name (label)
- Employee count (badge)
- Employee initials (abbreviated tags, max 8 visible)
- "+N more" indicator if > 8 employees
- Hover/click effects
- Color-coded background

**Cell Metadata:**
- Unique color scheme per quadrant
- Sublabel describing the archetype
- Interactive highlighting on selection

#### Selected Box Details
When a cell is clicked:
- Shows expanded view with all employees in that category
- Editable potential score inputs
- Shows performance & potential values
- Real-time grid re-plotting on changes

#### All Employees Table
- **Columns**: Employee, Performance, Potential (editable), Category (badge)
- **Search**: Filter by employee name
- **Sort**: By name, performance, or potential
- **Edit**: Inline potential score editing
- **Dynamic**: Table updates in real-time as grid is modified

### Key Functions

```typescript
// Utility Functions
function toBand(value: number): 1 | 2 | 3
function boxKey(perf: number, pot: number): string

// Components
function NineBoxGrid({ points, byBox, selectedBox, onSelectBox }): JSX.Element

// Calculations
const points: useMemo(() => calculate performance vs potential)
const filteredAndSorted: useMemo(() => filter and sort employees)
const byBox: useMemo(() => group employees by 9-box category)
```

### API Endpoints Used

```
GET    /api/v1/performance-cycles           (list cycles)
GET    /api/v1/reviews                       (get all reviews)
```

### Interaction Patterns

1. **Cycle Selection**: Load new reviews set
2. **Cell Click**: Toggle selected box detail view
3. **Potential Edit**: Real-time grid re-computation
4. **Search**: Filter employees in table
5. **Sort**: Click header to reorder
6. **Export**: Download CSV with all mappings

### State Management

- React Query for async data
- Local overrides for potential scores
- Selected box tracking
- Search and sort state
- Memoized computations for performance

---

## Shared Design System

### Color Palette

**Status/Rating Colors:**
```
1 = Red (#DC2626)       - Needs Improvement
2 = Orange (#EA580C)    - Below Expectations
3 = Yellow (#FBBF24)    - Meets Expectations
4 = Blue (#2563EB)      - Exceeds Expectations
5 = Green (#10B981)     - Outstanding
```

**9-Box Colors:**
```
Deadwood → Red
Dilemma → Orange
Highly Skilled → Yellow
Inconsistent Player → Amber
Core Player → Blue
High Performer → Indigo
Growth Employee → Teal
Future Star → Green
Star → Emerald
```

### Component Standards

- **Buttons**: Primary (blue) | Secondary (outline) | Danger (red)
- **Badges**: Inline pills with color-coded backgrounds
- **Tables**: Striped rows, hover effects, sortable headers
- **Modals**: Overlay with dark background, centered positioning
- **Cards**: White background with borders, hover shadow
- **Icons**: Lucide React (16-20px default)

### Typography

- **Headings**: Bold, size 2xl-3xl
- **Labels**: Small (sm), medium weight
- **Body**: Regular size (sm/base), medium weight
- **Helpers**: Tiny (xs), gray color

### Spacing

- **Padding**: 4, 6, 8, 12px (input/cards)
- **Gaps**: 2, 3, 4, 6px between elements
- **Margins**: 2, 4, 6px top/bottom

### Dark Mode

All pages feature full dark mode support:
- Background: `dark:bg-surface-800` / `dark:bg-surface-900`
- Text: `dark:text-white` / `dark:text-surface-300`
- Borders: `dark:border-surface-700`
- Cards: `dark:bg-surface-800`

---

## Performance Considerations

### Optimization Techniques

1. **React Query**: Automatic caching and invalidation
2. **Memoization**: useMemo for heavy computations
3. **Code Splitting**: Each page is a separate route
4. **Lazy Loading**: Images and icons loaded on demand
5. **Debouncing**: Search input debounced (implicit in React Query)

### Scalability

- **PIP Page**: Handles 1000+ PIPs with card virtualization possible
- **Calibration**: Spreadsheet can handle 500+ employees with sorting/filtering
- **9-Box**: Grid handles 1000+ employees with memoized computations

### API Pagination

All endpoints support pagination:
```typescript
GET /api/v1/performance/pip?page=0&size=50&status=ACTIVE
GET /api/v1/reviews?page=0&size=500
```

---

## Testing Scenarios

### PIP Page

- [ ] Create PIP with all fields filled
- [ ] Test 30/60/90 day presets
- [ ] Add check-in to active PIP
- [ ] Close PIP as Completed/Extended/Terminated
- [ ] Filter by department and status
- [ ] Search by employee name
- [ ] View empty state (no PIPs)

### Calibration Page

- [ ] Select different review cycles
- [ ] Edit final ratings inline
- [ ] Verify bell curve warning appears
- [ ] Sort by each column
- [ ] Search and filter simultaneously
- [ ] Export CSV file
- [ ] Verify dirty state highlighting
- [ ] Save individual ratings

### 9-Box Page

- [ ] Plot employees in correct quadrants
- [ ] Click cells to show details
- [ ] Edit potential scores
- [ ] Verify grid re-plots dynamically
- [ ] Search employees in table
- [ ] Sort by performance/potential
- [ ] Export CSV
- [ ] Verify statistics calculations

---

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

All pages use modern CSS and ES2020+ JavaScript.

---

## Future Enhancements

1. **Drag & Drop**: Move employees between 9-box quadrants
2. **Bulk Actions**: Mass update PIPs or ratings
3. **Analytics**: Charts for rating distributions over time
4. **Email Integration**: Send PIP summaries to managers
5. **Print Preview**: Export PIPs/calibrations as PDF
6. **Workflow Approvals**: Route ratings through approval chains
7. **Notifications**: Real-time alerts for PIP milestones
8. **Audit Trail**: Track all rating changes with timestamps

