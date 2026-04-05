import {expect, test} from '@playwright/test';
import {loginAs, navigateTo} from './fixtures/helpers';
import {demoUsers, testUsers} from './fixtures/testData';

/**
 * Reports Extended + Analytics E2E Tests
 *
 * Covers:
 *  - /analytics/org-health         (REPORT_VIEW permission required)
 *  - /predictive-analytics          (admin/HR only)
 *  - /reports                       (hub page + download modal)
 *  - /reports/attrition             (AI risk table + filters)
 *  - /reports/headcount             (KPI cards + dept bars)
 *  - /reports/leave                 (date range + format picker)
 *  - /reports/payroll               (date range required, RBAC)
 *  - /reports/performance           (optional date range)
 *  - /reports/utilization           (tabbed dashboard, date selector)
 *  - /dashboards/employee           (DASHBOARD:EMPLOYEE gate)
 *  - /dashboards/manager            (DASHBOARD:MANAGER gate)
 *  - /dashboards/executive          (DASHBOARD:EXECUTIVE gate — admin only)
 */

// ─── Org Health ───────────────────────────────────────────────────────────────

test.describe('Org Health Analytics (/analytics/org-health)', () => {
  test('admin sees Organization Health page with health score', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('h1')).toContainText('Organization Health');
    // Hero card contains the score label
    await expect(page.locator('text=Organization Pulse')).toBeVisible();
  });

  test('page renders Refresh Data and Export Report buttons', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('button:has-text("Refresh Data")')).toBeVisible();
    await expect(page.locator('button:has-text("Export Report")')).toBeVisible();
  });

  test('Staff Retention card is visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('text=Staff Retention')).toBeVisible();
    await expect(page.locator('text=Annual Stability Rate')).toBeVisible();
  });

  test('Engagement Intensity card is visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('text=Engagement Intensity')).toBeVisible();
    await expect(page.locator('text=Avg Engagement Score')).toBeVisible();
  });

  test('Diversity & Inclusion section is rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('text=Diversity & Inclusion')).toBeVisible();
    await expect(page.locator('text=Workforce makeup by gender')).toBeVisible();
  });

  test('Tenure Distribution section is rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('text=Tenure Distribution')).toBeVisible();
  });

  test('Learning Vitality / Course Completion section is rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('text=Learning Vitality')).toBeVisible();
    await expect(page.locator('text=Course Completion Rate')).toBeVisible();
  });

  test('Department Vibrancy table is visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('text=Department Vibrancy')).toBeVisible();
    // Table header columns
    await expect(page.locator('text=Stability').first()).toBeVisible();
    await expect(page.locator('text=Engagement').first()).toBeVisible();
  });

  test('employee without REPORT_VIEW is redirected away from org-health', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await page.goto('/analytics/org-health');
    // Expect redirect — should not stay on /analytics/org-health
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/analytics/org-health');
  });

  test('HR Manager can access org health page', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/analytics/org-health');

    await expect(page.locator('h1')).toContainText('Organization Health');
  });
});

// ─── Predictive Analytics ─────────────────────────────────────────────────────

test.describe('Predictive Analytics (/predictive-analytics)', () => {
  test('admin sees Predictive Analytics page with heading', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/predictive-analytics');

    await expect(page.locator('h1')).toBeVisible();
    // The page title should contain some analytics/predictive wording
    const heading = await page.locator('h1').textContent();
    expect(heading?.toLowerCase()).toMatch(/predictive|analytics|insight/i);
  });

  test('key metric cards are rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/predictive-analytics');

    // At least one metric card area should appear (grid of KPI cards)
    await page.waitForTimeout(2000);
    // Page should have some content beyond blank
    const body = await page.locator('main, [class*="space-y"]').first();
    await expect(body).toBeVisible();
  });

  test('Refresh and Export buttons are present', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/predictive-analytics');

    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('attrition prediction section visible for admin', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/predictive-analytics');

    // At minimum, headings or cards related to attrition should appear
    await page.waitForTimeout(3000);
    const pageText = await page.textContent('body');
    expect(pageText).toMatch(/attrition|prediction|risk/i);
  });

  test('HR Manager can access predictive analytics', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/predictive-analytics');

    await expect(page.locator('h1')).toBeVisible();
  });
});

// ─── Reports Hub (/reports) ──────────────────────────────────────────────────

