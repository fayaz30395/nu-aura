package com.hrms.infrastructure.onboarding.repository;

import com.hrms.domain.onboarding.OnboardingProcess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnboardingProcessRepository extends JpaRepository<OnboardingProcess, UUID>, JpaSpecificationExecutor<OnboardingProcess> {

    Optional<OnboardingProcess> findByIdAndTenantId(UUID id, UUID tenantId);

    List<OnboardingProcess> findByTenantId(UUID tenantId);

    Optional<OnboardingProcess> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<OnboardingProcess> findByTenantIdAndStatus(UUID tenantId, OnboardingProcess.ProcessStatus status);

    List<OnboardingProcess> findByTenantIdAndProcessType(UUID tenantId, OnboardingProcess.ProcessType processType);

    List<OnboardingProcess> findByTenantIdAndAssignedBuddyId(UUID tenantId, UUID buddyId);
}
