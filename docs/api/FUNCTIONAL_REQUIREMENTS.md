# Functional Requirements Specification

## 1. Authentication & Authorization (IAM)

### 1.1 Authentication Methods

#### JWT Token Authentication
- **Access Token**: Short-lived tokens (1 hour expiration) for API access
- **Refresh Token**: Long-lived tokens (24 hours) for session renewal
- **Token Storage**: Secure HTTP-only cookies or secure local storage
- **Token Rotation**: Automatic refresh before expiration

#### Google SSO Integration
- **Protocol**: OpenID Connect (OIDC) with PKCE flow
- **Scopes**: `openid`, `email`, `profile`
- **Account Linking**: Auto-create or link existing employee accounts
- **Domain Restriction**: Optional restriction to organization's Google Workspace domain

### 1.2 Role-Based Access Control (RBAC)

#### Permission Matrix Structure
```
Permission = Module + Action + Scope
Example: EMPLOYEE_VIEW_DEPARTMENT (View employees in own department only)
```

#### Scope Levels
| Scope | Description | Use Case |
|-------|-------------|----------|
| GLOBAL | Organization-wide access | Super Admin, CEO |
| LOCATION | Specific office/entity | Regional HR Manager |
| DEPARTMENT | Specific department | Department Head |
| TEAM | Direct reports only | Team Lead, Manager |
| OWN | Self-data only | Regular Employee |

#### Permission Actions
- **VIEW**: Read access to records
- **CREATE**: Create new records
- **EDIT**: Modify existing records
- **DELETE**: Remove records (soft or hard delete)
- **APPROVE**: Workflow approval capability
- **EXPORT**: Data export to files

#### Pre-defined Roles
| Role | Description | Default Permissions |
|------|-------------|---------------------|
| SUPER_ADMIN | Full system access | All permissions (GLOBAL) |
| HR_ADMIN | HR operations manager | HR modules (GLOBAL) |
| MANAGER | Team manager | Team management (TEAM) |
| EMPLOYEE | Standard employee | Self-service (OWN) |

### 1.3 Multi-Tenancy

- **Tenant Identification**: UUID-based tenant ID in request headers (`X-Tenant-ID`)
- **Data Isolation**: Row-level isolation with tenant_id foreign key
- **Tenant Context**: Spring RequestContext propagation for automatic filtering
- **Cross-Tenant Prevention**: JPA entity listeners enforce tenant boundaries

---

## 2. Employee Management

### 2.1 Employee Profile

#### Personal Information
- Full name, date of birth, gender
- Contact details (phone, email, address)
- Emergency contact information
- Photo/avatar upload
- Personal identification documents

#### Employment Information
- Employee ID (auto-generated or custom)
- Designation and department
- Employment type (Full-time, Part-time, Contract)
- Joining date and confirmation date
- Reporting manager (hierarchical relationship)
- Work location assignment

#### Bank & Financial Details
- Bank account information for payroll
- PAN number, Aadhaar (for Indian statutory compliance)
- Tax filing status

