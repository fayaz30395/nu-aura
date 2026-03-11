# ADR-004: Recruitment ATS Gap Analysis & Implementation Plan

**Status:** Proposed
**Date:** 2026-03-11
**Decision Makers:** Product & Engineering Team
**Priority:** Medium (Feature Completeness)

---

## Context

The current recruitment module has foundational entities (`Candidate`, `JobOpening`, `Interview`) but lacks critical ATS (Applicant Tracking System) capabilities required for enterprise recruitment workflows.

### Current Implementation Analysis

**Existing Entities:**

1. **JobOpening** (`domain/recruitment/JobOpening.java`)
   - Job code, title, description
   - Department, location, employment type
   - Min/max salary, number of openings
   - Hiring manager, status, priority
   - Posted/closing dates

2. **Candidate** (`domain/recruitment/Candidate.java`)
   - Personal info (name, email, phone)
   - Current employment details (company, designation, CTC)
   - Total experience, notice period
   - Resume URL, source
   - Status, current stage, assigned recruiter
   - Applied date, notes

3. **Applicant** (`domain/recruitment/Applicant.java`)
   - Links candidate to job opening
   - Application status and source
   - Rating, notes, rejection reason
   - Offered/expected salary

4. **Interview** (`domain/recruitment/Interview.java`)
   - Interview round, type, scheduled time
   - Interviewer, location, meeting link
   - Status, feedback, rating, result

5. **AI-Enhanced Features** (from `AIRecruitmentService.java`)
   - Resume parsing
   - Candidate-job matching
   - Interview question generation
   - Feedback synthesis
   - Job description generation

**Current Service Capabilities:**

From `RecruitmentManagementService.java`:
- CRUD for job openings, candidates, interviews
- Candidate stage movement
- Offer creation/acceptance/decline
- Data scope filtering (RBAC)
- Event publishing (CandidateHiredEvent)

---

## Gap Analysis

### What's Missing for Complete ATS

#### 1. **Application Pipeline/Kanban Board** (Critical)

**Current State:**
- `Candidate.currentStage` enum exists: `APPLICATION_RECEIVED`, `SCREENING`, `TECHNICAL_ROUND`, etc.
- No visual pipeline/kanban representation
- No drag-and-drop stage transitions

**Gap:**
- Frontend: No kanban board component (exists in `/recruitment/[jobId]/kanban/page.tsx` but may be incomplete)
- Backend: No pipeline configuration per job opening
- No stage-specific metadata (time in stage, bottleneck detection)

**Required Implementation:**

```java
// New entity: PipelineStage
@Entity
@Table(name = "pipeline_stages")
public class PipelineStage extends BaseEntity {
    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Column(name = "stage_name", nullable = false, length = 100)
    private String stageName;

    @Column(name = "stage_order", nullable = false)
    private Integer stageOrder;

    @Column(name = "stage_type")
    @Enumerated(EnumType.STRING)
    private StageType stageType; // SCREENING, INTERVIEW, ASSESSMENT, OFFER, etc.

    @Column(name = "is_mandatory")
    private Boolean isMandatory;

    @Column(name = "sla_hours")
    private Integer slaHours; // Time limit for this stage

    @Column(name = "auto_advance_enabled")
    private Boolean autoAdvanceEnabled; // Auto-move after interview completion?

    @Column(name = "color_code", length = 7)
    private String colorCode; // For kanban board UI

    @Column(name = "applicant_count")
    private Integer applicantCount; // Cached count for performance
}

// New: PipelineStageTransition (audit trail)
@Entity
@Table(name = "pipeline_stage_transitions")
public class PipelineStageTransition extends BaseEntity {
    @Column(name = "applicant_id", nullable = false)
    private UUID applicantId;

    @Column(name = "from_stage_id")
    private UUID fromStageId;

    @Column(name = "to_stage_id", nullable = false)
    private UUID toStageId;

    @Column(name = "transitioned_by", nullable = false)
    private UUID transitionedBy;

    @Column(name = "transitioned_at", nullable = false)
    private Instant transitionedAt;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "time_in_previous_stage_hours")
    private Integer timeInPreviousStageHours;
}
```

**Frontend Gap:**
- `/recruitment/[jobId]/kanban/page.tsx` needs drag-and-drop library (react-beautiful-dnd or dnd-kit)
- API integration for stage transitions
- Real-time updates via WebSocket for multi-user coordination

