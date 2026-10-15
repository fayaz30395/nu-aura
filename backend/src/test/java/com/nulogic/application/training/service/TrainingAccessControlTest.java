package com.nulogic.application.training.service;

import com.nulogic.api.training.dto.TrainingEnrollmentRequest;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.training.TrainingEnrollment;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.training.repository.TrainingEnrollmentRepository;
import com.nulogic.infrastructure.training.repository.TrainingProgramRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Training enrollment record-level access")
class TrainingAccessControlTest {

    private final UUID tenantId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private final UUID other = UUID.randomUUID();
    private final UUID reportee = UUID.randomUUID();
    private final UUID enrollmentId = UUID.randomUUID();
    private final UUID programId = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantCtx;
    private TrainingEnrollmentRepository enrollmentRepo;
    private TrainingManagementService service;
    private TrainingEnrollment enrollment;

    @BeforeEach
    void setUp() {
        tenantCtx = mockStatic(TenantContext.class);
        tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        SecurityContext.setCurrentUser(UUID.randomUUID(), me, Set.of("EMPLOYEE"), Map.of());
        SecurityContext.setAllReporteeIds(Set.of(reportee));

        enrollmentRepo = mock(TrainingEnrollmentRepository.class);
        service = new TrainingManagementService(mock(TrainingProgramRepository.class), enrollmentRepo,
                mock(EmployeeRepository.class), null, null, null, null, null);
        enrollment = TrainingEnrollment.builder().employeeId(other)
                .status(TrainingEnrollment.EnrollmentStatus.ENROLLED).build();
        enrollment.setId(enrollmentId);
        when(enrollmentRepo.findByIdAndTenantId(enrollmentId, tenantId)).thenReturn(Optional.of(enrollment));
        when(enrollmentRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantCtx.close();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("an employee cannot enroll someone else")
    void enrollOther_denied() {
        TrainingEnrollmentRequest req = new TrainingEnrollmentRequest();
        req.setProgramId(programId);
        req.setEmployeeId(other);

        assertThatThrownBy(() -> service.enrollEmployee(req)).isInstanceOf(AccessDeniedException.class);
        verify(enrollmentRepo, never()).save(any());
    }

    @Test
    @DisplayName("enrollment history of another employee is denied; own and reportee are allowed")
    void historyScoped() {
        assertThatThrownBy(() -> service.getEnrollmentsByEmployee(other)).isInstanceOf(AccessDeniedException.class);

        when(enrollmentRepo.findByTenantIdAndEmployeeId(tenantId, me)).thenReturn(List.of());
        when(enrollmentRepo.findByTenantIdAndEmployeeId(tenantId, reportee)).thenReturn(List.of());
        assertThat(service.getEnrollmentsByEmployee(me)).isEmpty();
        assertThat(service.getEnrollmentsByEmployee(reportee)).isEmpty();
    }

    @Test
    @DisplayName("program enrollments are filtered to self/reportees for a non-HR caller")
    void programEnrollments_filtered() {
        TrainingEnrollment mine = TrainingEnrollment.builder().employeeId(me).build();
        when(enrollmentRepo.findByTenantIdAndProgramId(tenantId, programId)).thenReturn(List.of(mine, enrollment));

        assertThat(service.getEnrollmentsByProgram(programId)).hasSize(1);
    }

    @Test
    @DisplayName("complete / certificate / status change are denied for a stranger and for the learner themself; nothing saved")
    void decide_denied() {
        assertThatThrownBy(() -> service.completeTraining(enrollmentId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.generateCertificate(enrollmentId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.updateEnrollmentStatus(enrollmentId, TrainingEnrollment.EnrollmentStatus.COMPLETED))
                .isInstanceOf(AccessDeniedException.class);

        enrollment.setEmployeeId(me);
        assertThatThrownBy(() -> service.completeTraining(enrollmentId))
                .isInstanceOf(AccessDeniedException.class).hasMessageContaining("own");
        verify(enrollmentRepo, never()).save(any());
    }

    @Test
    @DisplayName("a manager may change status for a reportee's enrollment")
    void managerCanDecideForReportee() {
        enrollment.setEmployeeId(reportee);

        service.updateEnrollmentStatus(enrollmentId, TrainingEnrollment.EnrollmentStatus.IN_PROGRESS);

        assertThat(enrollment.getStatus()).isEqualTo(TrainingEnrollment.EnrollmentStatus.IN_PROGRESS);
    }
}
