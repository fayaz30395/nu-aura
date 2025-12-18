package com.hrms.domain.user.repository;

import com.hrms.domain.user.model.UserNotificationPreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserNotificationPreferencesRepository extends JpaRepository<UserNotificationPreferences, UUID> {

    Optional<UserNotificationPreferences> findByUserIdAndTenantId(UUID userId, UUID tenantId);

    boolean existsByUserIdAndTenantId(UUID userId, UUID tenantId);
}
