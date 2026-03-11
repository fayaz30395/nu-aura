# NU-AURA HRMS - UI Architecture

> Interactive architecture diagrams for the NU-AURA HRMS platform

---

## 1. System Overview

```mermaid
flowchart TB
    subgraph Clients["🖥️ Client Layer"]
        Desktop["💻 Desktop Browser"]
        Tablet["📱 Tablet"]
        Mobile["📲 Mobile Browser"]
        PWA["⚡ PWA"]
    end

    subgraph Frontend["⚛️ Next.js 14 Application"]
        App["App Router"]
        Components["Components"]
        Services["Services"]
        State["State Management"]
    end

    subgraph APIs["🔌 API Layer"]
        REST["REST API\n/api/v1/*"]
        WS["WebSocket\nSTOMP/SockJS"]
        OAuth["Google OAuth\nDrive/Mail/Calendar"]
    end

    subgraph Backend["🚀 Spring Boot 3.4"]
        Auth["🔐 Auth Filter"]
        RBAC["🛡️ RBAC"]
        Tenant["🏢 Multi-Tenant"]
        Rate["⏱️ Rate Limiter"]
        Audit["📝 Audit Log"]
    end

    subgraph Data["💾 Data Layer"]
        PG[("PostgreSQL\n80+ Tables")]
        Redis[("Redis\nCache")]
        MinIO[("MinIO\nStorage")]
        External["📧 Twilio/SMTP"]
    end

    Clients --> Frontend
    Frontend --> APIs
    APIs --> Backend
    Backend --> Data

    style Clients fill:#e1f5fe,stroke:#01579b
    style Frontend fill:#f3e5f5,stroke:#7b1fa2
    style APIs fill:#fff3e0,stroke:#e65100
    style Backend fill:#e8f5e9,stroke:#2e7d32
    style Data fill:#fce4ec,stroke:#c2185b
```

---

## 2. Frontend Provider Architecture

```mermaid
flowchart TB
    subgraph Providers["🎁 Provider Stack"]
        EB["ErrorBoundary\n🚨 Error Handling"]
        GOA["GoogleOAuthProvider\n🔑 OAuth Context"]
        QC["QueryClientProvider\n📊 React Query"]
        TP["ToastProvider\n🔔 Notifications"]
        DM["DarkModeProvider\n🌙 Theme Toggle"]
        MT["MantineThemeProvider\n🎨 UI Theme"]
        WS["WebSocketProvider\n⚡ Real-time"]
        APP["📱 Application"]
    end

    EB --> GOA --> QC --> TP --> DM --> MT --> WS --> APP

    style EB fill:#ffcdd2,stroke:#c62828
    style GOA fill:#bbdefb,stroke:#1565c0
    style QC fill:#c8e6c9,stroke:#2e7d32
    style TP fill:#fff9c4,stroke:#f9a825
    style DM fill:#d1c4e9,stroke:#512da8
    style MT fill:#b2ebf2,stroke:#00838f
    style WS fill:#ffe0b2,stroke:#e65100
    style APP fill:#f5f5f5,stroke:#424242
```

---

## 3. State Management Architecture

```mermaid
flowchart LR
    subgraph Global["🌍 Global State"]
        Zustand["Zustand Store\n━━━━━━━━━━━\n👤 User Session\n🎫 Auth Tokens\n🔒 Permissions\n🏢 Tenant"]
    end

    subgraph Server["☁️ Server State"]
        RQ["React Query\n━━━━━━━━━━━\n📦 API Cache\n🔄 Auto Refetch\n⚡ Optimistic\n🔁 Invalidation"]
    end

    subgraph Realtime["⚡ Real-time"]
        WSS["WebSocket Context\n━━━━━━━━━━━\n🔔 Notifications\n📡 Connection\n🔄 Auto-reconnect"]
    end

    subgraph Form["📝 Form State"]
        RHF["React Hook Form\n━━━━━━━━━━━\n✅ Validation\n📋 Registration\n❌ Errors"]
    end

    Global --> |"Persisted"| LS[("💾 localStorage")]
    Server --> |"60s stale"| API[("🌐 API")]
    Realtime --> |"STOMP"| Socket[("🔌 WebSocket")]

    style Global fill:#e3f2fd,stroke:#1565c0
    style Server fill:#e8f5e9,stroke:#2e7d32
    style Realtime fill:#fff3e0,stroke:#e65100
    style Form fill:#fce4ec,stroke:#c2185b
```

---

## 4. Component Hierarchy

