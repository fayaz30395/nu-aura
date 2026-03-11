package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.*;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.recruitment.*;
import com.hrms.domain.user.RoleScope;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.recruitment.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RecruitmentManagementService Tests")
class RecruitmentManagementServiceTest {

    @Mock
    private JobOpeningRepository jobOpeningRepository;

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DataScopeService dataScopeService;

    @Mock
    private com.hrms.application.workflow.service.WorkflowService workflowService;

    @InjectMocks
    private RecruitmentManagementService recruitmentManagementService;

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    private UUID tenantId;
    private UUID jobOpeningId;
    private UUID candidateId;
    private UUID interviewId;
    private UUID departmentId;
    private UUID hiringManagerId;
    private UUID recruiterId;
    private UUID interviewerId;
    private JobOpening jobOpening;
    private Candidate candidate;
    private Interview interview;
    private Employee hiringManager;
    private Employee recruiter;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        jobOpeningId = UUID.randomUUID();
        candidateId = UUID.randomUUID();
        interviewId = UUID.randomUUID();
        departmentId = UUID.randomUUID();
        hiringManagerId = UUID.randomUUID();
        recruiterId = UUID.randomUUID();
        interviewerId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::isSuperAdmin).thenReturn(false);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(hiringManagerId);
        securityContextMock.when(() -> SecurityContext.getPermissionScope(Permission.RECRUITMENT_VIEW_ALL))
                .thenReturn(RoleScope.ALL);

        // Setup job opening
        jobOpening = new JobOpening();
        jobOpening.setId(jobOpeningId);
        jobOpening.setTenantId(tenantId);
        jobOpening.setJobCode("JOB-001");
        jobOpening.setJobTitle("Senior Software Engineer");
        jobOpening.setDepartmentId(departmentId);
        jobOpening.setLocation("Bangalore");
        jobOpening.setEmploymentType(JobOpening.EmploymentType.FULL_TIME);
        jobOpening.setExperienceRequired("5-8 years");
        jobOpening.setMinSalary(new BigDecimal("1500000"));
        jobOpening.setMaxSalary(new BigDecimal("2500000"));
        jobOpening.setNumberOfOpenings(3);
        jobOpening.setJobDescription("We are looking for a senior software engineer");
        jobOpening.setRequirements("Java, Spring Boot, Microservices");
        jobOpening.setSkillsRequired("Java, Spring Boot, AWS");
        jobOpening.setHiringManagerId(hiringManagerId);
        jobOpening.setStatus(JobOpening.JobStatus.OPEN);
        jobOpening.setPostedDate(LocalDate.now());
        jobOpening.setClosingDate(LocalDate.now().plusMonths(1));
        jobOpening.setPriority(JobOpening.Priority.HIGH);
        jobOpening.setIsActive(true);
        jobOpening.setCreatedAt(LocalDateTime.now());
        jobOpening.setUpdatedAt(LocalDateTime.now());

        // Setup candidate
        candidate = new Candidate();
        candidate.setId(candidateId);
        candidate.setTenantId(tenantId);
        candidate.setCandidateCode("CAND-001");
        candidate.setJobOpeningId(jobOpeningId);
        candidate.setFirstName("John");
        candidate.setLastName("Doe");
        candidate.setEmail("john.doe@email.com");
        candidate.setPhone("+91-9876543210");
        candidate.setCurrentLocation("Chennai");
        candidate.setCurrentCompany("Tech Corp");
        candidate.setCurrentDesignation("Software Engineer");
        candidate.setTotalExperience(new BigDecimal("5.5"));
        candidate.setCurrentCtc(new BigDecimal("1200000"));
        candidate.setExpectedCtc(new BigDecimal("1800000"));
        candidate.setNoticePeriodDays(30);
        candidate.setResumeUrl("https://storage.example.com/resumes/john_doe.pdf");
        candidate.setSource(Candidate.CandidateSource.LINKEDIN);
        candidate.setStatus(Candidate.CandidateStatus.NEW);
        candidate.setCurrentStage(Candidate.RecruitmentStage.APPLICATION_RECEIVED);
        candidate.setAppliedDate(LocalDate.now());
        candidate.setNotes("Strong candidate with good experience");
        candidate.setAssignedRecruiterId(recruiterId);
        candidate.setCreatedAt(LocalDateTime.now());
        candidate.setUpdatedAt(LocalDateTime.now());

        // Setup interview
        interview = new Interview();
        interview.setId(interviewId);
        interview.setTenantId(tenantId);
        interview.setCandidateId(candidateId);
        interview.setJobOpeningId(jobOpeningId);
        interview.setInterviewRound(Interview.InterviewRound.TECHNICAL_1);
        interview.setInterviewType(Interview.InterviewType.VIDEO);
        interview.setScheduledAt(LocalDateTime.now().plusDays(3));
        interview.setDurationMinutes(60);
        interview.setInterviewerId(interviewerId);
        interview.setLocation("Google Meet");
        interview.setMeetingLink("https://meet.google.com/abc-defg-hij");
        interview.setStatus(Interview.InterviewStatus.SCHEDULED);
        interview.setCreatedAt(LocalDateTime.now());
        interview.setUpdatedAt(LocalDateTime.now());

        // Setup employees
        hiringManager = new Employee();
        hiringManager.setId(hiringManagerId);
        hiringManager.setFirstName("Jane");
        hiringManager.setLastName("Manager");

        recruiter = new Employee();
        recruiter.setId(recruiterId);
        recruiter.setFirstName("Bob");
        recruiter.setLastName("Recruiter");
    }

    @Nested
    @DisplayName("Job Opening Tests")
    class JobOpeningTests {

        @Test
        @DisplayName("Should create job opening successfully")
        void shouldCreateJobOpeningSuccessfully() {
            JobOpeningRequest request = new JobOpeningRequest();
            request.setJobCode("JOB-002");
            request.setJobTitle("Junior Developer");
            request.setDepartmentId(departmentId);
            request.setLocation("Mumbai");
            request.setEmploymentType(JobOpening.EmploymentType.FULL_TIME);
            request.setExperienceRequired("0-2 years");
            request.setMinSalary(new BigDecimal("500000"));
            request.setMaxSalary(new BigDecimal("800000"));
            request.setNumberOfOpenings(5);
            request.setJobDescription("Entry level developer position");
            request.setStatus(JobOpening.JobStatus.OPEN);
            request.setIsActive(true);

            when(jobOpeningRepository.existsByTenantIdAndJobCode(tenantId, "JOB-002")).thenReturn(false);
            when(jobOpeningRepository.save(any(JobOpening.class))).thenAnswer(invocation -> {
                JobOpening saved = invocation.getArgument(0);
                saved.setCreatedAt(LocalDateTime.now());
                return saved;
            });
            when(candidateRepository.findByTenantIdAndJobOpeningId(any(), any())).thenReturn(List.of());

            JobOpeningResponse result = recruitmentManagementService.createJobOpening(request);

            assertThat(result).isNotNull();
            assertThat(result.getJobCode()).isEqualTo("JOB-002");
            assertThat(result.getJobTitle()).isEqualTo("Junior Developer");
            verify(jobOpeningRepository).save(any(JobOpening.class));
        }

        @Test
        @DisplayName("Should throw exception when job code already exists")
        void shouldThrowExceptionWhenJobCodeExists() {
            JobOpeningRequest request = new JobOpeningRequest();
            request.setJobCode("JOB-001");
            request.setJobTitle("Duplicate Job");

            when(jobOpeningRepository.existsByTenantIdAndJobCode(tenantId, "JOB-001")).thenReturn(true);

            assertThatThrownBy(() -> recruitmentManagementService.createJobOpening(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }

        @Test
        @DisplayName("Should update job opening successfully")
        void shouldUpdateJobOpeningSuccessfully() {
            JobOpeningRequest request = new JobOpeningRequest();
            request.setJobTitle("Updated Senior Developer");
            request.setLocation("Hyderabad");
            request.setStatus(JobOpening.JobStatus.ON_HOLD);

            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(jobOpeningRepository.save(any(JobOpening.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(candidateRepository.findByTenantIdAndJobOpeningId(any(), any())).thenReturn(List.of());

            JobOpeningResponse result = recruitmentManagementService.updateJobOpening(jobOpeningId, request);

            assertThat(result).isNotNull();
            assertThat(result.getJobTitle()).isEqualTo("Updated Senior Developer");
            assertThat(result.getLocation()).isEqualTo("Hyderabad");
        }

        @Test
        @DisplayName("Should throw exception when updating non-existent job opening")
        void shouldThrowExceptionWhenUpdatingNonExistent() {
            UUID invalidId = UUID.randomUUID();
            JobOpeningRequest request = new JobOpeningRequest();

            when(jobOpeningRepository.findByIdAndTenantId(invalidId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> recruitmentManagementService.updateJobOpening(invalidId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get job opening by ID")
        void shouldGetJobOpeningById() {
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(hiringManagerId)).thenReturn(Optional.of(hiringManager));
            when(candidateRepository.findByTenantIdAndJobOpeningId(tenantId, jobOpeningId)).thenReturn(List.of(candidate));

            JobOpeningResponse result = recruitmentManagementService.getJobOpeningById(jobOpeningId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(jobOpeningId);
            assertThat(result.getJobCode()).isEqualTo("JOB-001");
            assertThat(result.getHiringManagerName()).isEqualTo("Jane Manager");
            assertThat(result.getCandidateCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should throw exception when job opening not found by ID")
        void shouldThrowExceptionWhenJobOpeningNotFoundById() {
            UUID invalidId = UUID.randomUUID();

            when(jobOpeningRepository.findByIdAndTenantId(invalidId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> recruitmentManagementService.getJobOpeningById(invalidId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get all job openings with pagination")
        @SuppressWarnings("unchecked")
        void shouldGetAllJobOpeningsWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<JobOpening> page = new PageImpl<>(List.of(jobOpening));

            when(dataScopeService.getScopeSpecification(any())).thenReturn(null);
            when(jobOpeningRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(candidateRepository.findByTenantIdAndJobOpeningId(any(), any())).thenReturn(List.of());

            Page<JobOpeningResponse> result = recruitmentManagementService.getAllJobOpenings(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get job openings by status")
        void shouldGetJobOpeningsByStatus() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<JobOpening> page = new PageImpl<>(List.of(jobOpening));

            when(dataScopeService.getScopeSpecification(any())).thenReturn((root, query, cb) -> cb.conjunction());
            when(jobOpeningRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(candidateRepository.findByTenantIdAndJobOpeningId(any(), any())).thenReturn(List.of());

            Page<JobOpeningResponse> result = recruitmentManagementService
                    .getJobOpeningsByStatus(JobOpening.JobStatus.OPEN, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getStatus()).isEqualTo(JobOpening.JobStatus.OPEN);
        }

        @Test
        @DisplayName("Should delete job opening successfully")
        void shouldDeleteJobOpeningSuccessfully() {
            when(jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId))
                    .thenReturn(Optional.of(jobOpening));
            doNothing().when(jobOpeningRepository).delete(any(JobOpening.class));

            recruitmentManagementService.deleteJobOpening(jobOpeningId);

            verify(jobOpeningRepository).delete(jobOpening);
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent job opening")
        void shouldThrowExceptionWhenDeletingNonExistent() {
            UUID invalidId = UUID.randomUUID();

            when(jobOpeningRepository.findByIdAndTenantId(invalidId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> recruitmentManagementService.deleteJobOpening(invalidId))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Nested
    @DisplayName("Candidate Tests")
    class CandidateTests {

        @Test
        @DisplayName("Should create candidate successfully")
        void shouldCreateCandidateSuccessfully() {
            CandidateRequest request = new CandidateRequest();
            request.setCandidateCode("CAND-002");
            request.setJobOpeningId(jobOpeningId);
            request.setFirstName("Alice");
            request.setLastName("Smith");
            request.setEmail("alice.smith@email.com");
            request.setPhone("+91-9876543211");
            request.setCurrentLocation("Delhi");
            request.setCurrentCompany("IT Solutions");
            request.setCurrentDesignation("Developer");
            request.setTotalExperience(new BigDecimal("3.0"));
            request.setCurrentCtc(new BigDecimal("800000"));
            request.setExpectedCtc(new BigDecimal("1200000"));
            request.setNoticePeriodDays(60);
            request.setSource(Candidate.CandidateSource.JOB_PORTAL);
            request.setStatus(Candidate.CandidateStatus.NEW);
            request.setAppliedDate(LocalDate.now());

            when(candidateRepository.existsByTenantIdAndCandidateCode(tenantId, "CAND-002")).thenReturn(false);
            when(candidateRepository.save(any(Candidate.class))).thenAnswer(invocation -> {
                Candidate saved = invocation.getArgument(0);
                saved.setCreatedAt(LocalDateTime.now());
                return saved;
            });
            when(jobOpeningRepository.findById(jobOpeningId)).thenReturn(Optional.of(jobOpening));

            CandidateResponse result = recruitmentManagementService.createCandidate(request);

            assertThat(result).isNotNull();
            assertThat(result.getCandidateCode()).isEqualTo("CAND-002");
            assertThat(result.getFirstName()).isEqualTo("Alice");
            assertThat(result.getEmail()).isEqualTo("alice.smith@email.com");
            verify(candidateRepository).save(any(Candidate.class));
        }

        @Test
        @DisplayName("Should throw exception when candidate code already exists")
        void shouldThrowExceptionWhenCandidateCodeExists() {
            CandidateRequest request = new CandidateRequest();
            request.setCandidateCode("CAND-001");
            request.setFirstName("Duplicate");
            request.setLastName("Candidate");

            when(candidateRepository.existsByTenantIdAndCandidateCode(tenantId, "CAND-001")).thenReturn(true);

            assertThatThrownBy(() -> recruitmentManagementService.createCandidate(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }

        @Test
        @DisplayName("Should update candidate successfully")
        void shouldUpdateCandidateSuccessfully() {
            CandidateRequest request = new CandidateRequest();
            request.setFirstName("John");
            request.setLastName("Updated");
            request.setEmail("john.updated@email.com");
            request.setStatus(Candidate.CandidateStatus.SCREENING);
            request.setCurrentStage(Candidate.RecruitmentStage.SCREENING);

            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(candidateRepository.save(any(Candidate.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(jobOpeningRepository.findById(any())).thenReturn(Optional.of(jobOpening));

            CandidateResponse result = recruitmentManagementService.updateCandidate(candidateId, request);

            assertThat(result).isNotNull();
            assertThat(result.getLastName()).isEqualTo("Updated");
            assertThat(result.getEmail()).isEqualTo("john.updated@email.com");
        }

        @Test
        @DisplayName("Should throw exception when updating non-existent candidate")
        void shouldThrowExceptionWhenUpdatingNonExistentCandidate() {
            UUID invalidId = UUID.randomUUID();
            CandidateRequest request = new CandidateRequest();

            when(candidateRepository.findByIdAndTenantId(invalidId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> recruitmentManagementService.updateCandidate(invalidId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get candidate by ID")
        void shouldGetCandidateById() {
            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId)).thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(recruiterId)).thenReturn(Optional.of(recruiter));

            CandidateResponse result = recruitmentManagementService.getCandidateById(candidateId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(candidateId);
            assertThat(result.getFullName()).isEqualTo("John Doe");
            assertThat(result.getJobTitle()).isEqualTo("Senior Software Engineer");
            assertThat(result.getAssignedRecruiterName()).isEqualTo("Bob Recruiter");
        }

        @Test
        @DisplayName("Should throw exception when candidate not found by ID")
        void shouldThrowExceptionWhenCandidateNotFoundById() {
            UUID invalidId = UUID.randomUUID();

            when(candidateRepository.findByIdAndTenantId(invalidId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> recruitmentManagementService.getCandidateById(invalidId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get all candidates with pagination")
        @SuppressWarnings("unchecked")
        void shouldGetAllCandidatesWithPagination() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Candidate> page = new PageImpl<>(List.of(candidate));

            when(dataScopeService.getScopeSpecification(any())).thenReturn(null);
            when(candidateRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(jobOpeningRepository.findById(any())).thenReturn(Optional.of(jobOpening));

            Page<CandidateResponse> result = recruitmentManagementService.getAllCandidates(pageable);

            assertThat(result).isNotNull();
            assertThat(result.getContent()).hasSize(1);
        }

        @Test
        @DisplayName("Should get candidates by job opening")
        void shouldGetCandidatesByJobOpening() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Candidate> page = new PageImpl<>(List.of(candidate));

            when(dataScopeService.getScopeSpecification(any())).thenReturn((root, query, cb) -> cb.conjunction());
            when(candidateRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(jobOpeningRepository.findById(any())).thenReturn(Optional.of(jobOpening));

            Page<CandidateResponse> result = recruitmentManagementService.getCandidatesByJobOpening(jobOpeningId, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getJobOpeningId()).isEqualTo(jobOpeningId);
        }

        @Test
        @DisplayName("Should delete candidate successfully")
        void shouldDeleteCandidateSuccessfully() {
            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId))
                    .thenReturn(Optional.of(candidate));
            doNothing().when(candidateRepository).delete(any(Candidate.class));

            recruitmentManagementService.deleteCandidate(candidateId);

            verify(candidateRepository).delete(candidate);
        }
    }

    @Nested
    @DisplayName("Interview Tests")
    class InterviewTests {

        @Test
        @DisplayName("Should schedule interview successfully")
        void shouldScheduleInterviewSuccessfully() {
            InterviewRequest request = new InterviewRequest();
            request.setCandidateId(candidateId);
            request.setJobOpeningId(jobOpeningId);
            request.setInterviewRound(Interview.InterviewRound.TECHNICAL_1);
            request.setInterviewType(Interview.InterviewType.VIDEO);
            request.setScheduledAt(LocalDateTime.now().plusDays(5));
            request.setDurationMinutes(60);
            request.setInterviewerId(interviewerId);
            request.setMeetingLink("https://zoom.us/j/123456789");

            when(interviewRepository.save(any(Interview.class))).thenAnswer(invocation -> {
                Interview saved = invocation.getArgument(0);
                saved.setCreatedAt(LocalDateTime.now());
                return saved;
            });
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId)).thenReturn(Optional.of(jobOpening));

            InterviewResponse result = recruitmentManagementService.scheduleInterview(request);

            assertThat(result).isNotNull();
            assertThat(result.getCandidateId()).isEqualTo(candidateId);
            assertThat(result.getInterviewRound()).isEqualTo(Interview.InterviewRound.TECHNICAL_1);
            assertThat(result.getStatus()).isEqualTo(Interview.InterviewStatus.SCHEDULED);
            verify(interviewRepository).save(any(Interview.class));
        }

        @Test
        @DisplayName("Should update interview successfully")
        void shouldUpdateInterviewSuccessfully() {
            InterviewRequest request = new InterviewRequest();
            request.setInterviewRound(Interview.InterviewRound.TECHNICAL_2);
            request.setStatus(Interview.InterviewStatus.COMPLETED);
            request.setFeedback("Great technical skills");
            request.setRating(4);
            request.setResult(Interview.InterviewResult.SELECTED);

            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview));
            when(interviewRepository.save(any(Interview.class))).thenAnswer(invocation -> invocation.getArgument(0));
            when(candidateRepository.findById(any())).thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(any())).thenReturn(Optional.of(jobOpening));

            InterviewResponse result = recruitmentManagementService.updateInterview(interviewId, request);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(Interview.InterviewStatus.COMPLETED);
            assertThat(result.getResult()).isEqualTo(Interview.InterviewResult.SELECTED);
        }

        @Test
        @DisplayName("Should throw exception when updating non-existent interview")
        void shouldThrowExceptionWhenUpdatingNonExistentInterview() {
            UUID invalidId = UUID.randomUUID();
            InterviewRequest request = new InterviewRequest();

            when(interviewRepository.findByIdAndTenantId(invalidId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> recruitmentManagementService.updateInterview(invalidId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get interview by ID")
        void shouldGetInterviewById() {
            Employee interviewer = new Employee();
            interviewer.setId(interviewerId);
            interviewer.setFirstName("Mike");
            interviewer.setLastName("Interviewer");

            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview));
            when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId)).thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId)).thenReturn(Optional.of(interviewer));

            InterviewResponse result = recruitmentManagementService.getInterviewById(interviewId);

            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(interviewId);
            assertThat(result.getCandidateName()).isEqualTo("John Doe");
            assertThat(result.getJobTitle()).isEqualTo("Senior Software Engineer");
            assertThat(result.getInterviewerName()).isEqualTo("Mike Interviewer");
        }

        @Test
        @DisplayName("Should throw exception when interview not found by ID")
        void shouldThrowExceptionWhenInterviewNotFoundById() {
            UUID invalidId = UUID.randomUUID();

            when(interviewRepository.findByIdAndTenantId(invalidId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> recruitmentManagementService.getInterviewById(invalidId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }

        @Test
        @DisplayName("Should get interviews by candidate")
        void shouldGetInterviewsByCandidate() {
            Pageable pageable = PageRequest.of(0, 10);
            Page<Interview> page = new PageImpl<>(List.of(interview));

            when(candidateRepository.findByIdAndTenantId(candidateId, tenantId)).thenReturn(Optional.of(candidate));
            when(dataScopeService.getScopeSpecification(any())).thenReturn((root, query, cb) -> cb.conjunction());
            when(interviewRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
            when(jobOpeningRepository.findById(any())).thenReturn(Optional.of(jobOpening));

            Page<InterviewResponse> result = recruitmentManagementService.getInterviewsByCandidate(candidateId, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getCandidateId()).isEqualTo(candidateId);
        }

        @Test
        @DisplayName("Should delete interview successfully")
        void shouldDeleteInterviewSuccessfully() {
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview));
            doNothing().when(interviewRepository).delete(any(Interview.class));

            recruitmentManagementService.deleteInterview(interviewId);

            verify(interviewRepository).delete(interview);
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent interview")
        void shouldThrowExceptionWhenDeletingNonExistentInterview() {
            UUID invalidId = UUID.randomUUID();

            when(interviewRepository.findByIdAndTenantId(invalidId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> recruitmentManagementService.deleteInterview(invalidId))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
