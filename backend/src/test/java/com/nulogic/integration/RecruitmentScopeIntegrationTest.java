package com.nulogic.integration;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.attendance.OfficeLocation;
import com.nulogic.domain.employee.Department;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.recruitment.Candidate;
import com.nulogic.domain.recruitment.Interview;
import com.nulogic.domain.recruitment.JobOpening;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.attendance.repository.OfficeLocationRepository;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.recruitment.repository.CandidateRepository;
import com.nulogic.infrastructure.recruitment.repository.InterviewRepository;
import com.nulogic.infrastructure.recruitment.repository.JobOpeningRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Recruitment RBAC Scope Integration Tests")
class RecruitmentScopeIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final String BASE_URL = "/api/v1/recruitment";
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    private UUID currentEmployeeId;
    private UUID reporteeEmployeeId;
    private UUID otherEmployeeId;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JobOpeningRepository jobOpeningRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private InterviewRepository interviewRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private OfficeLocationRepository officeLocationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private JobOpening selfJobOpening;
    private JobOpening reporteeJobOpening;
    private JobOpening otherJobOpening;
    private Candidate selfCandidate;
    private Candidate reporteeCandidate;
    private Candidate otherCandidate;
    private Interview selfInterview;
    private Interview reporteeInterview;
    private Interview otherInterview;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);

        currentEmployeeId = UUID.randomUUID();
        reporteeEmployeeId = UUID.randomUUID();
        otherEmployeeId = UUID.randomUUID();

        createEmployee(currentEmployeeId, "CURRENT", null, null);
        createEmployee(reporteeEmployeeId, "REPORTEE", null, null);
        createEmployee(otherEmployeeId, "OTHER", null, null);

        selfJobOpening = createJobOpening(currentEmployeeId, "JOB-SELF", JobOpening.JobStatus.OPEN);
        reporteeJobOpening = createJobOpening(reporteeEmployeeId, "JOB-TEAM", JobOpening.JobStatus.OPEN);
        otherJobOpening = createJobOpening(otherEmployeeId, "JOB-OTHER", JobOpening.JobStatus.CLOSED);

        selfCandidate = createCandidate(selfJobOpening.getId(), currentEmployeeId, "CAND-SELF");
        reporteeCandidate = createCandidate(reporteeJobOpening.getId(), reporteeEmployeeId, "CAND-TEAM");
        otherCandidate = createCandidate(otherJobOpening.getId(), otherEmployeeId, "CAND-OTHER");

        selfInterview = createInterview(selfJobOpening.getId(), selfCandidate.getId(), currentEmployeeId);
        reporteeInterview = createInterview(reporteeJobOpening.getId(), reporteeCandidate.getId(), reporteeEmployeeId);
        otherInterview = createInterview(otherJobOpening.getId(), otherCandidate.getId(), otherEmployeeId);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    // ==================== SELF Scope Tests ====================

    private JobOpening createJobOpening(UUID hiringManagerId, String jobCode, JobOpening.JobStatus status) {
        return createJobOpening(hiringManagerId, jobCode, status, UUID.randomUUID());
    }

    // ==================== TEAM Scope Tests ====================

    private JobOpening createJobOpening(UUID hiringManagerId, String jobCode, JobOpening.JobStatus status,
                                        UUID departmentId) {
        ensureDepartment(departmentId);

        JobOpening jobOpening = new JobOpening();
        jobOpening.setId(UUID.randomUUID());
        jobOpening.setTenantId(TENANT_ID);
        jobOpening.setJobCode(jobCode);
        jobOpening.setJobTitle("Engineer " + jobCode);
        jobOpening.setDepartmentId(departmentId);
        jobOpening.setLocation("HQ");
        jobOpening.setEmploymentType(JobOpening.EmploymentType.FULL_TIME);
        jobOpening.setStatus(status);
        jobOpening.setHiringManagerId(hiringManagerId);
        jobOpening.setPostedDate(LocalDate.now());
        jobOpening.setIsActive(true);
        return jobOpeningRepository.save(jobOpening);
    }

    // ==================== CUSTOM Scope Tests ====================

    private Candidate createCandidate(UUID jobOpeningId, UUID assignedRecruiterId, String code) {
        Candidate candidate = new Candidate();
        candidate.setId(UUID.randomUUID());
        candidate.setTenantId(TENANT_ID);
        candidate.setCandidateCode(code);
        candidate.setJobOpeningId(jobOpeningId);
        candidate.setFirstName("Test");
        candidate.setLastName(code);
        candidate.setEmail(code.toLowerCase() + "@example.com");
        candidate.setStatus(Candidate.CandidateStatus.NEW);
        candidate.setCurrentStage(Candidate.RecruitmentStage.PANEL_REVIEW);
        candidate.setAssignedRecruiterId(assignedRecruiterId);
        candidate.setAppliedDate(LocalDate.now());
        return candidateRepository.save(candidate);
    }

    // ==================== ALL Scope Tests ====================

    private Interview createInterview(UUID jobOpeningId, UUID candidateId, UUID interviewerId) {
        Interview interview = new Interview();
        interview.setId(UUID.randomUUID());
        interview.setTenantId(TENANT_ID);
        interview.setJobOpeningId(jobOpeningId);
        interview.setCandidateId(candidateId);
        interview.setInterviewerId(interviewerId);
        interview.setInterviewRound(Interview.InterviewRound.SCREENING);
        interview.setInterviewType(Interview.InterviewType.VIDEO);
        interview.setStatus(Interview.InterviewStatus.SCHEDULED);
        return interviewRepository.save(interview);
    }

    // ==================== LOCATION Scope Tests ====================

    private Employee createEmployee(String employeeCodePrefix, UUID locationId, UUID departmentId) {
        return createEmployee(UUID.randomUUID(), employeeCodePrefix, locationId, departmentId);
    }

    private Employee createEmployee(UUID employeeId, String employeeCodePrefix, UUID locationId, UUID departmentId) {
        UUID id = employeeId == null ? UUID.randomUUID() : employeeId;
        ensureOfficeLocation(locationId);
        ensureDepartment(departmentId);

        User user = User.builder()
                .email(employeeCodePrefix.toLowerCase() + "-" + id.toString().substring(0, 8) + "@example.com")
                .firstName("Test")
                .lastName("User")
                .passwordHash("test-hash")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(TENANT_ID);
        User savedUser = userRepository.saveAndFlush(user);

        Employee employee = Employee.builder()
                .employeeCode(employeeCodePrefix + "-" + UUID.randomUUID().toString().substring(0, 6))
                .firstName("Test")
                .lastName("Employee")
                .joiningDate(LocalDate.now().minusDays(30))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .officeLocationId(locationId)
                .departmentId(departmentId)
                .user(savedUser)
                .build();
        employee.setTenantId(TENANT_ID);

        jdbcTemplate.update("""
                        INSERT INTO employees (
                            id, tenant_id, employee_code, user_id, first_name, last_name,
                            joining_date, department_id, office_location_id, employment_type,
                            status, created_at, updated_at, version, is_deleted
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0, false)
                        ON CONFLICT (id) DO NOTHING
                        """,
                id,
                TENANT_ID,
                employee.getEmployeeCode(),
                savedUser.getId(),
                employee.getFirstName(),
                employee.getLastName(),
                employee.getJoiningDate(),
                departmentId,
                locationId,
                employee.getEmploymentType().name(),
                employee.getStatus().name());

        return employeeRepository.findByIdAndTenantId(id, TENANT_ID).orElseThrow();
    }

    private void ensureDepartment(UUID departmentId) {
        if (departmentId == null || departmentRepository.existsById(departmentId)) {
            return;
        }

        Department department = Department.builder()
                .code("DEPT-" + departmentId.toString().substring(0, 8))
                .name("Department " + departmentId.toString().substring(0, 8))
                .isActive(true)
                .build();
        jdbcTemplate.update("""
                        INSERT INTO departments (
                            id, tenant_id, code, name, is_active, created_at, updated_at, version, is_deleted
                        )
                        VALUES (?, ?, ?, ?, true, NOW(), NOW(), 0, false)
                        ON CONFLICT (id) DO NOTHING
                        """,
                departmentId,
                TENANT_ID,
                department.getCode(),
                department.getName());
    }

    private void ensureOfficeLocation(UUID locationId) {
        if (locationId == null || officeLocationRepository.existsById(locationId)) {
            return;
        }

        OfficeLocation location = OfficeLocation.builder()
                .locationCode("LOC-" + locationId.toString().substring(0, 8))
                .locationName("Location " + locationId.toString().substring(0, 8))
                .latitude(BigDecimal.ZERO)
                .longitude(BigDecimal.ZERO)
                .geofenceRadiusMeters(100)
                .isActive(true)
                .build();
        jdbcTemplate.update("""
                        INSERT INTO office_locations (
                            id, tenant_id, location_code, location_name, latitude, longitude,
                            geofence_radius_meters, is_active, created_at, updated_at, version, is_deleted
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, true, NOW(), NOW(), 0, false)
                        ON CONFLICT (id) DO NOTHING
                        """,
                locationId,
                TENANT_ID,
                location.getLocationCode(),
                location.getLocationName(),
                location.getLatitude(),
                location.getLongitude(),
                location.getGeofenceRadiusMeters());
    }

    // ==================== DEPARTMENT Scope Tests ====================

    private void setupScope(RoleScope scope, UUID employeeId, Set<UUID> reporteeIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.RECRUITMENT_VIEW, scope);
        permissions.put(Permission.CANDIDATE_VIEW, scope);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("USER"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);

        if (reporteeIds != null && !reporteeIds.isEmpty()) {
            SecurityContext.setAllReporteeIds(reporteeIds);
        }
    }

    // ==================== Helper Methods ====================

    private void setupCustomScope(UUID employeeId, Set<UUID> customEmployeeIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.RECRUITMENT_VIEW, RoleScope.CUSTOM);
        permissions.put(Permission.CANDIDATE_VIEW, RoleScope.CUSTOM);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("CUSTOM_ROLE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);

        SecurityContext.setCustomScopeTargets(Permission.RECRUITMENT_VIEW,
                customEmployeeIds, Collections.emptySet(), Collections.emptySet());
        SecurityContext.setCustomScopeTargets(Permission.CANDIDATE_VIEW,
                customEmployeeIds, Collections.emptySet(), Collections.emptySet());
    }

    private void setupLocationScope(UUID employeeId, Set<UUID> locationIds) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.RECRUITMENT_VIEW, RoleScope.LOCATION);
        permissions.put(Permission.CANDIDATE_VIEW, RoleScope.LOCATION);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("LOCATION_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
        SecurityContext.setCurrentLocationIds(locationIds);
    }

    private void setupDepartmentScope(UUID employeeId, UUID departmentId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.RECRUITMENT_VIEW, RoleScope.DEPARTMENT);
        permissions.put(Permission.CANDIDATE_VIEW, RoleScope.DEPARTMENT);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("DEPT_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
        SecurityContext.setOrgContext(null, departmentId, null);
    }

    @Nested
    @DisplayName("SELF Scope Tests")
    class SelfScopeTests {

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Can access own job opening")
        void selfCanAccessOwnJobOpening() throws Exception {
            setupScope(RoleScope.SELF, currentEmployeeId, Collections.emptySet());

            mockMvc.perform(get(BASE_URL + "/job-openings/" + selfJobOpening.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(selfJobOpening.getId().toString()));
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Cannot access other job opening")
        void selfCannotAccessOtherJobOpening() throws Exception {
            setupScope(RoleScope.SELF, currentEmployeeId, Collections.emptySet());

            mockMvc.perform(get(BASE_URL + "/job-openings/" + otherJobOpening.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Lists only own job openings")
        void selfListsOwnJobOpenings() throws Exception {
            setupScope(RoleScope.SELF, currentEmployeeId, Collections.emptySet());

            mockMvc.perform(get(BASE_URL + "/job-openings")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Can access own candidate and interview")
        void selfCanAccessOwnCandidateAndInterview() throws Exception {
            setupScope(RoleScope.SELF, currentEmployeeId, Collections.emptySet());

            mockMvc.perform(get(BASE_URL + "/candidates/" + selfCandidate.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(selfCandidate.getId().toString()));

            mockMvc.perform(get(BASE_URL + "/interviews/" + selfInterview.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(selfInterview.getId().toString()));
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Cannot access other candidate or interview")
        void selfCannotAccessOtherCandidateOrInterview() throws Exception {
            setupScope(RoleScope.SELF, currentEmployeeId, Collections.emptySet());

            mockMvc.perform(get(BASE_URL + "/candidates/" + otherCandidate.getId()))
                    .andExpect(status().isForbidden());

            mockMvc.perform(get(BASE_URL + "/interviews/" + otherInterview.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Filters job openings by status")
        void selfFiltersJobOpeningsByStatus() throws Exception {
            setupScope(RoleScope.SELF, currentEmployeeId, Collections.emptySet());

            mockMvc.perform(get(BASE_URL + "/job-openings/status/OPEN")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));
        }

        @Test
        @WithMockUser(username = "employee@test.com", roles = {"EMPLOYEE"})
        @DisplayName("SELF scope: Lists candidates by job opening with scope filtering")
        void selfListsCandidatesByJobOpening() throws Exception {
            setupScope(RoleScope.SELF, currentEmployeeId, Collections.emptySet());

            mockMvc.perform(get(BASE_URL + "/candidates/job-opening/" + selfJobOpening.getId())
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            mockMvc.perform(get(BASE_URL + "/candidates/job-opening/" + otherJobOpening.getId())
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(0));
        }
    }

    @Nested
    @DisplayName("TEAM Scope Tests")
    class TeamScopeTests {

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Can access reportee job opening and candidate")
        void teamCanAccessReporteeJobOpeningAndCandidate() throws Exception {
            setupScope(RoleScope.TEAM, currentEmployeeId, Set.of(reporteeEmployeeId));

            mockMvc.perform(get(BASE_URL + "/job-openings/" + reporteeJobOpening.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeJobOpening.getId().toString()));

            mockMvc.perform(get(BASE_URL + "/candidates/" + reporteeCandidate.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeCandidate.getId().toString()));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Lists own + reportee job openings")
        void teamListsOwnAndReporteeJobOpenings() throws Exception {
            setupScope(RoleScope.TEAM, currentEmployeeId, Set.of(reporteeEmployeeId));

            mockMvc.perform(get(BASE_URL + "/job-openings")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(2));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Filters job openings by status")
        void teamFiltersJobOpeningsByStatus() throws Exception {
            setupScope(RoleScope.TEAM, currentEmployeeId, Set.of(reporteeEmployeeId));

            mockMvc.perform(get(BASE_URL + "/job-openings/status/OPEN")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(2));
        }

        @Test
        @WithMockUser(username = "manager@test.com", roles = {"MANAGER"})
        @DisplayName("TEAM scope: Cannot access non-reportee candidate")
        void teamCannotAccessNonReporteeCandidate() throws Exception {
            setupScope(RoleScope.TEAM, currentEmployeeId, Set.of(reporteeEmployeeId));

            mockMvc.perform(get(BASE_URL + "/candidates/" + otherCandidate.getId()))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("CUSTOM Scope Tests")
    class CustomScopeTests {

        @Test
        @WithMockUser(username = "custom@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Can access custom target job opening and candidate")
        void customCanAccessCustomTargetData() throws Exception {
            setupCustomScope(currentEmployeeId, Set.of(reporteeEmployeeId));

            mockMvc.perform(get(BASE_URL + "/job-openings/" + reporteeJobOpening.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeJobOpening.getId().toString()));

            mockMvc.perform(get(BASE_URL + "/candidates/" + reporteeCandidate.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reporteeCandidate.getId().toString()));
        }

        @Test
        @WithMockUser(username = "custom@test.com", roles = {"CUSTOM_ROLE"})
        @DisplayName("CUSTOM scope: Cannot access non-target job opening")
        void customCannotAccessNonTargetJobOpening() throws Exception {
            setupCustomScope(currentEmployeeId, Set.of(reporteeEmployeeId));

            mockMvc.perform(get(BASE_URL + "/job-openings/" + otherJobOpening.getId()))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("ALL Scope Tests")
    class AllScopeTests {

        @Test
        @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
        @DisplayName("ALL scope: Can access all recruitment data")
        void allCanAccessAllData() throws Exception {
            setupScope(RoleScope.ALL, currentEmployeeId, Collections.emptySet());

            mockMvc.perform(get(BASE_URL + "/job-openings")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(3));

            mockMvc.perform(get(BASE_URL + "/candidates")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(3));

            mockMvc.perform(get(BASE_URL + "/interviews/candidate/" + otherCandidate.getId())
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));
        }
    }

    @Nested
    @DisplayName("LOCATION Scope Tests")
    class LocationScopeTests {

        @Test
        @WithMockUser(username = "locationadmin@test.com", roles = {"LOCATION_ADMIN"})
        @DisplayName("LOCATION scope: Can access recruitment data for employees in same location")
        void locationCanAccessRecruitmentData() throws Exception {
            UUID locationId = UUID.randomUUID();
            Employee hiringManager = createEmployee("LOC-HM", locationId, null);
            Employee recruiter = createEmployee("LOC-REC", locationId, null);
            Employee interviewer = createEmployee("LOC-INT", locationId, null);

            JobOpening locationJob = createJobOpening(hiringManager.getId(), "JOB-LOC", JobOpening.JobStatus.OPEN);
            Candidate locationCandidate = createCandidate(locationJob.getId(), recruiter.getId(), "CAND-LOC");
            Interview locationInterview = createInterview(locationJob.getId(), locationCandidate.getId(), interviewer.getId());

            setupLocationScope(currentEmployeeId, Set.of(locationId));

            mockMvc.perform(get(BASE_URL + "/job-openings/" + locationJob.getId()))
                    .andExpect(status().isOk());

            mockMvc.perform(get(BASE_URL + "/candidates/" + locationCandidate.getId()))
                    .andExpect(status().isOk());

            mockMvc.perform(get(BASE_URL + "/interviews/" + locationInterview.getId()))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("DEPARTMENT Scope Tests")
    class DepartmentScopeTests {

        @Test
        @WithMockUser(username = "deptadmin@test.com", roles = {"DEPT_ADMIN"})
        @DisplayName("DEPARTMENT scope: Can access recruitment data for employees in same department")
        void departmentCanAccessRecruitmentData() throws Exception {
            UUID departmentId = UUID.randomUUID();
            Employee hiringManager = createEmployee("DEPT-HM", null, departmentId);
            Employee recruiter = createEmployee("DEPT-REC", null, departmentId);
            Employee interviewer = createEmployee("DEPT-INT", null, departmentId);

            JobOpening deptJob = createJobOpening(hiringManager.getId(), "JOB-DEPT", JobOpening.JobStatus.OPEN, departmentId);
            Candidate deptCandidate = createCandidate(deptJob.getId(), recruiter.getId(), "CAND-DEPT");
            Interview deptInterview = createInterview(deptJob.getId(), deptCandidate.getId(), interviewer.getId());

            setupDepartmentScope(currentEmployeeId, departmentId);

            mockMvc.perform(get(BASE_URL + "/job-openings/" + deptJob.getId()))
                    .andExpect(status().isOk());

            mockMvc.perform(get(BASE_URL + "/candidates/" + deptCandidate.getId()))
                    .andExpect(status().isOk());

            mockMvc.perform(get(BASE_URL + "/interviews/" + deptInterview.getId()))
                    .andExpect(status().isOk());
        }

        @Test
        @WithMockUser(username = "deptadmin@test.com", roles = {"DEPT_ADMIN"})
        @DisplayName("DEPARTMENT scope: Filters job openings by status")
        void departmentFiltersJobOpeningsByStatus() throws Exception {
            UUID departmentId = UUID.randomUUID();
            Employee hiringManager = createEmployee("DEPT-HM-2", null, departmentId);
            createJobOpening(hiringManager.getId(), "JOB-DEPT-OPEN", JobOpening.JobStatus.OPEN, departmentId);
            createJobOpening(hiringManager.getId(), "JOB-DEPT-CLOSED", JobOpening.JobStatus.CLOSED, departmentId);

            setupDepartmentScope(currentEmployeeId, departmentId);

            mockMvc.perform(get(BASE_URL + "/job-openings/status/OPEN")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));
        }
    }
}
