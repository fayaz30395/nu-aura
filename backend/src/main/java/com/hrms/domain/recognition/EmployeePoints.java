package com.hrms.domain.recognition;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "employee_points",
       uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id", "tenant_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class EmployeePoints extends TenantAware {


    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Builder.Default
    private Integer totalPointsEarned = 0;

    @Builder.Default
    private Integer totalPointsRedeemed = 0;

    @Builder.Default
    private Integer currentBalance = 0;

    @Builder.Default
    private Integer recognitionsGiven = 0;

    @Builder.Default
    private Integer recognitionsReceived = 0;

    private LocalDateTime lastActivityAt;

    public void addPoints(int points) {
        this.totalPointsEarned += points;
        this.currentBalance += points;
        this.lastActivityAt = LocalDateTime.now();
    }

    public void redeemPoints(int points) {
        if (points > this.currentBalance) {
            throw new IllegalArgumentException("Insufficient points balance");
        }
        this.totalPointsRedeemed += points;
        this.currentBalance -= points;
        this.lastActivityAt = LocalDateTime.now();
    }

    public void incrementRecognitionsGiven() {
        this.recognitionsGiven++;
        this.lastActivityAt = LocalDateTime.now();
    }

    public void incrementRecognitionsReceived() {
        this.recognitionsReceived++;
        this.lastActivityAt = LocalDateTime.now();
    }
}
