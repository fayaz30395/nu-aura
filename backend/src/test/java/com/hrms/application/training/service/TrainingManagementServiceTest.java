package com.hrms.application.training.service;

import com.hrms.api.training.dto.TrainingProgramRequest;
import com.hrms.api.training.dto.TrainingProgramResponse;
import com.hrms.api.training.dto.TrainingEnrollmentRequest;
import com.hrms.api.training.dto.TrainingEnrollmentResponse;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.training.TrainingEnrollment;
import com.hrms.domain.training.TrainingProgram;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.training.repository.TrainingEnrollmentRepository;
import com.hrms.infrastructure.training.repository.TrainingProgramRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("TrainingManagementService Tests")
class TrainingManagementServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private TrainingProgramRepository programRepository;
    @Mock
    private TrainingEnrollmentRepository enrollmentRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @InjectMocks
    private TrainingManagementService trainingService;
    private UUID tenantId;

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
    }

    private TrainingProgramRequest buildRequest() {
        TrainingProgramRequest req = new TrainingProgramRequest();
        req.setProgramCode("TRN-001");
        req.setProgramName("Leadership 101");
        req.setDescription("Leadership training program");
        req.setCategory(TrainingProgram.TrainingCategory.LEADERSHIP);
        req.setDeliveryMode(TrainingProgram.DeliveryMode.IN_PERSON);
        req.setDurationHours(16);
        req.setMaxParticipants(30);
        req.setStartDate(LocalDate.now().plusDays(7));
        req.setEndDate(LocalDate.now().plusDays(9));
        return req;
    }

    private TrainingProgram buildProgram() {
        TrainingProgram p = new TrainingProgram();
        p.setId(UUID.randomUUID());
        p.setTenantId(tenantId);
        p.setProgramCode("TRN-001");
        p.setProgramName("Leadership 101");
        p.setStatus(TrainingProgram.ProgramStatus.DRAFT);
        p.setCategory(TrainingProgram.TrainingCategory.LEADERSHIP);
        p.setDeliveryMode(TrainingProgram.DeliveryMode.IN_PERSON);
        return p;
    }

    // ==================== createProgram ====================

    @Test
    @DisplayName("updateProgram should update fields")
    void shouldUpdateProgram() {
        UUID programId = UUID.randomUUID();
        TrainingProgram existing = buildProgram();
        existing.setId(programId);

        TrainingProgramRequest request = buildRequest();
        request.setProgramName("Updated Name");

        when(programRepository.findByIdAndTenantId(programId, tenantId)).thenReturn(Optional.of(existing));
        when(programRepository.save(any(TrainingProgram.class))).thenAnswer(inv -> inv.getArgument(0));

        TrainingProgramResponse result = trainingService.updateProgram(programId, request);

        assertThat(result.getProgramName()).isEqualTo("Updated Name");
    }

    // ==================== updateProgram ====================

    @Test
    @DisplayName("updateProgram should throw when not found")
    void shouldThrowWhenProgramNotFound() {
        UUID programId = UUID.randomUUID();
        when(programRepository.findByIdAndTenantId(programId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> trainingService.updateProgram(programId, buildRequest()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("getProgramById should return program response")
    void shouldGetProgramById() {
        UUID programId = UUID.randomUUID();
        TrainingProgram program = buildProgram();
        program.setId(programId);

        when(programRepository.findByIdAndTenantId(programId, tenantId)).thenReturn(Optional.of(program));

        TrainingProgramResponse result = trainingService.getProgramById(programId);

        assertThat(result.getProgramName()).isEqualTo("Leadership 101");
    }

    // ==================== getProgramById ====================

    @Test
    @DisplayName("getProgramsByStatus should filter by status")
    void shouldGetProgramsByStatus() {
        TrainingProgram program = buildProgram();
        when(programRepository.findByTenantIdAndStatus(tenantId, TrainingProgram.ProgramStatus.DRAFT))
                .thenReturn(List.of(program));

        List<TrainingProgramResponse> result = trainingService.getProgramsByStatus(TrainingProgram.ProgramStatus.DRAFT);

        assertThat(result).hasSize(1);
    }

    // ==================== getProgramsByStatus ====================

    @Test
    @DisplayName("deleteProgram should delete when found")
    void shouldDeleteProgram() {
        UUID programId = UUID.randomUUID();
        TrainingProgram program = buildProgram();
        program.setId(programId);

        when(programRepository.findByIdAndTenantId(programId, tenantId)).thenReturn(Optional.of(program));

        trainingService.deleteProgram(programId);

        verify(programRepository).delete(program);
    }

    // ==================== deleteProgram ====================

    @Nested
    @DisplayName("createProgram")
    class CreateProgramTests {

        @Test
        @DisplayName("Should create program successfully")
        void shouldCreateProgram() {
            TrainingProgramRequest request = buildRequest();

            when(programRepository.existsByTenantIdAndProgramCode(tenantId, "TRN-001")).thenReturn(false);
            when(programRepository.save(any(TrainingProgram.class))).thenAnswer(inv -> {
                TrainingProgram saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            TrainingProgramResponse result = trainingService.createProgram(request);

            assertThat(result).isNotNull();
            assertThat(result.getProgramName()).isEqualTo("Leadership 101");
            verify(programRepository).save(argThat(p ->
                    p.getTenantId().equals(tenantId) && p.getStatus() == TrainingProgram.ProgramStatus.DRAFT));
        }

        @Test
        @DisplayName("Should throw when program code exists")
        void shouldThrowWhenCodeExists() {
            TrainingProgramRequest request = buildRequest();

            when(programRepository.existsByTenantIdAndProgramCode(tenantId, "TRN-001")).thenReturn(true);

            assertThatThrownBy(() -> trainingService.createProgram(request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("already exists");
        }
    }
}
