package com.hrms.domain.organization;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "talent_pool_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"talent_pool_id", "employee_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class TalentPoolMember extends TenantAware {


    @Column(name = "talent_pool_id", nullable = false)
    private UUID talentPoolId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    private LocalDate addedDate;

    private UUID addedBy;

    @Enumerated(EnumType.STRING)
    private MemberStatus status;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDate reviewDate;

    public enum MemberStatus {
        ACTIVE,
        ON_HOLD,
        GRADUATED,
        REMOVED
    }

    @PrePersist
    public void prePersist() {
        if (addedDate == null) {
            addedDate = LocalDate.now();
        }
        if (status == null) {
            status = MemberStatus.ACTIVE;
        }
    }
}
