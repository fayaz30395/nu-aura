# NuLogic HRMS Frontend

Modern, responsive Human Resource Management System UI built with Next.js 14 and TypeScript.

## Overview

NuLogic HRMS Frontend is a comprehensive HR application featuring 28+ pages covering the complete employee lifecycle. Built with the App Router, it provides a seamless dark mode experience with the NuLogic design system.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

## Features

### UI/UX
- Responsive design for all devices
- NuLogic dark mode theme throughout
- Consistent component library
- Loading states and error handling
- Breadcrumb navigation
- Global search
- Notification center

### Pages (28 Total)

| Category | Pages |
|----------|-------|
| **Dashboard** | Main dashboard with analytics |
| **Employees** | List, detail, edit, directory, import |
| **Attendance** | My attendance, team, regularization |
| **Leave** | Apply, my leaves, approvals, calendar |
| **Payroll** | Overview, payslips |
| **Performance** | Goals, reviews, feedback, cycles |
| **Recruitment** | Jobs, candidates, interviews |
| **Benefits** | Plans, enrollment |
| **Training** | Programs, courses |
| **Admin** | Roles, permissions, settings, shifts, holidays |
| **Reports** | Various HR reports |
| **And more...** | OKR, recognition, surveys, wellness |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Or with yarn
yarn install
```

### Environment Setup

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

### Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── admin/                # Admin pages
│   │   ├── custom-fields/
│   │   ├── holidays/
│   │   ├── leave-requests/
│   │   ├── leave-types/
│   │   ├── office-locations/
│   │   ├── org-hierarchy/
│   │   ├── permissions/
│   │   ├── roles/
│   │   ├── settings/
│   │   └── shifts/
│   ├── announcements/
│   ├── attendance/
│   │   ├── my-attendance/
│   │   ├── regularization/
│   │   └── team/
│   ├── auth/
│   │   ├── login/
│   │   └── forgot-password/
│   ├── benefits/
│   ├── compensation/
│   ├── dashboard/
│   ├── departments/
│   ├── employees/
│   │   ├── [id]/
│   │   ├── directory/
│   │   └── import/
│   ├── expenses/
│   ├── feedback360/
│   ├── helpdesk/
│   ├── leave/
│   │   ├── apply/
│   │   ├── approvals/
│   │   ├── calendar/
│   │   └── my-leaves/
│   ├── learning/
│   ├── me/
│   │   ├── attendance/
│   │   ├── leaves/
│   │   ├── payslips/
│   │   └── profile/
│   ├── okr/
│   ├── org-chart/
│   ├── payroll/
│   ├── performance/
│   │   ├── cycles/
│   │   ├── feedback/
│   │   ├── goals/
│   │   └── reviews/
│   ├── projects/
│   ├── recognition/
│   ├── recruitment/
│   │   ├── candidates/
│   │   ├── interviews/
│   │   └── jobs/
│   ├── reports/
│   ├── settings/
│   ├── surveys/
│   ├── training/
│   ├── wellness/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
├── components/
│   ├── charts/               # Dashboard charts
│   │   ├── AttendanceTrendChart.tsx
│   │   ├── DepartmentDistributionChart.tsx
│   │   ├── HeadcountTrendChart.tsx
│   │   ├── LeaveDistributionChart.tsx
│   │   ├── PayrollCostTrendChart.tsx
│   │   └── UpcomingEventsCard.tsx
│   ├── custom-fields/        # Custom field components
│   ├── layout/               # Layout components
│   │   ├── AppLayout.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── DarkModeProvider.tsx
│   │   ├── GlobalSearch.tsx
│   │   └── Header.tsx
│   ├── notifications/
│   │   └── NotificationBell.tsx
│   ├── platform/
│   │   └── AppSwitcher.tsx
│   └── ui/                   # UI component library
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── ConfirmDialog.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBoundary.tsx
│       ├── Input.tsx
│       ├── Loading.tsx
│       ├── Modal.tsx
│       ├── Select.tsx
│       ├── Sidebar.tsx
│       ├── StatCard.tsx
│       ├── Textarea.tsx
│       └── Toast.tsx
├── lib/
│   ├── api/                  # API utilities
│   │   ├── auth.ts
│   │   ├── client.ts
│   │   ├── custom-fields.ts
│   │   ├── notifications.ts
│   │   └── roles.ts
│   ├── hooks/                # React hooks
│   │   └── useAuth.ts
│   ├── services/             # API service layer
│   │   ├── analytics.service.ts
│   │   ├── announcement.service.ts
│   │   ├── attendance.service.ts
│   │   ├── benefits.service.ts
│   │   ├── compensation.service.ts
│   │   ├── department.service.ts
│   │   ├── employee.service.ts
│   │   ├── feedback360.service.ts
│   │   ├── helpdesk-sla.service.ts
│   │   ├── leave.service.ts
│   │   ├── lms.service.ts
│   │   ├── office-location.service.ts
│   │   ├── okr.service.ts
│   │   ├── payroll.service.ts
│   │   ├── performance.service.ts
│   │   ├── platform.service.ts
│   │   ├── project.service.ts
│   │   ├── recognition.service.ts
│   │   ├── recruitment.service.ts
│   │   ├── report.service.ts
│   │   ├── survey.service.ts
│   │   ├── training.service.ts
│   │   └── wellness.service.ts
│   ├── types/                # TypeScript types
│   │   ├── analytics.ts
│   │   ├── attendance.ts
│   │   ├── auth.ts
│   │   ├── benefits.ts
│   │   ├── common.ts
│   │   ├── compensation.ts
│   │   ├── custom-fields.ts
│   │   ├── employee.ts
│   │   ├── leave.ts
│   │   ├── notifications.ts
│   │   ├── payroll.ts
│   │   ├── performance.ts
│   │   ├── project.ts
│   │   ├── recognition.ts
│   │   ├── recruitment.ts
│   │   ├── roles.ts
│   │   ├── shifts.ts
│   │   ├── survey.ts
│   │   ├── training.ts
│   │   └── wellness.ts
│   └── utils.ts
├── public/
│   └── images/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Component Library

### UI Components

```tsx
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Modal,
  Badge,
  Toast,
  Loading,
  EmptyState,
  ConfirmDialog
} from '@/components/ui';
```

### Layout Components

```tsx
import {
  AppLayout,
  Header,
  Breadcrumbs,
  GlobalSearch,
  DarkModeProvider
} from '@/components/layout';
```

### Charts

```tsx
import {
  AttendanceTrendChart,
  DepartmentDistributionChart,
  HeadcountTrendChart,
  LeaveDistributionChart,
  PayrollCostTrendChart
} from '@/components/charts';
```

## Services

### Using Services

```typescript
import { employeeService } from '@/lib/services/employee.service';
import { leaveService } from '@/lib/services/leave.service';

