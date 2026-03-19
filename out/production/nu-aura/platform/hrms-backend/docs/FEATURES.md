# Feature Documentation

## Core Features

### 1. Multi-Tenancy

Complete data isolation per organization with shared infrastructure.

**Capabilities:**
- Row-level tenant isolation
- Tenant-specific configurations
- Custom branding per tenant
- Separate user pools

**Implementation:**
```java
@MappedSuperclass
public abstract class TenantAware {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;
}
```

### 2. Authentication & Authorization

JWT-based authentication with role-based access control.

**Features:**
- JWT access tokens (1 hour expiry)
- Refresh token rotation (7 days)
- Password encryption (BCrypt)
- Session management
- Google OAuth ready

**Roles:**
| Role | Description |
|------|-------------|
| SUPER_ADMIN | Full system access |
| HR_ADMIN | HR module management |
| MANAGER | Team management |
| EMPLOYEE | Self-service access |

**Permissions:**
- EMPLOYEE:CREATE, READ, UPDATE, DELETE
- ATTENDANCE:MANAGE, VIEW
- LEAVE:APPROVE, CREATE, VIEW
- PAYROLL:MANAGE, VIEW
- REPORT:VIEW
- SYSTEM:ADMIN

### 3. Employee Management

Complete employee lifecycle management.

**Features:**
- 4-tab comprehensive employee form
- Employee directory with search
- Bulk import via CSV/Excel
- Organization chart
- Reporting hierarchy
- Custom fields support
- Document management
- Employment history tracking

**Employee Statuses:**
- ACTIVE
- ON_LEAVE
- ON_PROBATION
- TERMINATED
- RESIGNED

### 4. Attendance & Time Tracking

Comprehensive attendance management with geofencing and multi-session support.

**Features:**
- Web-based check-in/out
- Mobile attendance with GPS
- Geofence validation
- Multiple office locations
- Shift management
- Overtime tracking
- Regularization workflow
- Bulk attendance import
- Calendar view
- Multiple check-in/out sessions per day
- Time entry tracking
- Server-side timestamp handling

**Dashboard Quick Actions:**
| Button | Condition | Description |
|--------|-----------|-------------|
| Check In | No open session | Start new attendance session |
| Check Out | Open session exists | End current session |
| Check In Again | Session closed, can add more | Start another session |

**Check-in Methods:**
- Web portal
- Mobile app (GPS required)
- Biometric integration ready
- QR code support

### 5. Leave Management

Complete leave lifecycle from request to approval with full self-service.

**Features:**
- Configurable leave types
- Leave policies per grade/location
- Balance management
- Accrual rules
- Carry forward limits
- Approval workflow
- Calendar integration
- Team availability view
- Holiday calendar
- Edit pending requests
- Cancel requests with reason
- Filter by status and leave type

**Leave Request Actions:**
| Action | When Available | Description |
|--------|----------------|-------------|
| Edit | PENDING only | Modify dates, type, or reason |
| Cancel | PENDING, APPROVED | Cancel with mandatory reason |
| Approve | PENDING | Manager approval |
| Reject | PENDING | Manager rejection with reason |

**Leave Types (Default):**
- Annual Leave (Earned)
- Sick Leave
- Casual Leave
- Maternity Leave
- Paternity Leave
- Bereavement Leave
- Compensatory Off

### 6. Payroll Processing

End-to-end payroll with tax compliance.

**Features:**
- Salary structure management
- Payroll run workflow
- Automatic calculations
- Tax deductions (TDS)
- Statutory compliance (PF, ESI)
- Payslip generation (PDF)
- Bank file generation
- Arrears processing
- Reimbursements

**Salary Components:**
- Basic, HRA, Conveyance
- Special Allowance
- Performance Bonus
- PF (Employee + Employer)
- ESI
- Professional Tax
- TDS

### 7. Performance Management

Goal-based performance evaluation.

**Features:**
- SMART goal setting
- OKR framework support
- Review cycles (Annual, Semi-annual, Quarterly)
- Self-assessment
- Manager assessment
- 360-degree feedback
- Competency evaluation
- Rating calibration
- Performance improvement plans

