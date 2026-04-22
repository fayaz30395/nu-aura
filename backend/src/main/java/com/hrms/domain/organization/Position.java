package com.hrms.domain.organization;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "positions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Position extends TenantAware {


    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    private UUID departmentId;

    private UUID reportsToPositionId;

    @Enumerated(EnumType.STRING)
    private JobLevel level;

    @Enumerated(EnumType.STRING)
    private JobFamily jobFamily;

    @Builder.Default
    private Integer headcount = 1; // Approved headcount

    @Builder.Default
    private Integer filledCount = 0;

    private String gradeMin;
    private String gradeMax;

    @Column(columnDefinition = "TEXT")
    private String requiredSkills;

    @Column(columnDefinition = "TEXT")
    private String responsibilities;

    @Builder.Default
    private Boolean isCritical = false;

    @Builder.Default
    private Boolean isActive = true;

    private String location;

    public int getVacancies() {
        return headcount - filledCount;
    }

    public boolean hasVacancy() {
        return getVacancies() > 0;
    }

    public enum JobLevel {
        ENTRY,
        JUNIOR,
        MID,
        SENIOR,
        LEAD,
        MANAGER,
        SENIOR_MANAGER,
        DIRECTOR,
        VP,
        SVP,
        C_LEVEL,
        EXECUTIVE
    }

    public enum JobFamily {
        ENGINEERING,
        PRODUCT,
        DESIGN,
        DATA,
        SALES,
        MARKETING,
        FINANCE,
        HR,
        OPERATIONS,
        LEGAL,
        CUSTOMER_SUCCESS,
        IT,
        ADMIN,
        EXECUTIVE,
        OTHER
    }
}
