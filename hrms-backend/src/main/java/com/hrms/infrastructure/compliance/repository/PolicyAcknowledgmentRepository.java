package com.hrms.infrastructure.compliance.repository;

import com.hrms.domain.compliance.PolicyAcknowledgment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PolicyAcknowledgmentRepository extends JpaRepository<PolicyAcknowledgment, UUID> {

    Optional<PolicyAcknowledgment> findByPolicyIdAndEmployeeIdAndPolicyVersion(UUID policyId, UUID employeeId, Integer policyVersion);

    List<PolicyAcknowledgment> findByPolicyIdAndTenantId(UUID policyId, UUID tenantId);

    List<PolicyAcknowledgment> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    boolean existsByPolicyIdAndEmployeeIdAndPolicyVersion(UUID policyId, UUID employeeId, Integer policyVersion);

    @Query("SELECT COUNT(a) FROM PolicyAcknowledgment a WHERE a.policyId = :policyId AND a.policyVersion = :version")
    long countByPolicyAndVersion(@Param("policyId") UUID policyId, @Param("version") Integer version);

    @Query("SELECT a.policyId, COUNT(a) FROM PolicyAcknowledgment a WHERE a.tenantId = :tenantId GROUP BY a.policyId")
    List<Object[]> countAcknowledgmentsByPolicy(@Param("tenantId") UUID tenantId);
}
