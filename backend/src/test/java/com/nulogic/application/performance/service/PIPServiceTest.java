package com.nulogic.application.performance.service;

import com.nulogic.application.performance.dto.*;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.performance.PIPCheckIn;
import com.nulogic.domain.performance.PerformanceImprovementPlan;
import com.nulogic.domain.performance.PerformanceImprovementPlan.PIPStatus;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.PIPCheckInRepository;
import com.nulogic.infrastructure.performance.repository.PIPRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PIPService mutation paths")
class PIPServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private PIPRepository pipRepository;
    @Mock
    private PIPCheckInRepository checkInRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private com.nulogic.application.notification.service.WebSocketNotificationService webSocketNotificationService;

    private PIPService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID pipId = UUID.randomUUID();
    private final UUID employeeId = UUID.randomUUID();
    private final UUID managerId = UUID.randomUUID();

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
        service = new PIPService(pipRepository, checkInRepository, employeeRepository, webSocketNotificationService);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        when(employeeRepository.findAllById(any())).thenReturn(List.of());
    }

    private PerformanceImprovementPlan activePip() {
        PerformanceImprovementPlan pip = PerformanceImprovementPlan.builder()
                .employeeId(employeeId)
                .managerId(managerId)
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 3, 1))
                .status(PIPStatus.ACTIVE)
                .build();
        pip.setId(pipId);
        pip.setTenantId(tenantId);
        return pip;
    }

    private CreatePIPRequest createRequest() {
        CreatePIPRequest request = new CreatePIPRequest();
        request.setEmployeeId(employeeId);
        request.setManagerId(managerId);
        request.setStartDate(LocalDate.of(2026, 1, 1));
        request.setEndDate(LocalDate.of(2026, 3, 1));
        request.setReason("Missed targets");
        return request;
    }

    @Test
    @DisplayName("create persists an ACTIVE PIP")
    void createPersistsActivePip() {
        when(pipRepository.save(any())).thenAnswer(inv -> {
            PerformanceImprovementPlan saved = inv.getArgument(0);
            saved.setId(pipId);
            return saved;
        });
        when(checkInRepository.countByPipId(pipId)).thenReturn(0L);

        PIPResponse response = service.create(createRequest());

        assertThat(response.getStatus()).isEqualTo(PIPStatus.ACTIVE);
        assertThat(response.getEmployeeId()).isEqualTo(employeeId);
        verify(pipRepository).save(argThat(p -> p.getTenantId().equals(tenantId)));
    }

    @Test
    @DisplayName("create defaults checkInFrequency to BIWEEKLY when not provided")
    void createDefaultsCheckInFrequency() {
        when(pipRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(checkInRepository.countByPipId(any())).thenReturn(0L);

        service.create(createRequest());

        verify(pipRepository).save(argThat(p -> "BIWEEKLY".equals(p.getCheckInFrequency())));
    }

    @Test
    @DisplayName("recordCheckIn saves a check-in for an active PIP")
    void recordCheckInSavesForActivePip() {
        when(pipRepository.findByIdAndTenantId(pipId, tenantId)).thenReturn(Optional.of(activePip()));
        when(checkInRepository.save(any())).thenAnswer(inv -> {
            PIPCheckIn saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        PIPCheckInRequest request = new PIPCheckInRequest();
        request.setCheckInDate(LocalDate.of(2026, 1, 15));
        request.setProgressNotes("On track");

        PIPCheckInResponse response = service.recordCheckIn(pipId, request);

        assertThat(response.getProgressNotes()).isEqualTo("On track");
        assertThat(response.getPipId()).isEqualTo(pipId);
    }

    @Test
    @DisplayName("recordCheckIn throws when the PIP doesn't exist")
    void recordCheckInThrowsWhenNotFound() {
        when(pipRepository.findByIdAndTenantId(pipId, tenantId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.recordCheckIn(pipId, new PIPCheckInRequest()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PIP not found");

        verify(checkInRepository, never()).save(any());
    }

    @Test
    @DisplayName("recordCheckIn rejects a non-active PIP")
    void recordCheckInRejectsNonActivePip() {
        PerformanceImprovementPlan closedPip = activePip();
        closedPip.setStatus(PIPStatus.COMPLETED);
        when(pipRepository.findByIdAndTenantId(pipId, tenantId)).thenReturn(Optional.of(closedPip));

        assertThatThrownBy(() -> service.recordCheckIn(pipId, new PIPCheckInRequest()))
                .isInstanceOf(IllegalStateException.class);

        verify(checkInRepository, never()).save(any());
    }

    @Test
    @DisplayName("close sets the final status and notes")
    void closeSetsFinalStatusAndNotes() {
        PerformanceImprovementPlan pip = activePip();
        when(pipRepository.findByIdAndTenantId(pipId, tenantId)).thenReturn(Optional.of(pip));
        when(pipRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ClosePIPRequest request = new ClosePIPRequest();
        request.setFinalStatus(PIPStatus.COMPLETED);
        request.setNotes("Employee met all goals");

        service.close(pipId, request);

        assertThat(pip.getStatus()).isEqualTo(PIPStatus.COMPLETED);
        assertThat(pip.getCloseNotes()).isEqualTo("Employee met all goals");
        verify(pipRepository).save(pip);
    }

    @Test
    @DisplayName("close throws when the PIP doesn't exist")
    void closeThrowsWhenNotFound() {
        when(pipRepository.findByIdAndTenantId(pipId, tenantId)).thenReturn(Optional.empty());

        ClosePIPRequest request = new ClosePIPRequest();
        request.setFinalStatus(PIPStatus.COMPLETED);

        assertThatThrownBy(() -> service.close(pipId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("PIP not found");
    }

    @Test
    @DisplayName("close rejects setting the final status back to ACTIVE")
    void closeRejectsActiveFinalStatus() {
        when(pipRepository.findByIdAndTenantId(pipId, tenantId)).thenReturn(Optional.of(activePip()));

        ClosePIPRequest request = new ClosePIPRequest();
        request.setFinalStatus(PIPStatus.ACTIVE);

        assertThatThrownBy(() -> service.close(pipId, request))
                .isInstanceOf(IllegalArgumentException.class);

        verify(pipRepository, never()).save(any());
    }

    @Test
    @DisplayName("getForEmployee returns PIPs for the given employee")
    void getForEmployeeReturnsList() {
        when(pipRepository.findByTenantIdAndEmployeeId(tenantId, employeeId)).thenReturn(List.of(activePip()));
        when(checkInRepository.countByPipId(pipId)).thenReturn(2L);

        List<PIPResponse> result = service.getForEmployee(employeeId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCheckInCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("getForEmployee (paginated) returns an empty page when no PIPs exist")
    void getForEmployeePaginatedReturnsEmptyPage() {
        Page<PerformanceImprovementPlan> emptyPage = new PageImpl<>(List.of());
        when(pipRepository.findByTenantIdAndEmployeeId(eq(tenantId), eq(employeeId), any())).thenReturn(emptyPage);

        Page<PIPResponse> result = service.getForEmployee(employeeId, PageRequest.of(0, 10));

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("getForManager returns PIPs managed by the given manager")
    void getForManagerReturnsList() {
        when(pipRepository.findByTenantIdAndManagerId(tenantId, managerId)).thenReturn(List.of(activePip()));
        when(checkInRepository.countByPipId(pipId)).thenReturn(0L);

        List<PIPResponse> result = service.getForManager(managerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getManagerId()).isEqualTo(managerId);
    }

    @Test
    @DisplayName("getForManager (paginated) delegates to the repository")
    void getForManagerPaginatedDelegates() {
        Page<PerformanceImprovementPlan> page = new PageImpl<>(List.of(activePip()));
        when(pipRepository.findByTenantIdAndManagerId(eq(tenantId), eq(managerId), any())).thenReturn(page);
        when(checkInRepository.countByPipId(pipId)).thenReturn(0L);

        Page<PIPResponse> result = service.getForManager(managerId, PageRequest.of(0, 10));

        assertThat(result.getContent()).hasSize(1);
    }
}
