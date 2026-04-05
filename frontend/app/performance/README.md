# Performance Management Pages

Performance management frontend pages for the NU-AURA platform (NU-Grow sub-app).

## Pages

| Page                          | Route                          | Description                                  |
|-------------------------------|--------------------------------|----------------------------------------------|
| Performance Dashboard         | `/performance`                 | Overview of reviews, goals, team performance |
| Review Cycles                 | `/performance/reviews`         | Create and manage review cycles              |
| Self Assessment               | `/performance/self-assessment` | Employee self-review form                    |
| Manager Review                | `/performance/manager-review`  | Manager evaluation of direct reports         |
| PIP (Performance Improvement) | `/performance/pip`             | Performance improvement plans                |
| Calibration                   | `/performance/calibration`     | Cross-team rating calibration                |
| 9-Box Grid                    | `/performance/9-box`           | Potential vs. performance matrix             |

## Tech Stack

- Next.js 14 App Router
- TypeScript (strict mode)
- Mantine UI + Tailwind CSS
- React Query for data fetching
- React Hook Form + Zod for forms
- Recharts for visualization
- Framer Motion for animations

## Conventions

- All data fetching via React Query hooks in `frontend/lib/hooks/`
- Forms use React Hook Form + Zod validation
- Loading states use `SkeletonTable` / `SkeletonCard` — no plain spinners
- Empty states use `<EmptyState>` component
- 8px spacing grid — no `gap-3`, `p-3`, `p-5` classes
- Colors via CSS variables — no hardcoded hex
