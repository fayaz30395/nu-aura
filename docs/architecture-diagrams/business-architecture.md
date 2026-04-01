# NU-AURA Platform — Business Architecture

> For executives, product stakeholders, and business teams.
> Shows WHAT the platform does, WHO uses it, and HOW value flows.

---

## Platform Overview

```mermaid
graph TB
    subgraph PLATFORM["NU-AURA — Unified People Operations Platform"]
        direction TB

        subgraph ENTRY["Single Sign-On Entry Point"]
            LOGIN["Secure Login<br/>(Email / Google SSO / MFA)"]
            SWITCHER["App Switcher<br/>(Google-style Waffle Grid)"]
        end

        subgraph APPS["4 Sub-Applications"]
            direction LR

            subgraph HRMS["NU-HRMS<br/>Core HR Management"]
                direction TB
                H1["Employee Lifecycle<br/>Hire → Retire"]
                H2["Leave & Attendance<br/>Policies, Tracking, Regularization"]
                H3["Payroll & Compensation<br/>Formula Engine, Payslips, Tax"]
                H4["Benefits & Expenses<br/>Claims, Loans, Travel, Assets"]
                H5["Org Structure<br/>Departments, Org Chart, Shifts"]
                H6["Compliance<br/>Statutory, LWF, PF, ESI, Tax Filings"]
            end

            subgraph HIRE["NU-Hire<br/>Talent Acquisition"]
                direction TB
                R1["Job Postings<br/>Career Page, Job Board Sync"]
                R2["Candidate Pipeline<br/>Screening → Interview → Offer"]
                R3["Onboarding<br/>Pre-boarding, Day-1, Checklists"]
                R4["Offboarding<br/>Exit Interview, Clearance, KT"]
                R5["Referrals<br/>Employee Referral Program"]
            end

            subgraph GROW["NU-Grow<br/>Performance & Learning"]
                direction TB
                G1["Performance Reviews<br/>Annual, Mid-Year, Continuous"]
                G2["OKRs & Goals<br/>Cascading Objectives"]
                G3["360 Feedback<br/>Multi-rater Assessment"]
                G4["Training & LMS<br/>Course Catalog, Certifications"]
                G5["Recognition & Wellness<br/>Kudos, Surveys, Wellness Programs"]
            end

            subgraph FLUENCE["NU-Fluence<br/>Knowledge & Collaboration"]
                direction TB
                F1["Wiki<br/>Company Knowledge Base"]
                F2["Blogs<br/>Internal Communications"]
                F3["Templates<br/>Document Templates Library"]
                F4["Drive<br/>File Storage & Sharing"]
                F5["Social Wall<br/>Company Feed & Updates"]
            end
        end

        subgraph CROSS["Cross-Cutting Platform Capabilities"]
            direction LR
            C1["Approval Workflows<br/>Configurable Multi-step Approvals"]
            C2["Notifications<br/>In-app, Email, SMS, Real-time"]
            C3["Reports & Analytics<br/>Dashboards, Exports, Predictive"]
            C4["Document Generation<br/>Letters, Offer Letters, Payslips"]
            C5["Helpdesk<br/>Employee Support Tickets"]
            C6["Calendar & Scheduling<br/>Company Calendar, Holidays"]
        end
    end

    LOGIN --> SWITCHER
    SWITCHER --> HRMS
    SWITCHER --> HIRE
    SWITCHER --> GROW
    SWITCHER --> FLUENCE

    HRMS ~~~ CROSS
    HIRE ~~~ CROSS
    GROW ~~~ CROSS
    FLUENCE ~~~ CROSS

    style PLATFORM fill:#f0f4ff,stroke:#0369a1,stroke-width:3px
    style HRMS fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style HIRE fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style GROW fill:#ede9fe,stroke:#7c3aed,stroke-width:2px
    style FLUENCE fill:#fef3c7,stroke:#d97706,stroke-width:2px
    style CROSS fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style ENTRY fill:#fff7ed,stroke:#ea580c,stroke-width:2px
```

---

## Who Uses the Platform — Role-Based Access

```mermaid
graph LR
    subgraph ROLES["User Roles & Access Scope"]
        direction TB

        ESS["Employee (ESS)<br/>━━━━━━━━━━━━━━━<br/>Own profile, leave, payslips,<br/>expenses, attendance, training"]
        MGR["Manager (MGR)<br/>━━━━━━━━━━━━━━━<br/>Team approvals, team dashboard,<br/>performance reviews of direct reports"]
        HRA["HR Admin (HRA)<br/>━━━━━━━━━━━━━━━<br/>All employee data, policies,<br/>org structure, compliance, reports"]
        REC["Recruiter (REC)<br/>━━━━━━━━━━━━━━━<br/>Job postings, candidates,<br/>interviews, offers, onboarding"]
        PAY["Payroll Admin (PAY)<br/>━━━━━━━━━━━━━━━<br/>Payroll runs, compensation,<br/>tax, statutory filings"]
        FIN["Finance (FIN)<br/>━━━━━━━━━━━━━━━<br/>Expense approvals, budget,<br/>financial reports"]
        ITA["IT Admin (ITA)<br/>━━━━━━━━━━━━━━━<br/>Asset management,<br/>device allocation"]
        SYS["SuperAdmin (SYS)<br/>━━━━━━━━━━━━━━━<br/>Full platform access,<br/>tenant config, roles & permissions"]
    end

    subgraph ACCESS["Access Pattern"]
        OWN["Own Data Only"]
        TEAM["Team Data"]
        DOMAIN["Domain-wide"]
        ALL["Platform-wide"]
    end

    ESS --> OWN
    MGR --> TEAM
    HRA --> DOMAIN
    REC --> DOMAIN
    PAY --> DOMAIN
    FIN --> DOMAIN
    ITA --> DOMAIN
    SYS --> ALL

    style ESS fill:#dbeafe,stroke:#2563eb
    style MGR fill:#e0f2fe,stroke:#0284c7
    style HRA fill:#fce7f3,stroke:#db2777
    style REC fill:#ede9fe,stroke:#7c3aed
    style PAY fill:#fef3c7,stroke:#d97706
    style FIN fill:#d1fae5,stroke:#059669
    style ITA fill:#e5e7eb,stroke:#6b7280
    style SYS fill:#fee2e2,stroke:#dc2626
```

