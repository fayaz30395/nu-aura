package com.nulogic.application.referral.service;

import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.referral.EmployeeReferral;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.referral.repository.EmployeeReferralRepository;
import com.nulogic.infrastructure.referral.repository.ReferralPolicyRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Referral record-level access")
class ReferralAccessControlTest {

    private final UUID tenantId = UUID.randomUUID();
    private final UUID me = UUID.randomUUID();
    private final UUID referralId = UUID.randomUUID();

    private MockedStatic<TenantContext> tenantCtx;
    private EmployeeReferralRepository repo;
    private EmployeeRepository employeeRepo;
    private ReferralService service;
    private EmployeeReferral referral;

    @BeforeEach
    void setUp() {
        tenantCtx = mockStatic(TenantContext.class);
        tenantCtx.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        tenantCtx.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        SecurityContext.setCurrentUser(me, UUID.randomUUID(), Set.of("EMPLOYEE"), Map.of());

        repo = mock(EmployeeReferralRepository.class);
        employeeRepo = mock(EmployeeRepository.class);
        TenantTimeService time = mock(TenantTimeService.class);
        when(time.today(tenantId)).thenReturn(LocalDate.of(2026, 1, 1));
        service = new ReferralService(repo, mock(ReferralPolicyRepository.class), mock(UserRepository.class), time, employeeRepo);

        referral = new EmployeeReferral();
        referral.setReferrerId(UUID.randomUUID());
        referral.setBonusStatus(EmployeeReferral.BonusStatus.ELIGIBLE);
        when(repo.findByIdAndTenantId(referralId, tenantId)).thenReturn(Optional.of(referral));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantCtx.close();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("an employee cannot read another employee's referral")
    void readOthersReferral_denied() {
        assertThatThrownBy(() -> service.getReferral(referralId)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("the referrer can read their own referral")
    void readOwnReferral_allowed() {
        referral.setReferrerId(me);
        assertThat(service.getReferral(referralId)).isNotNull();
    }

    @Test
    @DisplayName("linking requires a tenant employee and not the referrer; a bad link mutates nothing")
    void link_validated() {
        UUID hired = UUID.randomUUID();
        when(employeeRepo.findByIdAndTenantId(hired, tenantId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.linkToHiredEmployee(referralId, hired)).isInstanceOf(IllegalArgumentException.class);
        verify(repo, never()).save(any());

        when(employeeRepo.findByIdAndTenantId(hired, tenantId)).thenReturn(Optional.of(new Employee()));
        referral.setReferrerId(me);
        assertThatThrownBy(() -> service.linkToHiredEmployee(referralId, hired)).isInstanceOf(AccessDeniedException.class);
        verify(repo, never()).save(any());

        referral.setReferrerId(UUID.randomUUID());
        service.linkToHiredEmployee(referralId, hired);
        assertThat(referral.getHiredEmployeeId()).isEqualTo(hired);
    }

    @Test
    @DisplayName("bonus: referrer cannot process their own bonus; paying requires PROCESSING")
    void bonus_selfAndStateBlocked() {
        referral.setReferrerId(me);
        assertThatThrownBy(() -> service.processBonus(referralId)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.markBonusPaid(referralId, "ref")).isInstanceOf(AccessDeniedException.class);

        referral.setReferrerId(UUID.randomUUID());
        assertThatThrownBy(() -> service.markBonusPaid(referralId, "ref")).isInstanceOf(IllegalStateException.class);
        assertThat(referral.getBonusStatus()).isEqualTo(EmployeeReferral.BonusStatus.ELIGIBLE);

        service.processBonus(referralId);
        service.markBonusPaid(referralId, "ref");
        assertThat(referral.getBonusStatus()).isEqualTo(EmployeeReferral.BonusStatus.PAID);
    }
}
