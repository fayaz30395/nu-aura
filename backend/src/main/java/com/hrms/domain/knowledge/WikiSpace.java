package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "wiki_spaces", indexes = {
        @Index(name = "idx_wiki_spaces_tenant", columnList = "tenantId"),
        @Index(name = "idx_wiki_spaces_visibility", columnList = "visibility"),
        @Index(name = "idx_wiki_spaces_is_archived", columnList = "is_archived")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WikiSpace extends TenantAware {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 200, unique = true)
    private String slug;

    @Column(length = 50)
    private String icon;

    @Column(length = 50, nullable = false)
    @Enumerated(EnumType.STRING)
    private VisibilityLevel visibility;

    @Column(length = 7)
    private String color;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Builder.Default
    @Column(name = "is_archived", nullable = false)
    private Boolean isArchived = false;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @Column(name = "archived_by")
    private UUID archivedBy;

    @Builder.Default
    @Column(name = "approval_enabled", nullable = false)
    private Boolean approvalEnabled = false;

    @Column(name = "approver_employee_id")
    private UUID approverEmployeeId;

    public enum VisibilityLevel {
        PUBLIC, ORGANIZATION, TEAM, PRIVATE, RESTRICTED
    }
}
