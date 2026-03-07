# Frontend Pages Documentation

## Overview

This document provides comprehensive information about the two new frontend pages created for the NU Aura HRMS platform.

## Files Created

### 1. Careers Page
- **Path:** `/app/careers/page.tsx`
- **Size:** ~28.8 KB
- **Type:** Public page (no authentication required)
- **Access:** `/careers` route

### 2. Careers Layout
- **Path:** `/app/careers/layout.tsx`
- **Size:** ~682 bytes
- **Type:** Layout component
- **Purpose:** Standalone marketing page wrapper

### 3. Helpdesk Knowledge Base
- **Path:** `/app/helpdesk/knowledge-base/page.tsx`
- **Size:** ~22.2 KB
- **Type:** Authenticated page (requires login)
- **Access:** `/helpdesk/knowledge-base` route

### 4. Middleware Update
- **Path:** `/middleware.ts` (modified)
- **Change:** Added `/careers` to PUBLIC_ROUTES array

---

## Component Architecture

### Careers Page (`/app/careers/page.tsx`)

#### Main Components

**1. JobCard Component**
- Displays job listing card
- Shows: title, department, location, type, posted date
- Color-coded employment type badges
- Click to view full details
- Props:
  - `job: Job` - Job data object
  - `onViewDetails: (job: Job) => void` - Click handler

**2. JobDetailModal Component**
- Full-screen modal showing complete job information
- Displays: description, responsibilities, requirements
- Meta information: employment type, experience level, salary
- Apply button triggers application form
- Props:
  - `job: Job | null` - Selected job
  - `isOpen: boolean` - Modal visibility
  - `onClose: () => void` - Close handler
  - `onApply: (job: Job) => void` - Apply handler

**3. ApplicationModal Component**
- Collects applicant information
- Fields: name, email, phone, resume, cover letter, LinkedIn
- File upload for resume
- Form validation
- Submission to `/api/public/careers/apply`
- Props:
  - `job: Job | null` - Job being applied for
  - `isOpen: boolean` - Modal visibility
  - `onClose: () => void` - Close handler

**4. JobSkeletonCard Component**
- Loading placeholder
- Matches JobCard dimensions
- Animated skeleton UI

#### Page State Management

```typescript
// Jobs and Filtering
- jobs: Job[] - All fetched jobs
- filteredJobs: Job[] - Currently displayed jobs
- isLoading: boolean - Loading state
- currentPage: number - Pagination state
- jobsPerPage: number = 9

// UI State
- selectedJob: Job | null - Currently selected job
- showJobDetail: boolean - Job detail modal visibility
- showApplicationModal: boolean - Application form visibility

// Filter State
- searchQuery: string - Search text
- selectedDepartment: string - Department filter
- selectedLocation: string - Location filter
- selectedType: string - Employment type filter
- selectedExperience: string - Experience level filter
```

#### API Endpoints

**Fetch Jobs**
```
GET /api/public/careers/jobs
Query Parameters:
  - department: string (optional)
  - location: string (optional)
  - type: string (optional)
  - q: string (optional, search query)

Response:
{
  jobs: Job[]
}
```

**Submit Application**
```
POST /api/public/careers/apply
Content-Type: multipart/form-data

Body:
{
  name: string (required)
  email: string (required)
  phone: string (required)
  jobId: string (required)
  resume: File (required)
  coverLetter: string (optional)
  linkedInUrl: string (optional)
}

Response:
{
  success: boolean
  message: string
}
```

#### Job Data Interface

```typescript
interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  postedDate: string; // ISO 8601 format
  description: string; // Short summary
  fullDescription: string; // Full description
  requirements: string[]; // Array of requirement bullets
  responsibilities: string[]; // Array of responsibility bullets
  salaryRange?: string; // Optional
  experience: 'Entry-level' | 'Mid-level' | 'Senior' | 'Lead';
}
```

---

### Knowledge Base Page (`/app/helpdesk/knowledge-base/page.tsx`)

#### Main Components

**1. ArticleCard Component**
- Displays article listing card
- Shows: title, category, views, helpful percentage, updated date
- Click to view full content
- Props:
  - `article: Article` - Article data
  - `onView: (article: Article) => void` - View handler