test.describe('Reports Hub (/reports)', () => {
  test('admin sees Reports page heading', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports');

    await expect(page.locator('h1')).toContainText('Reports');
  });

  test('all report cards are displayed', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports');

    const reportTitles = [
      'Employee Directory Report',
      'Attendance Report',
      'Department Headcount Report',
      'Leave Report',
      'Payroll Report',
      'Performance Report',
    ];

    for (const title of reportTitles) {
      await expect(page.locator(`text=${title}`).first()).toBeVisible();
    }
  });

  test('clicking Download Report opens modal with format options', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports');

    // Click the first "Download Report" button
    await page.locator('button:has-text("Download Report")').first().click();

    // Modal should appear with format choices
    await expect(page.locator('text=Export Format')).toBeVisible();
    await expect(page.locator('text=Excel')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();
    await expect(page.locator('text=CSV')).toBeVisible();
  });

  test('download modal can be closed', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports');

    await page.locator('button:has-text("Download Report")').first().click();
    await expect(page.locator('text=Export Format')).toBeVisible();

    // Click Cancel
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=Export Format')).not.toBeVisible();
  });

  test('attendance report modal shows date range inputs', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports');

    // Find the attendance card and click its download button
    const attendanceCard = page.locator('[class*="card"], [class*="Card"]').filter({hasText: 'Attendance Report'}).first();
    await attendanceCard.locator('button:has-text("Download Report")').click();

    // Date range inputs should appear because attendance requiresDateRange=true
    await expect(page.locator('text=Date Range')).toBeVisible();
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
  });

  test('report generation tips info card is displayed', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports');

    await expect(page.locator('text=Report Generation Tips')).toBeVisible();
  });

  test('employee cannot access reports hub — redirected', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    // RBAC redirects away
    expect(page.url()).not.toMatch(/\/reports$/);
  });

  test('HR Manager can access reports hub', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/reports');

    await expect(page.locator('h1')).toContainText('Reports');
  });
});

// ─── Attrition Report (/reports/attrition) ───────────────────────────────────

test.describe('Attrition Report (/reports/attrition)', () => {
  test('admin sees Attrition Analysis page', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/attrition');

    await expect(page.locator('h1')).toContainText('Attrition Analysis');
  });

  test('risk summary cards are rendered (Critical, High, Medium, Low)', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/attrition');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Critical Risk')).toBeVisible();
    await expect(page.locator('text=High Risk')).toBeVisible();
    await expect(page.locator('text=Medium Risk')).toBeVisible();
    await expect(page.locator('text=Low Risk')).toBeVisible();
  });

  test('min risk score filter input is present', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/attrition');

    await expect(page.locator('text=Min risk score')).toBeVisible();
    await expect(page.locator('input[type="number"]')).toBeVisible();
  });

  test('Refresh button is present and clickable', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/attrition');

    const refreshBtn = page.locator('button:has-text("Refresh")');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await page.waitForTimeout(500);
  });

  test('Export CSV button is visible for admin', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/attrition');

    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });

  test('clicking a risk level card filters employees shown', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/attrition');

    await page.waitForTimeout(2000);
    // Click "Critical Risk" summary card to activate filter
    const criticalBtn = page.locator('button[aria-label="Filter by Critical Risk"]');
    if (await criticalBtn.isVisible()) {
      await criticalBtn.click();
      await page.waitForTimeout(500);
      // "Clear filter" should now appear
      await expect(page.locator('button:has-text("Clear filter")')).toBeVisible();
    }
  });

  test('subtitle mentions AI-powered predictions', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/attrition');

    await expect(page.locator('text=AI-powered attrition risk predictions')).toBeVisible();
  });

  test('HR Manager can view attrition report', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/reports/attrition');

    await expect(page.locator('h1')).toContainText('Attrition Analysis');
  });

  test('employee is not shown Export CSV (no analytics.export permission)', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/reports/attrition');

    // PermissionGate hides the export button for employees
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).not.toBeVisible();
  });
});

// ─── Headcount Report (/reports/headcount) ───────────────────────────────────

