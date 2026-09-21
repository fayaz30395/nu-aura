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
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final com.nulogic.common.security.TenantRlsSessionSync tenantRlsSessionSync;

    @PersistenceContext
    private EntityManager entityManager;

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

        // Set context so downstream operations use the correct tenant. TenantContext
        // is only the in-JVM ThreadLocal — this transaction's Postgres session GUC
        // (app.current_tenant_id) was already set for the CALLING super-admin's
        // tenant at transaction start, so it must be explicitly re-synced here or
        // every subsequent insert for the new tenant violates RLS's restrictive
        // fail-closed policy.
        TenantContext.setCurrentTenant(tenantId);
        tenantRlsSessionSync.syncCurrentTenant(tenantId);

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
                    Role saved = roleRepository.save(r);
                    seedRolePermissions(saved.getId(), tenantId, RoleHierarchy.TENANT_ADMIN);
                    return saved;
                });

        // ── 5. Assign role to user ───────────────────────────────────────────
        // user_roles is a plain Hibernate-managed @ManyToMany join table with no
        // entity mapping for its (nullable) tenant_id column, so a normal
        // setRoles()+save() never populates it — the RESTRICTIVE RLS policy on
        // user_roles then rejects the insert (tenant_id IS NULL never matches the
        // session GUC). Insert the join row explicitly with tenant_id set.
        entityManager.createNativeQuery(
                        "INSERT INTO user_roles (user_id, role_id, tenant_id, is_deleted) VALUES (?1, ?2, ?3, false)")
                .setParameter(1, adminUser.getId())
                .setParameter(2, adminRole.getId())
                .setParameter(3, tenantId)
                .executeUpdate();
        // ── 6. Seed default approval workflows (BA-8) ────────────────────────
        seedDefaultWorkflowDefinitions(tenantId);

        // ── 7. Generate JWT ──────────────────────────────────────────────────
        // Deliberately NOT calling adminUser.setRoles(...)/UserPrincipal.create() —
        // adminUser is still an attached/managed entity, and Hibernate dirty-checks
        // collection fields at flush time regardless of whether save() is called
        // again, which would re-trigger the same tenant_id-less user_roles insert
        // the native query above exists to avoid. Build the principal/authorities
        // directly from adminRole instead.
        java.util.Set<org.springframework.security.core.GrantedAuthority> authorities = new java.util.HashSet<>();
        adminRole.getPermissions().forEach(rp ->
                authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(rp.getPermission().getCode())));
        authorities.add(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + adminRole.getCode()));
        com.nulogic.common.security.UserPrincipal userPrincipal = new com.nulogic.common.security.UserPrincipal(
                adminUser.getId(), tenantId, adminUser.getEmail(), adminUser.getPasswordHash(), authorities);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                userPrincipal,
                null,
                userPrincipal.getAuthorities()
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
     * Seeds role_permissions for a newly-created role from RoleHierarchy's static
     * default permission set — the same computation used to build the display-only
     * permission list in the login response. Without this, a brand-new tenant's role
     * has zero role_permissions rows and every @RequiresPermission check denies,
     * despite the role code matching TENANT_ADMIN (login-time RoleHierarchy lookups
     * and per-request permission enforcement are two independent code paths — see
     * SecurityService.getCachedPermissions, which reads role_permissions, not
     * RoleHierarchy.java).
     */
    private void seedRolePermissions(UUID roleId, UUID tenantId, String roleCode) {
        java.util.Set<String> codes = RoleHierarchy.getDefaultPermissions(roleCode);
        if (codes.isEmpty()) {
            return;
        }
        entityManager.createNativeQuery(
                        "INSERT INTO role_permissions (id, tenant_id, role_id, permission_id, scope, "
                                + "created_at, updated_at, version, is_deleted) "
                                + "SELECT gen_random_uuid(), :tenantId, :roleId, p.id, 'ALL', NOW(), NOW(), 0, false "
                                + "FROM permissions p WHERE p.code IN :codes AND (p.is_deleted = false OR p.is_deleted IS NULL)")
                .setParameter("tenantId", tenantId)
                .setParameter("roleId", roleId)
                .setParameter("codes", codes)
                .executeUpdate();
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
