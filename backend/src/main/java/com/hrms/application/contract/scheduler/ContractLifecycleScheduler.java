package com.hrms.application.contract.scheduler;

import com.hrms.common.metrics.MetricsService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.contract.Contract;
import com.hrms.domain.contract.ContractReminder;
import com.hrms.domain.contract.ContractStatus;
import com.hrms.domain.contract.ReminderType;
import com.hrms.domain.notification.Notification;
import com.hrms.application.notification.service.NotificationService;
import com.hrms.infrastructure.contract.repository.ContractReminderRepository;
import com.hrms.infrastructure.contract.repository.ContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Scheduled job for contract lifecycle automation.
 *
 * <p>Responsibilities:</p>
 * <ol>
 *   <li><b>Auto-Expire:</b> Marks active contracts past their end date as EXPIRED.</li>
 *   <li><b>Auto-Renew:</b> Renews eligible auto-renewable contracts past their end date.</li>
 *   <li><b>Reminder Creation:</b> Creates idempotent reminders for contracts approaching expiry
 *       at configurable day intervals (default: 30, 15, 7 days before).</li>
 *   <li><b>Notification Dispatch:</b> Sends notifications for due/overdue reminders that
 *       have not yet been notified.</li>
 * </ol>
 *
 * <p>Runs daily at 02:30 AM UTC. Processes all active tenants sequentially with
 * per-tenant failure isolation — one tenant's error does not block others.</p>
 *
 * <p>Idempotency: The scheduler can be run multiple times on the same day without
 * creating duplicate reminders, thanks to a unique partial index on
 * {@code (contract_id, reminder_type, reminder_date) WHERE is_completed = false}
 * and an application-level existence check before insert.</p>
 */
