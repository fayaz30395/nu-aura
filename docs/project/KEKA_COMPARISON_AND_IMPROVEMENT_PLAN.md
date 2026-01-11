# Nu-Aura HRMS vs Keka HRMS - Comparison & Improvement Plan

## Executive Summary

Nu-Aura HRMS is a comprehensive enterprise HRMS that **matches or exceeds Keka HRMS** in most areas:
- **49 modules** implemented (vs Keka's ~30 core modules)
- **340+ permission codes** (vs Keka's ~100)
- **8 predefined roles** with hierarchy (vs Keka's 6)
- **Advanced AI features** not available in Keka

---

## 1. Feature Comparison

### Core HR Management
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| Employee Profiles | ✅ | ✅ | Full parity |
| Organization Chart | ✅ | ✅ | Full parity |
| Department Management | ✅ | ✅ | Full parity |
| Position Management | ✅ | ✅ | Full parity |
| Document Management | ✅ | ✅ | Full parity |
| Custom Fields | ✅ | ✅ | Full parity |
| Employee Directory | ✅ | ✅ | Full parity |
| Bulk Import/Export | ✅ | ✅ | Full parity |

### Attendance & Time
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| Web Attendance | ✅ | ✅ | Full parity |
| Mobile Punch | ✅ | ✅ | Full parity |
| Geo-fencing | ✅ | ✅ | Full parity |
| Biometric Integration | ✅ | ⚠️ | API ready, need integrations |
| Facial Recognition | ✅ | ❌ | **Gap - Need to implement** |
| Shift Management | ✅ | ✅ | Full parity |
| Overtime Tracking | ✅ | ✅ | Full parity |
| Timesheet Management | ✅ | ✅ | Full parity |

### Leave Management
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| Leave Requests | ✅ | ✅ | Full parity |
| Custom Leave Types | ✅ | ✅ | Full parity |
| Leave Policies | ✅ | ✅ | Full parity |
| Comp-off Management | ✅ | ✅ | Full parity |
| Holiday Calendar | ✅ | ✅ | Full parity |
| Team Calendar | ✅ | ✅ | Full parity |
| Auto Carry Forward | ✅ | ✅ | Full parity |

### Payroll & Compensation
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| Payroll Processing | ✅ | ✅ | Full parity |
| Salary Structures | ✅ | ✅ | Full parity |
| Tax Calculations | ✅ | ✅ | Full parity |
| PF/ESI/PT | ✅ | ✅ | Full parity |
| Payslip Generation | ✅ | ✅ | Full parity |
| Loan Management | ✅ | ✅ | Full parity |
| Reimbursements | ✅ | ✅ | Full parity |
| Multi-currency | ✅ | ✅ | Full parity |
| Global Payroll | ✅ | ✅ | Full parity |

### Performance Management
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| Performance Reviews | ✅ | ✅ | Full parity |
| Goal Management | ✅ | ✅ | Full parity |
| OKR Management | ✅ | ✅ | Full parity |
| 360 Feedback | ✅ | ✅ | Full parity |
| Competency Mapping | ✅ | ✅ | Full parity |
| 1:1 Meetings | ✅ | ✅ | Full parity |
| Performance-Pay Link | ✅ | ✅ | Full parity |
| Review Cycles | ✅ | ✅ | Full parity |

### Recruitment
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| Job Requisitions | ✅ | ✅ | Full parity |
| ATS | ✅ | ✅ | Full parity |
| Resume Parsing | ✅ | ✅ | AI-powered |
| Interview Scheduling | ✅ | ✅ | Full parity |
| Offer Management | ✅ | ✅ | Full parity |
| Candidate Portal | ✅ | ⚠️ | Need enhancement |
| AI Candidate Matching | ❌ | ✅ | **We exceed Keka** |
| AI Sentiment Analysis | ❌ | ✅ | **We exceed Keka** |

### Onboarding & Exit
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| Onboarding Workflows | ✅ | ✅ | Full parity |
| Task Assignment | ✅ | ✅ | Full parity |
| Document Collection | ✅ | ✅ | Full parity |
| E-Signature | ✅ | ✅ | Full parity |
| Exit Process | ✅ | ✅ | Full parity |
| F&F Settlement | ✅ | ✅ | Full parity |
| Pre-boarding Portal | ✅ | ⚠️ | Need enhancement |

### Learning & Development
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| LMS Courses | ✅ | ✅ | Full parity |
| Quizzes/Assessments | ✅ | ✅ | Full parity |
| Certificates | ✅ | ✅ | Full parity |
| Learning Paths | ✅ | ✅ | Full parity |
| Training Programs | ✅ | ✅ | Full parity |
| Skill Gap Analysis | ⚠️ | ✅ | **We exceed Keka** |

### Employee Engagement
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| Pulse Surveys | ✅ | ✅ | Full parity |
| Announcements | ✅ | ✅ | Full parity |
| Recognition/Rewards | ✅ | ✅ | Full parity |
| Social Feed | ❌ | ✅ | **We exceed Keka** |
| Wellness Programs | ❌ | ✅ | **We exceed Keka** |

### Analytics & Reporting
| Feature | Keka | Nu-Aura | Notes |
|---------|------|---------|-------|
| HR Dashboards | ✅ | ✅ | Full parity |
| Custom Reports | ✅ | ✅ | Full parity |
| Export (PDF/Excel) | ✅ | ✅ | Full parity |
| Predictive Analytics | ⚠️ | ✅ | **We exceed Keka** |
| Attrition Prediction | ❌ | ✅ | **We exceed Keka** |

---

## 2. RBAC Comparison

### Current Role Definitions

#### Keka Roles (6)
```
1. Global Admin - Full system access
2. HR Manager - All HR functions except billing
3. HR Executive - HR functions without salary access
4. Payroll Admin - Financial/payroll access only
5. Asset Manager - Asset management only
6. Project Admin - Project/timesheet management
```

#### Nu-Aura Roles (8)
```
1. SUPER_ADMIN (100) - Complete system control
2. TENANT_ADMIN (90) - Tenant-level administration
3. HR_MANAGER (80) - Full HR operations
4. HR_EXECUTIVE (70) - HR operations (no salary)
5. DEPARTMENT_MANAGER (60) - Department-level management
6. TEAM_LEAD (50) - Team-level management
7. EMPLOYEE (40) - Self-service access
8. CONTRACTOR (30) - Limited access
```

### Permission Structure Comparison

| Aspect | Keka | Nu-Aura |
|--------|------|---------|
| Total Permissions | ~100 | 340+ |
| Module-based | ✅ | ✅ |
| Action-based (CRUD) | ✅ | ✅ |
| Scope-based (All/Dept/Team/Self) | ✅ | ✅ |
| Field-level | ✅ | ⚠️ |
| Implicit Roles | ✅ | ⚠️ |
| Custom Roles | ✅ | ✅ |
| Role Hierarchy | ✅ | ✅ |

---

## 3. Improvement Plan

### Phase 1: RBAC Enhancements (Priority: HIGH)

#### 1.1 Add Keka-equivalent Specialized Roles

```java
// New roles to add
PAYROLL_ADMIN (75)    - Payroll/financial access only
ASSET_MANAGER (55)    - Asset management only
PROJECT_ADMIN (55)    - Project/PSA management
RECRUITMENT_ADMIN (65) - Recruitment module access
HELPDESK_ADMIN (55)   - Helpdesk management
EXPENSE_MANAGER (55)  - Expense approvals
TRAVEL_ADMIN (55)     - Travel management
```

#### 1.2 Implement Implicit Roles (Reporting Manager)

```java
// Automatic permissions based on employee relationships
REPORTING_MANAGER - Auto-assigned when employee has direct reports
  - VIEW team members' profiles
  - APPROVE team leave requests
  - VIEW team attendance
  - CONDUCT performance reviews for team
  - APPROVE team expenses
```

#### 1.3 Add Field-Level Permissions

```java
// Salary field visibility
EMPLOYEE_SALARY_VIEW     - View salary information
EMPLOYEE_SALARY_EDIT     - Edit salary information
EMPLOYEE_BANK_VIEW       - View bank details
EMPLOYEE_PAN_VIEW        - View PAN/tax ID
EMPLOYEE_AADHAAR_VIEW    - View ID documents
```

### Phase 2: Feature Gaps (Priority: MEDIUM)

#### 2.1 Facial Recognition Attendance
- Integrate with facial recognition API (AWS Rekognition / Azure Face API)
- Store face encodings securely
- Add liveness detection

#### 2.2 Pre-boarding Portal
- Public portal for new hires before joining date
- Document upload
- Policy acknowledgment
- IT/Asset requirement form

#### 2.3 Enhanced Candidate Portal
- Public career page
- Application status tracking
- Interview scheduling (candidate self-service)
- Document upload

#### 2.4 Biometric Device Integration
- ZKTeco integration
- Suprema integration
- API for custom devices

### Phase 3: Feature Enhancements (Priority: LOW)

#### 3.1 Mobile App Enhancements
- Push notifications
- Offline attendance support
- Expense photo capture
- Leave quick apply

#### 3.2 Integration Marketplace
- Google Workspace sync
- Microsoft 365 sync
- Slack deep integration
- Zoom/Meet integration

---

## 4. Proposed Role Definitions (Enhanced)

### Complete Role Matrix

| Role | Rank | Description | Key Permissions |
|------|------|-------------|-----------------|
| **SUPER_ADMIN** | 100 | Platform owner | All permissions, multi-tenant management |
| **TENANT_ADMIN** | 90 | Organization admin | All tenant permissions, user management |
| **HR_MANAGER** | 80 | HR department head | All HR modules, salary access, policy management |
| **PAYROLL_ADMIN** | 75 | Payroll specialist | Payroll, compensation, tax, statutory - no HR |
| **HR_EXECUTIVE** | 70 | HR team member | All HR except salary, reports |
| **RECRUITMENT_ADMIN** | 65 | Talent acquisition | Recruitment, onboarding, candidate management |
| **DEPARTMENT_MANAGER** | 60 | Department head | Department employees, budgets, approvals |
| **PROJECT_ADMIN** | 58 | PMO/Project lead | Projects, timesheets, resource allocation |
| **ASSET_MANAGER** | 56 | IT/Admin | Asset tracking, allocation, recovery |
| **EXPENSE_MANAGER** | 55 | Finance team | Expense approvals, reimbursements |
| **HELPDESK_ADMIN** | 54 | Support team | Ticket management, SLA |
| **TEAM_LEAD** | 50 | Team manager | Team members, leave/attendance approval |
| **EMPLOYEE** | 40 | Regular employee | Self-service, requests, profile |
| **CONTRACTOR** | 30 | External worker | Limited self-service, timesheet |
| **INTERN** | 20 | Trainee | Minimal access, learning |

### Implicit Roles (Auto-assigned)

| Implicit Role | Trigger | Permissions |
|---------------|---------|-------------|
| REPORTING_MANAGER | Has direct reports | View/approve team requests |
| DEPARTMENT_HEAD | Heads a department | Department-level reporting |
| SKIP_LEVEL_MANAGER | Has indirect reports | View skip-level team |
| MENTOR | Assigned as mentor | View mentee progress |
| INTERVIEWER | Assigned to interview | Candidate evaluation |
| REVIEWER | Assigned for review | Performance review access |

---

## 5. Permission Matrix by Role

### Employee Module Permissions

| Permission | SUPER_ADMIN | HR_MANAGER | HR_EXEC | DEPT_MGR | TEAM_LEAD | EMPLOYEE |
|------------|-------------|------------|---------|----------|-----------|----------|
| EMPLOYEE:VIEW_ALL | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| EMPLOYEE:VIEW_DEPT | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| EMPLOYEE:VIEW_TEAM | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE:VIEW_SELF | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| EMPLOYEE:CREATE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| EMPLOYEE:UPDATE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| EMPLOYEE:DELETE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| EMPLOYEE:SALARY_VIEW | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Leave Module Permissions

| Permission | SUPER_ADMIN | HR_MANAGER | HR_EXEC | DEPT_MGR | TEAM_LEAD | EMPLOYEE |
|------------|-------------|------------|---------|----------|-----------|----------|
| LEAVE:VIEW_ALL | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| LEAVE:VIEW_DEPT | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| LEAVE:VIEW_TEAM | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| LEAVE:VIEW_SELF | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| LEAVE:REQUEST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| LEAVE:APPROVE_ALL | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| LEAVE:APPROVE_DEPT | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| LEAVE:APPROVE_TEAM | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| LEAVE:CANCEL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| LEAVE:POLICY_MANAGE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### Payroll Module Permissions

| Permission | SUPER_ADMIN | PAYROLL_ADMIN | HR_MANAGER | HR_EXEC | EMPLOYEE |
|------------|-------------|---------------|------------|---------|----------|
| PAYROLL:VIEW_ALL | ✅ | ✅ | ✅ | ❌ | ❌ |
| PAYROLL:VIEW_SELF | ✅ | ✅ | ✅ | ✅ | ✅ |
| PAYROLL:PROCESS | ✅ | ✅ | ✅ | ❌ | ❌ |
| PAYROLL:APPROVE | ✅ | ✅ | ✅ | ❌ | ❌ |
| PAYROLL:CONFIGURE | ✅ | ✅ | ❌ | ❌ | ❌ |
| SALARY:VIEW | ✅ | ✅ | ✅ | ❌ | ❌ |
| SALARY:EDIT | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 6. Implementation Roadmap

### Sprint 1: Core RBAC Enhancements
- [ ] Add new specialized roles (Payroll Admin, Asset Manager, etc.)
- [ ] Implement implicit roles mechanism
- [ ] Add field-level permission support
- [ ] Update RoleHierarchy.java

### Sprint 2: Role Management UI
- [ ] Role creation/editing interface
- [ ] Permission assignment matrix UI
- [ ] Role assignment to users
- [ ] Bulk role operations

### Sprint 3: Feature Gaps
- [ ] Pre-boarding portal
- [ ] Enhanced candidate portal
- [ ] Biometric integration APIs

### Sprint 4: Advanced Features
- [ ] Facial recognition integration
- [ ] Mobile app enhancements
- [ ] Integration marketplace

---

## 7. Conclusion

**Nu-Aura HRMS is feature-complete and exceeds Keka in several areas:**

✅ **Strengths over Keka:**
- AI-powered recruitment
- Predictive analytics
- Social feed
- Wellness programs
- More granular permissions (340+ vs ~100)
- Multi-tenant architecture

⚠️ **Gaps to Address:**
- Facial recognition attendance
- Pre-boarding portal
- Biometric device integrations
- Some specialized role definitions

The improvement plan focuses on:
1. RBAC enhancements for Keka parity
2. Filling feature gaps
3. Enhancing existing capabilities

---

## Sources

- [Keka HR Software](https://www.keka.com/hr-software)
- [Keka Roles & Permissions](https://help.keka.com/admin/overview-roles-permissions)
- [Keka User Roles](https://help.keka.com/admin/understanding-user-roles)
- [Keka Leave Management](https://www.keka.com/leave-management-system)
- [Keka Features - G2](https://www.g2.com/products/keka/features)
- [Keka Pricing & Features](https://www.saasworthy.com/product/keka)

---

*Document Version: 1.0*
*Last Updated: December 2025*