**2. ArticleDetailModal Component**
- Full article content display
- Helpful/unhelpful voting buttons
- Shows feedback confirmation
- Related articles section placeholder
- Submit ticket button
- Props:
  - `article: Article | null` - Selected article
  - `isOpen: boolean` - Modal visibility
  - `onClose: () => void` - Close handler
  - `onSubmitTicket: () => void` - Ticket submission handler

**3. ArticleSkeletonCard Component**
- Loading placeholder
- Animated skeleton UI

#### Page State Management

```typescript
// Articles and Filtering
- articles: Article[] - All fetched articles
- isLoading: boolean - Loading state

// UI State
- selectedArticle: Article | null - Currently selected article
- showDetail: boolean - Detail modal visibility
- showCreateModal: boolean - Create article modal visibility (admin)
- showTicketModal: boolean - Support ticket modal visibility

// Filter State
- searchQuery: string - Search text
- selectedCategory: string - Category filter
```

#### API Endpoints

**Fetch Articles**
```
GET /api/v1/helpdesk/knowledge-base
Query Parameters:
  - category: string (optional)
  - q: string (optional, search query)

Response:
{
  articles: Article[]
}

Note: Requires authentication headers
```

**Submit Helpful Feedback**
```
PATCH /api/v1/helpdesk/knowledge-base/{id}/helpful
Content-Type: application/json

Body:
{
  helpful: boolean
}

Response:
{
  success: boolean
  helpful_count: number
  unhelpful_count: number
}

Note: Requires authentication headers
```

#### Article Data Interface

```typescript
interface Article {
  id: string;
  title: string;
  category: string;
  content: string; // Full article content
  views: number;
  helpful: number; // Count of helpful votes
  unhelpful: number; // Count of unhelpful votes
  updatedAt: string; // ISO 8601 format
  author?: string; // Optional author name
}
```

#### Categories

Fixed set of categories:
- HR Policies
- IT Support
- Payroll
- Leave & Attendance
- Benefits
- Company Policies

---

## Layout Components

### Careers Layout (`/app/careers/layout.tsx`)

**Purpose:** Standalone marketing page layout without authenticated app shell

**Features:**
- Dark gradient background
- DarkModeProvider integration
- No sidebar or top navigation
- Clean, distraction-free presentation

**Props:**
```typescript
{
  children: React.ReactNode
}
```

---

## Design & Styling

### Color Palette

| Purpose | Dark Mode | Light Mode |
|---------|-----------|-----------|
| Background | slate-900/950 | white/slate-50 |
| Surface | slate-800 | white |
| Primary Text | slate-50 | slate-900 |
| Secondary Text | slate-400 | slate-600 |
| Accent | primary-600 | primary-600 |
| Border | slate-600/700 | slate-300 |

### Responsive Breakpoints

- **Mobile:** Default (< 640px)
- **Tablet:** sm (640px+) to md (768px)
- **Desktop:** lg (1024px) to xl (1280px)
- **Extra Large:** 2xl (1536px+)

### Component Sizing

**Cards:**
- Padding: 1.5rem
- Border radius: 0.5rem
- Hover: Shadow increase

**Buttons:**
- Height: 2.5rem (default)
- Border radius: 0.5rem
- State: hover, active, disabled

**Inputs:**
- Height: 2.5rem
- Padding: 0.75rem
- Border: 1px solid
- Focus: Ring-2 primary-600

---

## Accessibility Features

### ARIA Labels
- Modal elements: `aria-modal="true"`, `role="dialog"`
- Buttons: Clear text labels
- Form inputs: Associated labels

### Keyboard Navigation
- Tab through interactive elements
- Escape key closes modals
- Enter to submit forms
- Arrow keys for pagination

### Visual Indicators
- Color-coded badges with text labels
- Focus states on all inputs
- Loading states with spinner icons
- Success/error messaging with icons

### Screen Readers
- Semantic HTML structure
- Descriptive labels for inputs
- Icon labels and alt text
- Form instructions

---

## Performance Considerations

### Data Fetching

