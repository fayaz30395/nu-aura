package com.hrms.domain.performance;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "pip_check_ins", indexes = {
        @Index(name = "idx_pip_checkin_tenant", columnList = "tenantId"),
        @Index(name = "idx_pip_checkin_pip", columnList = "pip_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PIPCheckIn extends TenantAware {

    @Column(name = "pip_id", nullable = false)
    private UUID pipId;

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "progress_notes", columnDefinition = "TEXT")
    private String progressNotes;

    @Column(name = "manager_comments", columnDefinition = "TEXT")
    private String managerComments;

    @Column(name = "goal_updates", columnDefinition = "TEXT")
    private String goalUpdates; // JSON: [{goalIndex, achieved}]
}
