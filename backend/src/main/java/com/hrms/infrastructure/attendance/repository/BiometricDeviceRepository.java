package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.BiometricDevice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BiometricDeviceRepository
        extends JpaRepository<BiometricDevice, UUID>, JpaSpecificationExecutor<BiometricDevice> {

    Page<BiometricDevice> findByTenantIdAndIsDeletedFalse(UUID tenantId, Pageable pageable);

    Page<BiometricDevice> findByTenantIdAndIsActiveAndIsDeletedFalse(UUID tenantId, Boolean isActive, Pageable pageable);

    Optional<BiometricDevice> findBySerialNumberAndTenantIdAndIsDeletedFalse(String serialNumber, UUID tenantId);

    Optional<BiometricDevice> findByIdAndTenantIdAndIsDeletedFalse(UUID id, UUID tenantId);

    boolean existsBySerialNumberAndTenantId(String serialNumber, UUID tenantId);

    long countByTenantIdAndIsActiveAndIsDeletedFalse(UUID tenantId, Boolean isActive);
}