### 2.2 Employee Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌───────────┐    ┌─────────────┐
│ Onboarding  │───▶│  Probation   │───▶│ Confirmed │───▶│   Exit      │
└─────────────┘    └──────────────┘    └───────────┘    └─────────────┘
```

#### Onboarding
- Pre-boarding document collection
- Task checklist automation
- IT asset assignment
- Buddy assignment
- Training schedule creation

#### Probation Management
- Probation period tracking
- Review reminders
- Confirmation workflow
- Extension handling

#### Exit Management
- Resignation request workflow
- Clearance checklist
- Asset recovery tracking
- Final settlement calculation
- Exit interview scheduling

### 2.3 Employee Directory

- Global search with filters (name, department, location)
- Organization hierarchy visualization
- Reporting structure tree view
- Quick contact actions (email, phone)
- Profile card view with key details

### 2.4 Bulk Operations

- CSV/Excel import for employee creation
- Bulk status updates
- Mass email notifications
- Template-based data export

---

## 3. Attendance & Time Tracking

### 3.1 Attendance Capture

#### Methods
| Method | Description | Requirements |
|--------|-------------|--------------|
| Web Check-in | Browser-based punch | Authentication required |
| Mobile App | PWA-based punch | GPS location, device info |
| Biometric | Hardware integration | Device API integration |
| IP-Based | Auto-capture on network | Office network whitelist |

#### Geofencing
- Define office location coordinates
- Configure radius tolerance (default: 100m)
- GPS validation for mobile check-ins
- Manual override with approval workflow

### 3.2 Shift Management

#### Shift Configuration
- Shift start/end times
- Grace period (late arrival tolerance)
- Half-day thresholds
- Overtime rules
- Break time configuration

#### Shift Types
- **Fixed Shift**: Standard 9-5 schedule
- **Rotational Shift**: Week-based rotation patterns
- **Flexible Shift**: Core hours with flexible start/end
- **Night Shift**: Cross-midnight handling

#### Shift Assignment
- Individual assignment
- Bulk assignment by department/location
- Roster management calendar
- Shift swap requests

### 3.3 Attendance Records

#### Daily Record Fields
- Check-in time and source
- Check-out time and source
- Total working hours
- Break duration
- Overtime hours
- Status (Present, Absent, Half-Day, On Leave)

#### Regularization
- Missing punch request
- Time correction request
- Manager approval workflow
- Audit trail maintenance

### 3.4 Reports & Analytics

- Daily attendance summary
- Monthly attendance report
- Department-wise statistics
- Trend analysis (tardiness, absence patterns)
- Export to Excel/CSV

---

## 4. Leave Management

### 4.1 Leave Types

| Type | Description | Typical Allocation |
|------|-------------|-------------------|
| Casual Leave | Short-term personal needs | 12 days/year |
| Sick Leave | Medical absence | 12 days/year |
| Earned Leave | Long vacations | 15 days/year |
| Maternity Leave | Childbirth (female) | 26 weeks |
| Paternity Leave | Childbirth (male) | 5 days |
| Comp-Off | Overtime compensation | As earned |
| Loss of Pay | Unpaid leave | Unlimited |

### 4.2 Leave Policies

#### Accrual Rules
- Monthly accrual (e.g., 1.25 days/month)
- Pro-rata for mid-year joiners
- Accrual cap limits
- Year-end lapse or carry-over

#### Carry-Over Rules
- Maximum carry-over limit
- Encashment option
- Expiry policy (use-it-or-lose-it)

#### Restrictions
- Minimum notice period
- Maximum consecutive days
- Blackout dates (project deadlines, financial close)
- Holiday sandwich rules

### 4.3 Leave Request Workflow

```
┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────┐
│ Employee │───▶│  Submitted  │───▶│ Approved │───▶│ Applied  │
│ Request  │    │  (Pending)  │    │   (L1)   │    │          │
└──────────┘    └─────────────┘    └──────────┘    └──────────┘
                      │                  │
                      ▼                  ▼
                ┌──────────┐      ┌──────────┐
                │ Rejected │      │ Rejected │
                └──────────┘      └──────────┘
