import {apiClient} from '../../api/client';
import {Department, Employee, Page} from '../../types/hrms/employee';
import {Project} from '../../types/hrms/project';
import {FluenceSearchResponse, FluenceSearchResult} from '../../types/platform/fluence';

export interface SearchResult {
  id: string;
  type: 'employee' | 'project' | 'department' | 'wiki' | 'blog' | 'template';
  title: string;
  subtitle: string;
  href: string;
  metadata?: Record<string, string>;
}

export interface UnifiedSearchResponse {
  employees: SearchResult[];
  projects: SearchResult[];
  departments: SearchResult[];
  total: number;
}

export interface FluenceUnifiedSearchResponse {
  wikiPages: SearchResult[];
  blogPosts: SearchResult[];
  templates: SearchResult[];
  total: number;
}

class SearchService {
  /**
   * Unified search across multiple entities
   * Searches employees, projects, and departments in parallel
   */
  async unifiedSearch(query: string, limit: number = 5): Promise<UnifiedSearchResponse> {
    if (!query || query.trim().length < 2) {
      return {employees: [], projects: [], departments: [], total: 0};
    }

    const [employeesResult, projectsResult, departmentsResult] = await Promise.allSettled([
      this.searchEmployees(query, limit),
      this.searchProjects(query, limit),
      this.searchDepartments(query, limit),
    ]);

    const employees = employeesResult.status === 'fulfilled' ? employeesResult.value : [];
    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value : [];
    const departments = departmentsResult.status === 'fulfilled' ? departmentsResult.value : [];

    return {
      employees,
      projects,
      departments,
      total: employees.length + projects.length + departments.length,
    };
  }

  /**
   * Search employees and transform to SearchResult format
   */
  async searchEmployees(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const response = await apiClient.get<Page<Employee>>('/employees', {
        params: {search: query, page: 0, size: limit},
      });

      return response.data.content.map((emp) => ({
        id: emp.id,
        type: 'employee' as const,
        title: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        subtitle: emp.designation || 'Employee',
        href: `/employees/${emp.id}`,
        metadata: {
          email: emp.workEmail || '',
          employeeCode: emp.employeeCode || '',
          department: emp.departmentName || '',
        },
      }));
    } catch (error) {
      console.error('Employee search failed:', error);
      return [];
    }
  }

  /**
   * Search projects and transform to SearchResult format
   */
  async searchProjects(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const response = await apiClient.get<Page<Project>>('/projects/search', {
        params: {query, page: 0, size: limit},
      });

      return response.data.content.map((project) => ({
        id: project.id,
        type: 'project' as const,
        title: project.name,
        subtitle: project.status || 'Project',
        href: `/projects/${project.id}`,
        metadata: {
          code: project.projectCode || '',
          status: project.status || '',
        },
      }));
    } catch (error) {
      console.error('Project search failed:', error);
      return [];
    }
  }

  /**
   * Search departments and transform to SearchResult format
   */
  async searchDepartments(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const response = await apiClient.get<Page<Department>>('/departments/search', {
        params: {query, page: 0, size: limit},
      });

      return response.data.content.map((dept) => ({
        id: dept.id,
        type: 'department' as const,
        title: dept.name,
        subtitle: dept.code || 'Department',
        href: `/departments/${dept.id}`,
        metadata: {
          code: dept.code || '',
          employeeCount: String(dept.employeeCount || 0),
        },
      }));
    } catch (error) {
      console.error('Department search failed:', error);
      return [];
    }
  }

  /**
   * Search NU-Fluence content (wiki pages, blog posts, templates)
   * Used by GlobalSearch when the active app is FLUENCE
   */
  async searchFluenceContent(query: string, limit: number = 5): Promise<FluenceUnifiedSearchResponse> {
    if (!query || query.trim().length < 2) {
      return {wikiPages: [], blogPosts: [], templates: [], total: 0};
    }

    try {
      const response = await apiClient.get<FluenceSearchResponse>('/fluence/search', {
        params: {query, page: 0, size: limit},
      });

      const results = response.data.results || [];

      const mapResult = (item: FluenceSearchResult): SearchResult => {
        const hrefMap: Record<string, string> = {
          wiki: `/fluence/wiki/${item.id}`,
          blog: `/fluence/blogs/${item.id}`,
          template: `/fluence/templates/${item.id}`,
        };

        return {
          id: item.id,
          type: item.type,
          title: item.title,
          subtitle: item.excerpt || item.type.charAt(0).toUpperCase() + item.type.slice(1),
          href: item.url || hrefMap[item.type] || `/fluence/search?q=${encodeURIComponent(query)}`,
          metadata: {
            author: item.author || '',
            updatedAt: item.updatedAt || '',
          },
        };
      };

      const wikiPages = results.filter((r) => r.type === 'wiki').map(mapResult);
      const blogPosts = results.filter((r) => r.type === 'blog').map(mapResult);
      const templates = results.filter((r) => r.type === 'template').map(mapResult);

      return {
        wikiPages,
        blogPosts,
        templates,
        total: wikiPages.length + blogPosts.length + templates.length,
      };
    } catch (error) {
      console.error('Fluence search failed:', error);
      return {wikiPages: [], blogPosts: [], templates: [], total: 0};
    }
  }
}

export const searchService = new SearchService();
