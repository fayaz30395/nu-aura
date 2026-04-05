import {apiClient} from '@/lib/api/client';

export interface ReportRequest {
  startDate?: string;
  endDate?: string;
  departmentIds?: string[];
  employeeIds?: string[];
  employeeStatus?: string;
  attendanceStatus?: string;
  leaveStatus?: string;
  leaveTypeId?: string;
  payrollRunId?: string;
  reviewCycleId?: string;
  format: 'EXCEL' | 'PDF' | 'CSV';
}

export type ReportType =
  | 'employee-directory'
  | 'attendance'
  | 'department-headcount'
  | 'leave'
  | 'payroll'
  | 'performance';

class ReportService {
  async downloadEmployeeReport(request: ReportRequest): Promise<void> {
    await this.downloadReport('employee-directory', request, 'employee-directory');
  }

  async downloadAttendanceReport(request: ReportRequest): Promise<void> {
    if (!request.startDate || !request.endDate) {
      throw new Error('Start date and end date are required for attendance report');
    }
    await this.downloadReport('attendance', request, 'attendance-report');
  }

  async downloadDepartmentReport(request: ReportRequest): Promise<void> {
    await this.downloadReport('department-headcount', request, 'department-headcount');
  }

  async downloadLeaveReport(request: ReportRequest): Promise<void> {
    await this.downloadReport('leave', request, 'leave-report');
  }

  async downloadPayrollReport(request: ReportRequest): Promise<void> {
    await this.downloadReport('payroll', request, 'payroll-report');
  }

  async downloadPerformanceReport(request: ReportRequest): Promise<void> {
    await this.downloadReport('performance', request, 'performance-report');
  }

  private async downloadReport(endpoint: string, request: ReportRequest, filename: string): Promise<void> {
    try {
      const response = await apiClient.post<Blob>(
        `/reports/${endpoint}`,
        request,
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const blob = new Blob([response.data], {
        type: this.getContentType(request.format),
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.${this.getExtension(request.format)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'EXCEL':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'PDF':
        return 'application/pdf';
      case 'CSV':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }

  private getExtension(format: string): string {
    switch (format) {
      case 'EXCEL':
        return 'xlsx';
      case 'PDF':
        return 'pdf';
      case 'CSV':
        return 'csv';
      default:
        return 'xlsx';
    }
  }
}

export const reportService = new ReportService();
