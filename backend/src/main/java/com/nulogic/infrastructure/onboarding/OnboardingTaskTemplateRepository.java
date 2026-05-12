package com.nulogic.infrastructure.onboarding;

import com.nulogic.domain.onboarding.OnboardingTaskTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for role-aware onboarding task templates (wave-3 F4.6).
 *
 * <p>Derived-query naming follows the project convention used by sibling
 * onboarding repositories — the global {@code @Where(clause = "is_deleted = false")}
 * on the entity means the {@code IsDeletedFalse} suffix below is belt-and-braces
 * for callers that disable that filter (e.g. native queries / audit jobs).
 */
@Repository
public interface OnboardingTaskTemplateRepository extends JpaRepository<OnboardingTaskTemplate, UUID> {

    /**
     * All active, non-deleted templates for a tenant, ordered by their
     * configured sequence. Used as the seed list before role filtering in
     * {@code OnboardingManagementService.createProcess}.
     */
    List<OnboardingTaskTemplate> findByTenantIdAndIsActiveTrueAndIsDeletedFalseOrderBySequenceOrder(UUID tenantId);

    /**
     * Active, non-deleted templates that match a specific role filter exactly
     * (case-sensitive by default — callers normalise on either side if needed).
     */
    List<OnboardingTaskTemplate> findByTenantIdAndRoleFilterAndIsActiveTrueAndIsDeletedFalseOrderBySequenceOrder(
            UUID tenantId,
            String roleFilter);
}
