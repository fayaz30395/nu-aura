'use client';

import {useMutation} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {ReportRequest, reportService, ReportType} from '@/lib/services/core/report.service';

const downloadFns: Record<ReportType, (req: ReportRequest) => Promise<void>> = {
  'employee-directory': (req) => reportService.downloadEmployeeReport(req),
  'attendance': (req) => reportService.downloadAttendanceReport(req),
  'department-headcount': (req) => reportService.downloadDepartmentReport(req),
  'leave': (req) => reportService.downloadLeaveReport(req),
  'payroll': (req) => reportService.downloadPayrollReport(req),
  'performance': (req) => reportService.downloadPerformanceReport(req),
};

export function useReportDownload() {
  return useMutation<void, Error, { type: ReportType; request: ReportRequest }>({
    mutationFn: ({type, request}) => {
      const fn = downloadFns[type];
      if (!fn) throw new Error(`Unknown report type: ${type}`);
      return fn(request);
    },
    onError: (error) => {
      notifications.show({
        title: 'Download Failed',
        message: error.message || 'Failed to download report',
        color: 'red',
      });
    },
  });
}