---

#### 2. **Assessment/Skills Testing Integration** (High Priority)

**Current State:**
- No assessment/test entity
- No integration with testing platforms (HackerRank, Codility, TestGorilla)

**Gap:**
- No ability to assign coding tests or skill assessments
- No test result tracking

**Required Implementation:**

```java
@Entity
@Table(name = "candidate_assessments")
public class CandidateAssessment extends BaseEntity {
    @Column(name = "applicant_id", nullable = false)
    private UUID applicantId;

    @Column(name = "assessment_type")
    @Enumerated(EnumType.STRING)
    private AssessmentType assessmentType; // CODING, APTITUDE, SKILL_TEST, VIDEO_INTERVIEW

    @Column(name = "assessment_provider", length = 50)
    private String assessmentProvider; // HACKERRANK, CODILITY, INTERNAL

    @Column(name = "assessment_url", columnDefinition = "TEXT")
    private String assessmentUrl;

    @Column(name = "assigned_at")
    private Instant assignedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "max_score", precision = 5, scale = 2)
    private BigDecimal maxScore;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private AssessmentStatus status; // ASSIGNED, IN_PROGRESS, COMPLETED, EXPIRED

    @Column(name = "result_data", columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private Map<String, Object> resultData;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
```

**Integration Requirements:**
- HackerRank API integration for coding tests
- Webhook receivers for test completion callbacks
- Score normalization logic

---

#### 3. **Offer Letter Management** (Critical)

**Current State:**
- `Candidate.offeredCtc`, `Candidate.offeredDesignation`, `Candidate.proposedJoiningDate` fields exist
- No actual offer letter document generation
- No e-signature workflow

**Gap:**
- No offer letter template system
- No PDF generation with personalized data
- No e-signature integration (DocuSign, Adobe Sign)

**Required Implementation:**

```java
@Entity
@Table(name = "offer_letters")
public class OfferLetter extends BaseEntity {
    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_opening_id", nullable = false)
    private UUID jobOpeningId;

    @Column(name = "template_id", nullable = false)
    private UUID templateId;

    @Column(name = "offer_letter_number", unique = true, nullable = false, length = 50)
    private String offerLetterNumber; // AUTO-GEN: OL-2026-0001

    @Column(name = "position_title", nullable = false, length = 200)
    private String positionTitle;

    @Column(name = "department", length = 200)
    private String department;

    @Column(name = "offered_salary", precision = 15, scale = 2, nullable = false)
    private BigDecimal offeredSalary;

    @Column(name = "salary_breakdown", columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private Map<String, BigDecimal> salaryBreakdown; // BASE, HRA, SPECIAL, BONUS

    @Column(name = "joining_date", nullable = false)
    private LocalDate joiningDate;

    @Column(name = "reporting_manager_id")
    private UUID reportingManagerId;

    @Column(name = "work_location", length = 200)
    private String workLocation;

    @Column(name = "employment_type")
    @Enumerated(EnumType.STRING)
    private EmploymentType employmentType;

    @Column(name = "probation_period_months")
    private Integer probationPeriodMonths;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Column(name = "additional_terms", columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private List<String> additionalTerms;

    @Column(name = "generated_pdf_url", columnDefinition = "TEXT")
    private String generatedPdfUrl;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private OfferStatus status; // DRAFT, SENT, VIEWED, SIGNED, DECLINED, EXPIRED

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "viewed_at")
    private Instant viewedAt;

    @Column(name = "signed_at")
    private Instant signedAt;

    @Column(name = "signature_request_id", length = 200)
    private String signatureRequestId; // DocuSign envelope ID

    @Column(name = "signed_document_url", columnDefinition = "TEXT")
    private String signedDocumentUrl;

    @Column(name = "expiry_date")
    private LocalDate expiryDate; // Offer valid until

    @Column(name = "decline_reason", columnDefinition = "TEXT")
    private String declineReason;

    @Column(name = "generated_by", nullable = false)
    private UUID generatedBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;
}

// Offer Letter Template
@Entity
@Table(name = "offer_letter_templates")
public class OfferLetterTemplate extends BaseEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "template_name", nullable = false, length = 200)
    private String templateName;

    @Column(name = "template_content", columnDefinition = "TEXT", nullable = false)
    private String templateContent; // HTML with placeholders: {{candidateName}}, {{salary}}, etc.

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "employment_type")
    @Enumerated(EnumType.STRING)
    private EmploymentType employmentType; // Template specific to full-time, contract, etc.

    @Column(name = "placeholders", columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private List<String> placeholders; // Available placeholders

    @Column(name = "created_by")
    private UUID createdBy;
}
```

