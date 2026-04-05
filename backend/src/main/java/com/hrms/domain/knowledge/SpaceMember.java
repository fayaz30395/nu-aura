package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "wiki_space_members", indexes = {
        @Index(name = "idx_space_members_tenant", columnList = "tenantId"),
        @Index(name = "idx_space_members_space", columnList = "space_id"),
        @Index(name = "idx_space_members_user", columnList = "user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_space_member_tenant_space_user",
                columnNames = {"tenant_id", "space_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SpaceMember extends TenantAware {

    @Column(name = "space_id", nullable = false)
    private UUID spaceId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "added_by")
    private UUID addedBy;

    @Column(name = "added_at")
    private LocalDateTime addedAt;

    public enum Role {
        ADMIN,
        EDITOR,
        VIEWER
    }
}
