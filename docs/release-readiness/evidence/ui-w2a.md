# UI Wave 2 batch A (W2-02, W2-03, W2-04)

- W2-02 Payslips tab: blocked, no code changed. `app/payroll/_components/PayslipsTab.tsx` renders a card grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), not a `<table>`, so the "same migration as W2-01" to `ResponsiveTable` is a layout decision (cards to table). Needs human/design call.
- W2-03 Salary structures tab: blocked, no code changed. `app/payroll/_components/SalaryStructuresTab.tsx` is also a card grid, same open layout question as W2-02.
- W2-04 Payroll overview recent runs: skipped. Depends on the W1-02 gross placeholder, which was skipped (plan D3, needs backend DTO decision). `app/payroll/page.tsx:527` table left as is.

Checks: no source files changed, so tsc/eslint/vitest not run for this batch.
