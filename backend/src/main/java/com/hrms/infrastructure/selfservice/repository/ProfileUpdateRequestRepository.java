package com.hrms.infrastructure.selfservice.repository;

import com.hrms.domain.selfservice.ProfileUpdateRequest;
import com.hrms.domain.selfservice.ProfileUpdateRequest.RequestStatus;
import com.hrms.domain.selfservice.ProfileUpdateRequest.UpdateCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProfileUpdateRequestRepository extends JpaRepository<ProfileUpdateRequest, UUID> {

    Optional<ProfileUpdateRequest> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ProfileUpdateRequest> findByTenantId(UUID tenantId, Pageable pageable);

    List<ProfileUpdateRequest> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Page<ProfileUpdateRequest> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    @Query("SELECT p FROM ProfileUpdateRequest p WHERE p.tenantId = :tenantId AND p.status = :status")
    Page<ProfileUpdateRequest> findByStatus(@Param("tenantId") UUID tenantId,
                                            @Param("status") RequestStatus status,
                                            Pageable pageable);

    @Query("SELECT p FROM ProfileUpdateRequest p WHERE p.tenantId = :tenantId AND p.status IN :statuses")
    Page<ProfileUpdateRequest> findByStatusIn(@Param("tenantId") UUID tenantId,
                                              @Param("statuses") List<RequestStatus> statuses,
                                              Pageable pageable);

    @Query("SELECT p FROM ProfileUpdateRequest p WHERE p.employeeId = :employeeId AND p.tenantId = :tenantId " +
            "AND p.category = :category AND p.status IN ('PENDING', 'UNDER_REVIEW')")
    List<ProfileUpdateRequest> findPendingByCategoryAndEmployee(@Param("employeeId") UUID employeeId,
                                                                @Param("tenantId") UUID tenantId,
                                                                @Param("category") UpdateCategory category);

    @Query("SELECT COUNT(p) FROM ProfileUpdateRequest p WHERE p.tenantId = :tenantId AND p.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") RequestStatus status);

    @Query("SELECT p FROM ProfileUpdateRequest p WHERE p.tenantId = :tenantId " +
            "AND p.createdAt >= :startDate AND p.createdAt <= :endDate")
    List<ProfileUpdateRequest> findByDateRange(@Param("tenantId") UUID tenantId,
                                               @Param("startDate") LocalDateTime startDate,
                                               @Param("endDate") LocalDateTime endDate);

    @Query("SELECT p.category, COUNT(p) FROM ProfileUpdateRequest p " +
            "WHERE p.tenantId = :tenantId GROUP BY p.category")
    List<Object[]> countByCategory(@Param("tenantId") UUID tenantId);

    @Query("SELECT p.status, COUNT(p) FROM ProfileUpdateRequest p " +
            "WHERE p.tenantId = :tenantId GROUP BY p.status")
    List<Object[]> countByStatusGroup(@Param("tenantId") UUID tenantId);
}
