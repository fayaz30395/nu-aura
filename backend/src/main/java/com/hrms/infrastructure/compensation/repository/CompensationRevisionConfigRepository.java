package com.hrms.infrastructure.compensation.repository;

import com.hrms.domain.compensation.CompensationRevisionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompensationRevisionConfigRepository extends JpaRepository<CompensationRevisionConfig, UUID> {

    @Query("SELECT c FROM CompensationRevisionConfig c " +
           "WHERE c.tenantId = :tenantId AND c.isActive = true " +
           "ORDER BY c.ratingLabel ASC")
    List<CompensationRevisionConfig> findActiveByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT c FROM CompensationRevisionConfig c " +
           "WHERE c.tenantId = :tenantId AND c.ratingLabel = :ratingLabel AND c.isActive = true")
    Optional<CompensationRevisionConfig> findByTenantIdAndRatingLabel(
            @Param("tenantId") UUID tenantId,
            @Param("ratingLabel") String ratingLabel);
}
