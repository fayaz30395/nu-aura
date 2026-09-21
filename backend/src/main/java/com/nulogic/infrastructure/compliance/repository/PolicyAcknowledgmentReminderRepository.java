package com.nulogic.infrastructure.compliance.repository;

import com.nulogic.domain.compliance.PolicyAcknowledgmentReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PolicyAcknowledgmentReminderRepository extends JpaRepository<PolicyAcknowledgmentReminder, UUID> {

    Optional<PolicyAcknowledgmentReminder> findByTenantIdAndPolicyIdAndEmployeeId(
            UUID tenantId, UUID policyId, UUID employeeId);
}