**Service Layer:**

```java
@Service
public class OfferLetterService {

    @Autowired
    private OfferLetterTemplateRepository templateRepository;

    @Autowired
    private OfferLetterRepository offerLetterRepository;

    @Autowired
    private PdfGenerationService pdfGenerationService;

    @Autowired
    private DocuSignService docuSignService;

    /**
     * Generate offer letter from template
     */
    public OfferLetter generateOfferLetter(UUID candidateId, OfferLetterRequest request) {
        // Load template
        OfferLetterTemplate template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));

        // Load candidate data
        Candidate candidate = candidateRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        // Merge template with data
        String htmlContent = mergeTemplate(template.getTemplateContent(), candidate, request);

        // Generate PDF
        byte[] pdfBytes = pdfGenerationService.generatePdf(htmlContent);
        String pdfUrl = uploadToStorage(pdfBytes, generateFilename(candidate));

        // Create offer letter record
        OfferLetter offerLetter = OfferLetter.builder()
                .candidateId(candidateId)
                .jobOpeningId(candidate.getJobOpeningId())
                .templateId(template.getId())
                .offerLetterNumber(generateOfferNumber())
                .positionTitle(request.getPositionTitle())
                .offeredSalary(request.getOfferedSalary())
                .joiningDate(request.getJoiningDate())
                .generatedPdfUrl(pdfUrl)
                .status(OfferStatus.DRAFT)
                .generatedBy(SecurityContext.getCurrentUserId())
                .build();

        return offerLetterRepository.save(offerLetter);
    }

    /**
     * Send offer letter for e-signature
     */
    public void sendForSignature(UUID offerLetterId) {
        OfferLetter offerLetter = offerLetterRepository.findById(offerLetterId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer letter not found"));

        Candidate candidate = candidateRepository.findById(offerLetter.getCandidateId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        // Send to DocuSign
        String envelopeId = docuSignService.createEnvelope(
                offerLetter.getGeneratedPdfUrl(),
                candidate.getEmail(),
                candidate.getFullName(),
                "Please review and sign your offer letter"
        );

        offerLetter.setSignatureRequestId(envelopeId);
        offerLetter.setStatus(OfferStatus.SENT);
        offerLetter.setSentAt(Instant.now());
        offerLetterRepository.save(offerLetter);

        // Send email notification
        emailService.sendOfferLetterNotification(candidate.getEmail(), offerLetter);
    }

    /**
     * Webhook callback from DocuSign when candidate signs
     */
    public void handleSignatureComplete(String envelopeId, String signedDocumentUrl) {
        OfferLetter offerLetter = offerLetterRepository.findBySignatureRequestId(envelopeId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer letter not found for envelope: " + envelopeId));

        offerLetter.setStatus(OfferStatus.SIGNED);
        offerLetter.setSignedAt(Instant.now());
        offerLetter.setSignedDocumentUrl(signedDocumentUrl);
        offerLetterRepository.save(offerLetter);

        // Update candidate status
        Candidate candidate = candidateRepository.findById(offerLetter.getCandidateId()).orElseThrow();
        candidate.setStatus(Candidate.CandidateStatus.OFFER_ACCEPTED);
        candidateRepository.save(candidate);

        // Trigger onboarding workflow
        eventPublisher.publish(new OfferAcceptedEvent(offerLetter, candidate));
    }
}
```

---

#### 4. **Candidate Communication Hub** (Medium Priority)

**Current State:**
- Email notifications exist for offer letters (from service analysis)
- No communication history tracking
- No SMS/WhatsApp integration
- No email templates for different stages

**Gap:**
- No centralized communication log
- No scheduled email campaigns (e.g., "We're reviewing your application")
- No bulk communication

**Required Implementation:**

