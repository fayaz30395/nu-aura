package com.hrms.domain.user.model;

import com.hrms.common.entity.BaseEntity;
import com.hrms.domain.tenant.Tenant;
import com.hrms.domain.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "user_basic_notification_preferences",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"user_id", "tenant_id"},
                name = "uk_notification_prefs_user_tenant"
        ))
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationPreferences extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "email_notifications", nullable = false)
    private Boolean emailNotifications = true;

    @Column(name = "push_notifications", nullable = false)
    private Boolean pushNotifications = true;

    @Column(name = "sms_notifications", nullable = false)
    private Boolean smsNotifications = false;

    @Column(name = "security_alerts", nullable = false)
    private Boolean securityAlerts = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Tenant tenant;
}
