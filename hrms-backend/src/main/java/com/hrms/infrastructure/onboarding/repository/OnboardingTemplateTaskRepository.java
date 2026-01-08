package com.hrms.infrastructure.onboarding.repository;

import com.hrms.domain.onboarding.OnboardingTemplateTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OnboardingTemplateTaskRepository extends JpaRepository<OnboardingTemplateTask, UUID> {
    List<OnboardingTemplateTask> findByTemplateIdAndTenantId(UUID templateId, UUID tenantId);

    List<OnboardingTemplateTask> findByTemplateIdAndTenantIdOrderByOrderSequenceAsc(UUID templateId, UUID tenantId);
}