---

## Employee Lifecycle Journey

```mermaid
graph LR
    A["Recruit<br/>(NU-Hire)"] --> B["Onboard<br/>(NU-Hire)"]
    B --> C["Manage<br/>(NU-HRMS)"]
    C --> D["Grow<br/>(NU-Grow)"]
    D --> C
    C --> E["Offboard<br/>(NU-Hire)"]

    subgraph "Throughout Employment"
        direction TB
        P1["Pay → Payroll & Tax"]
        P2["Learn → Training & LMS"]
        P3["Collaborate → Wiki & Drive"]
        P4["Engage → Surveys & Recognition"]
    end

    C --- P1
    D --- P2
    D --- P4
    C --- P3

    style A fill:#dbeafe,stroke:#2563eb,stroke-width:2px
    style B fill:#d1fae5,stroke:#059669,stroke-width:2px
    style C fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    style D fill:#ede9fe,stroke:#7c3aed,stroke-width:2px
    style E fill:#fee2e2,stroke:#dc2626,stroke-width:2px
```

---

## Multi-Tenant SaaS Model

```mermaid
graph TB
    subgraph TENANTS["Tenant Isolation"]
        direction LR
        T1["Company A<br/>500 employees"]
        T2["Company B<br/>2,000 employees"]
        T3["Company C<br/>10,000 employees"]
    end

    subgraph SHARED["Shared Platform Infrastructure"]
        direction TB
        APP["Single NU-AURA Deployment"]
        DB["Shared Database<br/>(Row-Level Security)"]
        CACHE["Shared Cache Layer"]
        SEARCH["Shared Search Engine"]
    end

    T1 --> APP
    T2 --> APP
    T3 --> APP
    APP --> DB
    APP --> CACHE
    APP --> SEARCH

    NOTE["Each company's data is<br/>completely isolated via<br/>tenant_id + PostgreSQL RLS.<br/>No company can ever see<br/>another company's data."]

    style TENANTS fill:#fff7ed,stroke:#ea580c,stroke-width:2px
    style SHARED fill:#f0f4ff,stroke:#0369a1,stroke-width:2px
    style NOTE fill:#fefce8,stroke:#ca8a04,stroke-dasharray: 5 5
```

---

## Approval Workflow Engine (Business View)

```mermaid
graph LR
    REQ["Employee<br/>submits request"] --> WF["Workflow Engine<br/>routes based on rules"]
    WF --> A1["Step 1: Manager"]
    A1 -->|Approved| A2["Step 2: HR / Finance"]
    A2 -->|Approved| DONE["Request Fulfilled<br/>+ Notification Sent"]
    A1 -->|Rejected| REJ["Rejected<br/>+ Reason + Notification"]
    A2 -->|Rejected| REJ

    subgraph "Configurable Workflows"
        direction TB
        W1["Leave Requests"]
        W2["Expense Claims"]
        W3["Asset Requests"]
        W4["Loan Applications"]
        W5["Travel Requests"]
        W6["Onboarding Checklists"]
    end

    style REQ fill:#dbeafe,stroke:#2563eb
    style DONE fill:#d1fae5,stroke:#059669
    style REJ fill:#fee2e2,stroke:#dc2626
    style WF fill:#fef3c7,stroke:#d97706,stroke-width:2px
```

---

## Business Value Summary

| Capability | Business Impact |
|---|---|
| **Single Platform** | One login for all HR operations — no tool-switching |
| **Multi-Tenant SaaS** | Serve unlimited companies from one deployment |
| **Configurable Workflows** | No code changes needed for new approval chains |
| **Role-Based Access** | 9 roles with granular permissions (500+ permission rules) |
| **Real-Time Notifications** | Instant alerts via in-app, email, and SMS |
| **Compliance Built-In** | Statutory filings, PF, ESI, LWF, tax — India-ready |
| **Full Employee Lifecycle** | Recruit → Onboard → Manage → Grow → Offboard |
| **Analytics & Predictive** | Dashboards, exportable reports, ML-powered insights |
| **Knowledge Management** | Wiki, blogs, templates, drive — company brain |
