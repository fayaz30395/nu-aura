package com.hrms.infrastructure.onboarding.repository;

import com.hrms.domain.onboarding.OnboardingChecklistTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnboardingChecklistTemplateRepository extends JpaRepository<OnboardingChecklistTemplate, UUID>,
        JpaSpecificationExecutor<OnboardingChecklistTemplate> {
    Optional<OnboardingChecklistTemplate> findByIdAndTenantId(UUID id, UUID tenantId);

    List<OnboardingChecklistTemplate> findByTenantId(UUID tenantId);

    List<OnboardingChecklistTemplate> findByTenantIdAndIsActiveTrue(UUID tenantId);
}
