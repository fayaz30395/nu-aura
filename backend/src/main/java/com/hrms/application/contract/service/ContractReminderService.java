package com.hrms.application.contract.service;

import com.hrms.common.security.TenantContext;
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

import com.hrms.domain.tenant.Tenant;
import com.hrms.infrastructure.tenant.repository.TenantRepository;

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
    private final TenantRepository tenantRepository;

    /**
     * Create or update expiry reminder for contract
     */
    @Transactional
    public void createOrUpdateExpiryReminder(UUID contractId, LocalDate expiryDate) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Optional<ContractReminder> existing = reminderRepository.findPendingReminder(contractId, ReminderType.EXPIRY);

        if (existing.isPresent()) {
            ContractReminder reminder = existing.get();
            reminder.setReminderDate(expiryDate);
            reminderRepository.save(reminder);
            log.debug("Updated expiry reminder for contract: {}", contractId);
        } else {
            // BUG-010 FIX: stamp tenantId so the reminder is properly scoped
            ContractReminder reminder = ContractReminder.builder()
                    .tenantId(tenantId)
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
    @Transactional
    public void createOrUpdateRenewalReminder(UUID contractId, LocalDate renewalDate) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Optional<ContractReminder> existing = reminderRepository.findPendingReminder(contractId, ReminderType.RENEWAL);

        if (existing.isPresent()) {
            ContractReminder reminder = existing.get();
            reminder.setReminderDate(renewalDate);
            reminderRepository.save(reminder);
            log.debug("Updated renewal reminder for contract: {}", contractId);
        } else {
            // BUG-010 FIX: stamp tenantId so the reminder is properly scoped
            ContractReminder reminder = ContractReminder.builder()
                    .tenantId(tenantId)
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
    @Transactional
    public void createOrUpdateReviewReminder(UUID contractId, LocalDate reviewDate) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        Optional<ContractReminder> existing = reminderRepository.findPendingReminder(contractId, ReminderType.REVIEW);

        if (existing.isPresent()) {
            ContractReminder reminder = existing.get();
            reminder.setReminderDate(reviewDate);
            reminderRepository.save(reminder);
            log.debug("Updated review reminder for contract: {}", contractId);
        } else {
            // BUG-010 FIX: stamp tenantId so the reminder is properly scoped
            ContractReminder reminder = ContractReminder.builder()
                    .tenantId(tenantId)
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
    @Transactional
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
    @Transactional(readOnly = true)
    public List<ContractReminder> getRemindersForToday() {
        return reminderRepository.findRemindersForToday();
    }

    /**
     * Get overdue reminders
     */
    @Transactional(readOnly = true)
    public List<ContractReminder> getOverdueReminders() {
        return reminderRepository.findOverdueReminders();
    }

    /**
     * Get reminders in date range
     */
    @Transactional(readOnly = true)
    public List<ContractReminder> getRemindersInDateRange(LocalDate startDate, LocalDate endDate) {
        return reminderRepository.findRemindersInDateRange(startDate, endDate);
    }

    /**
     * Scheduled task to auto-create reminders for expiring contracts.
     * Runs daily at 2 AM.
     *
     * <p>SEC-FIX: Iterates over all ACTIVE tenants and sets TenantContext per
     * iteration so that contract queries are properly scoped. Without tenant
     * context, queries would either fail or return cross-tenant data.</p>
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void autoCreateExpiryReminders() {
        log.info("Running scheduled task to auto-create expiry reminders");

        List<Tenant> activeTenants = tenantRepository.findByStatus(Tenant.TenantStatus.ACTIVE);
        for (Tenant tenant : activeTenants) {
            TenantContext.setCurrentTenant(tenant.getId());
            try {
                // TODO: Get active contracts expiring within reminder window and create reminders
                log.debug("Checked expiry reminders for tenant {}", tenant.getId());
            } catch (Exception e) {
                log.error("Error creating expiry reminders for tenant {}: {}", tenant.getId(), e.getMessage());
            } finally {
                TenantContext.clear();
            }
        }

        log.info("Expiry reminder job completed for {} tenant(s)", activeTenants.size());
    }

    /**
     * Scheduled task to auto-create renewal reminders for auto-renewable contracts.
     * Runs daily at 3 AM.
     *
     * <p>SEC-FIX: Iterates over all ACTIVE tenants and sets TenantContext per
     * iteration so that contract queries are properly scoped.</p>
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void autoCreateRenewalReminders() {
        log.info("Running scheduled task to auto-create renewal reminders");

        List<Tenant> activeTenants = tenantRepository.findByStatus(Tenant.TenantStatus.ACTIVE);
        for (Tenant tenant : activeTenants) {
            TenantContext.setCurrentTenant(tenant.getId());
            try {
                // TODO: Get active contracts with auto-renewal and create reminders
                log.debug("Checked renewal reminders for tenant {}", tenant.getId());
            } catch (Exception e) {
                log.error("Error creating renewal reminders for tenant {}: {}", tenant.getId(), e.getMessage());
            } finally {
                TenantContext.clear();
            }
        }

        log.info("Renewal reminder job completed for {} tenant(s)", activeTenants.size());
    }
}
