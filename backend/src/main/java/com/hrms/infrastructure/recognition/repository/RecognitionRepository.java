package com.hrms.infrastructure.recognition.repository;

import com.hrms.domain.recognition.Recognition;
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
public interface RecognitionRepository extends JpaRepository<Recognition, UUID> {

    Optional<Recognition> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Recognition> findByTenantIdAndIsPublicTrueAndIsApprovedTrue(UUID tenantId, Pageable pageable);

    @Query("SELECT r FROM Recognition r WHERE r.tenantId = :tenantId AND r.receiverId = :employeeId ORDER BY r.createdAt DESC")
    Page<Recognition> findByReceiver(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, Pageable pageable);

    @Query("SELECT r FROM Recognition r WHERE r.tenantId = :tenantId AND r.giverId = :employeeId ORDER BY r.createdAt DESC")
    Page<Recognition> findByGiver(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId, Pageable pageable);

    @Query("SELECT r FROM Recognition r WHERE r.tenantId = :tenantId AND r.isPublic = true AND r.isApproved = true " +
           "AND r.createdAt >= :since ORDER BY r.createdAt DESC")
    List<Recognition> findRecentPublicRecognitions(@Param("tenantId") UUID tenantId, @Param("since") LocalDateTime since);

    @Query("SELECT r.receiverId, COUNT(r) FROM Recognition r WHERE r.tenantId = :tenantId " +
           "AND r.createdAt >= :since GROUP BY r.receiverId ORDER BY COUNT(r) DESC")
    List<Object[]> findTopReceivers(@Param("tenantId") UUID tenantId, @Param("since") LocalDateTime since, Pageable pageable);

    @Query("SELECT r.giverId, COUNT(r) FROM Recognition r WHERE r.tenantId = :tenantId " +
           "AND r.createdAt >= :since GROUP BY r.giverId ORDER BY COUNT(r) DESC")
    List<Object[]> findTopGivers(@Param("tenantId") UUID tenantId, @Param("since") LocalDateTime since, Pageable pageable);

    @Query("SELECT COUNT(r) FROM Recognition r WHERE r.tenantId = :tenantId AND r.receiverId = :employeeId")
    long countByReceiver(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT COUNT(r) FROM Recognition r WHERE r.tenantId = :tenantId AND r.giverId = :employeeId")
    long countByGiver(@Param("tenantId") UUID tenantId, @Param("employeeId") UUID employeeId);

    @Query("SELECT r.category, COUNT(r) FROM Recognition r WHERE r.tenantId = :tenantId " +
           "GROUP BY r.category ORDER BY COUNT(r) DESC")
    List<Object[]> countByCategory(@Param("tenantId") UUID tenantId);

    Page<Recognition> findByTenantIdAndIsApprovedFalse(UUID tenantId, Pageable pageable);
}
