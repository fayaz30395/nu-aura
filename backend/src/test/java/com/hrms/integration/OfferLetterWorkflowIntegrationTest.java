package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.letter.dto.GenerateOfferLetterRequest;
import com.hrms.api.recruitment.dto.OfferResponseRequest;
import com.hrms.application.esignature.event.SignatureCompletedEvent;
import com.hrms.application.recruitment.listener.OfferLetterSignatureListener;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.esignature.SignatureApproval;
import com.hrms.domain.esignature.SignatureRequest;
import com.hrms.domain.letter.GeneratedLetter;
import com.hrms.domain.letter.LetterTemplate;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.domain.user.RoleScope;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.esignature.repository.SignatureApprovalRepository;
import com.hrms.infrastructure.esignature.repository.SignatureRequestRepository;
import com.hrms.infrastructure.letter.repository.GeneratedLetterRepository;
import com.hrms.infrastructure.letter.repository.LetterTemplateRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Offer Letter Workflow Integration Tests")
class OfferLetterWorkflowIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private UUID currentEmployeeId; // Set dynamically from created employee

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobOpeningRepository jobOpeningRepository;

    @Autowired
    private LetterTemplateRepository letterTemplateRepository;

    @Autowired
    private GeneratedLetterRepository generatedLetterRepository;

    @Autowired
    private SignatureRequestRepository signatureRequestRepository;

    @Autowired
    private SignatureApprovalRepository signatureApprovalRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OfferLetterSignatureListener signatureListener;

    private JobOpening jobOpening;
    private Candidate candidate;
    private LetterTemplate offerTemplate;
    private Employee hrEmployee;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);

        // Create HR employee first to get the ID
        hrEmployee = createEmployee("HR-001");
        currentEmployeeId = hrEmployee.getId();

        // Now setup security context with the correct employee ID
        setupAdminScope();

        // Create job opening
        jobOpening = createJobOpening();

        // Create candidate
        candidate = createCandidate();

        // Create offer letter template
        offerTemplate = createOfferLetterTemplate();
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    // ==================== Offer Letter Generation Tests ====================

    @Nested
    @DisplayName("Offer Letter Generation")
    class OfferLetterGenerationTests {

        @Test
        @WithMockUser(username = "hr@test.com", roles = {"HR"})
        @DisplayName("Should generate offer letter for candidate")
        void shouldGenerateOfferLetterForCandidate() throws Exception {
            setupAdminScope();

            GenerateOfferLetterRequest request = GenerateOfferLetterRequest.builder()
                    .templateId(offerTemplate.getId())
                    .candidateId(candidate.getId())
                    .offeredCtc(new BigDecimal("1200000"))
                    .offeredDesignation("Senior Engineer")
                    .proposedJoiningDate(LocalDate.now().plusMonths(1))
                    .letterTitle("Offer Letter - " + candidate.getFullName())
                    .build();

            MvcResult result = mockMvc.perform(post("/api/v1/letters/generate-offer")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.candidateName").value(candidate.getFullName()))
                    .andExpect(jsonPath("$.category").value("OFFER"))
                    .andReturn();

            // Verify candidate is updated with offer details but NOT OFFER_EXTENDED yet
            Candidate updatedCandidate = candidateRepository.findById(candidate.getId()).orElseThrow();
            assertThat(updatedCandidate.getOfferedCtc()).isEqualByComparingTo(new BigDecimal("1200000"));
            assertThat(updatedCandidate.getOfferedDesignation()).isEqualTo("Senior Engineer");
            assertThat(updatedCandidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.OFFER);
            // Status should NOT be OFFER_EXTENDED until letter is issued
            assertThat(updatedCandidate.getStatus()).isNotEqualTo(Candidate.CandidateStatus.OFFER_EXTENDED);
        }

        @Test
        @WithMockUser(username = "hr@test.com", roles = {"HR"})
        @DisplayName("Should reject non-OFFER category template for offer letter")
        void shouldRejectNonOfferTemplate() throws Exception {
            setupAdminScope();

            // Create a non-offer template
            LetterTemplate nonOfferTemplate = createNonOfferTemplate();

            GenerateOfferLetterRequest request = GenerateOfferLetterRequest.builder()
                    .templateId(nonOfferTemplate.getId())
                    .candidateId(candidate.getId())
                    .offeredCtc(new BigDecimal("1200000"))
                    .offeredDesignation("Senior Engineer")
                    .proposedJoiningDate(LocalDate.now().plusMonths(1))
                    .build();

            mockMvc.perform(post("/api/v1/letters/generate-offer")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isConflict()); // BusinessException returns 409 CONFLICT
        }
    }

    // ==================== E-Signature Tests ====================

    @Nested
    @DisplayName("E-Signature for External Candidates")
    class ESignatureTests {

        @Test
        @WithMockUser(username = "hr@test.com", roles = {"HR"})
        @DisplayName("Should create e-signature request for external candidate with null signerId")
        void shouldCreateEsignatureForExternalCandidate() throws Exception {
            setupAdminScope();

            // Generate and approve offer letter first
            GeneratedLetter letter = createAndApproveOfferLetter();

            // Set a PDF URL for the letter (required for e-sign)
            letter.setPdfUrl("https://storage.example.com/offer-letters/" + letter.getId() + ".pdf");
            generatedLetterRepository.save(letter);

            // Issue with e-sign
            mockMvc.perform(post("/api/v1/letters/" + letter.getId() + "/issue-with-esign"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ISSUED"));

            // Verify signature approval was created with null signerId (EXTERNAL signer)
            SignatureRequest signatureRequest = signatureRequestRepository
                    .findByTenantIdAndDocumentType(TENANT_ID, SignatureRequest.DocumentType.OFFER_LETTER)
                    .stream()
                    .findFirst()
                    .orElseThrow();

            assertThat(signatureRequest.getStatus()).isEqualTo(SignatureRequest.SignatureStatus.PENDING);

            SignatureApproval approval = signatureApprovalRepository
                    .findByTenantIdAndSignatureRequestIdOrderBySigningOrderAsc(TENANT_ID, signatureRequest.getId())
                    .stream()
                    .findFirst()
                    .orElseThrow();

            assertThat(approval.getSignerId()).isNull(); // EXTERNAL signer has no employee ID
            assertThat(approval.getSignerEmail()).isEqualTo(candidate.getEmail());
            assertThat(approval.getSignerRole()).isEqualTo(SignatureApproval.SignerRole.EXTERNAL);
            assertThat(approval.getAuthenticationToken()).isNotNull(); // Token generated for external signer

            // Verify candidate status is now OFFER_EXTENDED
            Candidate updatedCandidate = candidateRepository.findById(candidate.getId()).orElseThrow();
            assertThat(updatedCandidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_EXTENDED);
            assertThat(updatedCandidate.getOfferExtendedDate()).isNotNull();
        }

        @Test
        @WithMockUser(username = "hr@test.com", roles = {"HR"})
        @DisplayName("Should reject e-sign if PDF is not generated")
        void shouldRejectEsignWithoutPdf() throws Exception {
            setupAdminScope();

            // Generate and approve offer letter but don't set PDF URL
            GeneratedLetter letter = createAndApproveOfferLetter();
            // Note: pdfUrl is null

            mockMvc.perform(post("/api/v1/letters/" + letter.getId() + "/issue-with-esign"))
                    .andExpect(status().isConflict()); // BusinessException returns 409 CONFLICT
        }
    }

    // ==================== Offer Response Tests ====================

    @Nested
    @DisplayName("Offer Acceptance/Decline")
    class OfferResponseTests {

        @Test
        @WithMockUser(username = "hr@test.com", roles = {"HR"})
        @DisplayName("Should accept offer and keep stage at OFFER (not JOINED)")
        void shouldAcceptOfferWithCorrectStage() throws Exception {
            setupAdminScope();

            // Set candidate to OFFER_EXTENDED status
            candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
            candidate.setCurrentStage(Candidate.RecruitmentStage.OFFER);
            candidateRepository.save(candidate);

            OfferResponseRequest request = OfferResponseRequest.builder()
                    .candidateId(candidate.getId())
                    .response(OfferResponseRequest.OfferResponse.ACCEPTED)
                    .confirmedJoiningDate(LocalDate.now().plusMonths(1))
                    .build();

            mockMvc.perform(post("/api/v1/recruitment/candidates/" + candidate.getId() + "/accept-offer")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("OFFER_ACCEPTED"));

            // Verify stage is NOT set to JOINED
            Candidate updatedCandidate = candidateRepository.findById(candidate.getId()).orElseThrow();
            assertThat(updatedCandidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_ACCEPTED);
            assertThat(updatedCandidate.getCurrentStage()).isEqualTo(Candidate.RecruitmentStage.OFFER);
            assertThat(updatedCandidate.getOfferAcceptedDate()).isNotNull();
        }

        @Test
        @WithMockUser(username = "hr@test.com", roles = {"HR"})
        @DisplayName("Should decline offer with reason")
        void shouldDeclineOfferWithReason() throws Exception {
            setupAdminScope();

            // Set candidate to OFFER_EXTENDED status
            candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
            candidate.setCurrentStage(Candidate.RecruitmentStage.OFFER);
            candidateRepository.save(candidate);

            OfferResponseRequest request = OfferResponseRequest.builder()
                    .candidateId(candidate.getId())
                    .response(OfferResponseRequest.OfferResponse.DECLINED)
                    .declineReason("Accepted another offer")
                    .build();

            mockMvc.perform(post("/api/v1/recruitment/candidates/" + candidate.getId() + "/decline-offer")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("OFFER_DECLINED"));

            Candidate updatedCandidate = candidateRepository.findById(candidate.getId()).orElseThrow();
            assertThat(updatedCandidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_DECLINED);
            assertThat(updatedCandidate.getOfferDeclineReason()).isEqualTo("Accepted another offer");
        }

        @Test
        @WithMockUser(username = "hr@test.com", roles = {"HR"})
        @DisplayName("Should reject accept if candidate ID in path doesn't match body")
        void shouldRejectMismatchedCandidateId() throws Exception {
            setupAdminScope();

            candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
            candidateRepository.save(candidate);

            OfferResponseRequest request = OfferResponseRequest.builder()
                    .candidateId(UUID.randomUUID()) // Different ID
                    .response(OfferResponseRequest.OfferResponse.ACCEPTED)
                    .build();

            mockMvc.perform(post("/api/v1/recruitment/candidates/" + candidate.getId() + "/accept-offer")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== E-Sign Completion Event Tests ====================

    @Nested
    @DisplayName("E-Sign Completion Events")
    class ESignCompletionEventTests {

        @Test
        @DisplayName("Should update candidate status to OFFER_ACCEPTED when signature completed")
        void shouldUpdateCandidateOnSignatureCompletion() {
            // Set candidate to OFFER_EXTENDED
            candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
            candidate.setCurrentStage(Candidate.RecruitmentStage.OFFER);
            candidateRepository.save(candidate);

            // Simulate signature completed event
            String metadata = "{\"candidateId\":\"" + candidate.getId() + "\",\"letterId\":\"" + UUID.randomUUID() + "\"}";
            SignatureCompletedEvent event = new SignatureCompletedEvent(
                    this,
                    UUID.randomUUID(),
                    TENANT_ID,
                    SignatureRequest.DocumentType.OFFER_LETTER,
                    SignatureRequest.SignatureStatus.COMPLETED,
                    metadata
            );

            signatureListener.handleSignatureCompleted(event);

            // Verify candidate status updated
            Candidate updatedCandidate = candidateRepository.findById(candidate.getId()).orElseThrow();
            assertThat(updatedCandidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_ACCEPTED);
            assertThat(updatedCandidate.getOfferAcceptedDate()).isNotNull();
        }

        @Test
        @DisplayName("Should update candidate status to OFFER_DECLINED when signature declined")
        void shouldUpdateCandidateOnSignatureDecline() {
            // Set candidate to OFFER_EXTENDED
            candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
            candidate.setCurrentStage(Candidate.RecruitmentStage.OFFER);
            candidateRepository.save(candidate);

            // Simulate signature declined event
            String metadata = "{\"candidateId\":\"" + candidate.getId() + "\",\"letterId\":\"" + UUID.randomUUID() + "\"}";
            SignatureCompletedEvent event = new SignatureCompletedEvent(
                    this,
                    UUID.randomUUID(),
                    TENANT_ID,
                    SignatureRequest.DocumentType.OFFER_LETTER,
                    SignatureRequest.SignatureStatus.DECLINED,
                    metadata
            );

            signatureListener.handleSignatureCompleted(event);

            // Verify candidate status updated
            Candidate updatedCandidate = candidateRepository.findById(candidate.getId()).orElseThrow();
            assertThat(updatedCandidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_DECLINED);
            assertThat(updatedCandidate.getOfferDeclinedDate()).isNotNull();
        }

        @Test
        @DisplayName("Should ignore non-OFFER_LETTER document types")
        void shouldIgnoreNonOfferLetterDocuments() {
            // Set candidate to OFFER_EXTENDED
            candidate.setStatus(Candidate.CandidateStatus.OFFER_EXTENDED);
            candidateRepository.save(candidate);

            // Simulate event for different document type
            String metadata = "{\"candidateId\":\"" + candidate.getId() + "\"}";
            SignatureCompletedEvent event = new SignatureCompletedEvent(
                    this,
                    UUID.randomUUID(),
                    TENANT_ID,
                    SignatureRequest.DocumentType.NDA, // Not an offer letter
                    SignatureRequest.SignatureStatus.COMPLETED,
                    metadata
            );

            signatureListener.handleSignatureCompleted(event);

            // Verify candidate status unchanged
            Candidate updatedCandidate = candidateRepository.findById(candidate.getId()).orElseThrow();
            assertThat(updatedCandidate.getStatus()).isEqualTo(Candidate.CandidateStatus.OFFER_EXTENDED);
        }

        @Test
        @DisplayName("Should not update candidate not in OFFER_EXTENDED status")
        void shouldNotUpdateCandidateNotInOfferExtended() {
            // Candidate is still in NEW status
            candidate.setStatus(Candidate.CandidateStatus.NEW);
            candidateRepository.save(candidate);

            // Simulate signature completed event
            String metadata = "{\"candidateId\":\"" + candidate.getId() + "\"}";
            SignatureCompletedEvent event = new SignatureCompletedEvent(
                    this,
                    UUID.randomUUID(),
                    TENANT_ID,
                    SignatureRequest.DocumentType.OFFER_LETTER,
                    SignatureRequest.SignatureStatus.COMPLETED,
                    metadata
            );

            signatureListener.handleSignatureCompleted(event);

            // Verify candidate status unchanged
            Candidate updatedCandidate = candidateRepository.findById(candidate.getId()).orElseThrow();
            assertThat(updatedCandidate.getStatus()).isEqualTo(Candidate.CandidateStatus.NEW);
        }
    }

    // ==================== Helper Methods ====================

    private void setupAdminScope() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.RECRUITMENT_MANAGE, RoleScope.ALL);
        permissions.put(Permission.RECRUITMENT_VIEW, RoleScope.ALL);
        permissions.put(Permission.CANDIDATE_VIEW, RoleScope.ALL);
        permissions.put(Permission.LETTER_TEMPLATE_VIEW, RoleScope.ALL);
        permissions.put(Permission.LETTER_GENERATE, RoleScope.ALL);
        permissions.put(Permission.LETTER_ISSUE, RoleScope.ALL);
        permissions.put(Permission.ESIGNATURE_REQUEST, RoleScope.ALL);
        permissions.put(Permission.ESIGNATURE_VIEW, RoleScope.ALL);
        permissions.put(Permission.ESIGNATURE_MANAGE, RoleScope.ALL);

        SecurityContext.setCurrentUser(UUID.randomUUID(), currentEmployeeId, Set.of("ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    private Employee createEmployee(String code) {
        User user = User.builder()
                .email(code.toLowerCase() + "@example.com")
                .firstName("HR")
                .lastName("Admin")
                .passwordHash("test-hash")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(TENANT_ID);
        User savedUser = userRepository.save(user);

        Employee employee = Employee.builder()
                .employeeCode(code)
                .firstName("HR")
                .lastName("Admin")
                .joiningDate(LocalDate.now().minusYears(1))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .user(savedUser)
                .build();
        employee.setTenantId(TENANT_ID);
        return employeeRepository.save(employee);
    }

    private JobOpening createJobOpening() {
        JobOpening jo = new JobOpening();
        jo.setId(UUID.randomUUID());
        jo.setTenantId(TENANT_ID);
        jo.setJobCode("JOB-TEST-" + UUID.randomUUID().toString().substring(0, 6));
        jo.setJobTitle("Software Engineer");
        jo.setDepartmentId(UUID.randomUUID());
        jo.setLocation("Bangalore");
        jo.setEmploymentType(JobOpening.EmploymentType.FULL_TIME);
        jo.setStatus(JobOpening.JobStatus.OPEN);
        jo.setHiringManagerId(currentEmployeeId);
        jo.setPostedDate(LocalDate.now());
        jo.setIsActive(true);
        return jobOpeningRepository.save(jo);
    }

    private Candidate createCandidate() {
        Candidate c = new Candidate();
        c.setId(UUID.randomUUID());
        c.setTenantId(TENANT_ID);
        c.setCandidateCode("CAND-TEST-" + UUID.randomUUID().toString().substring(0, 6));
        c.setJobOpeningId(jobOpening.getId());
        c.setFirstName("John");
        c.setLastName("Doe");
        c.setEmail("john.doe." + UUID.randomUUID().toString().substring(0, 6) + "@example.com");
        c.setPhone("+91 9876543210");
        c.setCurrentCompany("Previous Corp");
        c.setCurrentDesignation("Engineer");
        c.setCurrentCtc(new BigDecimal("1000000"));
        c.setExpectedCtc(new BigDecimal("1500000"));
        c.setStatus(Candidate.CandidateStatus.NEW);
        c.setCurrentStage(Candidate.RecruitmentStage.SCREENING);
        c.setAppliedDate(LocalDate.now());
        return candidateRepository.save(c);
    }

    private LetterTemplate createOfferLetterTemplate() {
        LetterTemplate template = LetterTemplate.builder()
                .name("Standard Offer Letter")
                .code("OFFER-STD-" + UUID.randomUUID().toString().substring(0, 6))
                .description("Standard offer letter template")
                .category(LetterTemplate.LetterCategory.OFFER)
                .templateContent("""
                        Dear {{candidate.name}},

                        We are pleased to offer you the position of {{offer.designation}} at our company.

                        Your compensation will be {{offer.ctc}} per annum.
                        Your proposed joining date is {{offer.joiningDate}}.

                        Please sign this letter to confirm your acceptance.

                        Best regards,
                        HR Team
                        """)
                .isActive(true)
                .isSystemTemplate(false)
                .templateVersion(1)
                .requiresApproval(false)
                .build();
        template.setTenantId(TENANT_ID);
        return letterTemplateRepository.save(template);
    }

    private LetterTemplate createNonOfferTemplate() {
        LetterTemplate template = LetterTemplate.builder()
                .name("Appointment Letter")
                .code("APPT-" + UUID.randomUUID().toString().substring(0, 6))
                .category(LetterTemplate.LetterCategory.APPOINTMENT)
                .templateContent("Appointment letter content...")
                .isActive(true)
                .isSystemTemplate(false)
                .templateVersion(1)
                .requiresApproval(false)
                .build();
        template.setTenantId(TENANT_ID);
        return letterTemplateRepository.save(template);
    }

    private GeneratedLetter createAndApproveOfferLetter() {
        GeneratedLetter letter = GeneratedLetter.builder()
                .referenceNumber("OFF/" + LocalDate.now().getYear() + "/001")
                .templateId(offerTemplate.getId())
                .candidateId(candidate.getId())
                .category(LetterTemplate.LetterCategory.OFFER)
                .letterTitle("Offer Letter - " + candidate.getFullName())
                .generatedContent("Generated offer letter content...")
                .letterDate(LocalDate.now())
                .effectiveDate(LocalDate.now().plusMonths(1))
                .status(GeneratedLetter.LetterStatus.APPROVED)
                .generatedBy(currentEmployeeId)
                .build();
        letter.setTenantId(TENANT_ID);
        return generatedLetterRepository.save(letter);
    }
}
