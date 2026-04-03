package com.hrms.infrastructure.performance.repository;

import com.hrms.domain.performance.Feedback;
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
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    Optional<Feedback> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<Feedback> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<Feedback> findAllByTenantIdAndRecipientId(UUID tenantId, UUID recipientId);

    List<Feedback> findAllByTenantIdAndGiverId(UUID tenantId, UUID giverId);

    @Query("SELECT f FROM Feedback f WHERE f.tenantId = :tenantId " +
            "AND f.recipientId = :employeeId ORDER BY f.createdAt DESC")
    List<Feedback> findReceivedFeedback(@Param("tenantId") UUID tenantId,
                                        @Param("employeeId") UUID employeeId);

    @Query("SELECT f FROM Feedback f WHERE f.tenantId = :tenantId " +
            "AND f.giverId = :employeeId ORDER BY f.createdAt DESC")
    List<Feedback> findGivenFeedback(@Param("tenantId") UUID tenantId,
                                     @Param("employeeId") UUID employeeId);

    long countByTenantIdAndRecipientId(UUID tenantId, UUID recipientId);
}