```mermaid
flowchart TB
    subgraph Layout["📐 Layout Layer"]
        direction TB
        Header["🔝 Header\nSearch | Notifications | Profile"]
        Sidebar["📑 Sidebar\nRole-based Navigation"]
        Breadcrumb["🍞 Breadcrumbs"]
        Content["📄 Main Content"]
        MobileNav["📱 Mobile Bottom Nav"]
    end

    subgraph UI["🧩 UI Components (27)"]
        direction LR
        Btn["Button"]
        Card["Card"]
        Modal["Modal"]
        Table["Table"]
        Input["Input"]
        Select["Select"]
        Badge["Badge"]
        Toast["Toast"]
    end

    subgraph Charts["📊 Chart Components"]
        direction LR
        Attendance["Attendance Trend"]
        Headcount["Headcount"]
        Payroll["Payroll Cost"]
        Leave["Leave Distribution"]
    end

    subgraph Domain["🏛️ Domain Components"]
        direction LR
        Employee["Employee"]
        Resource["Resources"]
        Project["Projects"]
        Performance["Performance"]
    end

    Layout --> UI
    Layout --> Charts
    Layout --> Domain

    style Layout fill:#e8eaf6,stroke:#3949ab
    style UI fill:#e0f7fa,stroke:#00838f
    style Charts fill:#f3e5f5,stroke:#7b1fa2
    style Domain fill:#fff8e1,stroke:#ff8f00
```

---

## 5. API & Service Architecture

```mermaid
flowchart TB
    subgraph Client["📱 React Components"]
        Pages["Pages"]
        Hooks["Custom Hooks"]
    end

    subgraph Axios["🔌 Axios Instance"]
        direction TB
        ReqInt["📤 Request Interceptors\n• Authorization Header\n• X-Tenant-ID Header\n• Content-Type"]
        ResInt["📥 Response Interceptors\n• Token Refresh on 401\n• Error Transform\n• Response Unwrap"]
    end

    subgraph Services["⚙️ Domain Services (43)"]
        direction TB
        Core["🏢 Core\nEmployee | Department\nAttendance | Leave"]
        HR["💰 HR & Comp\nPayroll | Benefits\nLoans | Expenses"]
        Perf["📈 Performance\nReviews | OKR\n360 | Training"]
        Ops["🔧 Operations\nProjects | Resources\nTimesheets | Travel"]
        Analytics["📊 Analytics\nDashboard | Reports"]
    end

    subgraph Backend["🖥️ Spring Boot API"]
        API["/api/v1/*"]
    end

    Client --> Axios
    Axios --> Services
    Services --> Backend

    style Client fill:#e3f2fd,stroke:#1565c0
    style Axios fill:#fff3e0,stroke:#e65100
    style Services fill:#e8f5e9,stroke:#2e7d32
    style Backend fill:#fce4ec,stroke:#c2185b
```

---

## 6. Real-time WebSocket Architecture

```mermaid
sequenceDiagram
    participant C as 🖥️ Client
    participant WS as ⚡ WebSocket
    participant B as 🖥️ Backend
    participant DB as 💾 Database

    C->>WS: Connect (STOMP/SockJS)
    WS->>C: Connected ✅

    C->>WS: Subscribe /topic/user/{userId}
    C->>WS: Subscribe /topic/broadcast
    C->>WS: Subscribe /topic/tenant/{tenantId}

    Note over B: Event Triggered
    B->>DB: Save Notification
    B->>WS: Publish Message

    WS->>C: 🔔 Notification

    Note over C: Toast + Badge Update

    alt Connection Lost
        WS--xC: Disconnect
        C->>WS: Reconnect (exponential backoff)
    end
```

---

## 7. Authentication Flow

```mermaid
flowchart TB
    subgraph Login["🔐 Login Options"]
        Email["📧 Email/Password"]
        Google["🔵 Google OAuth"]
    end

    subgraph Auth["🎫 Authentication"]
        Validate["Validate Credentials"]
        JWT["Generate JWT"]
    end

    subgraph Response["📦 Response"]
        Access["🎟️ Access Token\n(1 hour)"]
        Refresh["🔄 Refresh Token\n(24 hours)"]
        User["👤 User Object"]
        Perms["🔒 Permissions"]
    end

    subgraph Store["💾 Zustand Store"]
        Persist["Persist to\nlocalStorage"]
    end

    Login --> Auth
    Auth --> Response
    Response --> Store

    style Login fill:#e3f2fd,stroke:#1565c0
    style Auth fill:#fff3e0,stroke:#e65100
    style Response fill:#e8f5e9,stroke:#2e7d32
    style Store fill:#f3e5f5,stroke:#7b1fa2
```

