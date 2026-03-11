# Frontend Architecture

The HRMS platform's web application is a Single Page Application (SPA) built to deliver a highly interactive, consumer-grade experience. The architecture prioritizes strong typing, efficient data synchronization, modularity for large teams, and a rigorous design system interface. 

## 1. Technology Stack
- **Core:** React 18+
- **Language:** TypeScript (Strict Mode Enabled)
- **Styling:** Tailwind CSS
- **Data Fetching/Caching:** TanStack Query (React Query)
- **State Management:** Zustand (for global UI state like Sidebar toggles or Auth user info)
- **Routing:** React Router DOM (v6)
- **Forms:** React Hook Form + Zod (Validation)
- **Tables:** TanStack Table (React Table v8)

## 2. Global Directory Structure (Feature-Sliced Design)
The repository is structured around business domains rather than file types (e.g., 'all components' vs 'all hooks').

```text
src/
├── assets/         # Static global assets (logos, global icons)
├── components/     # **Shared/Dumb** UI components (Buttons, Modals, Inputs) - The Design System
├── config/         # Environment variables, constants
├── hooks/          # Global utility hooks (useWindowSize, useTheme)
├── layouts/        # Page wrappers (AuthLayout, DashboardLayout)
├── lib/            # Axios setup, utility wrappers (e.g. date-fns helpers), Zod base schemas
├── services/       # Base API client functions
├── store/          # Zustand global stores (AuthStore, UIStore)
├── types/          # Global TypeScript interfaces
└── features/       # **The Core of the App** - Domain-Specific Modules
    ├── auth/
    ├── employees/
    ├── leave/
    ├── recruitment/
        ├── api/        # TanStack Query mutations/queries (e.g., `useGetCandidates.ts`)
        ├── components/ # Components specific ONLY to this feature (e.g., `CandidateScorecard.tsx`)
        ├── hooks/      # Business logic hooks specific to recruitment
        ├── types/      # Domain specific DTOs
        └── pages/      # Routeable views (e.g., `RecruitmentDashboard.tsx`)
```

## 3. Core Architectural Patterns

### A. Data Fetching and Caching (TanStack Query)
The frontend delegates all remote state management (server state) to React Query.
- `useQuery` is used for fetching datagrid lists and profile data. 
- Results are cached automatically, improving perceived performance on subsequent tab switches.
- `useMutation` is used for form submissions, POST/PUT/DELETE calls.
- On successful mutation (e.g., Adding a new leave request), the cache keys are invalidated globally to automatically re-fetch the latest data across all components showing leave balances. 

### B. Form Handling (React Hook Form + Zod)
Enterprise HR forms are massive (e.g., Onboarding Profile with 50+ fields).
- **React Hook Form** reduces re-renders by treating inputs as uncontrolled components.
- **Zod** provides schema parsing. A Zod schema is defined for the payload, enabling both TypeScript typings and immediate validation errors on blur/submit. 

### C. The API Layer (Axios)
A centralized Axios instance located in `src/lib/apiClient.ts`.
- **Interceptors:**
  - *Response Interceptor:* Implements unified error handling (e.g., popping up a global Toast notification on generic `500` errors) and handles automatic token refreshing if a `401 Unauthorized` is encountered.
  - *Request Interceptor:* Automatically attaches the current specific tenant identifier and the `Bearer` token to headers.

### D. Advanced Data Tables
HR admins interact heavily with lists of employees and reports.
- **TanStack Table (Headless):** We utilize the headless table utility to separate the complex state logic (sorting, pagination, filtering, column visibility, row selection) from the specific Tailwind DOM rendering. Server-side pagination is natively integrated with React Query limits/offsets. 

### E. Security & Routing Boundaries
- Defines a `ProtectedRoute` wrapper component.
- The wrapper reads the `AuthStore`. If the JWT is missing or expired, it forces a redirect to `/login`.
- Furthermore, components utilize a `RequirePermission` wrapper (e.g., `<RequirePermission code="employee.delete"><Button>Delete Employee</Button></RequirePermission>`), which evaluates the user's role/permission array and hides elements they are not authorized to use, enforcing front-end RBAC reflecting the backend matrix.
