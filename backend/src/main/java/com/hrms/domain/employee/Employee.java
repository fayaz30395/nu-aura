package com.hrms.domain.employee;

import com.hrms.common.entity.TenantAware;
import com.hrms.domain.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "employees", indexes = {
        @Index(name = "idx_employee_code_tenant", columnList = "employeeCode,tenantId", unique = true),
        @Index(name = "idx_employee_tenant", columnList = "tenantId"),
        @Index(name = "idx_employee_department", columnList = "departmentId"),
        @Index(name = "idx_employee_manager", columnList = "managerId"),
        @Index(name = "idx_employee_dotted_mgr1", columnList = "dottedLineManager1Id"),
        @Index(name = "idx_employee_dotted_mgr2", columnList = "dottedLineManager2Id"),
        @Index(name = "idx_employee_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Employee extends TenantAware {

    @Column(nullable = false, length = 50)
    private String employeeCode;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(length = 100)
    private String middleName;

    @Column(length = 100)
    private String lastName;

    @Column(length = 200)
    private String personalEmail;

    @Column(length = 20)
    private String phoneNumber;

    @Column(length = 20)
    private String emergencyContactNumber;

    @Column
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Gender gender;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String state;

    @Column(length = 20)
    private String postalCode;

    @Column(length = 100)
    private String country;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(nullable = false)
    private LocalDate joiningDate;

    @Column
    private LocalDate confirmationDate;

    @Column
    private LocalDate exitDate;

    @Column
    private UUID departmentId;

    @Column
    private UUID officeLocationId;

    @Column
    private UUID teamId;

    @Column(length = 100)
    private String designation;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private EmployeeLevel level;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private JobRole jobRole;

    @Column
    private UUID managerId;

    /** Optional first dotted-line manager (matrix reporting, informational only). */
    @Column
    private UUID dottedLineManager1Id;

    /** Optional second dotted-line manager (matrix reporting, informational only). */
    @Column
    private UUID dottedLineManager2Id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EmployeeStatus status;

    @Column(length = 100)
    private String bankAccountNumber;

    @Column(length = 50)
    private String bankName;

    @Column(length = 50)
    private String bankIfscCode;

    @Column(length = 50)
    private String taxId;

    public enum Gender {
        MALE,
        FEMALE,
        OTHER,
        PREFER_NOT_TO_SAY
    }

    public enum EmploymentType {
        FULL_TIME,
        PART_TIME,
        CONTRACT,
        INTERN,
        CONSULTANT
    }

    public enum EmployeeStatus {
        ACTIVE,
        INACTIVE,
        ON_LEAVE,
        ON_NOTICE,
        TERMINATED,
        RESIGNED
    }

    public enum EmployeeLevel {
        ENTRY, // Junior/Associate
        MID, // Mid-level
        SENIOR, // Senior
        LEAD, // Lead/Principal
        MANAGER, // Manager
        SENIOR_MANAGER, // Senior Manager
        DIRECTOR, // Director
        VP, // Vice President
        SVP, // Senior Vice President
        CXO // C-level Executive
    }

    public enum JobRole {
        // Executive
        EXECUTIVE,
        CEO,
        CTO,
        CFO,
        COO,

        // Engineering
        ENGINEERING,
        SOFTWARE_ENGINEER,
        FRONTEND_DEVELOPER,
        BACKEND_DEVELOPER,
        FULLSTACK_DEVELOPER,
        DEVOPS_ENGINEER,
        QA_ENGINEER,
        DATA_ENGINEER,
        MOBILE_DEVELOPER,
        SYSTEM_ARCHITECT,
        TECH_LEAD,
        ENGINEERING_MANAGER,

        // Product
        PRODUCT_MANAGER,
        PRODUCT_OWNER,
        PRODUCT_ANALYST,

        // Design
        UI_DESIGNER,
        UX_DESIGNER,
        GRAPHIC_DESIGNER,
        PRODUCT_DESIGNER,

        // Data & Analytics
        DATA_ANALYST,
        DATA_SCIENTIST,
        BUSINESS_ANALYST,

        // Marketing
        MARKETING_MANAGER,
        CONTENT_WRITER,
        SEO_SPECIALIST,
        SOCIAL_MEDIA_MANAGER,
        DIGITAL_MARKETER,

        // Sales
        SALES_REPRESENTATIVE,
        SALES_MANAGER,
        ACCOUNT_MANAGER,
        BUSINESS_DEVELOPMENT,

        // Operations
        OPERATIONS_MANAGER,
        PROJECT_MANAGER,
        SCRUM_MASTER,
        PROGRAM_MANAGER,

        // HR
        HR_MANAGER,
        HR_GENERALIST,
        RECRUITER,
        TALENT_ACQUISITION,
        HUMAN_RESOURCES, // Legacy value from seed data

        // Finance
        ACCOUNTANT,
        FINANCIAL_ANALYST,
        FINANCE_MANAGER,
        FINANCE, // Legacy value from seed data

        // Admin & Support
        ADMIN_ASSISTANT,
        OFFICE_MANAGER,
        CUSTOMER_SUPPORT,
        TECH_SUPPORT,

        // Legal
        LEGAL_COUNSEL,
        COMPLIANCE_OFFICER,

        // Other
        CONSULTANT,
        INTERN,
        OTHER
    }

    public String getFullName() {
        StringBuilder name = new StringBuilder();
        if (firstName != null) {
            name.append(firstName);
        }
        if (middleName != null && !middleName.isEmpty()) {
            if (name.length() > 0) name.append(" ");
            name.append(middleName);
        }
        if (lastName != null && !lastName.isEmpty()) {
            if (name.length() > 0) name.append(" ");
            name.append(lastName);
        }
        return name.length() > 0 ? name.toString() : "";
    }

    public void terminate() {
        this.status = EmployeeStatus.TERMINATED;
        this.exitDate = LocalDate.now();
    }

    public void resign() {
        this.status = EmployeeStatus.RESIGNED;
        this.exitDate = LocalDate.now();
    }
}