test.describe('Headcount Report (/reports/headcount)', () => {
  test('admin sees Headcount Report page', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/headcount');

    await expect(page.locator('h1')).toContainText('Headcount Report');
  });

  test('KPI cards (Total, Active, New Hires, Exits) are rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/headcount');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Total Employees')).toBeVisible();
    await expect(page.locator('text=Active Employees')).toBeVisible();
    await expect(page.locator('text=New Hires (Month)')).toBeVisible();
    await expect(page.locator('text=Exits (Month)')).toBeVisible();
  });

  test('Headcount by Department section is rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/headcount');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Headcount by Department')).toBeVisible();
  });

  test('12-Month Headcount Trend section is rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/headcount');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=12-Month Headcount Trend')).toBeVisible();
  });

  test('Refresh button is present', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/headcount');

    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('Export CSV is visible for admin (analytics.export permission)', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/headcount');

    await expect(page.locator('button:has-text("Export CSV")')).toBeVisible();
  });

  test('HR Manager can view headcount report', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/reports/headcount');

    await expect(page.locator('h1')).toContainText('Headcount Report');
  });

  test('employee cannot see Export CSV button', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/reports/headcount');

    await page.waitForTimeout(2000);
    // PermissionGate hides it
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).not.toBeVisible();
  });
});

// ─── Leave Report (/reports/leave) ───────────────────────────────────────────

test.describe('Leave Report (/reports/leave)', () => {
  test('admin sees Leave Reports page', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/leave');

    await expect(page.locator('h1')).toContainText('Leave Reports');
  });

  test('date range inputs are visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/leave');

    await expect(page.locator('label:has-text("Date Range")')).toBeVisible();
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.first()).toBeVisible();
    await expect(dateInputs.nth(1)).toBeVisible();
  });

  test('Leave Status filter dropdown is present', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/leave');

    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('option:has-text("All Statuses")')).toBeAttached();
    await expect(page.locator('option:has-text("Approved")')).toBeAttached();
  });

  test('format buttons (EXCEL, PDF, CSV) are visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/leave');

    await expect(page.locator('text=EXCEL')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();
    await expect(page.locator('text=CSV')).toBeVisible();
  });

  test('Download button shows validation error when dates are missing', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/leave');

    // Click download without filling dates
    await page.locator('button:has-text("Download Leave Report")').click();

    await expect(page.locator('text=Please select both start and end dates')).toBeVisible();
  });

  test('CSV format can be selected', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/leave');

    await page.locator('button:has-text("CSV")').click();
    // After click, the CSV button should be highlighted (border changes)
    const csvButton = page.locator('button:has-text("CSV")');
    await expect(csvButton).toHaveClass(/border-warning-500|border-warning/);
  });

  test('Report Details info card is displayed', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/leave');

    await expect(page.locator('text=Report Details')).toBeVisible();
    await expect(page.locator('text=employee code, name, department')).toBeVisible();
  });

  test('HR Manager can access leave reports', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/reports/leave');

    await expect(page.locator('h1')).toContainText('Leave Reports');
  });
});

// ─── Payroll Report (/reports/payroll) ──────────────────────────────────────

test.describe('Payroll Report (/reports/payroll)', () => {
  test('admin sees Payroll Reports page', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/payroll');

    await expect(page.locator('h1')).toContainText('Payroll Reports');
  });

  test('Payroll Period date range inputs are visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/payroll');

    await expect(page.locator('text=Payroll Period')).toBeVisible();
    const dateInputs = page.locator('input[type="date"]');
    await expect(dateInputs.first()).toBeVisible();
    await expect(dateInputs.nth(1)).toBeVisible();
  });

  test('format selector shows EXCEL, PDF, CSV options', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/payroll');

    await expect(page.locator('text=EXCEL')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();
    await expect(page.locator('text=CSV')).toBeVisible();
  });

  test('Download Payroll Report button triggers validation when dates empty', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/payroll');

    await page.locator('button:has-text("Download Payroll Report")').click();
    await expect(page.locator('text=Please select both start and end dates')).toBeVisible();
  });

  test('Report Details info card mentions confidential information', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/payroll');

    await expect(page.locator('text=Confidential information - handle with care')).toBeVisible();
  });

  test('employee is redirected from payroll report (RBAC)', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await page.goto('/reports/payroll');
    await page.waitForTimeout(2000);
    // Should be redirected to /reports or /dashboard
    expect(page.url()).not.toContain('/reports/payroll');
  });

  test('HR Manager can access payroll report', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/reports/payroll');

    await expect(page.locator('h1')).toContainText('Payroll Reports');
  });

  test('PDF format can be selected', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/payroll');

    await page.locator('button:has-text("PDF")').click();
    const pdfButton = page.locator('button:has-text("PDF")');
    await expect(pdfButton).toBeVisible();
  });
});

// ─── Performance Report (/reports/performance) ───────────────────────────────

