package com.hrms.infrastructure.contract.repository;

import com.hrms.domain.contract.ContractVersion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ContractVersion entity
 */
@Repository
public interface ContractVersionRepository extends JpaRepository<ContractVersion, UUID> {

    List<ContractVersion> findByContractIdOrderByVersionNumberDesc(UUID contractId);

    Page<ContractVersion> findByContractIdOrderByVersionNumberDesc(UUID contractId, Pageable pageable);

    Optional<ContractVersion> findByContractIdAndVersionNumber(UUID contractId, Integer versionNumber);

    @Query("SELECT COALESCE(MAX(cv.versionNumber), 0) FROM ContractVersion cv WHERE cv.contractId = :contractId")
    Integer findMaxVersionNumber(@Param("contractId") UUID contractId);
}
