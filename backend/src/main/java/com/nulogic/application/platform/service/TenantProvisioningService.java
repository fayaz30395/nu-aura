package com.nulogic.application.platform.service;

import com.nulogic.api.auth.dto.AuthResponse;
import com.nulogic.api.platform.dto.TenantRegistrationRequest;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.common.security.RoleHierarchy;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.domain.user.Role;
import com.nulogic.domain.user.User;
import com.nulogic.domain.workflow.ApprovalStep;
import com.nulogic.domain.workflow.WorkflowDefinition;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import com.nulogic.infrastructure.workflow.repository.WorkflowDefinitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Provisions a new tenant for SaaS self-serve registration.
 *
 * <p>Flow:
 * <ol>
 *   <li>Validate uniqueness of company code and admin email</li>
 *   <li>Create the {@link Tenant} record (status ACTIVE)</li>
 *   <li>Create the admin {@link User} with a hashed password</li>
 *   <li>Create a default ADMIN {@link Role} for the tenant</li>
 *   <li>Assign the role to the user</li>
 *   <li>Generate and return JWT so the admin is immediately logged in</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TenantProvisioningService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final WorkflowDefinitionRepository workflowDefinitionRepository;

    public AuthResponse register(TenantRegistrationRequest req) {

        // ── 1. Uniqueness checks ────────────────────────────────────────────
        if (tenantRepository.existsByCode(req.getCompanyCode())) {
            throw new ValidationException("Company code already taken: " + req.getCompanyCode());
        }

        // Tenant does not exist yet — email uniqueness is per tenant, so any existing
        // record with the same email in another tenant is fine.

        // ── 2. Create tenant ────────────────────────────────────────────────
        Tenant tenant = Tenant.builder()
                .code(req.getCompanyCode())
                .name(req.getCompanyName())
                .status(Tenant.TenantStatus.ACTIVE)
                .contactEmail(req.getAdminEmail())
                .contactPhone(req.getContactPhone())
                .build();
        tenant = tenantRepository.save(tenant);
        UUID tenantId = tenant.getId();
        log.info("Provisioned new tenant: {} ({})", tenant.getName(), tenantId);

        // Set context so downstream operations use the correct tenant
        TenantContext.setCurrentTenant(tenantId);

        // ── 3. Create admin user ─────────────────────────────────────────────
        User adminUser = new User();
        adminUser.setTenantId(tenantId);
        adminUser.setEmail(req.getAdminEmail());
        adminUser.setFirstName(req.getAdminFirstName());
        adminUser.setLastName(req.getAdminLastName());
        adminUser.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        adminUser.setStatus(User.UserStatus.ACTIVE);
        adminUser = userRepository.save(adminUser);
        log.info("Created admin user {} for tenant {}", adminUser.getEmail(), tenantId);

        // ── 4. Create default TENANT_ADMIN role for this tenant ──────────────
        // Try TENANT_ADMIN first; fall back to legacy ADMIN code for existing tenants.
        Role adminRole = roleRepository.findByCodeAndTenantId(RoleHierarchy.TENANT_ADMIN, tenantId)
                .or(() -> roleRepository.findByCodeAndTenantId("ADMIN", tenantId))
                .orElseGet(() -> {
                    Role r = new Role();
                    r.setTenantId(tenantId);
                    r.setCode(RoleHierarchy.TENANT_ADMIN);
                    r.setName("Tenant Administrator");
                    r.setDescription("Full intra-tenant administration — manages all HRMS modules");
                    r.setIsSystemRole(true);
                    return roleRepository.save(r);
                });

        // ── 5. Assign role to user ───────────────────────────────────────────
        adminUser.setRoles(Set.of(adminRole));
        adminUser = userRepository.save(adminUser);

        // ── 6. Seed default approval workflows (BA-8) ────────────────────────
        seedDefaultWorkflowDefinitions(tenantId);

        // ── 7. Generate JWT ──────────────────────────────────────────────────
        Authentication auth = new UsernamePasswordAuthenticationToken(
                adminUser.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        String accessToken = jwtTokenProvider.generateToken(auth, tenantId, adminUser.getId());
        String refreshToken = jwtTokenProvider.generateRefreshToken(adminUser.getEmail(), tenantId, adminUser.getId());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(3600L)
                .userId(adminUser.getId())
                .tenantId(tenantId)
                .email(adminUser.getEmail())
                .fullName(adminUser.getFullName())
                .build();
    }

    /**
     * BA-8: Seed the same 7 default approval workflows that {@code V54} ships for the
     * demo tenant. Without these, {@code WorkflowService.startWorkflow} throws
     * "No active workflow definition configured" for every leave/expense/asset/travel/
     * loan/onboarding/timesheet submission on a newly provisioned tenant, rolling back
     * the submit transaction. Runs inside the provisioning transaction.
     */
    private void seedDefaultWorkflowDefinitions(UUID tenantId) {
        seedWorkflow(tenantId, "Default Leave Approval", WorkflowDefinition.EntityType.LEAVE_REQUEST,
                step(1, "Manager Approval", ApprovalStep.ApproverType.REPORTING_MANAGER, null));
        seedWorkflow(tenantId, "Default Expense Approval", WorkflowDefinition.EntityType.EXPENSE_CLAIM,
                step(1, "Manager Approval", ApprovalStep.ApproverType.REPORTING_MANAGER, null),
                step(2, "Finance Head Approval", ApprovalStep.ApproverType.FINANCE_MANAGER, null));
        seedWorkflow(tenantId, "Default Asset Request Approval", WorkflowDefinition.EntityType.ASSET_REQUEST,
                step(1, "Manager Approval", ApprovalStep.ApproverType.REPORTING_MANAGER, null),
                step(2, "IT Admin Approval", ApprovalStep.ApproverType.ANY_OF_ROLE, "IT_ADMIN"));
        seedWorkflow(tenantId, "Default Travel Approval", WorkflowDefinition.EntityType.TRAVEL_REQUEST,
                step(1, "Manager Approval", ApprovalStep.ApproverType.REPORTING_MANAGER, null));
        seedWorkflow(tenantId, "Default Loan Approval", WorkflowDefinition.EntityType.LOAN_REQUEST,
                step(1, "Manager Approval", ApprovalStep.ApproverType.REPORTING_MANAGER, null),
                step(2, "Finance Head Approval", ApprovalStep.ApproverType.FINANCE_MANAGER, null));
        seedWorkflow(tenantId, "Default Onboarding Approval", WorkflowDefinition.EntityType.ONBOARDING,
                step(1, "Department Head Approval", ApprovalStep.ApproverType.DEPARTMENT_HEAD, null));
        seedWorkflow(tenantId, "Default Timesheet Approval", WorkflowDefinition.EntityType.TIMESHEET,
                step(1, "Project Manager Approval", ApprovalStep.ApproverType.REPORTING_MANAGER, null));
        log.info("Seeded 7 default workflow definitions for tenant {}", tenantId);
    }

    private void seedWorkflow(UUID tenantId, String name,
                              WorkflowDefinition.EntityType entityType, ApprovalStep... steps) {
        // Idempotency guard mirroring V285's NOT EXISTS: a provisioning retry for an
        // already-seeded tenant must not create duplicate default definitions.
        if (workflowDefinitionRepository.existsByTenantIdAndNameAndIsActiveTrue(tenantId, name)) {
            log.debug("Workflow definition '{}' already exists for tenant {}, skipping seed", name, tenantId);
            return;
        }
        WorkflowDefinition definition = WorkflowDefinition.builder()
                .name(name)
                .entityType(entityType)
                .workflowType(WorkflowDefinition.WorkflowType.SEQUENTIAL)
                .workflowVersion(1)
                .isActive(true)
                .isDefault(true)
                .defaultSlaHours(48)
                .escalationAfterHours(72)
                .notifyOnSubmission(true)
                .notifyOnApproval(true)
                .notifyOnRejection(true)
                .build();
        definition.setTenantId(tenantId);
        for (ApprovalStep step : steps) {
            step.setTenantId(tenantId);
            definition.addStep(step);
        }
        workflowDefinitionRepository.save(definition);
    }

    private ApprovalStep step(int order, String name, ApprovalStep.ApproverType approverType, String roleName) {
        return ApprovalStep.builder()
                .stepOrder(order)
                .stepName(name)
                .approverType(approverType)
                .roleName(roleName)
                .hierarchyLevel(1)
                .minApprovals(1)
                .slaHours(48)
                .escalateAfterHours(72)
                .delegationAllowed(true)
                .build();
    }
}
