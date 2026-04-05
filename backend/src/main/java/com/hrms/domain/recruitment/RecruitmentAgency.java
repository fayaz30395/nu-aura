package com.hrms.domain.recruitment;

import com.hrms.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "recruitment_agencies", indexes = {
        @Index(name = "idx_agency_tenant", columnList = "tenant_id"),
        @Index(name = "idx_agency_tenant_status", columnList = "tenant_id,status"),
        @Index(name = "idx_agency_tenant_name", columnList = "tenant_id,name")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class RecruitmentAgency extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "contact_person", length = 200)
    private String contactPerson;

    @Column(name = "email", length = 200)
    private String email;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "website", length = 500)
    private String website;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "fee_type", length = 20)
    private FeeType feeType;

    @Column(name = "fee_amount", precision = 15, scale = 2)
    private BigDecimal feeAmount;

    @Column(name = "contract_start_date")
    private LocalDate contractStartDate;

    @Column(name = "contract_end_date")
    private LocalDate contractEndDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AgencyStatus status;

    @Column(name = "specializations", columnDefinition = "TEXT")
    private String specializations;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "rating")
    private Integer rating;

    public enum FeeType {
        FIXED, PERCENTAGE, RETAINER
    }

    public enum AgencyStatus {
        ACTIVE, INACTIVE, BLACKLISTED, PENDING_APPROVAL
    }
}
