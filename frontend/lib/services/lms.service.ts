import { apiClient } from '../api/client';

export interface Course {
  id: string;
  tenantId: string;
  title: string;
  code?: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationHours?: number;
  passingScore: number;
  maxAttempts: number;
  isMandatory: boolean;
  isSelfPaced: boolean;
  instructorName?: string;
  totalEnrollments: number;
  avgRating?: number;
  totalRatings: number;
  modules?: CourseModule[];
  createdAt: string;
  updatedAt?: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderIndex: number;
  durationMinutes?: number;
  isMandatory: boolean;
  contents?: ModuleContent[];
}

export interface ModuleContent {
  id: string;
  moduleId: string;
  title: string;
  contentType: 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'SCORM' | 'EXTERNAL_LINK';
  orderIndex: number;
  durationMinutes?: number;
  videoUrl?: string;
  documentUrl?: string;
  textContent?: string;
  isMandatory: boolean;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  employeeId: string;
  status: 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED';
  enrolledAt: string;
  startedAt?: string;
  completedAt?: string;
  progressPercentage: number;
  lastAccessedAt?: string;
  quizScore?: number;
  certificateId?: string;
}

export interface ContentProgress {
  id: string;
  enrollmentId: string;
  contentId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  progressPercentage: number;
  timeSpentSeconds: number;
  completedAt?: string;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  courseId: string;
  courseTitle: string;
  employeeId: string;
  employeeName?: string;
  issuedAt: string;
  expiryDate?: string;
  isActive: boolean;
  scoreAchieved?: number;
}

export interface CourseRequest {
  title: string;
  code?: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  difficultyLevel?: string;
  durationHours?: number;
  passingScore?: number;
  maxAttempts?: number;
  isMandatory?: boolean;
  isSelfPaced?: boolean;
  instructorName?: string;
}

export interface LmsDashboard {
  totalEnrollments: number;
  inProgress: number;
  completed: number;
  averageProgress: number;
  certificatesEarned: number;
  recentEnrollments: CourseEnrollment[];
}

export interface SkillGapReport {
  employeeName: string;
  department: string;
  gaps: GapDetail[];
}

export interface GapDetail {
  skillName: string;
  requiredLevel: number;
  currentLevel: number;
  gapLevel: 'CRITICAL' | 'MODERATE' | 'LOW';
  recommendedCourses: SuggestedCourse[];
}

export interface SuggestedCourse {
  courseId: string;
  title: string;
  difficulty: string;
}

export interface CourseCatalogResponse {
  courses: CourseSummaryDto[];
}

export interface CourseSummaryDto {
  id: string;
  title: string;
  code: string;
  shortDescription: string;
  thumbnailUrl: string;
  difficultyLevel: string;
  durationHours: number;
  skillsCovered: string[];
  isMandatory: boolean;
  totalEnrollments: number;
  avgRating: number;
}

class LmsService {
  async createCourse(data: CourseRequest): Promise<Course> {
    const response = await apiClient.post<Course>('/lms/courses', data);
    return response.data;
  }

  async getCourses(page: number = 0, size: number = 20, search?: string): Promise<{ content: Course[], totalElements: number }> {
    const response = await apiClient.get<{ content: Course[], totalElements: number }>('/lms/courses', { params: { page, size, search } });
    return response.data;
  }

  async getPublishedCourses(page: number = 0, size: number = 20): Promise<{ content: Course[], totalElements: number }> {
    const response = await apiClient.get<{ content: Course[], totalElements: number }>('/lms/courses/published', { params: { page, size } });
    return response.data;
  }

  async getCourse(id: string): Promise<Course> {
    const response = await apiClient.get<Course>(`/lms/courses/${id}`);
    return response.data;
  }

  async updateCourse(id: string, data: CourseRequest): Promise<Course> {
    const response = await apiClient.put<Course>(`/lms/courses/${id}`, data);
    return response.data;
  }

  async publishCourse(id: string): Promise<void> {
    await apiClient.post(`/lms/courses/${id}/publish`);
  }

  async archiveCourse(id: string): Promise<void> {
    await apiClient.post(`/lms/courses/${id}/archive`);
  }

  async deleteCourse(id: string): Promise<void> {
    await apiClient.delete(`/lms/courses/${id}`);
  }

  async enrollSelf(courseId: string): Promise<CourseEnrollment> {
    const response = await apiClient.post<CourseEnrollment>(`/lms/courses/${courseId}/enroll`);
    return response.data;
  }

  /**
   * Retrieve all enrollments for the currently authenticated employee.
   * Calls GET /api/v1/lms/my-courses (CourseEnrollmentController).
   */
  async getMyEnrollments(): Promise<CourseEnrollment[]> {
    const response = await apiClient.get<CourseEnrollment[]>('/lms/my-courses');
    return response.data;
  }

  async getEnrollment(courseId: string): Promise<CourseEnrollment> {
    const response = await apiClient.get<CourseEnrollment>(`/lms/enrollments/${courseId}`);
    return response.data;
  }

  /**
   * Update the progress percentage of an enrollment directly.
   * Calls PUT /api/v1/lms/enrollments/{enrollmentId}/progress
   * with body { progressPercent: number }.
   */
  async updateEnrollmentProgress(enrollmentId: string, progressPercent: number): Promise<CourseEnrollment> {
    const response = await apiClient.put<CourseEnrollment>(
      `/lms/enrollments/${enrollmentId}/progress`,
      { progressPercent }
    );
    return response.data;
  }

  /**
   * Update content-level progress (existing fine-grained tracking).
   */
  async updateProgress(enrollmentId: string, contentId: string, status: string, timeSpentSeconds?: number): Promise<ContentProgress> {
    const response = await apiClient.post<ContentProgress>(
      `/lms/progress/${enrollmentId}/content/${contentId}`,
      null,
      { params: { status, timeSpentSeconds } }
    );
    return response.data;
  }

  async getMyCertificates(): Promise<Certificate[]> {
    const response = await apiClient.get<Certificate[]>('/lms/my-certificates');
    return response.data;
  }

  async verifyCertificate(certificateNumber: string): Promise<Certificate> {
    const response = await apiClient.get<Certificate>(`/lms/certificates/verify/${certificateNumber}`);
    return response.data;
  }

  async getMyDashboard(): Promise<LmsDashboard> {
    const response = await apiClient.get<LmsDashboard>('/lms/dashboard');
    return response.data;
  }

  async getAdminDashboard(): Promise<any> {
    const response = await apiClient.get('/lms/admin/dashboard');
    return response.data;
  }

  async getSkillGaps(employeeId: string): Promise<SkillGapReport> {
    const response = await apiClient.get<SkillGapReport>(`/lms/employees/${employeeId}/skill-gaps`);
    return response.data;
  }

  async getCatalog(page: number = 0, size: number = 10): Promise<CourseCatalogResponse> {
    const response = await apiClient.get<CourseCatalogResponse>('/lms/catalog', { params: { page, size } });
    return response.data;
  }

  async enrollEmployee(courseId: string, employeeId: string): Promise<void> {
    await apiClient.post(`/lms/courses/${courseId}/enroll`, null, { params: { employeeId } });
  }
}

export const lmsService = new LmsService();
