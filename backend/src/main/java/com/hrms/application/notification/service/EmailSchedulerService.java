package com.hrms.application.notification.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.tenant.Tenant;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailSchedulerService {

    private final EmailService emailService;
    private final EmployeeRepository employeeRepository;
    // R2-003 FIX: Inject TenantRepository so scheduled jobs can iterate over all
    // active tenants and set the correct TenantContext for each query instead of
    // passing null (which caused the birthday/anniversary queries to return 0 rows
    // or throw a SQL error, silently sending no emails).
    private final TenantRepository tenantRepository;

    /**
     * Send birthday wishes at 9 AM every day.
     *
     * <p>R2-003 FIX: Iterates over all ACTIVE tenants and sets TenantContext per
     * iteration so that the employee query is scoped to the correct tenant.</p>
     */
    @Scheduled(cron = "0 0 9 * * *")
    @SchedulerLock(name = "sendBirthdayEmails", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    @Transactional(readOnly = true)
    public void sendBirthdayEmails() {
        log.info("Starting birthday email job");

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        List<Tenant> activeTenants = tenantRepository.findByStatus(Tenant.TenantStatus.ACTIVE);

        for (Tenant tenant : activeTenants) {
            TenantContext.setCurrentTenant(tenant.getId());
            try {
                List<Employee> birthdayEmployees = employeeRepository.findUpcomingBirthdays(
                        tenant.getId(), today, tomorrow);
                log.debug("Tenant {}: found {} employees with birthdays today",
                        tenant.getCode(), birthdayEmployees.size());

                for (Employee employee : birthdayEmployees) {
                    try {
                        String email = employee.getUser() != null
                                ? employee.getUser().getEmail()
                                : employee.getPersonalEmail();
                        if (email != null && !email.isEmpty()) {
                            emailService.sendBirthdayEmail(email, employee.getFullName());
                        }
                    } catch (Exception e) { // Intentional broad catch — per-email error boundary
                        log.error("Failed to send birthday email to {} (tenant {}): {}",
                                employee.getFullName(), tenant.getCode(), e.getMessage());
                    }
                }
            } finally {
                TenantContext.clear();
            }
        }

        log.info("Birthday email job completed for {} tenant(s)", activeTenants.size());
    }

    /**
     * Send work anniversary emails at 9 AM every day.
     *
     * <p>R2-003 FIX: Iterates over all ACTIVE tenants with proper TenantContext.</p>
     * <p>R2-017 FIX: Use {@link ChronoUnit#YEARS#between} instead of raw year subtraction
     * to correctly compute full elapsed years regardless of leap years or the calendar
     * boundary (e.g. joining on Dec 31 checked on Jan 1 would incorrectly show 1 year).</p>
     */
    @Scheduled(cron = "0 0 9 * * *")
    @SchedulerLock(name = "sendAnniversaryEmails", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    @Transactional(readOnly = true)
    public void sendAnniversaryEmails() {
        log.info("Starting work anniversary email job");

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);
        List<Tenant> activeTenants = tenantRepository.findByStatus(Tenant.TenantStatus.ACTIVE);

        for (Tenant tenant : activeTenants) {
            TenantContext.setCurrentTenant(tenant.getId());
            try {
                List<Employee> anniversaryEmployees = employeeRepository.findUpcomingAnniversaries(
                        tenant.getId(), today, tomorrow);
                log.debug("Tenant {}: found {} employees with work anniversaries today",
                        tenant.getCode(), anniversaryEmployees.size());

                for (Employee employee : anniversaryEmployees) {
                    try {
                        // R2-017 FIX: ChronoUnit.YEARS correctly handles leap years and
                        // day-of-month boundaries; raw getYear() subtraction does not.
                        long years = ChronoUnit.YEARS.between(employee.getJoiningDate(), today);
                        String email = employee.getUser() != null
                                ? employee.getUser().getEmail()
                                : employee.getPersonalEmail();

                        if (email != null && !email.isEmpty() && years > 0) {
                            emailService.sendAnniversaryEmail(email, employee.getFullName(), String.valueOf(years));
                        }
                    } catch (Exception e) { // Intentional broad catch — per-email error boundary
                        log.error("Failed to send anniversary email to {} (tenant {}): {}",
                                employee.getFullName(), tenant.getCode(), e.getMessage());
                    }
                }
            } finally {
                TenantContext.clear();
            }
        }

        log.info("Work anniversary email job completed for {} tenant(s)", activeTenants.size());
    }

    /**
     * Retry failed emails every hour.
     *
     * <p>SEC-FIX: Iterates over all ACTIVE tenants and sets TenantContext per
     * iteration so that failed email retries are properly scoped to each tenant.
     * Previously called emailService.retryFailedEmails() without tenant context,
     * which used a cross-tenant query (no tenant_id filter) — a data isolation risk.</p>
     */
    @Scheduled(cron = "0 0 * * * *")
    @SchedulerLock(name = "retryFailedEmails", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    public void retryFailedEmails() {
        log.info("Starting failed email retry job");

        List<Tenant> activeTenants = tenantRepository.findByStatus(Tenant.TenantStatus.ACTIVE);
        for (Tenant tenant : activeTenants) {
            TenantContext.setCurrentTenant(tenant.getId());
            try {
                emailService.retryFailedEmailsForTenant(tenant.getId());
            } catch (Exception e) { // Intentional broad catch — per-email error boundary
                log.error("Error retrying failed emails for tenant {}: {}", tenant.getCode(), e.getMessage());
            } finally {
                TenantContext.clear();
            }
        }

        log.info("Failed email retry job completed for {} tenant(s)", activeTenants.size());
    }

    /**
     * Send scheduled emails every 15 minutes.
     *
     * <p>SEC-FIX: Iterates over all ACTIVE tenants and sets TenantContext per
     * iteration so that scheduled email queries are properly scoped. Previously
     * called emailService.sendScheduledEmails() without tenant context, passing
     * null to the tenant-scoped query — resulting in no emails being sent.</p>
     */
    @Scheduled(cron = "0 */15 * * * *")
    @SchedulerLock(name = "sendScheduledEmails", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    @Transactional
    public void sendScheduledEmails() {
        log.info("Starting scheduled email job");

        List<Tenant> activeTenants = tenantRepository.findByStatus(Tenant.TenantStatus.ACTIVE);
        for (Tenant tenant : activeTenants) {
            TenantContext.setCurrentTenant(tenant.getId());
            try {
                emailService.sendScheduledEmails();
            } catch (Exception e) { // Intentional broad catch — per-email error boundary
                log.error("Error sending scheduled emails for tenant {}: {}", tenant.getCode(), e.getMessage());
            } finally {
                TenantContext.clear();
            }
        }

        log.info("Scheduled email job completed for {} tenant(s)", activeTenants.size());
    }
}
