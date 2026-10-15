package com.nulogic.application.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.auth.dto.SamlConfigRequest;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.auth.SamlIdentityProvider;
import com.nulogic.domain.user.Role;
import com.nulogic.domain.user.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import com.nulogic.application.auth.service.SamlAuthenticationHandler.SamlUserAttributes;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** SAML default role must be resolved within the IdP's own tenant (no cross-tenant role grant). */
@ExtendWith(MockitoExtension.class)
class SamlDefaultRoleTenantScopeTest {

    private static final UUID TENANT = UUID.randomUUID();
    private static final UUID ROLE_ID = UUID.randomUUID();

    @Mock private com.nulogic.infrastructure.auth.repository.SamlIdentityProviderRepository idpRepo;
    @Mock private com.nulogic.infrastructure.user.repository.UserRepository userRepo;
    @Mock private com.nulogic.infrastructure.employee.repository.EmployeeRepository employeeRepo;
    @Mock private com.nulogic.infrastructure.user.repository.RoleRepository roleRepo;
    @Mock private com.nulogic.infrastructure.platform.repository.UserAppAccessRepository appAccessRepo;
    @Mock private com.nulogic.common.security.JwtTokenProvider tokenProvider;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private TenantTimeService tenantTimeService;
    @Mock private com.nulogic.common.security.EncryptionService encryptionService;

    private SamlAuthenticationHandler handler() {
        return new SamlAuthenticationHandler(idpRepo, userRepo, employeeRepo, roleRepo, appAccessRepo,
                tokenProvider, passwordEncoder, new ObjectMapper(), tenantTimeService);
    }

    private SamlIdentityProvider idp() {
        return SamlIdentityProvider.builder().tenantId(TENANT).isActive(true)
                .autoProvisionUsers(true).defaultRoleId(ROLE_ID).build();
    }

    private void stubProvisioning() {
        when(userRepo.findByEmailAndTenantId("new@x.io", TENANT)).thenReturn(Optional.empty());
        when(idpRepo.findActiveByTenantId(TENANT)).thenReturn(Optional.of(idp()));
        when(passwordEncoder.encode(any())).thenReturn("h");
        when(userRepo.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void jit_defaultRoleFromAnotherTenant_isNotAssigned() {
        stubProvisioning();
        when(roleRepo.findByIdAndTenantIdWithPermissions(ROLE_ID, TENANT)).thenReturn(Optional.empty());

        User u = handler().provisionOrLinkUser(TENANT, new SamlUserAttributes("new@x.io", "N", "U", null, null));

        assertThat(u.getRoles()).isEmpty();
        verify(roleRepo, never()).findById(any());
    }

    @Test
    void jit_defaultRoleInSameTenant_isAssigned() {
        stubProvisioning();
        Role role = new Role();
        when(roleRepo.findByIdAndTenantIdWithPermissions(ROLE_ID, TENANT)).thenReturn(Optional.of(role));

        User u = handler().provisionOrLinkUser(TENANT, new SamlUserAttributes("new@x.io", "N", "U", null, null));

        assertThat(u.getRoles()).containsExactly(role);
    }

    private SamlConfigurationService service() {
        return new SamlConfigurationService(idpRepo, roleRepo, encryptionService, new ObjectMapper());
    }

    private SamlConfigRequest request() {
        return SamlConfigRequest.builder().name("idp").entityId("e").ssoUrl("https://idp.example.com/sso")
                .defaultRoleId(ROLE_ID).build();
    }

    @Test
    void save_defaultRoleFromAnotherTenant_isRejected() {
        when(idpRepo.existsByTenantIdAndIsDeletedFalse(TENANT)).thenReturn(false);
        when(roleRepo.findByIdAndTenantIdWithPermissions(ROLE_ID, TENANT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().configureSamlProvider(TENANT, request()))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Default role not found");
        verify(idpRepo, never()).save(any());
    }

    @Test
    void save_defaultRoleInSameTenant_isAccepted() {
        when(idpRepo.existsByTenantIdAndIsDeletedFalse(TENANT)).thenReturn(false);
        when(roleRepo.findByIdAndTenantIdWithPermissions(ROLE_ID, TENANT)).thenReturn(Optional.of(new Role()));
        when(idpRepo.save(any(SamlIdentityProvider.class))).thenAnswer(i -> i.getArgument(0));

        service().configureSamlProvider(TENANT, request());

        verify(idpRepo).save(any(SamlIdentityProvider.class));
    }
}
