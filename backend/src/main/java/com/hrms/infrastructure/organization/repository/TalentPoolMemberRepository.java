package com.hrms.infrastructure.organization.repository;

import com.hrms.domain.organization.TalentPoolMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TalentPoolMemberRepository extends JpaRepository<TalentPoolMember, UUID> {

    Optional<TalentPoolMember> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query("SELECT m FROM TalentPoolMember m WHERE m.talentPoolId = :poolId AND m.status = 'ACTIVE'")
    List<TalentPoolMember> findActiveByPool(@Param("poolId") UUID poolId);

    @Query("SELECT m FROM TalentPoolMember m WHERE m.tenantId = :tenantId AND m.employeeId = :employeeId AND m.status = 'ACTIVE'")
    List<TalentPoolMember> findByEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    boolean existsByTalentPoolIdAndEmployeeId(UUID poolId, UUID employeeId);

    Optional<TalentPoolMember> findByTalentPoolIdAndEmployeeId(UUID poolId, UUID employeeId);
}
