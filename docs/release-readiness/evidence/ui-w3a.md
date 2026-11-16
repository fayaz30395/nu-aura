# UI Wave 3 batch A (W3-01 to W3-04)

- W3-01 DONE: MobileNavDrawer dialog label set to "Navigation" (aria-current, close button label already present); new MobileNavDrawer.test.tsx (4 cases) + PersistentShell.test.tsx pass (17/17).
- W3-02 NO-OP: `check-styling-drift.mjs --json` shows 0 icon-button-no-label findings under app/me/**.
- W3-03 NO-OP: same check shows 0 icon-button-no-label findings under app/leave/** and app/attendance/**.
- W3-04 SKIPPED (needs decision): spec asks for `Button variant="light"`, which does not exist in components/ui/Button.tsx (valid: primary, secondary, outline, ghost, soft, ...). Choose the variant (e.g. `soft`) and confirm.
- W3-04 DONE: PayslipCard download uses Button variant="soft" size="xs" with aria-label and data-testid="payslip-download" (isLoading kept, the Button prop for loading); page.tsx shows toast.error('Payslip PDF is empty, contact HR') on 0-byte blob and skips the save. Checks: app/me/payslips vitest 15/15 pass including new 0-byte case; tsc shows no payslip errors.