```

#### Approval Chain
- L1: Reporting Manager
- L2: Department Head (optional, for extended leave)
- HR Override: For exceptional cases

### 4.4 Leave Balance Management

- Real-time balance display
- Projected balance after pending requests
- Balance history and transactions
- Balance adjustment (admin only)

---

## 5. Payroll & Compensation

### 5.1 Salary Structure

#### Earnings Components
| Component | Type | Description |
|-----------|------|-------------|
| Basic Salary | Fixed | Base pay |
| HRA | Fixed | House Rent Allowance |
| Special Allowance | Fixed | Flexible component |
| Conveyance | Fixed | Travel allowance |
| Medical | Fixed | Health allowance |
| Bonus | Variable | Performance-based |
| Overtime | Variable | Based on hours worked |

#### Deductions
| Component | Type | Description |
|-----------|------|-------------|
| PF (Employee) | Statutory | Provident Fund (12% of Basic) |
| ESI | Statutory | Employee State Insurance |
| Professional Tax | Statutory | State-specific tax |
| TDS | Statutory | Income tax deduction |
| Loan Recovery | Custom | EMI deductions |

### 5.2 Payroll Processing

#### Payroll Run Workflow
```
1. Initiate Payroll Run
2. Attendance Data Import
3. Leave Data Integration
4. Overtime Calculation
5. Variable Pay Addition
6. Deduction Application
7. Statutory Calculation
8. Preview & Validation
9. Approval
10. Payslip Generation
11. Bank File Export
```

#### Payroll Frequency
- Monthly (most common)
- Bi-weekly
- Weekly

### 5.3 Payslip Generation

- PDF format with company branding
- YTD (Year-to-Date) summaries
- Statutory breakdowns
- Employee self-service download
- Bulk distribution via email

### 5.4 Statutory Compliance (India)

#### Provident Fund (PF)
- Employee contribution: 12% of Basic
- Employer contribution: 12% of Basic
- PF return generation

#### Professional Tax
- State-wise slabs
- Monthly deduction
- Annual filing

#### TDS (Tax Deducted at Source)
- IT declaration integration
- Tax slab calculation
- Form 16 generation

### 5.5 Loans & Advances

#### Loan Types
- Salary Advance
- Personal Loan
- Emergency Loan

#### Loan Workflow
```
Request ─▶ Manager Approval ─▶ Finance Approval ─▶ Disbursement ─▶ EMI Recovery
```

#### EMI Management
- Tenure-based installments
- Interest calculation (optional)
- Payroll deduction integration
- Prepayment handling

---

## 6. Performance Management

### 6.1 Goal Setting (OKR)

#### Objectives
- Company-level strategic objectives
- Department-level team objectives
- Individual employee objectives
- Alignment tracking (cascade view)

#### Key Results
- Measurable outcomes
- Progress tracking (0-100%)
- Milestone markers
- Due dates

### 6.2 Performance Reviews

#### Review Cycles
- Annual Review
- Mid-Year Review
- Quarterly Check-ins
- Probation Review

#### Review Components
- Self-assessment
- Manager assessment
- Peer feedback (optional)
- Skip-level feedback (optional)

### 6.3 360-Degree Feedback

#### Feedback Sources
- Self
- Manager (upward)
- Direct Reports (downward)
- Peers (lateral)
- Cross-functional stakeholders

#### Competency Assessment
- Technical skills
- Leadership skills
- Communication
- Problem-solving
- Teamwork

### 6.4 9-Box Grid (Talent Matrix)

```
High     │ Rising Star │ Consistent Star │ Super Star │
Potential│             │                 │            │
─────────┼─────────────┼─────────────────┼────────────┤
Medium   │ Inconsistent│ Key Player      │ High       │
Potential│ Player      │                 │ Performer  │
─────────┼─────────────┼─────────────────┼────────────┤
Low      │ Talent Risk │ Moderate        │ Solid      │
Potential│             │ Performer       │ Performer  │
─────────┴─────────────┴─────────────────┴────────────┘
          Low             Medium            High
                       Performance
```

### 6.5 Appraisals & Compensation Review

- Rating finalization
- Increment recommendation
- Promotion recommendation
- Approval workflow
- Letter generation

---

## 7. Recruitment & ATS

### 7.1 Job Management

#### Job Requisition
- Position title and description
- Required skills and qualifications
- Experience requirements
- Salary budget range
- Hiring manager assignment

#### Job Posting
- Internal job board
- External career page
- Job board integrations (LinkedIn, Naukri - planned)

### 7.2 Candidate Pipeline

```
┌─────────┐   ┌──────────┐   ┌───────────┐   ┌─────────┐   ┌────────┐
│ Applied │──▶│ Screened │──▶│ Interview │──▶│ Offered │──▶│ Hired  │
└─────────┘   └──────────┘   └───────────┘   └─────────┘   └────────┘
                                   │
                                   ▼
                            ┌────────────┐
                            │  Rejected  │
                            └────────────┘
