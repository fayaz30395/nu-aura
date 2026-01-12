package com.hrms.infrastructure.wellness.repository;

import com.hrms.domain.wellness.WellnessProgram;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WellnessProgramRepository extends JpaRepository<WellnessProgram, UUID> {

    Optional<WellnessProgram> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<WellnessProgram> findByTenantId(UUID tenantId, Pageable pageable);

    List<WellnessProgram> findByTenantIdAndIsActiveTrue(UUID tenantId);

    @Query("SELECT p FROM WellnessProgram p WHERE p.tenantId = :tenantId AND p.isActive = true " +
           "AND (p.startDate IS NULL OR p.startDate <= :date) " +
           "AND (p.endDate IS NULL OR p.endDate >= :date)")
    List<WellnessProgram> findActivePrograms(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT p FROM WellnessProgram p WHERE p.tenantId = :tenantId AND p.isFeatured = true AND p.isActive = true")
    List<WellnessProgram> findFeaturedPrograms(@Param("tenantId") UUID tenantId);

    @Query("SELECT p FROM WellnessProgram p WHERE p.tenantId = :tenantId AND p.category = :category AND p.isActive = true")
    List<WellnessProgram> findByCategory(@Param("tenantId") UUID tenantId,
                                          @Param("category") WellnessProgram.ProgramCategory category);

    @Query("SELECT p FROM WellnessProgram p WHERE p.tenantId = :tenantId AND p.programType = :type AND p.isActive = true")
    List<WellnessProgram> findByType(@Param("tenantId") UUID tenantId,
                                      @Param("type") WellnessProgram.ProgramType type);
}