---

## 8. Role Hierarchy

```mermaid
flowchart TB
    SA["👑 SUPER_ADMIN\nFull System Access"]

    SA --> HRA["🏛️ HR_ADMIN"]
    SA --> CEO["👔 CEO"]
    SA --> VP["📊 VP"]
    SA --> OH["⚙️ OPERATIONS_HEAD"]

    HRA --> HRE["👥 HR_EXECUTIVE"]
    CEO --> DL["🎯 DELIVERY_LEAD"]
    VP --> DL
    OH --> MGR["👨‍💼 MANAGER"]
    DL --> MGR

    HRE --> EMP["👤 EMPLOYEE"]
    MGR --> EMP

    subgraph Senior["🔷 Senior Management"]
        SA
        HRA
        CEO
        VP
        OH
        DL
    end

    style SA fill:#ffcdd2,stroke:#c62828
    style HRA fill:#f8bbd9,stroke:#ad1457
    style CEO fill:#e1bee7,stroke:#7b1fa2
    style VP fill:#d1c4e9,stroke:#512da8
    style OH fill:#c5cae9,stroke:#303f9f
    style DL fill:#bbdefb,stroke:#1565c0
    style HRE fill:#b3e5fc,stroke:#0277bd
    style MGR fill:#b2ebf2,stroke:#00838f
    style EMP fill:#c8e6c9,stroke:#388e3c
```

---

## 9. Google Workspace Integration

```mermaid
flowchart LR
    subgraph OAuth["🔐 Google OAuth"]
        Provider["GoogleOAuthProvider"]
    end

    subgraph Services["🔗 Integrated Services"]
        Drive["📁 Google Drive\n• File Browser\n• Upload/Share\n• Org Folders"]
        Mail["📧 Gmail\n• Inbox View\n• Send/Compose\n• Labels"]
        Calendar["📅 Calendar\n• Event View\n• Create Events\n• Sync Meetings"]
    end

    subgraph Routes["🛣️ Routes"]
        R1["/nu-drive"]
        R2["/nu-mail"]
        R3["/nu-calendar"]
    end

    OAuth --> Services
    Drive --> R1
    Mail --> R2
    Calendar --> R3

    style OAuth fill:#e3f2fd,stroke:#1565c0
    style Drive fill:#e8f5e9,stroke:#2e7d32
    style Mail fill:#ffebee,stroke:#c62828
    style Calendar fill:#fff3e0,stroke:#e65100
```

---

## 10. Application Modules

```mermaid
mindmap
  root((NU-AURA HRMS))
    Core HR
      👥 Employees
      📅 Attendance
      🏖️ Leave
      💰 Payroll
      🏢 Departments
    Performance
      📈 Reviews
      🎯 OKR
      🔄 360 Feedback
      📚 Training
      🏆 Recognition
    Lifecycle
      📝 Recruitment
      🚪 Preboarding
      🎉 Onboarding
      👋 Offboarding
    Operations
      📊 Projects
      ⏱️ Timesheets
      👔 Resources
      ✈️ Travel
      💼 Assets
    Finance
      💵 Compensation
      🎁 Benefits
      💳 Expenses
      🏦 Loans
    Analytics
      📉 Dashboards
      📋 Reports
      📢 Announcements
      📊 Surveys
    Admin
      🔐 Roles
      🛡️ Permissions
      🏢 Locations
      📅 Holidays
```

---

## 11. Data Flow Architecture

```mermaid
flowchart LR
    subgraph UI["🖥️ UI Layer"]
        Page["Page Component"]
        Hook["useQuery Hook"]
    end

    subgraph Service["⚙️ Service Layer"]
        Svc["Domain Service"]
        Axios["Axios Client"]
    end

    subgraph API["🌐 API Layer"]
        REST["REST Endpoint"]
        Controller["Controller"]
    end

    subgraph Domain["🏛️ Domain Layer"]
        Svc2["Service"]
        Repo["Repository"]
    end

    subgraph DB["💾 Data Layer"]
        PG[("PostgreSQL")]
    end

    Page --> Hook --> Svc --> Axios --> REST --> Controller --> Svc2 --> Repo --> PG

    PG --> Repo --> Svc2 --> Controller --> REST --> Axios --> Svc --> Hook --> Page

    style UI fill:#e3f2fd,stroke:#1565c0
    style Service fill:#fff3e0,stroke:#e65100
    style API fill:#e8f5e9,stroke:#2e7d32
    style Domain fill:#f3e5f5,stroke:#7b1fa2
    style DB fill:#fce4ec,stroke:#c2185b
```

