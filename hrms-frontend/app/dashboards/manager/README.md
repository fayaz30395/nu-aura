# Manager Dashboard

## Overview
The Manager Dashboard provides a comprehensive view of team metrics, attendance, performance, and action items for managers to effectively oversee their direct and indirect reports.

## Features

### 1. Team Overview Section
- **Team Size**: Total team size with direct reports count
- **Present Today**: Number of employees present and working from home
- **On Leave Today**: Employees on leave with pending approvals count
- **Action Items**: Total action items with overdue count

### 2. Team Attendance Metrics
- **Weekly & Monthly Attendance Rates**: Track team attendance over time
- **Average Work Hours**: Monitor team productivity
- **Late Arrivals**: Track punctuality issues
- **Weekly Trend**: Visual line chart showing attendance trends

### 3. Performance Distribution
- **Performance Ratings**: Visual pie chart showing team performance distribution
  - Exceeding expectations
  - Meeting expectations
  - Needs improvement
  - Not rated
- **Average Performance Rating**: Overall team performance score
- **Goal Completion Rate**: Percentage of completed goals

### 4. Pending Approvals
- **Leave Requests**: List of pending leave approvals with urgency indicators
- **Request Details**: Employee name, leave type, dates, duration, and reason
- **Urgency Badges**: Highlight urgent requests that need immediate attention

### 5. Action Items Summary
- **Leave Approvals**: Number of pending leave requests
- **Timesheet Approvals**: Pending timesheet submissions
- **Performance Reviews**: Reviews due for completion
- **One-on-Ones**: Scheduled one-on-one meetings due
- **Overdue Items**: Highlighted alerts for overdue approvals and reviews

### 6. Team Alerts
- **Severity-based Alerts**: INFO, WARNING, CRITICAL
- **Alert Types**: ATTENDANCE, PERFORMANCE, LEAVE, PROBATION
- **Actionable Items**: Clear action requirements for each alert

### 7. Team Goals
- **Goals On Track**: Number of goals progressing well
- **Goals At Risk**: Goals that need attention
- **Goals Completed**: Successfully completed goals
- **Completion Progress**: Visual progress bar

### 8. Engagement & Feedback
- **One-on-Ones**: Completed, scheduled, and overdue meetings
- **Feedback Score**: Average team feedback rating
- **Training Completion**: Team training completion rate

## API Endpoint
```
GET /api/v1/dashboards/manager
```

## Component Structure

### State Management
- `loading`: Loading state for initial data fetch
- `error`: Error message if API call fails
- `dashboardData`: Complete dashboard data from API

### Key Components Used
- **AppLayout**: Main layout wrapper
- **Card**: Card component for sections
- **Badge**: Status and metric badges
- **Skeleton**: Loading state placeholders
- **Recharts**: Charts for data visualization
  - LineChart: Attendance trends
  - PieChart: Performance distribution

### Charts & Visualizations
1. **Attendance Trend Line Chart**: 7-day attendance rate visualization
2. **Performance Distribution Pie Chart**: Team performance breakdown
3. **Progress Bars**: Goal completion and training progress

## Error Handling
- Loading states with skeleton components
- Error states with retry messaging
- Authentication checks with redirect to login
- Graceful handling of missing or null data

## Responsive Design
- Mobile-first approach
- Grid layouts that adapt to screen size
- Collapsible sections for mobile view
- Touch-friendly interactive elements

## Color Coding
- **Green**: Positive metrics (present, on track, completed)
- **Blue**: Neutral information (scheduled, pending)
- **Amber/Orange**: Warning states (at risk, late arrivals)
- **Red**: Critical alerts (overdue, critical severity)
- **Purple**: Action items (reviews, one-on-ones)

## Usage Example
```typescript
import ManagerDashboardPage from '@/app/dashboards/manager/page';

// The page is automatically routed at /dashboards/manager
// Accessed through the application menu or direct URL navigation
```

## Data Flow
1. User navigates to Manager Dashboard
2. Authentication check via `useAuth` hook
3. API call to fetch manager dashboard data
4. Data processing and state updates
5. Render dashboard with metrics and charts
6. Real-time updates on user interaction

## Performance Considerations
- Lazy loading of chart libraries
- Memoization of chart data transformations
- Efficient re-rendering with React best practices
- Skeleton loaders for perceived performance

## Accessibility
- Semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- High contrast color schemes
- Screen reader friendly

## Future Enhancements
- Real-time updates via WebSocket
- Export dashboard as PDF/Excel
- Customizable dashboard widgets
- Drill-down capability for detailed metrics
- Team member comparison views
- Historical trend analysis
- Predictive analytics integration