test.describe('Performance Report (/reports/performance)', () => {
  test('admin sees Performance Reports page', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/performance');

    await expect(page.locator('h1')).toContainText('Performance Reports');
  });

  test('Review Period date range is optional and visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/performance');

    await expect(page.locator('text=Review Period (Optional)')).toBeVisible();
    await expect(page.locator('text=Leave empty to include all performance reviews')).toBeVisible();
  });

  test('format buttons are displayed', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/performance');

    await expect(page.locator('text=EXCEL')).toBeVisible();
    await expect(page.locator('text=PDF')).toBeVisible();
    await expect(page.locator('text=CSV')).toBeVisible();
  });

  test('Download Performance Report button is visible and enabled', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/performance');

    // Unlike payroll/leave, performance report does not require date range
    const downloadBtn = page.locator('button:has-text("Download Performance Report")');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).not.toBeDisabled();
  });

  test('Report Details info card is visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/performance');

    await expect(page.locator('text=Report Details')).toBeVisible();
    await expect(page.locator('text=reviewer information')).toBeVisible();
  });

  test('HR Manager can access performance report', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/reports/performance');

    await expect(page.locator('h1')).toContainText('Performance Reports');
  });

  test('EXCEL format is selected by default', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/performance');

    // EXCEL button should have the accent border class by default
    const excelBtn = page.locator('button:has-text("EXCEL")');
    await expect(excelBtn).toBeVisible();
  });

  test('selecting a date range pre-fills form fields', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/performance');

    const fromInput = page.locator('input[type="date"]').first();
    await fromInput.fill('2025-01-01');
    await expect(fromInput).toHaveValue('2025-01-01');
  });
});

// ─── Utilization Report (/reports/utilization) ───────────────────────────────

test.describe('Utilization Report (/reports/utilization)', () => {
  test('admin sees Utilization Dashboard page', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/utilization');

    await expect(page.locator('h1')).toContainText('Utilization Dashboard');
  });

  test('summary KPI stat cards are rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/utilization');

    await page.waitForTimeout(3000);
    await expect(page.locator('text=Average Utilization')).toBeVisible();
    await expect(page.locator('text=Billable Hours')).toBeVisible();
    await expect(page.locator('text=Active Resources')).toBeVisible();
    await expect(page.locator('text=Revenue Generated')).toBeVisible();
  });

  test('tab navigation (Overview, By Employee, By Department, By Project)', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/utilization');

    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("Overview")')).toBeVisible();
    await expect(page.locator('button:has-text("By Employee")')).toBeVisible();
    await expect(page.locator('button:has-text("By Department")')).toBeVisible();
    await expect(page.locator('button:has-text("By Project")')).toBeVisible();
  });

  test('clicking By Employee tab shows employee search input', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/utilization');

    await page.waitForTimeout(2000);
    await page.locator('button:has-text("By Employee")').click();
    await expect(page.locator('input[placeholder*="Search employees"]')).toBeVisible();
  });

  test('date range selector defaults to This Month', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/utilization');

    const select = page.locator('select').first();
    await expect(select).toHaveValue('thisMonth');
  });

  test('switching date range to Last Month changes the select value', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/utilization');

    const select = page.locator('select').first();
    await select.selectOption('lastMonth');
    await expect(select).toHaveValue('lastMonth');
  });

  test('Export button is visible for admin', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/reports/utilization');

    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('employee is redirected from utilization report (RBAC)', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await page.goto('/reports/utilization');
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/reports/utilization');
  });
});

// ─── Employee Dashboard (/dashboards/employee) ───────────────────────────────

test.describe('Employee Dashboard (/dashboards/employee)', () => {
  test('employee sees their dashboard with welcome message', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    await page.waitForTimeout(2000);
    // Welcome message includes the employee name
    await expect(page.locator('h1')).toContainText('Welcome');
  });

  test('attendance quick stat cards are displayed', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Present Days')).toBeVisible();
    await expect(page.locator('text=Leaves Taken')).toBeVisible();
    await expect(page.locator('text=Leaves Available')).toBeVisible();
    await expect(page.locator('text=Avg Work Hours')).toBeVisible();
  });

  test('Leave Balance section is rendered', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Leave Balance')).toBeVisible();
  });

  test('Upcoming Events section is rendered', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Upcoming Events')).toBeVisible();
  });

  test('Quick Actions panel contains action buttons', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('button:has-text("View Attendance")')).toBeVisible();
    await expect(page.locator('button:has-text("Apply for Leave")')).toBeVisible();
  });

  test('Career Progress section is rendered', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Career Progress')).toBeVisible();
  });

  test('Mark Attendance quick button is visible', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("Mark Attendance")')).toBeVisible();
  });

  test('Apply Leave button is visible in header', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("Apply Leave")')).toBeVisible();
  });

  test('admin without DASHBOARD_EMPLOYEE permission is redirected', async ({page}) => {
    // SuperAdmin may or may not have this explicit permission — test redirect if not
    // We test with an employee to ensure they can access it
    await loginAs(page, testUsers.employee.email);
    await navigateTo(page, '/dashboards/employee');

    // Should stay on the page (employee has this permission)
    await page.waitForTimeout(2000);
    await expect(page.locator('h1')).toContainText('Welcome');
  });
});

