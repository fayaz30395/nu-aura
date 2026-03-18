package com.hrms.application.notification.service;

import com.hrms.api.notification.dto.SendNotificationRequest;
import com.hrms.api.notification.dto.SendNotificationRequest.RecipientInfo;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationPriority;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for sending scheduled notifications:
 * - Birthday notifications
 * - Work anniversary notifications
 * - Attendance reminder notifications
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledNotificationService {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final TenantRepository tenantRepository;
    private final MultiChannelNotificationService notificationService;

    private static final Set<NotificationChannel> DEFAULT_CHANNELS = Set.of(
            NotificationChannel.EMAIL,
            NotificationChannel.PUSH,
            NotificationChannel.IN_APP);

    // ==================== BIRTHDAY NOTIFICATIONS ====================

    /**
     * Runs daily at 8:00 AM to send birthday wishes
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendBirthdayNotifications() {
        log.info("Starting birthday notification job...");

        try {
            // Get all active tenants
            tenantRepository.findAll().forEach(tenant -> {
                try {
                    sendBirthdayNotificationsForTenant(tenant.getId());
                } catch (RuntimeException e) {
                    // Intentional broad catch — one tenant failure must not stop processing for other tenants
                    log.error("Error sending birthday notifications for tenant {}: {}", tenant.getId(), e.getMessage());
                }
            });
        } catch (RuntimeException e) {
            // Intentional broad catch — scheduler job must not propagate exceptions to Quartz
            log.error("Error in birthday notification job: {}", e.getMessage(), e);
        }

        log.info("Birthday notification job completed");
    }

    private void sendBirthdayNotificationsForTenant(UUID tenantId) {
        LocalDate today = LocalDate.now();

        // Find employees with birthday today
        List<Employee> birthdayEmployees = employeeRepository.findUpcomingBirthdays(
                tenantId, today, today);

        if (birthdayEmployees.isEmpty()) {
            log.debug("No birthdays today for tenant {}", tenantId);
            return;
        }

        log.info("Found {} employees with birthdays today for tenant {}", birthdayEmployees.size(), tenantId);

        // Get all active employees to notify
        List<Employee> allEmployees = employeeRepository.findByTenantId(tenantId).stream()
                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .collect(Collectors.toList());

        for (Employee birthdayPerson : birthdayEmployees) {

            String fullName = getFullName(birthdayPerson);

            // Notify everyone except the birthday person
            List<RecipientInfo> recipients = allEmployees.stream()
                    .filter(e -> !e.getId().equals(birthdayPerson.getId()))
                    .map(e -> RecipientInfo.builder()
                            .userId(e.getUser() != null ? e.getUser().getId() : null)
                            .email(e.getUser() != null ? e.getUser().getEmail() : e.getPersonalEmail())
                            .name(getFullName(e))
                            .build())
                    .collect(Collectors.toList());

            if (!recipients.isEmpty()) {
                SendNotificationRequest request = SendNotificationRequest.builder()
                        .subject("🎂 Birthday Celebration - " + fullName)
                        .title("Happy Birthday!")
                        .body(String.format(
                                "🎉 Today is %s's birthday! Let's wish them a wonderful day! 🎂",
                                fullName))
                        .actionUrl("/employees/" + birthdayPerson.getId())
                        .channels(DEFAULT_CHANNELS)
                        .priority(NotificationPriority.NORMAL)
                        .recipients(recipients)
                        .referenceType("BIRTHDAY")
                        .referenceId(birthdayPerson.getId())
                        .contextData(Map.of(
                                "employeeName", fullName,
                                "employeeId", birthdayPerson.getId().toString(),
                                "department",
                                birthdayPerson.getDepartmentId() != null ? birthdayPerson.getDepartmentId().toString()
                                        : ""))
                        .build();

                try {
                    notificationService.sendNotification(request);
                    log.info("Sent birthday notification for {} to {} recipients", fullName, recipients.size());
                } catch (RuntimeException e) {
                    log.error("Failed to send birthday notification for {}: {}", fullName, e.getMessage());
                }
            }

            // Also send a personal birthday wish to the birthday person
            if (birthdayPerson.getUser() != null) {
                SendNotificationRequest personalWish = SendNotificationRequest.builder()
                        .subject("🎂 Happy Birthday, " + birthdayPerson.getFirstName() + "!")
                        .title("Happy Birthday!")
                        .body("Wishing you a wonderful birthday filled with joy and happiness! 🎉🎂")
                        .channels(DEFAULT_CHANNELS)
                        .priority(NotificationPriority.NORMAL)
                        .recipients(List.of(RecipientInfo.builder()
                                .userId(birthdayPerson.getUser().getId())
                                .email(birthdayPerson.getUser().getEmail())
                                .name(fullName)
                                .build()))
                        .referenceType("BIRTHDAY_PERSONAL")
                        .referenceId(birthdayPerson.getId())
                        .build();

                try {
                    notificationService.sendNotification(personalWish);
                } catch (RuntimeException e) {
                    log.error("Failed to send personal birthday wish to {}: {}", fullName, e.getMessage());
                }
            }
        }
    }

    // ==================== WORK ANNIVERSARY NOTIFICATIONS ====================

    /**
     * Runs daily at 8:30 AM to send work anniversary wishes
     */
    @Scheduled(cron = "0 30 8 * * *")
    @Transactional
    public void sendAnniversaryNotifications() {
        log.info("Starting work anniversary notification job...");

        try {
            tenantRepository.findAll().forEach(tenant -> {
                try {
                    sendAnniversaryNotificationsForTenant(tenant.getId());
                } catch (RuntimeException e) {
                    // Intentional broad catch — one tenant failure must not stop processing for other tenants
                    log.error("Error sending anniversary notifications for tenant {}: {}", tenant.getId(),
                            e.getMessage());
                }
            });
        } catch (RuntimeException e) {
            // Intentional broad catch — scheduler job must not propagate exceptions to Quartz
            log.error("Error in anniversary notification job: {}", e.getMessage(), e);
        }

        log.info("Work anniversary notification job completed");
    }

    private void sendAnniversaryNotificationsForTenant(UUID tenantId) {
        LocalDate today = LocalDate.now();

        // Find employees with work anniversary today
        List<Employee> anniversaryEmployees = employeeRepository.findUpcomingAnniversaries(
                tenantId, today, today);

        if (anniversaryEmployees.isEmpty()) {
            log.debug("No work anniversaries today for tenant {}", tenantId);
            return;
        }

        log.info("Found {} employees with work anniversaries today for tenant {}", anniversaryEmployees.size(),
                tenantId);

        // Get all active employees to notify
        List<Employee> allEmployees = employeeRepository.findByTenantId(tenantId).stream()
                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .collect(Collectors.toList());

        for (Employee anniversaryPerson : anniversaryEmployees) {
            int yearsOfService = Period.between(anniversaryPerson.getJoiningDate(), today).getYears();

            // Skip if less than 1 year (not an anniversary)
            if (yearsOfService < 1) {
                continue;
            }

            String fullName = getFullName(anniversaryPerson);
            String yearText = yearsOfService == 1 ? "1 year" : yearsOfService + " years";

            // Notify everyone except the anniversary person
            List<RecipientInfo> recipients = allEmployees.stream()
                    .filter(e -> !e.getId().equals(anniversaryPerson.getId()))
                    .map(e -> RecipientInfo.builder()
                            .userId(e.getUser() != null ? e.getUser().getId() : null)
                            .email(e.getUser() != null ? e.getUser().getEmail() : e.getPersonalEmail())
                            .name(getFullName(e))
                            .build())
                    .collect(Collectors.toList());

            if (!recipients.isEmpty()) {
                SendNotificationRequest request = SendNotificationRequest.builder()
                        .subject("🎊 Work Anniversary - " + fullName)
                        .title("Celebrating " + yearText + "!")
                        .body(String.format(
                                "🎉 Today marks %s's %s work anniversary with us! Let's congratulate them on this milestone! 🌟",
                                fullName, yearText))
                        .actionUrl("/employees/" + anniversaryPerson.getId())
                        .channels(DEFAULT_CHANNELS)
                        .priority(NotificationPriority.NORMAL)
                        .recipients(recipients)
                        .referenceType("WORK_ANNIVERSARY")
                        .referenceId(anniversaryPerson.getId())
                        .contextData(Map.of(
                                "employeeName", fullName,
                                "employeeId", anniversaryPerson.getId().toString(),
                                "yearsOfService", String.valueOf(yearsOfService),
                                "joiningDate", anniversaryPerson.getJoiningDate().toString()))
                        .build();

                try {
                    notificationService.sendNotification(request);
                    log.info("Sent anniversary notification for {} ({}) to {} recipients", fullName, yearText,
                            recipients.size());
                } catch (RuntimeException e) {
                    log.error("Failed to send anniversary notification for {}: {}", fullName, e.getMessage());
                }
            }

            // Send personal congratulation to the anniversary person
            if (anniversaryPerson.getUser() != null) {
                SendNotificationRequest personalCongrats = SendNotificationRequest.builder()
                        .subject("🎊 Congratulations on your " + yearText + " anniversary!")
                        .title("Happy Work Anniversary!")
                        .body(String.format(
                                "Congratulations on completing %s with us! Thank you for your dedication and contributions. Here's to many more years of success! 🌟",
                                yearText))
                        .channels(DEFAULT_CHANNELS)
                        .priority(NotificationPriority.NORMAL)
                        .recipients(List.of(RecipientInfo.builder()
                                .userId(anniversaryPerson.getUser().getId())
                                .email(anniversaryPerson.getUser().getEmail())
                                .name(fullName)
                                .build()))
                        .referenceType("WORK_ANNIVERSARY_PERSONAL")
                        .referenceId(anniversaryPerson.getId())
                        .build();

                try {
                    notificationService.sendNotification(personalCongrats);
                } catch (RuntimeException e) {
                    log.error("Failed to send personal anniversary message to {}: {}", fullName, e.getMessage());
                }
            }
        }
    }

    // ==================== ATTENDANCE REMINDER NOTIFICATIONS ====================

    /**
     * Runs at 10:00 AM on weekdays to remind employees who haven't checked in
     */
    @Scheduled(cron = "0 0 10 * * MON-FRI")
    @Transactional
    public void sendAttendanceReminders() {
        log.info("Starting attendance reminder notification job...");

        try {
            tenantRepository.findAll().forEach(tenant -> {
                try {
                    sendAttendanceRemindersForTenant(tenant.getId());
                } catch (RuntimeException e) {
                    // Intentional broad catch — one tenant failure must not stop processing for other tenants
                    log.error("Error sending attendance reminders for tenant {}: {}", tenant.getId(), e.getMessage());
                }
            });
        } catch (RuntimeException e) {
            // Intentional broad catch — scheduler job must not propagate exceptions to Quartz
            log.error("Error in attendance reminder job: {}", e.getMessage(), e);
        }

        log.info("Attendance reminder notification job completed");
    }

    /**
     * Runs at 5:00 PM on weekdays to remind employees who haven't checked out
     */
    @Scheduled(cron = "0 0 17 * * MON-FRI")
    @Transactional
    public void sendCheckoutReminders() {
        log.info("Starting checkout reminder notification job...");

        try {
            tenantRepository.findAll().forEach(tenant -> {
                try {
                    sendCheckoutRemindersForTenant(tenant.getId());
                } catch (RuntimeException e) {
                    // Intentional broad catch — one tenant failure must not stop processing for other tenants
                    log.error("Error sending checkout reminders for tenant {}: {}", tenant.getId(), e.getMessage());
                }
            });
        } catch (RuntimeException e) {
            // Intentional broad catch — scheduler job must not propagate exceptions to Quartz
            log.error("Error in checkout reminder job: {}", e.getMessage(), e);
        }

        log.info("Checkout reminder notification job completed");
    }

    private void sendAttendanceRemindersForTenant(UUID tenantId) {
        LocalDate today = LocalDate.now();

        // Get all active employees
        List<Employee> activeEmployees = employeeRepository.findByTenantId(tenantId).stream()
                .filter(e -> e.getStatus() == Employee.EmployeeStatus.ACTIVE)
                .collect(Collectors.toList());

        // Get today's attendance records
        List<AttendanceRecord> todayRecords = attendanceRecordRepository.findByTenantIdAndAttendanceDate(tenantId,
                today);
        Set<UUID> checkedInEmployeeIds = todayRecords.stream()
                .map(AttendanceRecord::getEmployeeId)
                .collect(Collectors.toSet());

        // Find employees who haven't checked in
        List<Employee> notCheckedIn = activeEmployees.stream()
                .filter(e -> !checkedInEmployeeIds.contains(e.getId()))
                .collect(Collectors.toList());

        if (notCheckedIn.isEmpty()) {
            log.debug("All employees have checked in for tenant {}", tenantId);
            return;
        }

        log.info("Found {} employees who haven't checked in for tenant {}", notCheckedIn.size(), tenantId);

        for (Employee employee : notCheckedIn) {
            if (employee.getUser() == null)
                continue;

            SendNotificationRequest reminder = SendNotificationRequest.builder()
                    .subject("⏰ Attendance Reminder")
                    .title("Don't forget to check in!")
                    .body("Hi " + employee.getFirstName()
                            + ", we noticed you haven't checked in today. Please mark your attendance.")
                    .actionUrl("/attendance")
                    .channels(Set.of(NotificationChannel.PUSH, NotificationChannel.IN_APP))
                    .priority(NotificationPriority.HIGH)
                    .recipients(List.of(RecipientInfo.builder()
                            .userId(employee.getUser().getId())
                            .email(employee.getUser().getEmail())
                            .name(getFullName(employee))
                            .build()))
                    .referenceType("ATTENDANCE_REMINDER")
                    .referenceId(employee.getId())
                    .build();

            try {
                notificationService.sendNotification(reminder);
            } catch (RuntimeException e) {
                log.error("Failed to send attendance reminder to {}: {}", getFullName(employee), e.getMessage());
            }
        }
    }

    private void sendCheckoutRemindersForTenant(UUID tenantId) {
        LocalDate today = LocalDate.now();

        // Get today's attendance records without checkout
        List<AttendanceRecord> recordsWithoutCheckout = attendanceRecordRepository
                .findByTenantIdAndAttendanceDate(tenantId, today).stream()
                .filter(r -> r.getCheckInTime() != null && r.getCheckOutTime() == null)
                .collect(Collectors.toList());

        if (recordsWithoutCheckout.isEmpty()) {
            log.debug("All checked-in employees have checked out for tenant {}", tenantId);
            return;
        }

        log.info("Found {} employees who haven't checked out for tenant {}", recordsWithoutCheckout.size(), tenantId);

        for (AttendanceRecord record : recordsWithoutCheckout) {
            Employee employee = employeeRepository.findByIdAndTenantId(record.getEmployeeId(), tenantId)
                    .orElse(null);

            if (employee == null || employee.getUser() == null)
                continue;

            String checkInTimeStr = record.getCheckInTime().format(DateTimeFormatter.ofPattern("hh:mm a"));

            SendNotificationRequest reminder = SendNotificationRequest.builder()
                    .subject("⏰ Checkout Reminder")
                    .title("Don't forget to check out!")
                    .body(String.format(
                            "Hi %s, you checked in at %s but haven't checked out yet. Please mark your checkout before leaving.",
                            employee.getFirstName(), checkInTimeStr))
                    .actionUrl("/attendance")
                    .channels(Set.of(NotificationChannel.PUSH, NotificationChannel.IN_APP))
                    .priority(NotificationPriority.NORMAL)
                    .recipients(List.of(RecipientInfo.builder()
                            .userId(employee.getUser().getId())
                            .email(employee.getUser().getEmail())
                            .name(getFullName(employee))
                            .build()))
                    .referenceType("CHECKOUT_REMINDER")
                    .referenceId(record.getId())
                    .build();

            try {
                notificationService.sendNotification(reminder);
            } catch (RuntimeException e) {
                log.error("Failed to send checkout reminder to {}: {}", getFullName(employee), e.getMessage());
            }
        }
    }

    // ==================== HELPER METHODS ====================

    private String getFullName(Employee employee) {
        StringBuilder name = new StringBuilder(employee.getFirstName());
        if (employee.getMiddleName() != null && !employee.getMiddleName().isEmpty()) {
            name.append(" ").append(employee.getMiddleName());
        }
        if (employee.getLastName() != null && !employee.getLastName().isEmpty()) {
            name.append(" ").append(employee.getLastName());
        }
        return name.toString();
    }
}
