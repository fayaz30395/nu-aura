package com.nulogic.application.platform.service;

import com.nulogic.api.platform.dto.TenantRegistrationRequest;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.domain.user.User;
import com.nulogic.domain.workflow.WorkflowDefinition;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import com.nulogic.infrastructure.workflow.repository.WorkflowDefinitionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TenantProvisioningServiceTest {

    @Mock
    private TenantRepository tenantRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider jwtTokenProvider;
    @Mock
    private WorkflowDefinitionRepository workflowDefinitionRepository;

    private TenantProvisioningService service;

    @BeforeEach
    void setUp() {
        service = new TenantProvisioningService(tenantRepository, userRepository, roleRepository,
                passwordEncoder, jwtTokenProvider, workflowDefinitionRepository);

        when(tenantRepository.existsByCode(anyString())).thenReturn(false);
        when(tenantRepository.save(any(Tenant.class))).thenAnswer(inv -> {
            Tenant t = inv.getArgument(0);
            t.setId(UUID.randomUUID());
            return t;
        });
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(roleRepository.findByCodeAndTenantId(eq("ADMIN"), any())).thenReturn(Optional.empty());
        when(roleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(jwtTokenProvider.generateToken(any(), any(), any())).thenReturn("access");
        when(jwtTokenProvider.generateRefreshToken(anyString(), any(), any())).thenReturn("refresh");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private TenantRegistrationRequest request() {
        TenantRegistrationRequest req = new TenantRegistrationRequest();
        req.setCompanyName("Acme Corp");
        req.setCompanyCode("acme-corp");
        req.setAdminFirstName("Ada");
        req.setAdminLastName("Lovelace");
        req.setAdminEmail("ada@acme.test");
        req.setPassword("Sup3r$ecret!");
        return req;
    }

    @Test
    @DisplayName("register seeds the 7 default workflow definitions for a new tenant (BA-8)")
    void register_newTenant_seedsSevenDefaultWorkflows() {
        when(workflowDefinitionRepository.existsByTenantIdAndNameAndIsActiveTrue(any(), anyString()))
                .thenReturn(false);

        var response = service.register(request());

        assertThat(response.getAccessToken()).isEqualTo("access");
        verify(workflowDefinitionRepository, times(7)).save(any(WorkflowDefinition.class));
    }

    @Test
    @DisplayName("register skips workflow seeding when definitions already exist (idempotent retry)")
    void register_existingDefinitions_skipsSeeding() {
        when(workflowDefinitionRepository.existsByTenantIdAndNameAndIsActiveTrue(any(), anyString()))
                .thenReturn(true);

        service.register(request());

        verify(workflowDefinitionRepository, never()).save(any(WorkflowDefinition.class));
    }
}
