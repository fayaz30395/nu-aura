import {apiClient} from '../../api/client';
import {Department, Employee, Page} from '../../types/hrms/employee';

/**
 * Org-chart specific interfaces.
 *
 * The backend does not expose a dedicated /org-chart endpoint today;
 * we compose the tree client-side from the paginated employee list
 * plus department data.  If a dedicated endpoint is added later,
 * swap `getOrgChartEmployees` to call it.
 */

export interface OrgChartNode {
  employee: Employee;
  children: OrgChartNode[];
  depth: number;
}

export interface OrgChartStats {
  totalEmployees: number;
  totalDepartments: number;
  averageSpanOfControl: number;
  maxDepth: number;
}

class OrgChartService {
  /**
   * Fetch all active employees (paginated, up to `size`).
   * For orgs with > 1000 employees the caller should use
   * lazy-loading via `getSubordinates` instead.
   */
  async getOrgChartEmployees(size: number = 1000): Promise<Employee[]> {
    const response = await apiClient.get<Page<Employee>>('/employees', {
      params: {page: 0, size, sortBy: 'fullName', sortDirection: 'ASC', status: 'ACTIVE'},
    });
    return response.data.content;
  }

  /** Fetch direct subordinates for a given manager (lazy-load). */
  async getSubordinates(managerId: string): Promise<Employee[]> {
    const response = await apiClient.get<Employee[]>(`/employees/${managerId}/subordinates`);
    return response.data;
  }

  /** Fetch active departments for the filter dropdown. */
  async getActiveDepartments(): Promise<Department[]> {
    const response = await apiClient.get<Department[]>('/departments/active');
    return response.data;
  }

  // ── Pure client-side tree-building logic ──────────────────────────

  /**
   * Build a forest of OrgChartNode trees from a flat employee list.
   *
   * Handles:
   * - Circular references (employee is own manager)
   * - Employees whose manager is missing from the list (become roots)
   * - Employees with no managerId (become roots)
   */
  buildTree(employees: Employee[], departmentFilter?: string): OrgChartNode[] {
    let filtered = employees;

    if (departmentFilter) {
      filtered = employees.filter(e => e.departmentId === departmentFilter);
    }

    const idSet = new Set(filtered.map(e => e.id));
    const childrenMap = new Map<string, Employee[]>();

    // Index children by managerId
    for (const emp of filtered) {
      // Guard against circular: employee is own manager
      if (emp.managerId && emp.managerId !== emp.id && idSet.has(emp.managerId)) {
        const siblings = childrenMap.get(emp.managerId) ?? [];
        siblings.push(emp);
        childrenMap.set(emp.managerId, siblings);
      }
    }

    // Roots: no manager, or manager not in filtered set, or self-managed
    const roots = filtered.filter(
      emp => !emp.managerId || emp.managerId === emp.id || !idSet.has(emp.managerId),
    );

    const visited = new Set<string>();

    const build = (emp: Employee, depth: number): OrgChartNode => {
      visited.add(emp.id);
      const kids = (childrenMap.get(emp.id) ?? [])
        .filter(c => !visited.has(c.id)) // prevent cycles
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map(c => build(c, depth + 1));

      return {employee: emp, children: kids, depth};
    };

    return roots
      .sort((a, b) => {
        // Sort roots: CXO first, then by level, then name
        const levelOrder: Record<string, number> = {
          CXO: 0, SVP: 1, VP: 2, DIRECTOR: 3, SENIOR_MANAGER: 4,
          MANAGER: 5, LEAD: 6, SENIOR: 7, MID: 8, ENTRY: 9,
        };
        const aLevel = levelOrder[a.level ?? 'ENTRY'] ?? 9;
        const bLevel = levelOrder[b.level ?? 'ENTRY'] ?? 9;
        if (aLevel !== bLevel) return aLevel - bLevel;
        return a.fullName.localeCompare(b.fullName);
      })
      .map(r => build(r, 0));
  }

  /** Compute summary statistics from a tree. */
  computeStats(
    tree: OrgChartNode[],
    totalEmployees: number,
    departmentCount: number,
  ): OrgChartStats {
    let managersWithReports = 0;
    let totalDirectReports = 0;
    let maxDepth = 0;

    const walk = (node: OrgChartNode) => {
      if (node.depth > maxDepth) maxDepth = node.depth;
      if (node.children.length > 0) {
        managersWithReports++;
        totalDirectReports += node.children.length;
      }
      node.children.forEach(walk);
    };

    tree.forEach(walk);

    return {
      totalEmployees,
      totalDepartments: departmentCount,
      averageSpanOfControl:
        managersWithReports > 0
          ? Math.round((totalDirectReports / managersWithReports) * 10) / 10
          : 0,
      maxDepth: maxDepth + 1, // +1 because root is depth 0
    };
  }

  /** Flatten tree to an array (for search highlighting). */
  flattenTree(tree: OrgChartNode[]): OrgChartNode[] {
    const result: OrgChartNode[] = [];
    const walk = (node: OrgChartNode) => {
      result.push(node);
      node.children.forEach(walk);
    };
    tree.forEach(walk);
    return result;
  }
}

export const orgChartService = new OrgChartService();
