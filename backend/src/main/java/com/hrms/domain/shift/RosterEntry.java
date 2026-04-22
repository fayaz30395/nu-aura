package com.hrms.domain.shift;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "roster_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class RosterEntry extends TenantAware {


    @Column(name = "roster_id", nullable = false)
    private UUID rosterId;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "shift_id", nullable = false)
    private UUID shiftId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_type")
    @Builder.Default
    private DayType dayType = DayType.WORKING;

    @Column(name = "is_overtime")
    @Builder.Default
    private Boolean isOvertime = false;

    @Column(name = "notes")
    private String notes;

    @Column(name = "is_published")
    @Builder.Default
    private Boolean isPublished = false;

    @Column(name = "is_acknowledged")
    @Builder.Default
    private Boolean isAcknowledged = false;

    @Column(name = "acknowledged_date")
    private LocalDate acknowledgedDate;

    public enum DayType {
        WORKING,
        WEEKLY_OFF,
        HOLIDAY,
        LEAVE,
        COMP_OFF,
        TRAINING
    }
}
