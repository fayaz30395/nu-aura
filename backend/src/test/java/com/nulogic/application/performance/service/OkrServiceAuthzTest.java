package com.nulogic.application.performance.service;

import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.performance.KeyResult;
import com.nulogic.domain.performance.Objective;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.performance.repository.KeyResultRepository;
import com.nulogic.infrastructure.performance.repository.ObjectiveRepository;
import com.nulogic.infrastructure.performance.repository.OkrCheckInRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("OkrService ownership guards")
class OkrServiceAuthzTest {

    @Mock
    private ObjectiveRepository objectiveRepository;
    @Mock
    private KeyResultRepository keyResultRepository;
    @Mock
    private OkrCheckInRepository checkInRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private WebSocketNotificationService notificationService;

    private OkrService service;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID ownerId = UUID.randomUUID();
    private final UUID intruderId = UUID.randomUUID();
    private final UUID objectiveId = UUID.randomUUID();
    private Objective objective;

    @BeforeEach
    void setUp() {
        service = new OkrService(objectiveRepository, keyResultRepository, checkInRepository,
                tenantTimeService, employeeRepository, notificationService);
        objective = Objective.builder().ownerId(ownerId).build();
        objective.setId(objectiveId);
        objective.setTenantId(tenantId);
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId)).thenReturn(Optional.of(objective));
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private void actAs(UUID employeeId, String... permissions) {
        Map<String, RoleScope> perms = new java.util.HashMap<>();
        for (String p : permissions) {
            perms.put(p, RoleScope.ALL);
        }
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Collections.emptySet(), perms);
    }

    private KeyResult keyResult(UUID owner) {
        KeyResult kr = KeyResult.builder().objectiveId(objectiveId).ownerId(owner).build();
        kr.setTenantId(tenantId);
        return kr;
    }

    @Test
    @DisplayName("objective: the owner may modify it")
    void ownerCanModifyObjective() {
        actAs(ownerId, Permission.OKR_UPDATE);

        assertThatCode(() -> service.assertCanModifyObjective(objective)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("objective: another OKR:UPDATE holder is denied")
    void intruderDeniedObjective() {
        actAs(intruderId, Permission.OKR_UPDATE, Permission.OKR_DELETE);

        assertThatThrownBy(() -> service.assertCanModifyObjective(objective)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("objective: OKR:VIEW_ALL admins may modify any objective")
    void adminCanModifyObjective() {
        actAs(intruderId, Permission.OKR_VIEW_ALL);

        assertThatCode(() -> service.assertCanModifyObjective(objective)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("requireModifiableObjective: unknown objective is not found, foreign one is denied")
    void requireModifiableObjective() {
        actAs(intruderId, Permission.OKR_UPDATE);

        assertThatThrownBy(() -> service.requireModifiableObjective(tenantId, UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.requireModifiableObjective(tenantId, objectiveId))
                .isInstanceOf(AccessDeniedException.class);

        actAs(ownerId, Permission.OKR_UPDATE);
        assertThat(service.requireModifiableObjective(tenantId, objectiveId)).isSameAs(objective);
    }

    @Test
    @DisplayName("key result: its owner and the objective owner may modify; a stranger may not")
    void keyResultOwnership() {
        KeyResult kr = keyResult(intruderId);

        actAs(intruderId, Permission.OKR_UPDATE);
        assertThatCode(() -> service.assertCanModifyKeyResult(tenantId, kr)).doesNotThrowAnyException();

        actAs(ownerId, Permission.OKR_UPDATE);
        assertThatCode(() -> service.assertCanModifyKeyResult(tenantId, kr)).doesNotThrowAnyException();

        UUID stranger = UUID.randomUUID();
        actAs(stranger, Permission.OKR_UPDATE);
        assertThatThrownBy(() -> service.assertCanModifyKeyResult(tenantId, kr)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("key result owner: defaults to the caller; assigning someone else needs OKR admin and a tenant employee")
    void keyResultOwnerResolution() {
        actAs(ownerId, Permission.OKR_UPDATE);
        assertThat(service.resolveKeyResultOwner(tenantId, null)).isEqualTo(ownerId);
        assertThat(service.resolveKeyResultOwner(tenantId, ownerId)).isEqualTo(ownerId);
        assertThatThrownBy(() -> service.resolveKeyResultOwner(tenantId, intruderId)).isInstanceOf(AccessDeniedException.class);

        actAs(ownerId, Permission.OKR_VIEW_ALL);
        when(employeeRepository.findByIdAndTenantId(intruderId, tenantId)).thenReturn(Optional.of(new Employee()));
        assertThat(service.resolveKeyResultOwner(tenantId, intruderId)).isEqualTo(intruderId);
        UUID foreign = UUID.randomUUID();
        when(employeeRepository.findByIdAndTenantId(foreign, tenantId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.resolveKeyResultOwner(tenantId, foreign)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("approve: the owner cannot approve their own objective")
    void selfApprovalBlocked() {
        actAs(ownerId, Permission.OKR_APPROVE);

        assertThatThrownBy(() -> service.assertCanApproveObjective(objective, ownerId)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("approve: the owner's line manager may approve; an unrelated OKR:APPROVE holder may not")
    void approvalScope() {
        UUID managerId = UUID.randomUUID();
        Employee owner = new Employee();
        owner.setManagerId(managerId);
        when(employeeRepository.findByIdAndTenantId(ownerId, tenantId)).thenReturn(Optional.of(owner));

        actAs(managerId, Permission.OKR_APPROVE);
        assertThatCode(() -> service.assertCanApproveObjective(objective, managerId)).doesNotThrowAnyException();

        actAs(intruderId, Permission.OKR_APPROVE);
        assertThatThrownBy(() -> service.assertCanApproveObjective(objective, intruderId)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("approve: an OKR admin who is not the owner may approve")
    void adminCanApprove() {
        actAs(intruderId, Permission.OKR_APPROVE, Permission.OKR_VIEW_ALL);

        assertThatCode(() -> service.assertCanApproveObjective(objective, intruderId)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("check-in: owner may check in; stranger denied; key result must belong to the objective")
    void checkInGuards() {
        UUID krId = UUID.randomUUID();
        KeyResult kr = keyResult(ownerId);
        when(keyResultRepository.findByIdAndTenantId(krId, tenantId)).thenReturn(Optional.of(kr));

        actAs(ownerId, Permission.OKR_UPDATE);
        assertThatCode(() -> service.assertCanCheckIn(tenantId, objectiveId, krId)).doesNotThrowAnyException();
        assertThatCode(() -> service.assertCanCheckIn(tenantId, objectiveId, null)).doesNotThrowAnyException();
        assertThatThrownBy(() -> service.assertCanCheckIn(tenantId, UUID.randomUUID(), krId))
                .isInstanceOf(IllegalArgumentException.class);

        UUID otherObjective = UUID.randomUUID();
        Objective other = Objective.builder().ownerId(ownerId).build();
        other.setId(otherObjective);
        when(objectiveRepository.findByIdAndTenantId(otherObjective, tenantId)).thenReturn(Optional.of(other));
        assertThatThrownBy(() -> service.assertCanCheckIn(tenantId, otherObjective, krId))
                .isInstanceOf(IllegalArgumentException.class);

        actAs(intruderId, Permission.OKR_UPDATE);
        assertThatThrownBy(() -> service.assertCanCheckIn(tenantId, objectiveId, krId))
                .isInstanceOf(AccessDeniedException.class);
    }
}
