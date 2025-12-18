package com.hrms.infrastructure.recognition.repository;

import com.hrms.domain.recognition.EmployeePoints;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmployeePointsRepository extends JpaRepository<EmployeePoints, UUID> {

    Optional<EmployeePoints> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    @Query("SELECT ep FROM EmployeePoints ep WHERE ep.tenantId = :tenantId ORDER BY ep.currentBalance DESC")
    List<EmployeePoints> findTopByPoints(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT ep FROM EmployeePoints ep WHERE ep.tenantId = :tenantId ORDER BY ep.recognitionsReceived DESC")
    List<EmployeePoints> findTopByRecognitionsReceived(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT SUM(ep.totalPointsEarned) FROM EmployeePoints ep WHERE ep.tenantId = :tenantId")
    Long getTotalPointsEarned(@Param("tenantId") UUID tenantId);

    @Query("SELECT SUM(ep.totalPointsRedeemed) FROM EmployeePoints ep WHERE ep.tenantId = :tenantId")
    Long getTotalPointsRedeemed(@Param("tenantId") UUID tenantId);
}
