import {apiClient} from '../../api/client';
import {
  EmployeeUtilization,
  MonthlyTimeReport,
  ProjectTimeReport,
  TimeEntry,
  TimeSummaryReport,
  UtilizationDashboardData,
  UtilizationFilterOptions,
  UtilizationReport,
  WeeklyTimeReport,
} from '@/lib/types/hrms/utilization';

interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/**
 * DEV-4 feature flag: the aggregated utilization endpoints
 * (`/reports/dashboard`, `/reports/utilization`, `/reports/export`) have NO
 * backend mapping anywhere — only per-employee/per-project reports exist on
 * ProjectTimesheetController (`/project-timesheets/reports/...`). The
 * /reports/utilization page is hidden behind this flag until they ship.
 */
export const UTILIZATION_DASHBOARD_API_AVAILABLE = false;

export const utilizationService = {
  // DEV-4: real backend routes live on ProjectTimesheetController under
  // /project-timesheets/reports/... — not /time-tracking/reports/...
  // Get utilization report for an employee
  async getEmployeeUtilization(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<UtilizationReport> {
    const response = await apiClient.get<UtilizationReport>(
      `/project-timesheets/reports/employee/${employeeId}/utilization`,
      {params: {startDate, endDate}}
    );
    return response.data;
  },

  // Get time summary for an employee
  async getEmployeeTimeSummary(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<TimeSummaryReport> {
    const response = await apiClient.get<TimeSummaryReport>(
      `/project-timesheets/reports/employee/${employeeId}/summary`,
      {params: {startDate, endDate}}
    );
    return response.data;
  },

  // Get weekly time report for an employee
  async getWeeklyReport(
    employeeId: string,
    weekStartDate: string
  ): Promise<WeeklyTimeReport> {
    const response = await apiClient.get<WeeklyTimeReport>(
      `/project-timesheets/reports/employee/${employeeId}/weekly`,
      {params: {weekStartDate}}
    );
    return response.data;
  },

  // Get monthly time report for an employee
  async getMonthlyReport(
    employeeId: string,
    year: number,
    month: number
  ): Promise<MonthlyTimeReport> {
    const response = await apiClient.get<MonthlyTimeReport>(
      `/project-timesheets/reports/employee/${employeeId}/monthly`,
      {params: {year: year.toString(), month: month.toString()}}
    );
    return response.data;
  },

  // Get project time report
  async getProjectTimeReport(
    projectId: string,
    startDate: string,
    endDate: string
  ): Promise<ProjectTimeReport> {
    const response = await apiClient.get<ProjectTimeReport>(
      `/project-timesheets/reports/project/${projectId}`,
      {params: {startDate, endDate}}
    );
    return response.data;
  },

  // STUB: no backend mapping — gated by UTILIZATION_DASHBOARD_API_AVAILABLE.
  // Get utilization dashboard data (aggregated)
  async getDashboardData(
    filters: UtilizationFilterOptions
  ): Promise<UtilizationDashboardData> {
    const params: Record<string, string> = {};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.projectId) params.projectId = filters.projectId;

    const response = await apiClient.get<UtilizationDashboardData>(
      `/time-tracking/reports/dashboard`,
      {params}
    );
    return response.data;
  },

  // STUB: no backend mapping — gated by UTILIZATION_DASHBOARD_API_AVAILABLE.
  // Get all employees utilization for a period
  async getAllEmployeesUtilization(
    startDate: string,
    endDate: string,
    page: number = 0,
    size: number = 20
  ): Promise<PageResponse<EmployeeUtilization>> {
    const response = await apiClient.get<PageResponse<EmployeeUtilization>>(
      `/time-tracking/reports/utilization`,
      {params: {startDate, endDate, page: page.toString(), size: size.toString()}}
    );
    return response.data;
  },

  // Get time entries for reporting
  async getTimeEntries(
    filters: {
      employeeId?: string;
      projectId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
    page: number = 0,
    size: number = 20
  ): Promise<PageResponse<TimeEntry>> {
    const params: Record<string, string> = {
      page: page.toString(),
      size: size.toString(),
    };
    if (filters.employeeId) params.employeeId = filters.employeeId;
    if (filters.projectId) params.projectId = filters.projectId;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.status) params.status = filters.status;

    const response = await apiClient.get<PageResponse<TimeEntry>>(
      `/time-tracking/entries`,
      {params}
    );
    return response.data;
  },

  // STUB: no backend mapping — gated by UTILIZATION_DASHBOARD_API_AVAILABLE.
  // Export utilization report
  async exportReport(
    format: 'csv' | 'excel' | 'pdf',
    filters: UtilizationFilterOptions
  ): Promise<Blob> {
    const params: Record<string, string> = {format};
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.departmentId) params.departmentId = filters.departmentId;
    if (filters.projectId) params.projectId = filters.projectId;

    const response = await apiClient.get<Blob>(
      '/time-tracking/reports/export',
      {
        params,
        responseType: 'blob',
      }
    );
    return response.data;
  },
};

// Helper function to calculate date ranges
export const getDateRanges = () => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // This week (Monday to Sunday)
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() + mondayOffset);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  // Last week
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

  // This month
  const thisMonthStart = new Date(currentYear, currentMonth, 1);
  const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0);

  // Last month
  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthEnd = new Date(currentYear, currentMonth, 0);

  // This quarter
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
  const thisQuarterStart = new Date(currentYear, quarterStartMonth, 1);
  const thisQuarterEnd = new Date(currentYear, quarterStartMonth + 3, 0);

  // This year
  const thisYearStart = new Date(currentYear, 0, 1);
  const thisYearEnd = new Date(currentYear, 11, 31);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return {
    thisWeek: {
      label: 'This Week',
      startDate: formatDate(thisWeekStart),
      endDate: formatDate(thisWeekEnd),
    },
    lastWeek: {
      label: 'Last Week',
      startDate: formatDate(lastWeekStart),
      endDate: formatDate(lastWeekEnd),
    },
    thisMonth: {
      label: 'This Month',
      startDate: formatDate(thisMonthStart),
      endDate: formatDate(thisMonthEnd),
    },
    lastMonth: {
      label: 'Last Month',
      startDate: formatDate(lastMonthStart),
      endDate: formatDate(lastMonthEnd),
    },
    thisQuarter: {
      label: 'This Quarter',
      startDate: formatDate(thisQuarterStart),
      endDate: formatDate(thisQuarterEnd),
    },
    thisYear: {
      label: 'This Year',
      startDate: formatDate(thisYearStart),
      endDate: formatDate(thisYearEnd),
    },
  };
};

export default utilizationService;