**Debounced Search:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    fetchJobs();
  }, 300);
  return () => clearTimeout(timer);
}, [fetchJobs]);
```

**Pagination:**
- Jobs per page: 9
- Reduces initial payload
- Improves perceived performance

**Lazy Loading:**
- Skeleton states for initial load
- Soft refreshes on filter changes

### Bundle Size

- Lucide icons: Tree-shakeable (only used icons)
- Components: Modular imports
- API calls: Minimal payload

---

## Security Considerations

### Careers Page (Public)

**CORS:**
- Public endpoints, no auth required
- Standard CORS headers from backend

**File Upload:**
- Resume upload to `/api/public/careers/apply`
- Server validates file type and size
- Virus scanning recommended on backend

**Form Validation:**
- Client-side validation for UX
- Server-side validation required
- XSS protection via React's built-in escaping

### Knowledge Base (Authenticated)

**Authentication:**
- Requires valid access token
- Token extracted from cookies
- Bearer token in Authorization header

**Authorization:**
- Admin check for create article
- Permission-based UI visibility
- Server-side enforcement required

**Content:**
- Article content is escaped
- No raw HTML in responses expected
- Server should sanitize if needed

---

## Error Handling

### Network Errors

**Careers Page:**
```typescript
try {
  const response = await fetch(`/api/public/careers/apply`, {
    method: 'POST',
    body: formDataObj,
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit application');
  }
  // Success handling
} catch (error) {
  setSubmitStatus('error');
  setSubmitMessage(error.message);
}
```

**Knowledge Base:**
```typescript
try {
  const response = await fetch(
    `/api/v1/helpdesk/knowledge-base/{id}/helpful`,
    {
      method: 'PATCH',
      body: JSON.stringify({ helpful: true }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to submit feedback');
  }
} catch (error) {
  setSubmitStatus('error');
}
```

### User Feedback

- Loading spinners with "Submitting..." text
- Error messages in red-tinted alerts
- Success messages with checkmark icons
- Auto-dismiss modals on success (2s delay)

---

## Browser Compatibility

### Supported Browsers
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS 14+, Android 10+)

### Features Used
- CSS Grid/Flexbox
- CSS Variables
- Fetch API
- FormData API
- URLSearchParams

---

## Testing Strategy

### Unit Tests Needed
- Date formatting function
- Filter application logic
- Pagination calculations
- Help percentage calculations

### Integration Tests
- Form submission flow
- Filter updates
- Modal open/close
- Search debouncing

### E2E Tests
- Job search workflow
- Application submission
- Article search and voting
- Create article (admin)

---

## Future Enhancements

### Careers Page
- Job favorites/bookmarking
- Advanced search filters
- Candidate profile creation
- Application status tracking
- Email confirmations
- Interview scheduling

### Knowledge Base
- Related articles algorithm
- Article search autocomplete
- Print/PDF export
- Article translations
- Version history
- Comments on articles
- Article ratings

---

## Deployment Checklist

- [ ] API endpoints implemented and tested
- [ ] Database schema for jobs and articles ready
- [ ] File upload service configured
- [ ] Email service for confirmations
- [ ] Analytics tracking (optional)
- [ ] SEO optimization (careers page)
- [ ] Load testing for pagination
- [ ] GDPR compliance (resume storage)

---

## Support & Troubleshooting

### Common Issues

**Q: Jobs not loading**
A: Check `/api/public/careers/jobs` endpoint responds correctly

**Q: Resume upload fails**
A: Verify file size limits and allowed MIME types

**Q: Articles search not working**
A: Ensure authentication token is valid

**Q: Modals not closing**
A: Check closeOnEscape and closeOnBackdrop props

---

## API Response Examples

### Careers Jobs Response
```json
{
  "jobs": [
    {
      "id": "job-001",
      "title": "Senior React Developer",
      "department": "Engineering",
      "location": "San Francisco, CA",
      "employmentType": "Full-time",
      "postedDate": "2026-03-07T10:00:00Z",
      "description": "Looking for an experienced React developer...",
      "fullDescription": "We are hiring...",
      "requirements": ["5+ years experience", "React expertise"],
      "responsibilities": ["Develop features", "Code reviews"],
      "salaryRange": "$120k - $160k",
      "experience": "Senior"
    }
  ]
}
```

### Knowledge Base Articles Response
```json
{
  "articles": [
    {
      "id": "article-001",
      "title": "How to Submit Leave Request",
      "category": "Leave & Attendance",
      "content": "To submit a leave request...",
      "views": 254,
      "helpful": 42,
      "unhelpful": 3,
      "updatedAt": "2026-03-05T14:30:00Z",
      "author": "HR Team"
    }
  ]
}
```

---

## Maintenance Notes

- Update category list if new categories added
- Monitor job and article counts for performance
- Review error logs for API failures
- Track user feedback ratings for content improvements
- Update migration guides when API changes

