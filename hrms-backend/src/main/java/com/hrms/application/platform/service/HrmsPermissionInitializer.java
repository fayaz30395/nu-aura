package com.hrms.application.platform.service;

import com.hrms.application.platform.service.NuPlatformService.PermissionDefinition;

import com.hrms.infrastructure.platform.repository.NuApplicationRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Initializes HRMS application and its permissions in the NU Platform.
 * Runs on application startup.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HrmsPermissionInitializer {

        public static final String APP_CODE = "HRMS";
        public static final String APP_NAME = "NU-HRMS";

        private final NuPlatformService platformService;
        private final NuApplicationRepository applicationRepository;

        @PostConstruct
        @Transactional
        public void initialize() {
                log.info("Initializing HRMS application in NU Platform...");

                // Register HRMS application if not exists
                if (!applicationRepository.existsByCode(APP_CODE)) {
                        platformService.registerApplication(
                                        APP_CODE,
                                        APP_NAME,
                                        "Human Resource Management System - Complete HR operations platform",
                                        "http://localhost:3000",
                                        "/api/v1");
                }

                // Register all HRMS permissions
                platformService.registerPermissions(APP_CODE, buildPermissionDefinitions());

                log.info("HRMS application initialized successfully");
        }

        private List<PermissionDefinition> buildPermissionDefinitions() {
                List<PermissionDefinition> permissions = new ArrayList<>();

                // ==================== EMPLOYEE MODULE ====================
                permissions.add(PermissionDefinition.of("EMPLOYEE", "READ", "View Employees",
                                "View employee profiles and details", "Core HR"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "CREATE", "Create Employees",
                                "Add new employees to the system", "Core HR"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "UPDATE", "Update Employees",
                                "Modify employee information", "Core HR"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "DELETE", "Delete Employees",
                                "Remove employees from the system", "Core HR"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "VIEW_ALL", "View All Employees",
                                "View employees across all departments", "Core HR"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "VIEW_DEPARTMENT", "View Department Employees",
                                "View employees in own department", "Core HR"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "VIEW_TEAM", "View Team Employees",
                                "View employees in own team", "Core HR"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "VIEW_SELF", "View Own Profile",
                                "View own employee profile", "Self Service"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "IMPORT", "Import Employees",
                                "Bulk import employees from file", "Core HR"));
                permissions.add(PermissionDefinition.of("EMPLOYEE", "EXPORT", "Export Employees",
                                "Export employee data to file", "Core HR"));

                // ==================== DEPARTMENT MODULE ====================
                permissions.add(PermissionDefinition.of("DEPARTMENT", "READ", "View Departments",
                                "View department information", "Organization"));
                permissions.add(PermissionDefinition.of("DEPARTMENT", "CREATE", "Create Departments",
                                "Create new departments", "Organization"));
                permissions.add(PermissionDefinition.of("DEPARTMENT", "UPDATE", "Update Departments",
                                "Modify department information", "Organization"));
                permissions.add(PermissionDefinition.of("DEPARTMENT", "DELETE", "Delete Departments",
                                "Remove departments", "Organization"));

                // ==================== ATTENDANCE MODULE ====================
                permissions.add(PermissionDefinition.of("ATTENDANCE", "READ", "View Attendance",
                                "View attendance records", "Attendance"));
                permissions.add(PermissionDefinition.of("ATTENDANCE", "MARK", "Mark Attendance",
                                "Check-in and check-out", "Attendance"));
                permissions.add(PermissionDefinition.of("ATTENDANCE", "MANAGE", "Manage Attendance",
                                "Full attendance management", "Attendance"));
                permissions.add(PermissionDefinition.of("ATTENDANCE", "REGULARIZE", "Regularize Attendance",
                                "Request attendance regularization", "Attendance"));
                permissions.add(PermissionDefinition.of("ATTENDANCE", "APPROVE", "Approve Attendance",
                                "Approve attendance requests", "Attendance"));
                permissions.add(PermissionDefinition.of("ATTENDANCE", "VIEW_TEAM", "View Team Attendance",
                                "View team attendance records", "Attendance"));
                permissions.add(PermissionDefinition.of("ATTENDANCE", "VIEW_ALL", "View All Attendance",
                                "View all attendance records", "Attendance"));

                // ==================== LEAVE MODULE ====================
                permissions.add(PermissionDefinition.of("LEAVE", "READ", "View Leave",
                                "View leave information", "Leave"));
                permissions.add(PermissionDefinition.of("LEAVE", "REQUEST", "Request Leave",
                                "Apply for leave", "Leave"));
                permissions.add(PermissionDefinition.of("LEAVE", "APPROVE", "Approve Leave",
                                "Approve/reject leave requests", "Leave"));
                permissions.add(PermissionDefinition.of("LEAVE", "MANAGE", "Manage Leave",
                                "Full leave management", "Leave"));
                permissions.add(PermissionDefinition.of("LEAVE", "VIEW_TEAM", "View Team Leave",
                                "View team leave requests", "Leave"));
                permissions.add(PermissionDefinition.of("LEAVE", "VIEW_ALL", "View All Leave",
                                "View all leave requests", "Leave"));
                permissions.add(PermissionDefinition.of("LEAVE", "CONFIGURE", "Configure Leave Types",
                                "Manage leave types and policies", "Leave"));

                // ==================== PAYROLL MODULE ====================
                permissions.add(PermissionDefinition.of("PAYROLL", "READ", "View Payroll",
                                "View payroll information", "Payroll"));
                permissions.add(PermissionDefinition.of("PAYROLL", "MANAGE", "Manage Payroll",
                                "Full payroll management", "Payroll"));
                permissions.add(PermissionDefinition.of("PAYROLL", "RUN", "Run Payroll",
                                "Process payroll runs", "Payroll"));
                permissions.add(PermissionDefinition.of("PAYROLL", "APPROVE", "Approve Payroll",
                                "Approve payroll runs", "Payroll"));
                permissions.add(PermissionDefinition.of("PAYROLL", "VIEW_PAYSLIP", "View Payslips",
                                "View own payslips", "Self Service"));

                // ==================== PERFORMANCE MODULE ====================
                permissions.add(PermissionDefinition.of("PERFORMANCE", "READ", "View Performance",
                                "View performance data", "Performance"));
                permissions.add(PermissionDefinition.of("PERFORMANCE", "MANAGE", "Manage Performance",
                                "Full performance management", "Performance"));
                permissions.add(PermissionDefinition.of("PERFORMANCE", "GOAL_CREATE", "Create Goals",
                                "Create performance goals", "Performance"));
                permissions.add(PermissionDefinition.of("PERFORMANCE", "GOAL_REVIEW", "Review Goals",
                                "Review and rate goals", "Performance"));
                permissions.add(PermissionDefinition.of("PERFORMANCE", "FEEDBACK", "Give Feedback",
                                "Provide performance feedback", "Performance"));

                // ==================== RECRUITMENT MODULE ====================
                permissions.add(PermissionDefinition.of("RECRUITMENT", "READ", "View Recruitment",
                                "View recruitment data", "Recruitment"));
                permissions.add(PermissionDefinition.of("RECRUITMENT", "MANAGE", "Manage Recruitment",
                                "Full recruitment management", "Recruitment"));
                permissions.add(PermissionDefinition.of("RECRUITMENT", "JOB_CREATE", "Create Jobs",
                                "Create job postings", "Recruitment"));
                permissions.add(PermissionDefinition.of("RECRUITMENT", "CANDIDATE_MANAGE", "Manage Candidates",
                                "Manage candidate applications", "Recruitment"));
                permissions.add(PermissionDefinition.of("RECRUITMENT", "INTERVIEW", "Conduct Interviews",
                                "Schedule and conduct interviews", "Recruitment"));

                // ==================== PROJECT MODULE ====================
                permissions.add(PermissionDefinition.of("PROJECT", "VIEW", "View Projects",
                                "View project information and details", "Project Management"));
                permissions.add(PermissionDefinition.of("PROJECT", "CREATE", "Create Projects",
                                "Create and manage projects", "Project Management"));
                permissions.add(PermissionDefinition.of("PROJECT", "UPDATE", "Update Projects",
                                "Modify project information", "Project Management"));
                permissions.add(PermissionDefinition.of("PROJECT", "DELETE", "Delete Projects",
                                "Remove projects", "Project Management"));
                permissions.add(PermissionDefinition.of("PROJECT", "ASSIGN", "Assign Resources",
                                "Assign employees to projects", "Project Management"));

                // ==================== REPORT MODULE ====================
                permissions.add(PermissionDefinition.of("REPORT", "VIEW", "View Reports",
                                "View reports", "Reports"));
                permissions.add(PermissionDefinition.of("REPORT", "CREATE", "Create Reports",
                                "Generate and export reports", "Reports"));
                permissions.add(PermissionDefinition.of("REPORT", "MANAGE", "Manage Reports",
                                "Full report management", "Reports"));

                // ==================== ANNOUNCEMENT MODULE ====================
                permissions.add(PermissionDefinition.of("ANNOUNCEMENT", "READ", "View Announcements",
                                "View company announcements", "Communication"));
                permissions.add(PermissionDefinition.of("ANNOUNCEMENT", "CREATE", "Create Announcements",
                                "Create new announcements", "Communication"));
                permissions.add(PermissionDefinition.of("ANNOUNCEMENT", "MANAGE", "Manage Announcements",
                                "Full announcement management", "Communication"));

                // ==================== SETTINGS MODULE ====================
                permissions.add(PermissionDefinition.of("SETTINGS", "READ", "View Settings",
                                "View system settings", "Admin"));
                permissions.add(PermissionDefinition.of("SETTINGS", "MANAGE", "Manage Settings",
                                "Configure system settings", "Admin"));

                // ==================== ROLE MODULE ====================
                permissions.add(PermissionDefinition.of("ROLE", "READ", "View Roles",
                                "View roles and permissions", "Admin"));
                permissions.add(PermissionDefinition.of("ROLE", "MANAGE", "Manage Roles",
                                "Create and modify roles", "Admin"));

                // ==================== USER MODULE ====================
                permissions.add(PermissionDefinition.of("USER", "READ", "View Users",
                                "View user accounts", "Admin"));
                permissions.add(PermissionDefinition.of("USER", "MANAGE", "Manage Users",
                                "Create and manage user accounts", "Admin"));

                // ==================== SYSTEM MODULE ====================
                permissions.add(PermissionDefinition.of("SYSTEM", "ADMIN", "System Admin",
                                "Full system administration access - bypasses all checks", "Admin"));

                return permissions;
        }

        // ==================== Permission Code Constants ====================
        // These can be used throughout the HRMS application

        public static final String EMPLOYEE_READ = "HRMS:EMPLOYEE:READ";
        public static final String EMPLOYEE_CREATE = "HRMS:EMPLOYEE:CREATE";
        public static final String EMPLOYEE_UPDATE = "HRMS:EMPLOYEE:UPDATE";
        public static final String EMPLOYEE_DELETE = "HRMS:EMPLOYEE:DELETE";
        public static final String EMPLOYEE_VIEW_ALL = "HRMS:EMPLOYEE:VIEW_ALL";
        public static final String EMPLOYEE_VIEW_DEPARTMENT = "HRMS:EMPLOYEE:VIEW_DEPARTMENT";
        public static final String EMPLOYEE_VIEW_TEAM = "HRMS:EMPLOYEE:VIEW_TEAM";
        public static final String EMPLOYEE_VIEW_SELF = "HRMS:EMPLOYEE:VIEW_SELF";

        public static final String ATTENDANCE_READ = "HRMS:ATTENDANCE:READ";
        public static final String ATTENDANCE_MARK = "HRMS:ATTENDANCE:MARK";
        public static final String ATTENDANCE_MANAGE = "HRMS:ATTENDANCE:MANAGE";
        public static final String ATTENDANCE_APPROVE = "HRMS:ATTENDANCE:APPROVE";
        public static final String ATTENDANCE_VIEW_ALL = "HRMS:ATTENDANCE:VIEW_ALL";

        public static final String LEAVE_READ = "HRMS:LEAVE:READ";
        public static final String LEAVE_REQUEST = "HRMS:LEAVE:REQUEST";
        public static final String LEAVE_APPROVE = "HRMS:LEAVE:APPROVE";
        public static final String LEAVE_MANAGE = "HRMS:LEAVE:MANAGE";
        public static final String LEAVE_VIEW_ALL = "HRMS:LEAVE:VIEW_ALL";

        public static final String PAYROLL_READ = "HRMS:PAYROLL:READ";
        public static final String PAYROLL_MANAGE = "HRMS:PAYROLL:MANAGE";
        public static final String PAYROLL_RUN = "HRMS:PAYROLL:RUN";
        public static final String PAYROLL_APPROVE = "HRMS:PAYROLL:APPROVE";
        public static final String PAYROLL_VIEW_PAYSLIP = "HRMS:PAYROLL:VIEW_PAYSLIP";

        public static final String REPORT_VIEW = "HRMS:REPORT:VIEW";
        public static final String REPORT_CREATE = "HRMS:REPORT:CREATE";

        public static final String ANNOUNCEMENT_READ = "HRMS:ANNOUNCEMENT:READ";
        public static final String ANNOUNCEMENT_CREATE = "HRMS:ANNOUNCEMENT:CREATE";
        public static final String ANNOUNCEMENT_MANAGE = "HRMS:ANNOUNCEMENT:MANAGE";

        public static final String ROLE_READ = "HRMS:ROLE:READ";
        public static final String ROLE_MANAGE = "HRMS:ROLE:MANAGE";

        public static final String USER_READ = "HRMS:USER:READ";
        public static final String USER_MANAGE = "HRMS:USER:MANAGE";

        public static final String PROJECT_VIEW = "HRMS:PROJECT:VIEW";
        public static final String PROJECT_CREATE = "HRMS:PROJECT:CREATE";
        public static final String PROJECT_UPDATE = "HRMS:PROJECT:UPDATE";
        public static final String PROJECT_DELETE = "HRMS:PROJECT:DELETE";
        public static final String PROJECT_ASSIGN = "HRMS:PROJECT:ASSIGN";

        public static final String SYSTEM_ADMIN = "HRMS:SYSTEM:ADMIN";
}