```

#### Pipeline Stages
- New Application
- Resume Screening
- Phone Screen
- Technical Interview
- HR Interview
- Final Interview
- Offer Stage
- Hired / Rejected

### 7.3 Interview Management

- Interview scheduling
- Panel assignment
- Calendar integration
- Feedback collection
- Scorecard templates

### 7.4 Offer Management

- Offer letter generation
- E-signature integration (planned)
- Offer tracking
- Counter-offer handling
- Offer acceptance/rejection

### 7.5 AI-Assisted Screening (Planned)

- Resume parsing
- Skill matching
- Candidate ranking
- Bias detection

---

## 8. Project Management

### 8.1 Project Setup

#### Project Types
- Client Project (billable)
- Internal Project (non-billable)
- Support/Maintenance
- R&D

#### Project Fields
- Project name and code
- Client/customer assignment
- Start and end dates
- Budget allocation
- Project manager assignment
- Team members

### 8.2 Task Management

#### Task Hierarchy
```
Project
├── Phase/Milestone
│   ├── Task
│   │   ├── Subtask
│   │   └── Subtask
│   └── Task
└── Phase/Milestone
```

#### Task Properties
- Title and description
- Assignee
- Priority (Low, Medium, High, Critical)
- Status (To Do, In Progress, Review, Done)
- Due date
- Estimated hours
- Actual hours

### 8.3 Visualization

#### Gantt Chart
- Timeline view of all tasks
- Dependencies visualization
- Critical path highlighting
- Drag-and-drop rescheduling
- Zoom levels (Day, Week, Month, Quarter)

#### Kanban Board
- Column-based status view
- Drag-and-drop status changes
- WIP (Work in Progress) limits
- Swimlanes by assignee

### 8.4 Resource Allocation

#### Allocation Types
- Full-time (100%)
- Part-time (percentage-based)
- Temporary assignment

#### Capacity Planning
- Resource availability calendar
- Over-allocation alerts
- Utilization forecasting
- Skill-based assignment

### 8.5 Time Tracking

#### Timesheet Features
- Daily time entry
- Project/task selection
- Description/notes
- Billable/non-billable flag
- Weekly submission workflow

#### Approval Workflow
```
Employee Submit ─▶ Manager Review ─▶ Approved/Rejected
```

### 8.6 Project Analytics

- Budget vs. Actual comparison
- Resource utilization rates
- Project health indicators
- Milestone tracking
- Burndown charts

---

## 9. Benefits Administration

### 9.1 Benefit Plans

#### Plan Types
- Health Insurance
- Life Insurance
- Dental Coverage
- Vision Coverage
- Retirement Plans (401k, NPS)
- Flexible Benefits (Flex Credits)

#### Plan Configuration
- Coverage levels (Individual, Family)
- Premium costs (employee/employer share)
- Eligibility criteria
- Enrollment periods

### 9.2 Enrollment

#### Open Enrollment
- Annual enrollment window
- Plan comparison tools
- Premium calculator
- Family member addition
- Document upload (proof)

#### Life Event Changes
- Marriage
- Birth/Adoption
- Divorce
- Loss of coverage

### 9.3 Claims Management

- Claim submission
- Document attachment
- Status tracking
- Approval workflow
- Reimbursement processing

### 9.4 Wellness Programs

- Wellness challenges
- Health goals tracking
- Points/rewards system
- Wellness analytics

---

## 10. Training & Learning (LMS)

### 10.1 Course Catalog

#### Course Types
- Self-paced online
- Instructor-led (virtual)
- Instructor-led (classroom)
- Blended learning

#### Course Content
- Video modules
- Reading materials
- Quizzes/assessments
- Assignments
- Certifications

### 10.2 Learning Paths

- Sequential course progression
- Skill-based tracks
- Role-based tracks
- Compliance training tracks

### 10.3 Enrollment & Progress

- Self-enrollment
- Manager-assigned training
- Mandatory training tracking
- Progress indicators
- Completion certificates

### 10.4 Training Analytics

- Completion rates
- Assessment scores
- Time spent analysis
- Skill gap identification

---

## 11. Expense Management

### 11.1 Expense Categories

- Travel (airfare, hotel, local transport)
- Meals & Entertainment
- Office Supplies
- Professional Development
- Client Entertainment
- Miscellaneous

### 11.2 Expense Submission

#### Expense Entry
- Date of expense
- Category selection
- Amount and currency
- Receipt upload (image/PDF)
- Description/notes
- Project/client allocation

#### Expense Report
- Bundle multiple expenses
- Trip-based grouping
- Policy compliance check
- Pre-approval for large amounts

### 11.3 Approval Workflow

```
Submit ─▶ Manager Approval ─▶ Finance Review ─▶ Reimbursement
```

### 11.4 Reimbursement

- Payroll integration
- Direct bank transfer
- Payment status tracking
- Historical records

---

## 12. Asset Management

### 12.1 Asset Catalog

#### Asset Types
- IT Equipment (Laptops, Monitors, Keyboards)
- Furniture
- Vehicles
- Software Licenses
- Access Cards/Keys

#### Asset Properties
- Asset ID/Tag
- Description
- Purchase date and cost
- Vendor information
- Warranty details
- Current location
- Current assignee

### 12.2 Asset Lifecycle

```
Procurement ─▶ Inventory ─▶ Assignment ─▶ In Use ─▶ Recovery ─▶ Disposal
```

### 12.3 Assignment & Recovery

- Request workflow
- Acknowledgment capture
- Handover documentation
- Recovery during exit
- Condition assessment

### 12.4 Maintenance & Depreciation

- Maintenance scheduling
- Service history tracking
- Depreciation calculation
- Asset valuation reports

---

## 13. Employee Engagement

### 13.1 Announcements

- Company-wide broadcasts
- Department-specific announcements
- Pinned announcements
- Read tracking
- Comments and reactions

### 13.2 Recognition (Kudos)

- Peer-to-peer recognition
- Value-based badges
- Points/rewards system
- Recognition feed
- Manager recognition

### 13.3 Surveys

#### Survey Types
- Pulse surveys (quick feedback)
- Engagement surveys (comprehensive)
- Exit surveys
- Custom surveys

#### Survey Features
- Anonymous/identified responses
- Multiple question types
- Scheduling and reminders
- Analytics and reporting

### 13.4 Social Feed

- Post updates
- Photo sharing
- Event announcements
- Birthday/anniversary celebrations
- Like and comment interactions

---

## 14. Helpdesk & Support

### 14.1 Ticket Management

#### Ticket Categories
- IT Support
- HR Queries
- Facilities
- Finance
- General

#### Ticket Properties
- Subject and description
- Category and sub-category
- Priority (Low, Medium, High, Critical)
- Status (Open, In Progress, Resolved, Closed)
- Assignee
- Due date

### 14.2 SLA Management

- Response time SLAs
- Resolution time SLAs
- Escalation rules
- SLA breach alerts

### 14.3 Knowledge Base

- FAQ articles
- How-to guides
- Policy documents
- Searchable content

---

## 15. Reporting & Analytics

### 15.1 Dashboard Types

#### Executive Dashboard
- Headcount metrics
- Attrition rate
- Cost per employee
- Recruitment funnel
- Performance distribution

#### Manager Dashboard
- Team attendance
- Pending approvals
- Project status
- Team performance

#### Employee Dashboard
- Personal attendance
- Leave balance
- Goals progress
- Training status

### 15.2 Standard Reports

| Report | Description | Frequency |
|--------|-------------|-----------|
| Headcount Report | Employee count by dept/location | Monthly |
| Attendance Report | Attendance statistics | Weekly/Monthly |
| Leave Report | Leave utilization | Monthly |
| Payroll Report | Salary disbursement | Monthly |
| Attrition Report | Turnover analysis | Quarterly |
| Performance Report | Rating distribution | Annually |

### 15.3 Export Capabilities

- CSV export
- Excel export with formatting
- PDF generation
- Scheduled report delivery

---

## 16. Notifications & Alerts

### 16.1 Notification Channels

| Channel | Use Case |
|---------|----------|
| In-App | Real-time updates, alerts |
| Email | Important notifications, digests |
| SMS | Critical alerts (via Twilio) |
| WebSocket | Live updates in browser |

### 16.2 Notification Types

- Leave request approvals
- Attendance anomalies
- Payslip availability
- Task assignments
- Deadline reminders
- System announcements

### 16.3 Notification Preferences

- Channel preferences per type
- Do not disturb settings
- Digest frequency (daily, weekly)
- Unsubscribe options

---

## 17. Mobile Experience (PWA)

### 17.1 Mobile-Optimized Features

- Attendance check-in/out with GPS
- Leave request submission
- Approval actions
- Employee directory
- Notification center
- Profile management

### 17.2 Offline Capabilities (Planned)

- Offline attendance capture
- Sync on reconnection
- Cached employee data

### 17.3 Device Features

- Camera access (receipt capture)
- GPS location (geofencing)
- Push notifications
- Biometric authentication (device-level)

---

*Document Version: 1.0*
*Last Updated: January 11, 2026*