```java
@Entity
@Table(name = "candidate_communications")
public class CandidateCommunication extends BaseEntity {
    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "job_opening_id")
    private UUID jobOpeningId;

    @Column(name = "communication_type")
    @Enumerated(EnumType.STRING)
    private CommunicationType communicationType; // EMAIL, SMS, WHATSAPP, PHONE_CALL

    @Column(name = "direction")
    @Enumerated(EnumType.STRING)
    private Direction direction; // INBOUND, OUTBOUND

    @Column(name = "subject", length = 500)
    private String subject;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "delivered_at")
    private Instant deliveredAt;

    @Column(name = "opened_at")
    private Instant openedAt;

    @Column(name = "clicked_at")
    private Instant clickedAt;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private CommunicationStatus status; // DRAFT, QUEUED, SENT, DELIVERED, FAILED, BOUNCED

    @Column(name = "sent_by")
    private UUID sentBy;

    @Column(name = "template_id")
    private UUID templateId;

    @Column(name = "metadata", columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private Map<String, Object> metadata;
}

// Email template management
@Entity
@Table(name = "email_templates")
public class EmailTemplate extends BaseEntity {
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "template_name", nullable = false, length = 200)
    private String templateName;

    @Column(name = "template_type")
    @Enumerated(EnumType.STRING)
    private TemplateType templateType; // APPLICATION_RECEIVED, INTERVIEW_SCHEDULED, OFFER_EXTENDED, REJECTION

    @Column(name = "subject", length = 500)
    private String subject;

    @Column(name = "body_html", columnDefinition = "TEXT")
    private String bodyHtml;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "placeholders", columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private List<String> placeholders;
}
```

---

#### 5. **Recruitment Analytics Dashboard** (Medium Priority)

**Current State:**
- Basic counts exist (candidateCount in JobOpeningResponse)
- No time-to-hire metrics
- No conversion rate tracking
- No source effectiveness analysis

**Gap:**
- No recruitment funnel visualization
- No bottleneck identification
- No recruiter performance metrics

**Required Metrics:**

```java
public class RecruitmentAnalytics {
    // Time-based metrics
    private Double averageTimeToHire; // Days from application to offer accepted
    private Double averageTimeInStage; // Days per pipeline stage
    private Map<String, Double> stageConversionRates; // % moving from one stage to next

    // Source effectiveness
    private Map<String, Integer> applicationsBySource; // LinkedIn: 100, Naukri: 50, etc.
    private Map<String, Double> hireRateBySource; // LinkedIn: 5%, Naukri: 3%

    // Recruiter performance
    private Map<UUID, Integer> candidatesAssignedPerRecruiter;
    private Map<UUID, Integer> hiresPerRecruiter;
    private Map<UUID, Double> avgTimeToClosePerRecruiter;

    // Job opening metrics
    private Integer totalApplications;
    private Integer interviewsScheduled;
    private Integer offersExtended;
    private Integer offersAccepted;
    private Integer positionsFilled;
    private Integer positionsOpen;

    // Quality metrics
    private Double offerAcceptanceRate; // % of offers accepted
    private Double interviewShowUpRate; // % of scheduled interviews attended
    private Double screeningPassRate; // % passing initial screening
}
```

---

#### 6. **Career Portal / Job Board** (Low Priority for MVP, High for Public Rollout)

**Current State:**
- No public-facing job board
- No careers page
- No applicant self-service portal

**Gap:**
- Candidates can't apply directly
- No job search/filtering
- No application status tracking for candidates

**Required:**
- Public `/careers` page (framework exists in `/frontend/app/careers/page.tsx`)
- Job listing API with public access (no auth)
- Application submission form
- Candidate login portal to track application status

---

## Prioritized Implementation Roadmap

### Phase 1: Critical ATS Features (4 weeks)

**Week 1-2: Application Pipeline**
- [ ] Create `PipelineStage` and `PipelineStageTransition` entities
- [ ] Build pipeline configuration API
- [ ] Implement drag-and-drop kanban board frontend
- [ ] Add real-time WebSocket updates for multi-user boards
- [ ] Create SLA tracking and bottleneck detection

**Week 3-4: Offer Letter Management**
- [ ] Create `OfferLetter` and `OfferLetterTemplate` entities
- [ ] Build template editor with placeholders
- [ ] Integrate PDF generation (iText or Apache PDFBox)
- [ ] Integrate DocuSign API for e-signatures
- [ ] Create offer approval workflow
- [ ] Build candidate offer acceptance portal

**Effort:** 160 hours (2 engineers × 4 weeks)

---

