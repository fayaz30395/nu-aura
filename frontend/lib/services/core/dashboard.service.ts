import {apiClient} from '../../api/client';
import {
  EmployeeDashboardData,
  ExecutiveDashboardData,
  ManagerDashboardResponse,
  ManagerTeamProjectsResponse
} from '../../types/core/dashboard';

class DashboardService {
  /**
   * Get Executive Dashboard Data
   * Fetches comprehensive C-suite metrics, financial data, strategic insights, and workforce summary
   */
  async getExecutiveDashboard(): Promise<ExecutiveDashboardData | null> {
    try {
      const response = await apiClient.get<ExecutiveDashboardData>('/dashboards/executive');
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get Executive Dashboard Data with custom date range
   */
  async getExecutiveDashboardByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ExecutiveDashboardData> {
    const response = await apiClient.get<ExecutiveDashboardData>('/dashboards/executive', {
      params: {startDate, endDate},
    });
    return response.data;
  }

  /**
   * Get Employee Dashboard Data
   * Fetches employee-specific dashboard data including attendance, leaves, career progress, and events
   */
  async getEmployeeDashboard(): Promise<EmployeeDashboardData | null> {
    try {
      const response = await apiClient.get<EmployeeDashboardData>('/dashboards/employee');
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get Employee Dashboard Data for a specific employee
   */
  async getEmployeeDashboardById(employeeId: string): Promise<EmployeeDashboardData> {
    const response = await apiClient.get<EmployeeDashboardData>(`/dashboards/employee/${employeeId}`);
    return response.data;
  }

  /**
   * Get Manager Dashboard Data
   * Fetches team-specific insights including attendance, leave, performance, and action items
   */
  async getManagerDashboard(): Promise<ManagerDashboardResponse | null> {
    try {
      const response = await apiClient.get<ManagerDashboardResponse>('/dashboards/manager');
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get Manager Dashboard Data for a specific manager
   * Admin-only: View any manager's team dashboard
   */
  async getManagerDashboardById(managerId: string): Promise<ManagerDashboardResponse> {
    const response = await apiClient.get<ManagerDashboardResponse>(`/dashboards/manager/${managerId}`);
    return response.data;
  }

  /**
   * Get Team Projects & Allocations for the current manager
   * Shows what each direct report is working on with allocation percentages
   */
  async getManagerTeamProjects(): Promise<ManagerTeamProjectsResponse | null> {
    try {
      const response = await apiClient.get<ManagerTeamProjectsResponse>('/dashboards/manager/team-projects');
      return response.data;
    } catch {
      return null;
    }
  }
}

export const dashboardService = new DashboardService();