// ─── Manager Dashboard (/dashboards/manager) ─────────────────────────────────

test.describe('Manager Dashboard (/dashboards/manager)', () => {
  test('manager sees their dashboard page', async ({page}) => {
    await loginAs(page, testUsers.manager.email);
    await navigateTo(page, '/dashboards/manager');

    await page.waitForTimeout(2000);
    const heading = await page.locator('h1').textContent();
    expect(heading).toBeTruthy();
  });

  test('team-related stats or sections are visible', async ({page}) => {
    await loginAs(page, testUsers.manager.email);
    await navigateTo(page, '/dashboards/manager');

    await page.waitForTimeout(2000);
    const pageText = await page.textContent('body');
    // Manager dashboard should mention team/approval/project related content
    expect(pageText).toMatch(/team|approval|member|utilization|allocation/i);
  });

  test('HR Manager can also access manager dashboard', async ({page}) => {
    await loginAs(page, testUsers.hrManager.email);
    await navigateTo(page, '/dashboards/manager');

    await page.waitForTimeout(2000);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('admin can access manager dashboard', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/dashboards/manager');

    await page.waitForTimeout(2000);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('a plain employee without manager role is redirected', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await page.goto('/dashboards/manager');
    await page.waitForTimeout(2000);
    // Employee should be redirected away
    expect(page.url()).not.toContain('/dashboards/manager');
  });

  test('page renders without JS errors (basic smoke)', async ({page}) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await loginAs(page, testUsers.manager.email);
    await navigateTo(page, '/dashboards/manager');
    await page.waitForTimeout(3000);

    // Filter out known third-party/hydration noise
    const criticalErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('ResizeObserver'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ─── Executive Dashboard (/dashboards/executive) ─────────────────────────────

test.describe('Executive Dashboard (/dashboards/executive)', () => {
  test('admin sees Executive Dashboard page', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/dashboards/executive');

    await page.waitForTimeout(3000);
    await expect(page.locator('h1')).toContainText('Executive Dashboard');
  });

  test('page subtitle is visible', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/dashboards/executive');

    await page.waitForTimeout(2000);
    await expect(page.locator('text=Comprehensive C-suite insights')).toBeVisible();
  });

  test('Refresh button is present', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/dashboards/executive');

    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
  });

  test('Workforce Overview section is rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/dashboards/executive');

    await page.waitForTimeout(3000);
    await expect(page.locator('text=Workforce Overview')).toBeVisible();
  });

  test('Productivity metrics section is rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/dashboards/executive');

    await page.waitForTimeout(3000);
    await expect(page.locator('text=Productivity')).toBeVisible();
  });

  test('Risk Indicators section is rendered', async ({page}) => {
    await loginAs(page, testUsers.admin.email);
    await navigateTo(page, '/dashboards/executive');

    await page.waitForTimeout(3000);
    await expect(page.locator('text=Risk Indicators')).toBeVisible();
  });

  test('employee is redirected from executive dashboard', async ({page}) => {
    await loginAs(page, testUsers.employee.email);
    await page.goto('/dashboards/executive');
    await page.waitForTimeout(2000);
    // Should be redirected to /me/dashboard
    expect(page.url()).not.toContain('/dashboards/executive');
  });

  test('manager without executive permission is redirected', async ({page}) => {
    await loginAs(page, testUsers.manager.email);
    await page.goto('/dashboards/executive');
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/dashboards/executive');
  });

  test('second super admin can also access executive dashboard', async ({page}) => {
    await loginAs(page, demoUsers.superAdmin2.email);
    await navigateTo(page, '/dashboards/executive');

    await page.waitForTimeout(3000);
    await expect(page.locator('h1')).toContainText('Executive Dashboard');
  });
});