---

## 12. Technology Stack

```mermaid
flowchart TB
    subgraph Framework["🏗️ Framework"]
        Next["Next.js 14.2"]
        TS["TypeScript 5.9"]
        React["React 18"]
    end

    subgraph UI["🎨 UI"]
        Mantine["Mantine 8.3"]
        Tailwind["Tailwind 3.4"]
        Radix["Radix UI"]
        Lucide["Lucide Icons"]
    end

    subgraph State["📦 State"]
        Zustand["Zustand 4.4"]
        RQuery["React Query 5.17"]
        RHForm["React Hook Form"]
    end

    subgraph Data["📊 Data"]
        Axios["Axios 1.6"]
        Recharts["Recharts 3.5"]
        ExcelJS["ExcelJS 4.4"]
        jsPDF["jsPDF 3.0"]
    end

    subgraph Realtime["⚡ Real-time"]
        STOMP["STOMP.js 7.2"]
        SockJS["SockJS 1.6"]
    end

    subgraph Auth["🔐 Auth"]
        OAuth["@react-oauth/google"]
        JWTDec["jwt-decode 4.0"]
    end

    subgraph Test["🧪 Testing"]
        Playwright["Playwright"]
        Axe["axe-core"]
    end

    style Framework fill:#e3f2fd,stroke:#1565c0
    style UI fill:#e8f5e9,stroke:#2e7d32
    style State fill:#fff3e0,stroke:#e65100
    style Data fill:#f3e5f5,stroke:#7b1fa2
    style Realtime fill:#ffecb3,stroke:#ff8f00
    style Auth fill:#ffcdd2,stroke:#c62828
    style Test fill:#d1c4e9,stroke:#512da8
```

---

## 13. File Structure

```mermaid
flowchart TB
    subgraph Root["📁 hrms-frontend"]
        App["📂 app/\nNext.js Pages"]
        Comp["📂 components/\n57 Components"]
        Lib["📂 lib/\nUtilities"]
        E2E["📂 e2e/\n140+ Tests"]
    end

    subgraph AppDir["app/"]
        Auth["(auth)/"]
        Admin["admin/"]
        Modules["attendance/ | leave/\nemployees/ | payroll/\nperformance/ | projects/"]
    end

    subgraph CompDir["components/"]
        Layout["layout/ (7)"]
        UIComp["ui/ (27)"]
        Charts["charts/ (6)"]
        Notif["notifications/ (3)"]
    end

    subgraph LibDir["lib/"]
        APIs["api/ (7)"]
        Services["services/ (43)"]
        Types["types/ (43)"]
        Hooks["hooks/"]
        Utils["utils/"]
    end

    App --> AppDir
    Comp --> CompDir
    Lib --> LibDir

    style Root fill:#e3f2fd,stroke:#1565c0
    style AppDir fill:#e8f5e9,stroke:#2e7d32
    style CompDir fill:#fff3e0,stroke:#e65100
    style LibDir fill:#f3e5f5,stroke:#7b1fa2
```

---

## 14. Request Lifecycle

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant P as 📱 Page
    participant H as 🪝 useQuery
    participant S as ⚙️ Service
    participant A as 🔌 Axios
    participant B as 🖥️ Backend
    participant D as 💾 Database

    U->>P: Navigate/Action
    P->>H: Call Query Hook
    H->>S: Call Service Method
    S->>A: HTTP Request

    Note over A: Add Headers<br/>• Authorization<br/>• X-Tenant-ID

    A->>B: API Call
    B->>D: Query Data
    D-->>B: Result
    B-->>A: Response

    alt Success
        A-->>S: Data
        S-->>H: Parsed Data
        H-->>P: Cached Data
        P-->>U: Render UI
    else 401 Unauthorized
        A->>A: Refresh Token
        A->>B: Retry Request
    else Error
        A-->>S: Error
        S-->>H: Error
        H-->>P: Error State
        P-->>U: Error Toast
    end
```

---

## Quick Stats

| Category | Count |
|----------|-------|
| 📄 Pages/Routes | 60+ |
| ⚙️ Services | 43 |
| 🧩 Components | 57 |
| 📊 Chart Components | 6 |
| 📝 Type Definitions | 43 |
| 🧪 E2E Tests | 140+ |
| 🔌 API Modules | 7 |

---

*Last Updated: January 12, 2026*
