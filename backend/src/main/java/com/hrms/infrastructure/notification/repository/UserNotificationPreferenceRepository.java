package com.hrms.infrastructure.notification.repository;

import com.hrms.domain.notification.UserNotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserNotificationPreferenceRepository extends JpaRepository<UserNotificationPreference, UUID> {

    List<UserNotificationPreference> findByUserIdAndTenantId(UUID userId, UUID tenantId);

    Optional<UserNotificationPreference> findByUserIdAndCategoryAndTenantId(UUID userId, String category, UUID tenantId);

    @Query("SELECT p FROM UserNotificationPreference p WHERE p.tenantId = :tenantId " +
            "AND p.userId = :userId AND p.emailEnabled = true")
    List<UserNotificationPreference> findEmailEnabledCategories(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT p FROM UserNotificationPreference p WHERE p.tenantId = :tenantId " +
            "AND p.userId = :userId AND p.pushEnabled = true")
    List<UserNotificationPreference> findPushEnabledCategories(@Param("tenantId") UUID tenantId, @Param("userId") UUID userId);

    @Query("SELECT DISTINCT p.userId FROM UserNotificationPreference p WHERE p.tenantId = :tenantId " +
            "AND p.category = :category AND p.digestFrequency = :frequency")
    List<UUID> findUsersForDigest(@Param("tenantId") UUID tenantId, @Param("category") String category, @Param("frequency") String frequency);

    void deleteByUserIdAndTenantId(UUID userId, UUID tenantId);
}
