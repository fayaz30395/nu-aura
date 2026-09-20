# RV-2FZ4618VMNHH: Replaced hardcoded zero/empty placeholder data in ScheduledReportExecutionJob.generateReport() with real tenant-wide aggregation, reusing the same repository query methods ReportService already uses (no new query logic invented): ATTENDANCE builds presentDays/absentDays/lateDays/totalHours + per-record rows from AttendanceRecordRepository.findAllByTenantIdAndAttendanceDateBetween (matches ReportService.generateAttendanceReport's source query); LEAVE builds balances (grouped by leave type via LeaveBalanceRepository.findAllByTenantIdAndYear) + history (LeaveRequestRepository.findByTenantIdAndStartDateBetween, same query ReportService.generateLeaveReport uses); default analytics branch delegates to the existing AnalyticsService.getAnalyticsSummary() (same source as the live dashboard) instead of hardcoded zeros. No test existed for this job (grepped first, confirmed absent). mvn compile clean.

> **Story:** US-2FZ3WP130FT7
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