### Phase 2: Enhanced Communication & Assessments (3 weeks)

**Week 5-6: Communication Hub**
- [ ] Create `CandidateCommunication` and `EmailTemplate` entities
- [ ] Build email template editor (WYSIWYG)
- [ ] Implement communication timeline in candidate profile
- [ ] Add bulk email functionality
- [ ] Integrate SMS/WhatsApp via Twilio

**Week 7: Assessment Integration**
- [ ] Create `CandidateAssessment` entity
- [ ] Integrate HackerRank API for coding tests
- [ ] Build assessment assignment workflow
- [ ] Create webhook receivers for test completion
- [ ] Display assessment scores in candidate profile

**Effort:** 120 hours (2 engineers × 3 weeks)

---

### Phase 3: Analytics & Reporting (2 weeks)

**Week 8-9: Recruitment Analytics**
- [ ] Build analytics aggregation service
- [ ] Create recruitment funnel dashboard
- [ ] Implement time-to-hire metrics
- [ ] Build source effectiveness reports
- [ ] Create recruiter performance dashboard
- [ ] Add exportable reports (Excel, PDF)

**Effort:** 80 hours (2 engineers × 2 weeks)

---

### Phase 4: Public Job Board (3 weeks)

**Week 10-12: Career Portal**
- [ ] Build public job listing page
- [ ] Implement job search/filtering
- [ ] Create application submission form
- [ ] Build candidate self-service portal
- [ ] Add application status tracking
- [ ] SEO optimization for job listings

**Effort:** 120 hours (2 engineers × 3 weeks)

---

## Total Implementation Effort

| Phase | Duration | Effort (hours) | Team Size |
|-------|----------|----------------|-----------|
| Phase 1: Critical ATS | 4 weeks | 160 | 2 engineers |
| Phase 2: Communication & Assessments | 3 weeks | 120 | 2 engineers |
| Phase 3: Analytics | 2 weeks | 80 | 2 engineers |
| Phase 4: Job Board | 3 weeks | 120 | 2 engineers |
| **Total** | **12 weeks** | **480 hours** | **2 engineers** |

---

## Competitive Feature Comparison

| Feature | Current | Greenhouse | Lever | Workable | Target |
|---------|---------|------------|-------|----------|--------|
| Job Postings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Candidate Profiles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Interview Scheduling | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Kanban Pipeline** | ❌ | ✅ | ✅ | ✅ | **Phase 1** |
| **Offer Letters** | ❌ | ✅ | ✅ | ✅ | **Phase 1** |
| **E-Signatures** | ❌ | ✅ (DocuSign) | ✅ | ✅ | **Phase 1** |
| Communication Hub | ❌ | ✅ | ✅ | ✅ | **Phase 2** |
| Assessment Integration | ❌ | ✅ | ✅ | ✅ | **Phase 2** |
| Analytics Dashboard | ❌ | ✅ | ✅ | ✅ | **Phase 3** |
| Public Job Board | ❌ | ✅ | ✅ | ✅ | **Phase 4** |
| AI-Powered Screening | ✅ | ✅ | ✅ | ❌ | ✅ (Existing) |
| Resume Parsing | ✅ | ✅ | ✅ | ✅ | ✅ (Existing) |

**Competitive Advantage:**
- **AI Integration**: Already ahead with OpenAI-powered resume parsing, candidate matching, and interview questions
- **Multi-tenant**: Built-in tenant isolation (competitors require separate instances)
- **Integrated HRMS**: Seamless transition from candidate to employee (competitors require integrations)

---

## Decision

**Approved for Phased Implementation**: Start with Phase 1 (Critical ATS Features)

**Responsible Team**: Recruitment Module Team
**Implementation Start**: Week 4 (after saga pattern and JWT optimization)
**Review Date**: After Phase 1 completion (4 weeks)
**Success Criteria:**
- Pipeline kanban board with drag-and-drop (< 200ms latency)
- Offer letter generation with e-signature (< 5 min end-to-end)
- 95% feature parity with Lever/Greenhouse for core ATS

---

## References

- [Greenhouse ATS Features](https://www.greenhouse.io/features)
- [Lever Recruitment Platform](https://www.lever.co/platform)
- [DocuSign API Documentation](https://developers.docusign.com/)
- [HackerRank Work API](https://www.hackerrank.com/work/apidocs)
