package com.hrms.infrastructure.shift.repository;

import com.hrms.domain.shift.ShiftPattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShiftPatternRepository extends JpaRepository<ShiftPattern, UUID> {

    Optional<ShiftPattern> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<ShiftPattern> findAllByTenantId(UUID tenantId, Pageable pageable);

    List<ShiftPattern> findAllByTenantIdAndIsActive(UUID tenantId, Boolean isActive);

    boolean existsByTenantIdAndName(UUID tenantId, String name);
}
