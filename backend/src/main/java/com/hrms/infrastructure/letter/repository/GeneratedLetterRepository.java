package com.hrms.infrastructure.letter.repository;

import com.hrms.domain.letter.GeneratedLetter;
import com.hrms.domain.letter.GeneratedLetter.LetterStatus;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GeneratedLetterRepository extends JpaRepository<GeneratedLetter, UUID>, JpaSpecificationExecutor<GeneratedLetter> {

    Optional<GeneratedLetter> findByIdAndTenantId(UUID id, UUID tenantId);

    Optional<GeneratedLetter> findByReferenceNumberAndTenantId(String referenceNumber, UUID tenantId);

    Page<GeneratedLetter> findByTenantId(UUID tenantId, Pageable pageable);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.employeeId = :employeeId AND l.tenantId = :tenantId ORDER BY l.createdAt DESC")
    List<GeneratedLetter> findByEmployeeId(@Param("employeeId") UUID employeeId, @Param("tenantId") UUID tenantId);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.employeeId = :employeeId AND l.tenantId = :tenantId ORDER BY l.createdAt DESC")
    Page<GeneratedLetter> findByEmployeeId(@Param("employeeId") UUID employeeId, @Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.tenantId = :tenantId AND l.status = :status ORDER BY l.createdAt DESC")
    Page<GeneratedLetter> findByStatus(@Param("tenantId") UUID tenantId,
                                       @Param("status") LetterStatus status,
                                       Pageable pageable);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.tenantId = :tenantId AND l.category = :category ORDER BY l.createdAt DESC")
    Page<GeneratedLetter> findByCategory(@Param("tenantId") UUID tenantId,
                                         @Param("category") LetterCategory category,
                                         Pageable pageable);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.tenantId = :tenantId AND l.status = 'PENDING_APPROVAL' ORDER BY l.createdAt")
    Page<GeneratedLetter> findPendingApprovals(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.employeeId = :employeeId AND l.tenantId = :tenantId " +
            "AND l.status = 'ISSUED' ORDER BY l.issuedAt DESC")
    List<GeneratedLetter> findIssuedLettersForEmployee(@Param("employeeId") UUID employeeId, @Param("tenantId") UUID tenantId);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.tenantId = :tenantId " +
            "AND l.letterDate >= :startDate AND l.letterDate <= :endDate ORDER BY l.letterDate DESC")
    List<GeneratedLetter> findByDateRange(@Param("tenantId") UUID tenantId,
                                          @Param("startDate") LocalDate startDate,
                                          @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(l) FROM GeneratedLetter l WHERE l.tenantId = :tenantId AND l.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") LetterStatus status);

    @Query("SELECT l.category, COUNT(l) FROM GeneratedLetter l " +
            "WHERE l.tenantId = :tenantId GROUP BY l.category")
    List<Object[]> countByCategory(@Param("tenantId") UUID tenantId);

    @Query("SELECT MAX(CAST(SUBSTRING(l.referenceNumber, -4) AS integer)) FROM GeneratedLetter l " +
            "WHERE l.tenantId = :tenantId AND l.referenceNumber LIKE :prefix%")
    Integer findMaxSequenceByPrefix(@Param("tenantId") UUID tenantId, @Param("prefix") String prefix);

    @Query("SELECT l FROM GeneratedLetter l WHERE l.generatedBy = :userId AND l.tenantId = :tenantId ORDER BY l.createdAt DESC")
    Page<GeneratedLetter> findByGeneratedBy(@Param("userId") UUID userId, @Param("tenantId") UUID tenantId, Pageable pageable);
}