**Rating Scale:**
- 5: Exceptional
- 4: Exceeds Expectations
- 3: Meets Expectations
- 2: Needs Improvement
- 1: Unsatisfactory

### 8. Recruitment

Full applicant tracking system.

**Features:**
- Job posting management
- Career page ready
- Resume parsing (AI)
- Candidate scoring (AI)
- Interview scheduling
- Feedback collection
- Offer management
- Onboarding workflow
- Employee referrals

**Pipeline Stages:**
- Applied
- Screening
- Interview
- Assessment
- Offer
- Hired
- Rejected

### 9. Benefits Administration

Complete benefits lifecycle management.

**Features:**
- Benefit plan creation
- Employee enrollment
- Claims processing
- Flex benefits allocation
- Dependent management
- COBRA continuation
- Open enrollment periods
- Plan comparison

**Benefit Types:**
- Health Insurance
- Dental & Vision
- Life Insurance
- Disability
- Retirement (401k)
- FSA/HSA
- Wellness Programs

### 10. Training & Development

Learning management system integration.

**Features:**
- Training program creation
- Course management
- Enrollment tracking
- Progress monitoring
- Certification tracking
- Skill gap analysis
- Learning paths
- Quiz/assessment support

### 11. Announcements & Communication

Internal communication platform with targeted delivery.

**Features:**
- Rich text announcements
- Category-based organization
- Target audience filtering with department selection
- Read tracking
- Accept/acknowledge workflow
- Email notifications
- Pinned announcements
- Scheduled publishing
- Expiry management
- Edit/Delete with permissions
- Department-specific targeting

**Target Audiences:**
| Type | Description |
|------|-------------|
| ALL_EMPLOYEES | Visible to entire organization |
| SPECIFIC_DEPARTMENTS | Only employees in selected departments |
| MANAGERS_ONLY | Only employees with direct reports |
| NEW_JOINERS | Employees who joined within 90 days |
| SPECIFIC_EMPLOYEES | Targeted individual employees |

**Categories:**
- General, Policy Update, Event
- Holiday, Achievement, Urgent
- Benefit, Training, Social
- IT Maintenance, Health & Safety

**Permissions:**
- Admins can edit/delete any announcement
- Creators can edit/delete their own announcements

### 12. Surveys & Engagement

Employee feedback collection.

**Features:**
- Survey creation with templates
- Multiple question types
- Anonymous responses
- Pulse surveys
- eNPS tracking
- Response analytics
- Trend analysis
- Action planning

### 13. Workflow Automation

Configurable approval workflows.

**Features:**
- Visual workflow builder
- Multi-level approvals
- Conditional routing
- Delegation support
- SLA tracking
- Escalation rules
- Email notifications
- Audit trail

**Workflow Types:**
- Leave approval
- Expense approval
- Profile updates
- Document requests
- Asset requests
- Exit clearance

### 14. Analytics & Reporting

Comprehensive HR analytics.

**Dashboards:**
- Executive dashboard
- Headcount analytics
- Attendance analytics
- Leave analytics
- Payroll analytics
- Performance analytics
- Recruitment analytics
- Attrition analytics

**Reports:**
- Employee directory
- Attendance report
- Leave report
- Payroll register
- Tax reports
- Statutory reports
- Headcount by department
- Performance distribution

### 15. Self-Service Portal

Employee self-service capabilities.

**Features:**
- Profile management
- Leave requests
- Attendance regularization
- Payslip download
- Tax declaration
- Document requests
- Expense claims
- Benefits enrollment
- Training enrollment

### 16. Mobile Features

Mobile-first capabilities.

**Features:**
- Mobile check-in with GPS
- Geofence validation
- Leave requests
- Approvals on-the-go
- Push notifications
- Team calendar
- Directory search
- Payslip access

### 17. Asset Management

IT asset tracking.

**Features:**
- Asset inventory
- Assignment tracking
- Maintenance schedules
- Return management
- Depreciation tracking
- Audit history

### 18. Exit Management

Employee offboarding automation.

**Features:**
- Resignation workflow
- Exit interview
- Clearance checklist
- Asset recovery
- Knowledge transfer
- Full & final settlement
- Experience letter generation
- Alumni management

---

**Last Updated**: December 18, 2025
