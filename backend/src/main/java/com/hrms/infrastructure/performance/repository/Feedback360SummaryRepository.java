package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.Feedback360Summary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface Feedback360SummaryRepository extends JpaRepository<Feedback360Summary, UUID> {

    Optional<Feedback360Summary> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<Feedback360Summary> findByCycleIdAndSubjectEmployeeIdAndTenantId(UUID cycleId, UUID subjectEmployeeId, UUID tenantId);

    @Query("SELECT s FROM Feedback360Summary s WHERE s.tenantId = :tenantId AND s.cycleId = :cycleId")
    List<Feedback360Summary> findAllByCycleId(@Param("tenantId") UUID tenantId, @Param("cycleId") UUID cycleId);

    Page<Feedback360Summary> findAllByCycleIdAndTenantId(UUID cycleId, UUID tenantId, Pageable pageable);

    @Query("SELECT s FROM Feedback360Summary s WHERE s.tenantId = :tenantId AND s.subjectEmployeeId = :employeeId ORDER BY s.createdAt DESC")
    List<Feedback360Summary> findAllForEmployee(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    void deleteAllByCycleId(UUID cycleId);
}
