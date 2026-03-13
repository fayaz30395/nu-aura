package com.hrms.application.contract.service;

import com.hrms.domain.contract.Contract;
import com.hrms.domain.contract.ContractReminder;
import com.hrms.domain.contract.ReminderType;
import com.hrms.infrastructure.contract.repository.ContractReminderRepository;
import com.hrms.infrastructure.contract.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing contract reminders
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ContractReminderService {

    private final ContractReminderRepository reminderRepository;
    private final ContractRepository contractRepository;

    /**
     * Create or update expiry reminder for contract
     */
    public void createOrUpdateExpiryReminder(UUID contractId, LocalDate expiryDate) {
        Optional<ContractReminder> existing = reminderRepository.findPendingReminder(contractId, ReminderType.EXPIRY);

        if (existing.isPresent()) {
            ContractReminder reminder = existing.get();
            reminder.setReminderDate(expiryDate);
            reminderRepository.save(reminder);
            log.debug("Updated expiry reminder for contract: {}", contractId);
        } else {
            ContractReminder reminder = ContractReminder.builder()
                    .contractId(contractId)
                    .reminderDate(expiryDate)
                    .reminderType(ReminderType.EXPIRY)
                    .isCompleted(false)
                    .build();
            reminderRepository.save(reminder);
            log.debug("Created expiry reminder for contract: {}", contractId);
        }
    }

    /**
     * Create or update renewal reminder
     */
    public void createOrUpdateRenewalReminder(UUID contractId, LocalDate renewalDate) {
        Optional<ContractReminder> existing = reminderRepository.findPendingReminder(contractId, ReminderType.RENEWAL);

        if (existing.isPresent()) {
            ContractReminder reminder = existing.get();
            reminder.setReminderDate(renewalDate);
            reminderRepository.save(reminder);
            log.debug("Updated renewal reminder for contract: {}", contractId);
        } else {
            ContractReminder reminder = ContractReminder.builder()
                    .contractId(contractId)
                    .reminderDate(renewalDate)
                    .reminderType(ReminderType.RENEWAL)
                    .isCompleted(false)
                    .build();
            reminderRepository.save(reminder);
            log.debug("Created renewal reminder for contract: {}", contractId);
        }
    }

    /**
     * Create or update review reminder
     */
    public void createOrUpdateReviewReminder(UUID contractId, LocalDate reviewDate) {
        Optional<ContractReminder> existing = reminderRepository.findPendingReminder(contractId, ReminderType.REVIEW);

        if (existing.isPresent()) {
            ContractReminder reminder = existing.get();
            reminder.setReminderDate(reviewDate);
            reminderRepository.save(reminder);
            log.debug("Updated review reminder for contract: {}", contractId);
        } else {
            ContractReminder reminder = ContractReminder.builder()
                    .contractId(contractId)
                    .reminderDate(reviewDate)
                    .reminderType(ReminderType.REVIEW)
                    .isCompleted(false)
                    .build();
            reminderRepository.save(reminder);
            log.debug("Created review reminder for contract: {}", contractId);
        }
    }

    /**
     * Mark reminder as completed
     */
    public void markReminderAsCompleted(UUID reminderId) {
        Optional<ContractReminder> reminder = reminderRepository.findById(reminderId);
        reminder.ifPresent(r -> {
            r.markAsCompleted();
            reminderRepository.save(r);
            log.debug("Marked reminder as completed: {}", reminderId);
        });
    }

    /**
     * Get reminders due today
     */
    public List<ContractReminder> getRemindersForToday() {
        return reminderRepository.findRemindersForToday();
    }

    /**
     * Get overdue reminders
     */
    public List<ContractReminder> getOverdueReminders() {
        return reminderRepository.findOverdueReminders();
    }

    /**
     * Get reminders in date range
     */
    public List<ContractReminder> getRemindersInDateRange(LocalDate startDate, LocalDate endDate) {
        return reminderRepository.findRemindersInDateRange(startDate, endDate);
    }

    /**
     * Scheduled task to auto-create reminders for expiring contracts
     * Runs daily at 2 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void autoCreateExpiryReminders() {
        log.info("Running scheduled task to auto-create expiry reminders");
        // Get all active contracts and check expiry
        // This would be called by the scheduler
    }

    /**
     * Scheduled task to auto-create renewal reminders for auto-renewable contracts
     * Runs daily at 3 AM
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void autoCreateRenewalReminders() {
        log.info("Running scheduled task to auto-create renewal reminders");
        // Get all active contracts with auto-renewal and create reminders
    }
}
