# Project Calendar/Gantt View

## Overview
The Project Calendar view provides a visual timeline (Gantt chart) representation of all projects, tasks, and milestones in the HRMS system. This view helps teams visualize project timelines, dependencies, and progress at a glance.

## Features

### 1. Gantt Chart Visualization
- **Project Timelines**: Visual bars showing project duration from start to expected end date
- **Task Timelines**: Expandable task rows under each project showing task durations
- **Milestone Markers**: Diamond-shaped markers for important project milestones
- **Progress Indicators**: Progress percentage shown on each timeline bar
- **Today Marker**: Vertical line indicating the current date

### 2. Multiple Zoom Levels
- **Day View**: See projects by individual days (2 weeks span)
- **Week View**: See projects by weeks (2 months span)
- **Month View**: See projects by months (6 months span)
- **Quarter View**: See projects by quarters (1 year span)

### 3. Interactive Features
- **Expandable Projects**: Click chevron icon to show/hide project tasks
- **Click to Navigate**: Click on project bars to navigate to project details
- **Filters**: Filter by status (Planned, In Progress, On Hold, Completed, Cancelled)
- **Priority Filters**: Filter by priority (Low, Medium, High, Critical)
- **Toggle Views**: Show/hide projects and tasks independently

### 4. Color Coding

#### Status Colors
- **Planned**: Gray (#94a3b8)
- **In Progress**: Blue (#3b82f6)
- **On Hold**: Amber (#f59e0b)
- **Completed**: Green (#10b981)
- **Cancelled**: Red (#ef4444)
- **Backlog**: Gray (#6b7280)
- **Todo**: Slate (#64748b)
- **In Review**: Purple (#8b5cf6)
- **Blocked**: Dark Red (#dc2626)
- **Done**: Dark Green (#059669)

#### Priority Colors
- **Low**: Green (#22c55e)
- **Medium**: Orange (#fb923c)
- **High**: Red (#ef4444)
- **Critical**: Dark Red (#991b1b)

### 5. Navigation Controls
- **Previous/Next Buttons**: Navigate backward and forward through time
- **Today Button**: Jump back to current date
- **Back to List**: Return to the main projects list view

### 6. Statistics Dashboard
Four stat cards showing:
- Total Projects count
- In Progress projects count
- Total Tasks count
- Total Milestones count

## File Structure

```
app/projects/calendar/
├── page.tsx          # Main calendar view component
└── README.md         # This documentation file
```

## Usage

### Accessing the Calendar View
1. Navigate to the Projects page (`/projects`)
2. Click on the Calendar icon in the view toggle buttons (top right)
3. You'll be redirected to `/projects/calendar`

### Navigating the Timeline
1. Use zoom level buttons to change the time scale
2. Use Previous/Next buttons to move through time
3. Click "Today" to return to current date
4. Apply filters to focus on specific projects

### Viewing Project Details
1. Expand a project by clicking the chevron icon next to its name
2. Click on a project timeline bar to navigate to the project details page
3. Hover over bars to see tooltips with progress information

### Filtering Data
1. Use the status dropdown to filter by project status
2. Use the priority dropdown to filter by priority level
3. Toggle "Projects" and "Tasks" checkboxes to show/hide each type

## Technical Implementation

### Components Used
- **AppLayout**: Standard HRMS layout wrapper
- **Card/CardContent**: UI components for sections
- **Button**: Action buttons
- **Lucide Icons**: Calendar, navigation, and status icons

### Data Sources
- **projectService**: Fetches all projects with pagination
- **taskService**: Fetches tasks for each project
- Uses existing API endpoints from the HRMS backend

### State Management
- React hooks (useState, useEffect, useCallback, useMemo)
- Local state for filters, zoom level, and expanded projects
- Optimized rendering with memoization

### Key Functions

#### `calculatePosition(startDate, endDate)`
Calculates the left position and width of timeline bars based on the current view range.

#### `toggleProjectExpansion(projectId)`
Expands or collapses a project to show/hide its tasks and milestones.

#### `ganttItems` (memoized)
Converts projects and tasks into Gantt chart items with proper dates and colors.

#### `timelineColumns` (memoized)
Generates the timeline header columns based on the current zoom level.

## Dependencies

The calendar view uses the following dependencies (already in package.json):
- **React 18.2.0**: Core framework
- **Next.js 14.2.35**: Routing and SSR
- **lucide-react**: Icons
- **date-fns** or native Date: Date manipulation
- Existing HRMS UI components and services

## Future Enhancements

### Planned Features
1. **Task Dependencies**: Visual arrows showing task dependencies
2. **Drag & Drop**: Drag tasks to reschedule dates
3. **Resource Allocation**: Show team member allocation on timeline
4. **Critical Path**: Highlight critical path in red
5. **Export Options**: Export to PDF, PNG, or Excel
6. **Milestone Drag**: Drag milestones to different dates
7. **Multi-Project Selection**: Select multiple projects for comparison
8. **Baseline Comparison**: Compare planned vs actual timelines

### Performance Optimizations
- Virtualization for large project lists (react-window)
- Progressive loading of task data
- Server-side filtering and pagination

## API Endpoints Used

```typescript
// Projects
GET /projects?page=0&size=100&status={status}&priority={priority}

// Tasks
GET /pm/tasks/project/{projectId}?size=100&status={status}&priority={priority}
```

## Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Limitations
1. Maximum 100 projects loaded at once (pagination needed for more)
2. Tasks are fetched per project (may be slow for many projects)
3. No real-time updates (requires manual refresh)
4. No collaborative features (multiple users editing)

## Troubleshooting

### Calendar not loading
- Check browser console for API errors
- Verify backend is running and accessible
- Check user permissions for project access

### Performance issues
- Reduce the number of projects shown by using filters
- Collapse expanded projects when not needed
- Use higher zoom levels (quarter view) for overview

### Timeline bars not showing
- Verify projects have valid start and end dates
- Check that dates are within the current view range
- Ensure status filter isn't excluding all projects

## Related Documentation
- [Project Management Module](/docs/project-management.md)
- [Task Management](/docs/task-management.md)
- [HRMS API Documentation](/docs/api.md)
