package com.hrms.infrastructure.attendance.repository;

import com.hrms.domain.attendance.BiometricApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BiometricApiKeyRepository extends JpaRepository<BiometricApiKey, UUID> {

    Optional<BiometricApiKey> findByKeyHashAndIsActiveTrueAndIsDeletedFalse(String keyHash);

    List<BiometricApiKey> findByTenantIdAndIsDeletedFalse(UUID tenantId);

    List<BiometricApiKey> findByDeviceIdAndIsDeletedFalse(UUID deviceId);

    Optional<BiometricApiKey> findByIdAndTenantIdAndIsDeletedFalse(UUID id, UUID tenantId);
}
