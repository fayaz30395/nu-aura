package com.hrms.infrastructure.workflow.repository;

import com.hrms.domain.workflow.ApprovalDelegate;
import com.hrms.domain.workflow.WorkflowDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApprovalDelegateRepository extends JpaRepository<ApprovalDelegate, UUID> {

    Optional<ApprovalDelegate> findByIdAndTenantId(UUID id, UUID tenantId);

    List<ApprovalDelegate> findByDelegatorIdAndTenantId(UUID delegatorId, UUID tenantId);

    List<ApprovalDelegate> findByDelegateIdAndTenantId(UUID delegateId, UUID tenantId);

    @Query("SELECT d FROM ApprovalDelegate d WHERE d.tenantId = :tenantId AND d.delegatorId = :delegatorId AND d.isActive = true AND d.revoked = false AND :today BETWEEN d.startDate AND d.endDate")
    List<ApprovalDelegate> findActiveDelegations(@Param("tenantId") UUID tenantId, @Param("delegatorId") UUID delegatorId, @Param("today") LocalDate today);

    @Query("SELECT d FROM ApprovalDelegate d WHERE d.tenantId = :tenantId AND d.delegateId = :delegateId AND d.isActive = true AND d.revoked = false AND :today BETWEEN d.startDate AND d.endDate")
    List<ApprovalDelegate> findActiveDelegationsForDelegate(@Param("tenantId") UUID tenantId, @Param("delegateId") UUID delegateId, @Param("today") LocalDate today);

    @Query("SELECT d FROM ApprovalDelegate d WHERE d.tenantId = :tenantId AND d.delegatorId = :delegatorId AND d.isActive = true AND d.revoked = false AND d.entityType = :entityType AND :today BETWEEN d.startDate AND d.endDate")
    Optional<ApprovalDelegate> findActiveDelegationForEntityType(@Param("tenantId") UUID tenantId, @Param("delegatorId") UUID delegatorId, @Param("entityType") WorkflowDefinition.EntityType entityType, @Param("today") LocalDate today);

    @Query("SELECT d FROM ApprovalDelegate d WHERE d.tenantId = :tenantId AND d.isActive = true AND d.revoked = false AND d.endDate < :today")
    List<ApprovalDelegate> findExpiredDelegations(@Param("tenantId") UUID tenantId, @Param("today") LocalDate today);

    @Query("SELECT d FROM ApprovalDelegate d WHERE d.tenantId = :tenantId AND d.isActive = true AND d.revoked = false AND d.endDate = :expiryDate")
    List<ApprovalDelegate> findDelegationsExpiringOn(@Param("tenantId") UUID tenantId, @Param("expiryDate") LocalDate expiryDate);

    @Query("SELECT COUNT(d) FROM ApprovalDelegate d WHERE d.tenantId = :tenantId AND d.delegatorId = :delegatorId AND d.isActive = true AND d.revoked = false")
    long countActiveDelegations(@Param("tenantId") UUID tenantId, @Param("delegatorId") UUID delegatorId);

    @Query("SELECT d FROM ApprovalDelegate d WHERE d.tenantId = :tenantId AND d.delegatorId = :delegatorId AND d.delegateId = :delegateId AND d.isActive = true AND d.revoked = false AND :today BETWEEN d.startDate AND d.endDate")
    Optional<ApprovalDelegate> findExistingDelegation(@Param("tenantId") UUID tenantId, @Param("delegatorId") UUID delegatorId, @Param("delegateId") UUID delegateId, @Param("today") LocalDate today);
}
