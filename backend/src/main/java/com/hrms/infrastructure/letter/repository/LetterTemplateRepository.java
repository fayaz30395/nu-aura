package com.hrms.infrastructure.letter.repository;

import com.hrms.domain.letter.LetterTemplate;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
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
public interface LetterTemplateRepository extends JpaRepository<LetterTemplate, UUID> {

    Optional<LetterTemplate> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<LetterTemplate> findByCodeAndTenantId(String code, UUID tenantId);

    Page<LetterTemplate> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT t FROM LetterTemplate t WHERE t.tenantId = :tenantId AND t.isActive = true")
    List<LetterTemplate> findActiveTemplates(@Param("tenantId") UUID tenantId);

    @Query("SELECT t FROM LetterTemplate t WHERE t.tenantId = :tenantId AND t.isActive = true")
    Page<LetterTemplate> findActiveTemplates(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT t FROM LetterTemplate t WHERE t.tenantId = :tenantId AND t.category = :category AND t.isActive = true")
    List<LetterTemplate> findByCategory(@Param("tenantId") UUID tenantId, @Param("category") LetterCategory category);

    @Query("SELECT t FROM LetterTemplate t WHERE t.tenantId = :tenantId AND t.isSystemTemplate = true")
    List<LetterTemplate> findSystemTemplates(@Param("tenantId") UUID tenantId);

    @Query("SELECT t FROM LetterTemplate t WHERE t.tenantId = :tenantId AND t.isSystemTemplate = false")
    Page<LetterTemplate> findCustomTemplates(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT t FROM LetterTemplate t WHERE t.tenantId = :tenantId " +
            "AND (LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR LOWER(t.code) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<LetterTemplate> searchTemplates(@Param("tenantId") UUID tenantId,
                                         @Param("search") String search,
                                         Pageable pageable);

    @Query("SELECT t.category, COUNT(t) FROM LetterTemplate t " +
            "WHERE t.tenantId = :tenantId AND t.isActive = true GROUP BY t.category")
    List<Object[]> countByCategory(@Param("tenantId") UUID tenantId);

    boolean existsByCodeAndTenantId(String code, UUID tenantId);
}