@Component
@ConditionalOnProperty(name = "app.contract.lifecycle.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class ContractLifecycleScheduler {

    /** Default reminder windows in days before expiry */
    /**
     * Default reminder windows in days before expiry (ascending order)
     */
    private static final int[] DEFAULT_REMINDER_DAYS = {7, 15, 30};

    private final ContractRepository contractRepository;
    private final ContractReminderRepository reminderRepository;
    private final NotificationService notificationService;
    private final MetricsService metricsService;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Main daily lifecycle job.
     * Cron: 02:30 AM UTC every day.
     */
    @Scheduled(cron = "${app.contract.lifecycle.cron:0 30 2 * * *}", zone = "UTC")
    @SchedulerLock(name = "processContractLifecycle", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void processContractLifecycle() {
        log.info("ContractLifecycleScheduler: starting daily contract lifecycle run");

        List<UUID> tenants = fetchActiveTenants();
        int totalExpired = 0;
        int totalRenewed = 0;
        int totalRemindersCreated = 0;
        int totalNotificationsSent = 0;
        int tenantsWithErrors = 0;

        for (UUID tenantId : tenants) {
            try {
                TenantContext.setCurrentTenant(tenantId);

                int expired = autoExpireContracts(tenantId);
                int renewed = autoRenewContracts(tenantId);
                int reminders = createExpiryReminders(tenantId);
                int notifications = dispatchDueReminders(tenantId);

                totalExpired += expired;
                totalRenewed += renewed;
                totalRemindersCreated += reminders;
                totalNotificationsSent += notifications;

                // Record per-tenant metrics
                metricsService.recordContractExpiryAlert(tenantId, reminders, expired);

            } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                tenantsWithErrors++;
                log.error("ContractLifecycleScheduler: failed for tenant {}: {}",
                        tenantId, e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }

        log.info("ContractLifecycleScheduler: completed. Tenants: {}, Expired: {}, Renewed: {}, " +
                        "Reminders created: {}, Notifications sent: {}, Tenants with errors: {}",
                tenants.size(), totalExpired, totalRenewed,
                totalRemindersCreated, totalNotificationsSent, tenantsWithErrors);
    }

    // ========== Step 1: Auto-Expire Contracts ==========

    /**
     * Find active contracts past their end date and mark them as EXPIRED.
     * Contracts with {@code autoRenew = true} are skipped (handled by auto-renew step).
     *
     * @return number of contracts expired
     */
    @Transactional
    public int autoExpireContracts(UUID tenantId) {
        if (!isAutoExpireEnabled(tenantId)) {
            return 0;
        }

        List<Contract> pastDue = contractRepository.findActiveContractsPastEndDate(tenantId);

        int expiredCount = 0;
        for (Contract contract : pastDue) {
            // Skip auto-renewable contracts — they will be handled by autoRenewContracts()
            if (Boolean.TRUE.equals(contract.getAutoRenew())) {
                continue;
            }

            ContractStatus previousStatus = contract.getStatus();
            contract.markAsExpired();
            contractRepository.save(contract);

            metricsService.recordContractStatusChange(tenantId, previousStatus.name(), ContractStatus.EXPIRED.name());
            metricsService.recordContractLifecycle(tenantId, "auto_expire", contract.getType().name());

            log.info("Auto-expired contract {} (tenant={})", contract.getId(), tenantId);
            expiredCount++;
        }

        if (expiredCount > 0) {
            log.debug("Auto-expired {} contracts for tenant {}", expiredCount, tenantId);
        }

        return expiredCount;
    }

    // ========== Step 2: Auto-Renew Contracts ==========

    /**
     * Find auto-renewable contracts past their end date and extend them.
     * Sets the new end date based on {@code renewalPeriodDays} and changes status to RENEWED.
     *
     * @return number of contracts renewed
     */
    @Transactional
    public int autoRenewContracts(UUID tenantId) {
        if (!isAutoRenewEnabled(tenantId)) {
            return 0;
        }

        List<Contract> eligible = contractRepository.findAutoRenewalEligibleContracts(tenantId);

        int renewedCount = 0;
        for (Contract contract : eligible) {
            if (contract.getEndDate() == null || contract.getRenewalPeriodDays() == null) {
                log.warn("Auto-renewable contract {} missing endDate or renewalPeriodDays, skipping", contract.getId());
                continue;
            }

            LocalDate newEndDate = contract.getEndDate().plusDays(contract.getRenewalPeriodDays());
            ContractStatus previousStatus = contract.getStatus();

            contract.setEndDate(newEndDate);
            contract.markAsRenewed();
            contractRepository.save(contract);

            metricsService.recordContractStatusChange(tenantId, previousStatus.name(), ContractStatus.RENEWED.name());
            metricsService.recordContractLifecycle(tenantId, "auto_renew", contract.getType().name());

            log.info("Auto-renewed contract {} (tenant={}, new end date={})", contract.getId(), tenantId, newEndDate);
            renewedCount++;
        }

        if (renewedCount > 0) {
            log.debug("Auto-renewed {} contracts for tenant {}", renewedCount, tenantId);
        }

        return renewedCount;
    }

    // ========== Step 3: Create Expiry Reminders ==========

    /**
     * For each active contract approaching expiry, create idempotent reminders at
     * the configured day intervals. Skips if a pending (not completed) reminder
     * already exists for the same contract + type + date.
     *
     * @return number of new reminders created
     */
    @Transactional
    public int createExpiryReminders(UUID tenantId) {
        int[] reminderDays = getReminderDaysForTenant(tenantId);
        int maxWindow = Arrays.stream(reminderDays).max().orElse(30);

        LocalDate windowEnd = LocalDate.now().plusDays(maxWindow);
        List<Contract> approachingExpiry = contractRepository.findActiveContractsExpiringBefore(tenantId, windowEnd);

        int remindersCreated = 0;
        for (Contract contract : approachingExpiry) {
            for (int daysBefore : reminderDays) {
                LocalDate reminderDate = contract.getEndDate().minusDays(daysBefore);

                // Only create future or today reminders
                if (reminderDate.isBefore(LocalDate.now())) {
                    continue;
                }

                // Idempotency check: skip if a pending reminder already exists
                if (reminderRepository.existsPendingReminder(
                        contract.getId(), ReminderType.EXPIRY, reminderDate)) {
                    continue;
                }

                ContractReminder reminder = ContractReminder.builder()
                        .tenantId(tenantId)
                        .contractId(contract.getId())
                        .reminderDate(reminderDate)
                        .reminderType(ReminderType.EXPIRY)
                        .isCompleted(false)
                        .build();

                reminderRepository.save(reminder);
                remindersCreated++;

                log.debug("Created expiry reminder for contract {} on {} ({}d before)",
                        contract.getId(), reminderDate, daysBefore);
            }

            // Also create a renewal reminder if the contract is auto-renewable
            if (Boolean.TRUE.equals(contract.getAutoRenew())) {
                LocalDate renewalReminderDate = contract.getEndDate().minusDays(
                        Math.min(reminderDays[0], 7));

                if (!renewalReminderDate.isBefore(LocalDate.now())
                        && !reminderRepository.existsPendingReminder(
                        contract.getId(), ReminderType.RENEWAL, renewalReminderDate)) {

                    ContractReminder renewalReminder = ContractReminder.builder()
                            .tenantId(tenantId)
                            .contractId(contract.getId())
                            .reminderDate(renewalReminderDate)
                            .reminderType(ReminderType.RENEWAL)
                            .isCompleted(false)
                            .build();

                    reminderRepository.save(renewalReminder);
                    remindersCreated++;

                    log.debug("Created renewal reminder for auto-renewable contract {} on {}",
                            contract.getId(), renewalReminderDate);
                }
            }
        }

        if (remindersCreated > 0) {
            log.debug("Created {} reminders for tenant {}", remindersCreated, tenantId);
        }

        return remindersCreated;
    }

    // ========== Step 4: Dispatch Due Reminders as Notifications ==========

    /**
     * Send notifications for reminders that are due today or overdue and have
     * not yet been notified. Marks reminders as notified after dispatch.
     *
     * @return number of notifications sent
     */
    @Transactional
    public int dispatchDueReminders(UUID tenantId) {
        List<ContractReminder> dueReminders = reminderRepository.findUnnotifiedDueReminders(tenantId);

        int notificationsSent = 0;
        for (ContractReminder reminder : dueReminders) {
            try {
                Contract contract = contractRepository.findByIdAndTenantId(reminder.getContractId(), tenantId)
                        .orElse(null);

                if (contract == null) {
                    log.warn("Contract {} not found for reminder {}, marking as completed",
                            reminder.getContractId(), reminder.getId());
                    reminder.markAsCompleted();
                    reminderRepository.save(reminder);
                    continue;
                }

                // Determine notification recipient
                UUID recipientId = contract.getCreatedBy();
                if (recipientId == null && contract.getEmployeeId() != null) {
                    recipientId = resolveUserIdForEmployee(contract.getEmployeeId(), tenantId);
                }

                if (recipientId == null) {
                    log.warn("No recipient found for contract {} reminder {}", contract.getId(), reminder.getId());
                    // Still mark as notified to avoid infinite retries
                    reminder.setNotifiedAt(LocalDateTime.now());
                    reminderRepository.save(reminder);
                    continue;
                }

                String title = buildNotificationTitle(reminder, contract);
                String message = buildNotificationMessage(reminder, contract);

                notificationService.createNotification(
                        recipientId,
                        Notification.NotificationType.REMINDER,
                        title,
                        message,
                        contract.getId(),
                        "Contract",
                        "/contracts/" + contract.getId(),
                        reminder.getReminderType() == ReminderType.EXPIRY
                                ? Notification.Priority.HIGH
                                : Notification.Priority.NORMAL
                );

                // Mark as notified (not completed — user may still need to take action)
                reminder.setNotifiedAt(LocalDateTime.now());
                reminderRepository.save(reminder);

                notificationsSent++;
            } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
                log.error("Failed to dispatch reminder {} for contract {}: {}",
                        reminder.getId(), reminder.getContractId(), e.getMessage(), e);
            }
        }

        if (notificationsSent > 0) {
            log.debug("Dispatched {} notifications for tenant {}", notificationsSent, tenantId);
        }

        return notificationsSent;
    }

    // ========== Configuration Helpers ==========

    private TenantLifecycleConfig loadTenantConfig(UUID tenantId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT auto_expire_enabled, auto_renew_enabled, reminder_days_before_expiry " +
                            "FROM contract_lifecycle_config WHERE tenant_id = ?",
                    (rs, rowNum) -> {
                        boolean autoExpire = rs.getBoolean("auto_expire_enabled");
                        boolean autoRenew = rs.getBoolean("auto_renew_enabled");
                        String daysConfig = rs.getString("reminder_days_before_expiry");
                        int[] days = DEFAULT_REMINDER_DAYS;
                        if (daysConfig != null && !daysConfig.isBlank()) {
                            try {
                                days = Arrays.stream(daysConfig.split(","))
                                        .map(String::trim)
                                        .mapToInt(Integer::parseInt)
                                        .sorted()
                                        .toArray();
                            } catch (NumberFormatException e) {
                                log.warn("Invalid reminder_days_before_expiry for tenant {}: {}", tenantId, daysConfig);
                            }
                        }
                        return new TenantLifecycleConfig(autoExpire, autoRenew, days);
                    },
                    tenantId);
        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            log.debug("Using default lifecycle config for tenant {} (no config row found)", tenantId);
            return TenantLifecycleConfig.DEFAULTS;
        }
    }

    private boolean isAutoExpireEnabled(UUID tenantId) {
        return loadTenantConfig(tenantId).autoExpireEnabled();
    }

    private boolean isAutoRenewEnabled(UUID tenantId) {
        return loadTenantConfig(tenantId).autoRenewEnabled();
    }

    int[] getReminderDaysForTenant(UUID tenantId) {
        return loadTenantConfig(tenantId).reminderDays();
    }

    private String buildNotificationTitle(ContractReminder reminder, Contract contract) {
        return switch (reminder.getReminderType()) {
            case EXPIRY -> "Contract Expiring: " + contract.getTitle();
            case RENEWAL -> "Contract Renewal Due: " + contract.getTitle();
            case REVIEW -> "Contract Review Due: " + contract.getTitle();
        };
    }

    // ========== Notification Helpers ==========

    private String buildNotificationMessage(ContractReminder reminder, Contract contract) {
        if (contract.getEndDate() == null) {
            return String.format("A reminder is due for contract '%s'. Please review and take action.",
                    contract.getTitle());
        }
        long daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), contract.getEndDate());
        String daysText = daysUntilExpiry > 0
                ? daysUntilExpiry + " day(s)"
                : "today (or already past)";

        return switch (reminder.getReminderType()) {
            case EXPIRY -> String.format(
                    "The contract '%s' is expiring in %s (end date: %s). Please review and take action.",
                    contract.getTitle(), daysText, contract.getEndDate());
            case RENEWAL -> String.format(
                    "The auto-renewable contract '%s' is approaching its renewal date (end date: %s). " +
                            "It will be automatically renewed unless cancelled.",
                    contract.getTitle(), contract.getEndDate());
            case REVIEW -> String.format(
                    "A review is due for contract '%s' (end date: %s).",
                    contract.getTitle(), contract.getEndDate());
        };
    }

    private UUID resolveUserIdForEmployee(UUID employeeId, UUID tenantId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT user_id FROM employees WHERE id = ? AND tenant_id = ?",
                    UUID.class, employeeId, tenantId);
        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            return null;
        }
    }

    private List<UUID> fetchActiveTenants() {
        try {
            return jdbcTemplate.queryForList(
                    "SELECT id FROM tenants WHERE is_active = true", UUID.class);
        } catch (Exception e) { // Intentional broad catch — scheduled job error boundary
            log.warn("Could not fetch active tenants: {}", e.getMessage());
            return List.of();
        }
    }

    // ========== Infrastructure ==========

    /**
     * Per-tenant lifecycle config, loaded once per tenant per scheduler run.
     * Falls back to defaults if no config row exists.
     */
    private record TenantLifecycleConfig(boolean autoExpireEnabled, boolean autoRenewEnabled, int[] reminderDays) {
        static final TenantLifecycleConfig DEFAULTS = new TenantLifecycleConfig(true, true, DEFAULT_REMINDER_DAYS);
    }
}
