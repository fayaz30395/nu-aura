package com.hrms.domain.contract;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * ContractReminder entity for managing contract reminders (expiry, renewal, review)
 */
@Entity
@Table(name = "contract_reminders", indexes = {
        @Index(name = "idx_contract_reminders_contract_id", columnList = "contract_id"),
        @Index(name = "idx_contract_reminders_reminder_date", columnList = "reminder_date"),
        @Index(name = "idx_contract_reminders_reminder_type", columnList = "reminder_type"),
        @Index(name = "idx_contract_reminders_is_completed", columnList = "is_completed"),
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ContractReminder extends TenantAware {

    @Column(nullable = false)
    private UUID contractId;

    @Column(nullable = false)
    private LocalDate reminderDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ReminderType reminderType;

    @Column
    private Boolean isCompleted;

    @Column
    private LocalDateTime notifiedAt;

    public boolean isOverdue() {
        return LocalDate.now().isAfter(reminderDate) && !isCompleted;
    }

    public boolean isDueToday() {
        return LocalDate.now().isEqual(reminderDate) && !isCompleted;
    }

    public void markAsCompleted() {
        this.isCompleted = true;
        this.notifiedAt = LocalDateTime.now();
    }
}
