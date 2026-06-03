package com.nulogic.application.user.service;

import com.nulogic.domain.user.ImplicitRoleRule;
import com.nulogic.domain.user.ImplicitUserRole;
import com.nulogic.domain.user.Role;
import com.nulogic.infrastructure.user.repository.ImplicitRoleRuleRepository;
import com.nulogic.infrastructure.user.repository.ImplicitUserRoleRepository;
import com.nulogic.infrastructure.user.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Application service that encapsulates data access for implicit role rules and
 * their derived user-role assignments.
 *
 * <p>Behaviour-preserving extraction: each method below is a thin, faithful
 * wrapper over the repository calls that previously lived directly inside
 * {@code ImplicitRoleRuleController}. Tenant-scoping is preserved exactly —
 * every finder/persistence call keeps the same {@code tenantId} arguments and
 * the same repository methods as before.</p>
 */
@Service
@RequiredArgsConstructor
public class ImplicitRoleRuleService {

    private final ImplicitRoleRuleRepository ruleRepository;
    private final ImplicitUserRoleRepository implicitUserRoleRepository;
    private final RoleRepository roleRepository;

    // ===================== Rule reads =====================

    public Page<ImplicitRoleRule> findRulesByTenantAndActive(UUID tenantId, Boolean active, Pageable pageable) {
        return ruleRepository.findByTenantIdAndIsActive(tenantId, active, pageable);
    }

    public Page<ImplicitRoleRule> findRulesByTenant(UUID tenantId, Pageable pageable) {
        return ruleRepository.findByTenantId(tenantId, pageable);
    }

    public Optional<ImplicitRoleRule> findRuleByIdAndTenant(UUID id, UUID tenantId) {
        return ruleRepository.findByIdAndTenantId(id, tenantId);
    }

    public List<ImplicitRoleRule> findRulesByIdsAndTenant(Collection<UUID> ids, UUID tenantId) {
        return ruleRepository.findByIdInAndTenantId(ids, tenantId);
    }

    // ===================== Rule writes =====================

    public ImplicitRoleRule saveRule(ImplicitRoleRule rule) {
        return ruleRepository.save(rule);
    }

    // ===================== Derived user-role reads =====================

    public List<ImplicitUserRole> findUserRolesByRuleAndTenant(UUID ruleId, UUID tenantId) {
        return implicitUserRoleRepository.findByDerivedFromRuleIdAndTenantId(ruleId, tenantId);
    }

    public List<ImplicitUserRole> findActiveUserRolesByUserAndTenant(UUID userId, UUID tenantId) {
        return implicitUserRoleRepository.findByUserIdAndTenantIdAndIsActiveTrue(userId, tenantId);
    }

    public long countAffectedUsers(UUID ruleId, UUID tenantId) {
        return implicitUserRoleRepository.countAffectedUsers(ruleId, tenantId);
    }

    // ===================== Role lookups =====================

    public Optional<Role> findRoleById(UUID roleId) {
        return roleRepository.findById(roleId);
    }
}
