package com.hrms.application.notification.service;

import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailSchedulerService {

    private final EmailService emailService;
    private final EmployeeRepository employeeRepository;

    /**
     * Send birthday wishes at 9 AM every day
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendBirthdayEmails() {
        log.info("Starting birthday email job");

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        // Find employees with birthdays today
        List<Employee> birthdayEmployees = employeeRepository.findUpcomingBirthdays(
                null, // Will be handled by tenant context in production
                today,
                tomorrow);

        log.info("Found {} employees with birthdays today", birthdayEmployees.size());

        for (Employee employee : birthdayEmployees) {
            try {
                String email = employee.getUser() != null ? employee.getUser().getEmail() : employee.getPersonalEmail();
                if (email != null && !email.isEmpty()) {
                    emailService.sendBirthdayEmail(email, employee.getFullName());
                }
            } catch (Exception e) {
                log.error("Failed to send birthday email to {}: {}", employee.getFullName(), e.getMessage());
            }
        }

        log.info("Birthday email job completed");
    }

    /**
     * Send work anniversary emails at 9 AM every day
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendAnniversaryEmails() {
        log.info("Starting work anniversary email job");

        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        // Find employees with work anniversaries today
        List<Employee> anniversaryEmployees = employeeRepository.findUpcomingAnniversaries(
                null, // Will be handled by tenant context in production
                today,
                tomorrow);

        log.info("Found {} employees with work anniversaries today", anniversaryEmployees.size());

        for (Employee employee : anniversaryEmployees) {
            try {
                int years = today.getYear() - employee.getJoiningDate().getYear();
                String email = employee.getUser() != null ? employee.getUser().getEmail() : employee.getPersonalEmail();

                if (email != null && !email.isEmpty() && years > 0) {
                    emailService.sendAnniversaryEmail(email, employee.getFullName(), String.valueOf(years));
                }
            } catch (Exception e) {
                log.error("Failed to send anniversary email to {}: {}", employee.getFullName(), e.getMessage());
            }
        }

        log.info("Work anniversary email job completed");
    }

    /**
     * Retry failed emails every hour
     */
    @Scheduled(cron = "0 0 * * * *")
    public void retryFailedEmails() {
        log.info("Starting failed email retry job");
        try {
            emailService.retryFailedEmails();
        } catch (Exception e) {
            log.error("Error in retry failed emails job: {}", e.getMessage());
        }
        log.info("Failed email retry job completed");
    }

    /**
     * Send scheduled emails every 15 minutes
     */
    @Scheduled(cron = "0 */15 * * * *")
    public void sendScheduledEmails() {
        log.info("Starting scheduled email job");
        try {
            emailService.sendScheduledEmails();
        } catch (Exception e) {
            log.error("Error in scheduled emails job: {}", e.getMessage());
        }
        log.info("Scheduled email job completed");
    }
}