// Fetch employees
const employees = await employeeService.getAllEmployees();

// Apply for leave
const request = await leaveService.createLeaveRequest({
  leaveTypeId: 'xxx',
  startDate: '2025-01-01',
  endDate: '2025-01-05',
  reason: 'Vacation'
});
```

### Available Services

| Service | Description |
|---------|-------------|
| `employeeService` | Employee CRUD operations |
| `attendanceService` | Attendance tracking |
| `leaveService` | Leave management |
| `payrollService` | Payroll operations |
| `benefitsService` | Benefits enrollment |
| `performanceService` | Performance reviews |
| `recruitmentService` | Recruitment pipeline |
| `analyticsService` | Dashboard analytics |
| `announcementService` | Announcements |
| `surveyService` | Surveys |
| `trainingService` | Training programs |
| `wellnessService` | Wellness programs |

## Authentication

### Login Flow

```typescript
import { useAuth } from '@/lib/hooks/useAuth';

const { user, login, logout, isAuthenticated } = useAuth();

// Login
await login({ email: 'admin@demo.com', password: 'password' });

// Check authentication
if (isAuthenticated) {
  // User is logged in
}

// Logout
logout();
```

### Protected Routes

All routes under `/dashboard`, `/employees`, etc. require authentication. Unauthenticated users are redirected to `/auth/login`.

## Styling

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { ... },
        surface: { ... },
      }
    }
  }
}
```

### Dark Mode

The app uses the NuLogic dark mode theme by default:

```tsx
// DarkModeProvider handles theme management
<DarkModeProvider>
  <App />
</DarkModeProvider>
```

## API Integration

### API Client

```typescript
// lib/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptors handle auth tokens automatically
```

### Error Handling

```typescript
try {
  const data = await employeeService.getEmployee(id);
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
  } else if (error.response?.status === 404) {
    // Show not found
  } else {
    // Show error toast
  }
}
```

## Building for Production

```bash
# Create production build
npm run build

# Analyze bundle size
npm run analyze

# Start production server
npm start
```

## Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t nulogic-hrms-frontend .
docker run -p 3000:3000 nulogic-hrms-frontend
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8080/api/v1` |

## Default Credentials

```
Email:    admin@demo.com
Password: password
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

## License

Proprietary - NuLogic Technologies

---

**Version**: 2.0.0
**Status**: Production Ready
**Last Updated**: December 2025
