package com.hrms.domain.announcement;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "announcement_reads", indexes = {
        @Index(name = "idx_ann_read_announcement", columnList = "announcement_id"),
        @Index(name = "idx_ann_read_employee", columnList = "employee_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_announcement_read", columnNames = {"announcement_id", "employee_id", "tenant_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AnnouncementRead extends TenantAware {

    @Column(name = "announcement_id", nullable = false)
    private UUID announcementId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "read_at", nullable = false)
    @Builder.Default
    private LocalDateTime readAt = LocalDateTime.now();

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "is_accepted")
    @Builder.Default
    private Boolean isAccepted = false;

    public void accept() {
        this.isAccepted = true;
        this.acceptedAt = LocalDateTime.now();
    }
}
