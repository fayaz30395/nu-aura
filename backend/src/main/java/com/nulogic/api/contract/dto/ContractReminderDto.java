package com.nulogic.api.contract.dto;

import com.nulogic.domain.contract.ReminderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for contract reminder response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractReminderDto {

    private UUID id;
    private UUID contractId;
    private LocalDate reminderDate;
    private ReminderType reminderType;
    private Boolean isCompleted;
    private LocalDateTime notifiedAt;
}
