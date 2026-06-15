package com.nulogic.infrastructure.onboarding.repository;

import com.nulogic.domain.onboarding.OnboardingTemplateTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnboardingTemplateTaskRepository extends JpaRepository<OnboardingTemplateTask, UUID> {

    Optional<OnboardingTemplateTask> findByIdAndTemplateIdAndTenantId(UUID id, UUID templateId, UUID tenantId);

    List<OnboardingTemplateTask> findByTemplateIdAndTenantId(UUID templateId, UUID tenantId);

    List<OnboardingTemplateTask> findByTemplateIdAndTenantIdOrderByOrderSequenceAsc(UUID templateId, UUID tenantId);
}
