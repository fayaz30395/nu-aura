# Enterprise UI System

The UI System dictates the visual language and interaction patterns of the HRMS, prioritizing
clarity, efficiency for power-users, and accessibility.

## 1. Global Layout Architecture

### Standard SaaS Shell

- **Left Sidebar Navigation:** Collapsible (Icon-only mode). Groups modules logically. Displays a
  badge counter for pending approvals next to an "Inbox" item. Avoids deep nesting; maximum one
  level of sub-menus (e.g., *Organization -> Departments*).
- **Top Header:** Persistent across all views.
  - *Global Search (Cmd/Ctrl + K):* Omnibox to find employees, policies, or specific pages
    instantly.
  - *Tenant Switcher (Admin only):* Context dropdown if managing multiple subsidiaries.
  - *Notification Bell:* With unread count and popover pane.
  - *User Profile Avatar:* Dropdown to access "My Profile", "Settings", or "Logout".
- **Main Workspace Area:** The dynamic rendering zone. Utilizes max-width constraints (e.g.,
  `max-w-7xl` in Tailwind) to maintain readability on ultra-wide monitors. Includes Breadcrumbs
  below the header for deep-linking context.

## 2. Core Interaction Patterns

### A. Data Density & Tables

HR Admins process large volumes of tabular data (e.g., month-end attendance logs).

- **Sticky Headers:** When scrolling 100+ rows, column headers must stick.
- **Sticky First Column:** Typically Employee Name/ID, ensuring context isn't lost when scrolling
  horizontally through 20+ columns.
- **Inline Editing (Spreadsheet Mode):** For rapid data entry (e.g., marking bulk attendance
  adjustments), cells become editable on click, saving via `PATCH` request on blur. Avoids modal
  fatigue.
- **Bulk Actions:** Utilizing row checkboxes. When >0 rows selected, a contextual floating action
  bar appears globally at the bottom (e.g., "Approve 14 Selected Leaves").

### B. Form Design

- **Stepped Wizards:** Used for lengthy processes (e.g., New Employee Onboarding: *Basic Info -> Org
  Assignment -> Salary Details -> Documents*). Shows progress indicators. Saves drafts locally to
  prevent data loss.
- **Slide-out Panels (Side Sheets):** Preferred over centered Modals for complex creates/edits (
  e.g., Editing a Leave Policy). Preserves the context of the underlying data table while providing
  ample vertical screen real estate for form fields.
- **Validation Feedback:** Real-time on blur. Red text below the input field, clearly explaining the
  requirement (e.g., "Must be exactly 10 digits").

### C. The "Inbox" Pattern (Approvals)

Inspired by email clients.

- Left-hand pane lists all pending task cards (Leaves, Expenses, Requisitions).
- Clicking a card updates the right-hand main reading pane with full contextual details (e.g.,
  showing the receipt image alongside the expense claim data).
- Fixed action buttons ("Approve", "Reject w/ Comment") at the bottom of the reading pane.

## 3. Keyboard Shortcuts & Power User Features

To compete with legacy ERP systems, data-entry speed is paramount.

- `Cmd + K`: Global Search Command Palette.
- `Esc`: Close any active modal, side-sheet, or dropdown.
- `?`: Toggle a modal displaying all available local page shortcuts.
- Tab index ordering MUST be strictly logical on all forms, supporting fully mouse-free data entry.

## 4. Mobile Responsiveness Strategy

While Admins primarily use desktops, Employees heavily rely on mobile.

- **Mobile Web First for ESS (Employee Self Service):**
  - Standard Sidebar collapses into a bottom navigation bar or a hamburger menu.
  - Wide data tables transform into stackable card lists.
  - Large side-sheet forms transform into full-screen mobile views.
- **Native App Considerations:** The API design supports native iOS/Android wrappers if required,
  specifically targeting native features like camera access for receipt scanning or GPS for
  geofenced attendance punches.

## 5. Styling Guidelines (Tailwind CSS)

### Color Palette (Configured in `tailwind.config.js`)

- Primary Brand Color (e.g., `#0f172a` Slate 900). Can be overridden by Tenant White-labeling
  logic (injecting CSS variables at runtime).
- Functional Colors: `success` (Green 500), `warning` (Yellow 500), `danger` (Red 500) for alerts
  and statuses.
- Neutral Backgrounds: E.g., `bg-gray-50` for the app canvas, ensuring white Cards (
  `bg-white shadow-sm`) stand out cleanly.

### Typography

- Base font: Inter or Roboto for optimal legibility at small sizes.
- Strict typographic hierarchy defined via Tailwind classes.

### Micro-interactions

- Immediate visual feedback on buttons (e.g., `hover:bg-primary-600 active:scale-95`).
- Skeletons (`animate-pulse`) used explicitly during data fetching, avoiding jarring layout shifts
  compared to simple spinners.
