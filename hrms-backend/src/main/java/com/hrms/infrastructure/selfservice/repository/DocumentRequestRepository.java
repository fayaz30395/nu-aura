package com.hrms.infrastructure.selfservice.repository;

import com.hrms.domain.selfservice.DocumentRequest;
import com.hrms.domain.selfservice.DocumentRequest.DocumentType;
import com.hrms.domain.selfservice.DocumentRequest.RequestStatus;
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
public interface DocumentRequestRepository extends JpaRepository<DocumentRequest, UUID> {

    Optional<DocumentRequest> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<DocumentRequest> findByTenantId(UUID tenantId, Pageable pageable);

    List<DocumentRequest> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId);

    Page<DocumentRequest> findByEmployeeIdAndTenantId(UUID employeeId, UUID tenantId, Pageable pageable);

    @Query("SELECT d FROM DocumentRequest d WHERE d.tenantId = :tenantId AND d.status = :status ORDER BY d.priority, d.createdAt")
    Page<DocumentRequest> findByStatus(@Param("tenantId") UUID tenantId,
                                       @Param("status") RequestStatus status,
                                       Pageable pageable);

    @Query("SELECT d FROM DocumentRequest d WHERE d.tenantId = :tenantId AND d.status IN :statuses ORDER BY d.priority, d.createdAt")
    Page<DocumentRequest> findByStatusIn(@Param("tenantId") UUID tenantId,
                                         @Param("statuses") List<RequestStatus> statuses,
                                         Pageable pageable);

    @Query("SELECT d FROM DocumentRequest d WHERE d.tenantId = :tenantId " +
           "AND d.requiredByDate <= :date AND d.status IN ('PENDING', 'IN_PROGRESS') ORDER BY d.requiredByDate")
    List<DocumentRequest> findUrgentRequests(@Param("tenantId") UUID tenantId, @Param("date") LocalDate date);

    @Query("SELECT d FROM DocumentRequest d WHERE d.tenantId = :tenantId AND d.documentType = :type")
    Page<DocumentRequest> findByDocumentType(@Param("tenantId") UUID tenantId,
                                             @Param("type") DocumentType type,
                                             Pageable pageable);

    @Query("SELECT COUNT(d) FROM DocumentRequest d WHERE d.tenantId = :tenantId AND d.status = :status")
    long countByStatus(@Param("tenantId") UUID tenantId, @Param("status") RequestStatus status);

    @Query("SELECT d.documentType, COUNT(d) FROM DocumentRequest d " +
           "WHERE d.tenantId = :tenantId GROUP BY d.documentType")
    List<Object[]> countByDocumentType(@Param("tenantId") UUID tenantId);

    @Query("SELECT d FROM DocumentRequest d WHERE d.employeeId = :employeeId AND d.tenantId = :tenantId " +
           "AND d.documentType = :type AND d.status IN ('PENDING', 'IN_PROGRESS')")
    List<DocumentRequest> findPendingByTypeAndEmployee(@Param("employeeId") UUID employeeId,
                                                        @Param("tenantId") UUID tenantId,
                                                        @Param("type") DocumentType type);

    @Query("SELECT d FROM DocumentRequest d WHERE d.processedBy = :processedBy AND d.tenantId = :tenantId")
    Page<DocumentRequest> findByProcessedBy(@Param("processedBy") UUID processedBy,
                                            @Param("tenantId") UUID tenantId,
                                            Pageable pageable);
}
