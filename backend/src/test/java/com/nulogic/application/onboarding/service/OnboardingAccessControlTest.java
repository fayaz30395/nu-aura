package com.nulogic.application.onboarding.service;

import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.onboarding.OnboardingProcess;
import com.nulogic.infrastructure.onboarding.repository.OnboardingProcessRepository;
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
import static org.mockito.Mockito.*;

@DisplayName("Onboarding process read access")
class OnboardingAccessControlTest {

    private final UUID tenantId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private final UUID newHire = UUID.randomUUID();
    private final UUID processId = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantCtx;
    private OnboardingProcessRepository repo;
    private OnboardingManagementService service;
    private OnboardingProcess process;

    @BeforeEach
    void setUp() {
        tenantCtx = mockStatic(TenantContext.class);
        tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        SecurityContext.setCurrentUser(UUID.randomUUID(), me, Set.of("EMPLOYEE"), Map.of());

        repo = mock(OnboardingProcessRepository.class);
        service = new OnboardingManagementService(repo,
                mock(com.nulogic.infrastructure.employee.repository.EmployeeRepository.class), null, null, null, null, null, null, null);
        process = OnboardingProcess.builder().employeeId(newHire).build();
        when(repo.findByIdAndTenantId(processId, tenantId)).thenReturn(Optional.of(process));
        when(repo.findByTenantIdAndEmployeeId(tenantId, newHire)).thenReturn(Optional.of(process));
    }

    @AfterEach
    void tearDown() {
        tenantCtx.close();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("an ONBOARDING:VIEW holder who is neither HR, the hire nor the buddy is denied")
    void stranger_denied() {
        assertThatThrownBy(() -> service.getProcessById(processId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getProcessByEmployee(newHire)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getProcessTasks(processId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.getProcessesByBuddy(UUID.randomUUID())).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("the assigned buddy and the new hire can read; status lists are filtered")
    void buddyAndHire_allowed() {
        process.setAssignedBuddyId(me);
        assertThat(service.getProcessById(processId)).isNotNull();

        OnboardingProcess other = OnboardingProcess.builder().employeeId(UUID.randomUUID()).build();
        when(repo.findByTenantIdAndStatus(tenantId, OnboardingProcess.ProcessStatus.IN_PROGRESS))
                .thenReturn(List.of(process, other));
        assertThat(service.getProcessesByStatus(OnboardingProcess.ProcessStatus.IN_PROGRESS)).hasSize(1);
    }

    @Test
    @DisplayName("HR-level (ONBOARDING:CREATE/MANAGE or HR manager) reads everything")
    void hr_allowed() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), me, Set.of("HR_MANAGER"), Map.of());
        assertThat(service.getProcessById(processId)).isNotNull();
    }
}
