package com.hrms.infrastructure.notification.repository;

import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationChannelConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationChannelConfigRepository extends JpaRepository<NotificationChannelConfig, UUID> {

    Optional<NotificationChannelConfig> findByChannelAndTenantId(NotificationChannel channel, UUID tenantId);

    List<NotificationChannelConfig> findByTenantId(UUID tenantId);

    List<NotificationChannelConfig> findByIsEnabledAndTenantId(Boolean isEnabled, UUID tenantId);

    boolean existsByChannelAndTenantId(NotificationChannel channel, UUID tenantId);
}
