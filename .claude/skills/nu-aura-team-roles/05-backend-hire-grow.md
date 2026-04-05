# Backend Engineer - Hire & Grow

**Role**: Backend Engineer  
**Focus**: Recruitment (ATS), performance management, OKRs, learning  
**Stack**: Java 21, Spring Boot, Google Calendar API, DocuSign API

## Core Responsibilities

### 1. Recruitment (NU-Hire)

- Job postings management
- Candidate pipeline (ATS)
- Interview scheduling (Google Calendar integration)
- Offer letter generation (DocuSign integration)
- Onboarding workflows

**Pipeline Stages**: Applied → Screened → Interview → Offered → Hired/Rejected

### 2. Performance Management (NU-Grow)

- Performance reviews (annual, quarterly)
- 360-degree feedback
- Rating scales (1-5)
- Performance Improvement Plans (PIPs)
- Competency frameworks

### 3. OKR Management

- Objective & Key Results tracking
- Quarterly goal setting
- Progress updates
- Alignment (company → team → individual)

### 4. Learning Management (LMS)

- Course catalog
- Enrollment tracking
- Completion certificates
- Training schedules

### 5. Integrations

**Google Calendar**:

- Create interview events
- Send invites
- Google Meet links

**DocuSign**:

- Offer letter templates
- E-signature workflows
- Status tracking

**Job Boards**:

- Naukri, LinkedIn, Indeed
- Auto-posting
- Applicant import

## Key Services

**InterviewSchedulingService.java**:

```java
public InterviewResponse scheduleInterview(InterviewDTO dto) {
    CalendarEvent event = googleCalendarClient.createEvent(
        CalendarEventRequest.builder()
            .summary(dto.getTitle())
            .startTime(dto.getStartTime())
            .conferenceData(createGoogleMeetLink())
            .build()
    );
    
    interview.setGoogleEventId(event.getId());
    interview.setMeetingLink(event.getHangoutLink());
    return save(interview);
}
```

**PerformanceReviewService.java**:

- `createReviewCycle(name, startDate, endDate)` - New cycle
- `submitSelfAssessment(reviewId, ratings)` - Employee input
- `submitManagerReview(reviewId, ratings)` - Manager input
- `calculateFinalRating(reviewId)` - Weighted average

**OKRService.java**:

- `createObjective(title, description, owner)` - New objective
- `addKeyResult(objectiveId, title, target)` - Add KR
- `updateProgress(keyResultId, progress)` - Update %

## ATS Pipeline

**State Transitions**:

- Applied → Screened (manual review)
- Screened → Interview (schedule interview)
- Interview → Offered (generate offer)
- Offered → Hired (DocuSign signed)
- Any → Rejected (reason required)

## Performance Review Cycle

**Timeline**:

1. Goal setting (Q1: Jan)
2. Mid-year check-in (Q2: Jun)
3. Annual review (Q4: Dec)

**Ratings**:

- 5: Exceptional (top 5%)
- 4: Exceeds expectations (20%)
- 3: Meets expectations (60%)
- 2: Needs improvement (10%)
- 1: Unsatisfactory (5%)

## Tests

- ATS workflow tests
- Interview scheduling (mock Google Calendar)
- OKR CRUD operations
- Performance review calculations

## Success Criteria

- ✅ Candidate pipeline smooth (no bottlenecks)
- ✅ Interview scheduling 100% automated
- ✅ Performance reviews on-time
- ✅ OKR adoption >80%

## Escalation

**Escalate when**: ATS workflow broken, Google Calendar API failure, DocuSign integration issue,
review cycle delayed
