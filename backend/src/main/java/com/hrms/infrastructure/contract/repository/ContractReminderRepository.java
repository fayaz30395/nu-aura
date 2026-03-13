package com.hrms.infrastructure.contract.repository;

import com.hrms.domain.contract.ContractReminder;
import com.hrms.domain.contract.ReminderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for ContractReminder entity
 */
@Repository
public interface ContractReminderRepository extends JpaRepository<ContractReminder, UUID> {

    List<ContractReminder> findByContractId(UUID contractId);

    List<ContractReminder> findByContractIdAndReminderType(UUID contractId, ReminderType reminderType);

    @Query("SELECT cr FROM ContractReminder cr WHERE cr.contractId = :contractId AND cr.reminderType = :reminderType " +
            "AND cr.isCompleted = false")
    Optional<ContractReminder> findPendingReminder(
            @Param("contractId") UUID contractId,
            @Param("reminderType") ReminderType reminderType
    );

    @Query("SELECT cr FROM ContractReminder cr WHERE cr.reminderDate <= CURRENT_DATE AND cr.isCompleted = false")
    List<ContractReminder> findOverdueReminders();

    @Query("SELECT cr FROM ContractReminder cr WHERE cr.reminderDate = CURRENT_DATE AND cr.isCompleted = false")
    List<ContractReminder> findRemindersForToday();

    @Query("SELECT cr FROM ContractReminder cr WHERE cr.reminderDate BETWEEN :startDate AND :endDate " +
            "AND cr.isCompleted = false")
    List<ContractReminder> findRemindersInDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
