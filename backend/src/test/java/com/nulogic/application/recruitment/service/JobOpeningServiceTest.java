package com.nulogic.application.recruitment.service;

import com.nulogic.api.recruitment.dto.JobOpeningRequest;
import com.nulogic.api.recruitment.dto.JobOpeningResponse;
import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog.AuditAction;
import com.nulogic.domain.recruitment.JobOpening;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.recruitment.repository.CandidateRepository;
import com.nulogic.infrastructure.recruitment.repository.JobOpeningRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JobOpeningService Tests")
class JobOpeningServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private JobOpeningRepository jobOpeningRepository;
    @Mock
    private CandidateRepository candidateRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DataScopeService dataScopeService;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private TenantTimeService tenantTimeService;
    @InjectMocks
    private JobOpeningService jobOpeningService;

    private UUID tenantId;
    private JobOpeningRequest request;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

        request = new JobOpeningRequest();
        request.setJobTitle("Senior Software Engineer");
        request.setDepartmentId(UUID.randomUUID());
        request.setLocation("Remote");
        request.setNumberOfOpenings(1);
    }

    private void stubResponseMapping() {
        // createJobOpening maps the saved entity through mapToJobOpeningResponse,
        // which needs the candidate list (empty) — hiring manager is null here.
        when(candidateRepository.findByTenantIdAndJobOpeningId(eq(tenantId), any(UUID.class)))
                .thenReturn(List.of());
    }

    @Nested
    @DisplayName("Create Job Opening")
    class CreateJobOpeningTests {

        @Test
        @DisplayName("Should auto-generate a year-prefixed job code when none is provided")
        void shouldAutoGenerateJobCode() {
            when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2025, 6, 1));
            when(jobOpeningRepository.existsByTenantIdAndJobCode(eq(tenantId), anyString()))
                    .thenReturn(false);
            when(jobOpeningRepository.save(any(JobOpening.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            stubResponseMapping();

            JobOpeningResponse result = jobOpeningService.createJobOpening(request);

            assertThat(result.getJobCode()).isEqualTo("JOB-2025-001");
            assertThat(result.getStatus()).isEqualTo(JobOpening.JobStatus.DRAFT);
            assertThat(result.getIsActive()).isTrue();
        }

        @Test
        @DisplayName("Should default status to DRAFT and isActive to true")
        void shouldApplyDefaults() {
            request.setStatus(null);
            request.setIsActive(null);
            when(tenantTimeService.today(tenantId)).thenReturn(LocalDate.of(2025, 6, 1));
            when(jobOpeningRepository.existsByTenantIdAndJobCode(eq(tenantId), anyString()))
                    .thenReturn(false);
            when(jobOpeningRepository.save(any(JobOpening.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            stubResponseMapping();

            JobOpeningResponse result = jobOpeningService.createJobOpening(request);

            assertThat(result.getStatus()).isEqualTo(JobOpening.JobStatus.DRAFT);
            assertThat(result.getIsActive()).isTrue();
        }

        @Test
        @DisplayName("Should disambiguate a colliding job code with a numeric suffix")
        void shouldDisambiguateCollidingJobCode() {
            request.setJobCode("ENG");
            when(jobOpeningRepository.existsByTenantIdAndJobCode(tenantId, "ENG"))
                    .thenReturn(true);
            when(jobOpeningRepository.existsByTenantIdAndJobCode(tenantId, "ENG-2"))
                    .thenReturn(false);
            when(jobOpeningRepository.save(any(JobOpening.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            stubResponseMapping();

            JobOpeningResponse result = jobOpeningService.createJobOpening(request);

            assertThat(result.getJobCode()).isEqualTo("ENG-2");
        }
    }

    @Nested
    @DisplayName("Update Job Opening")
    class UpdateJobOpeningTests {

        @Test
        @DisplayName("Should update fields on an existing job opening")
        void shouldUpdateJobOpening() {
            JobOpening existing = new JobOpening();
            existing.setId(UUID.randomUUID());
            existing.setTenantId(tenantId);
            existing.setJobTitle("Old Title");

            when(jobOpeningRepository.findByIdAndTenantId(existing.getId(), tenantId))
                    .thenReturn(Optional.of(existing));
            when(jobOpeningRepository.save(any(JobOpening.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            stubResponseMapping();

            JobOpeningResponse result = jobOpeningService.updateJobOpening(existing.getId(), request);

            assertThat(result.getJobTitle()).isEqualTo("Senior Software Engineer");
            verify(auditLogService).logAction(
                    eq("JOB_OPENING"), eq(existing.getId()), eq(AuditAction.UPDATE), any(), any(), anyString());
        }

        @Test
        @DisplayName("Should throw when updating a non-existent job opening")
        void shouldThrowWhenUpdatingMissing() {
            UUID missingId = UUID.randomUUID();
            when(jobOpeningRepository.findByIdAndTenantId(missingId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> jobOpeningService.updateJobOpening(missingId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }
    }

    @Nested
    @DisplayName("Delete Job Opening")
    class DeleteJobOpeningTests {

        @Test
        @DisplayName("Should delete an existing job opening and log an audit entry")
        void shouldDeleteJobOpening() {
            JobOpening existing = new JobOpening();
            existing.setId(UUID.randomUUID());
            existing.setTenantId(tenantId);
            existing.setJobCode("ENG-1");
            existing.setJobTitle("Senior Software Engineer");

            when(jobOpeningRepository.findByIdAndTenantId(existing.getId(), tenantId))
                    .thenReturn(Optional.of(existing));

            jobOpeningService.deleteJobOpening(existing.getId());

            verify(jobOpeningRepository).delete(existing);
            verify(auditLogService).logAction(
                    eq("JOB_OPENING"), eq(existing.getId()), eq(AuditAction.DELETE), any(), any(), anyString());
        }

        @Test
        @DisplayName("Should throw when deleting a non-existent job opening")
        void shouldThrowWhenDeletingMissing() {
            UUID missingId = UUID.randomUUID();
            when(jobOpeningRepository.findByIdAndTenantId(missingId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> jobOpeningService.deleteJobOpening(missingId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }
    }
}
