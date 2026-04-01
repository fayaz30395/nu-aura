package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.InterviewRequest;
import com.hrms.api.recruitment.dto.InterviewResponse;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.Interview;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.InterviewRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.TenantContext;
import com.hrms.application.audit.service.AuditLogService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InterviewManagementService Tests")
class InterviewManagementServiceTest {

    @Mock
    private InterviewRepository interviewRepository;

    @Mock
    private CandidateRepository candidateRepository;

    @Mock
    private JobOpeningRepository jobOpeningRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private DataScopeService dataScopeService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private GoogleMeetService googleMeetService;

    @InjectMocks
    private InterviewManagementService interviewManagementService;

    private static MockedStatic<TenantContext> tenantContextMock;

    private UUID tenantId;
    private UUID candidateId;
    private UUID jobOpeningId;
    private UUID interviewerId;
    private UUID interviewId;
    private Interview interview;
    private InterviewRequest interviewRequest;
    private Candidate candidate;
    private JobOpening jobOpening;
    private Employee interviewer;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        candidateId = UUID.randomUUID();
        jobOpeningId = UUID.randomUUID();
        interviewerId = UUID.randomUUID();
        interviewId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        candidate = new Candidate();
        candidate.setId(candidateId);
        candidate.setTenantId(tenantId);
        candidate.setFirstName("Jane");
        candidate.setLastName("Smith");
        candidate.setEmail("jane.smith@example.com");

        jobOpening = new JobOpening();
        jobOpening.setId(jobOpeningId);
        jobOpening.setTenantId(tenantId);
        jobOpening.setJobTitle("Senior Software Engineer");

        interviewer = new Employee();
        interviewer.setId(interviewerId);
        interviewer.setTenantId(tenantId);
        interviewer.setFirstName("Bob");
        interviewer.setLastName("Manager");

        interview = new Interview();
        interview.setId(interviewId);
        interview.setTenantId(tenantId);
        interview.setCandidateId(candidateId);
        interview.setJobOpeningId(jobOpeningId);
        interview.setInterviewRound(Interview.InterviewRound.TECHNICAL_1);
        interview.setInterviewType(Interview.InterviewType.VIDEO);
        interview.setScheduledAt(LocalDateTime.now().plusDays(2));
        interview.setDurationMinutes(60);
        interview.setInterviewerId(interviewerId);
        interview.setLocation("Conference Room A");
        interview.setStatus(Interview.InterviewStatus.SCHEDULED);

        interviewRequest = new InterviewRequest();
        interviewRequest.setCandidateId(candidateId);
        interviewRequest.setJobOpeningId(jobOpeningId);
        interviewRequest.setInterviewRound(Interview.InterviewRound.TECHNICAL_1);
        interviewRequest.setInterviewType(Interview.InterviewType.VIDEO);
        interviewRequest.setScheduledAt(LocalDateTime.now().plusDays(2));
        interviewRequest.setDurationMinutes(60);
        interviewRequest.setInterviewerId(interviewerId);
        interviewRequest.setLocation("Conference Room A");
    }

    @Nested
    @DisplayName("Schedule Interview")
    class ScheduleInterviewTests {

        @Test
        @DisplayName("Should schedule interview successfully without Google Meet")
        void shouldScheduleInterviewSuccessfully() {
            when(interviewRepository.save(any(Interview.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));

            InterviewResponse result = interviewManagementService.scheduleInterview(interviewRequest);

            assertThat(result).isNotNull();
            assertThat(result.getCandidateId()).isEqualTo(candidateId);
            assertThat(result.getJobOpeningId()).isEqualTo(jobOpeningId);
            assertThat(result.getInterviewRound()).isEqualTo(Interview.InterviewRound.TECHNICAL_1);
            assertThat(result.getInterviewType()).isEqualTo(Interview.InterviewType.VIDEO);
            assertThat(result.getStatus()).isEqualTo(Interview.InterviewStatus.SCHEDULED);
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(interviewRepository).save(any(Interview.class));
            verify(auditLogService).logAction(eq("INTERVIEW"), any(UUID.class), any(), any(), any(), any());
        }

        @Test
        @DisplayName("Should default status to SCHEDULED when not specified")
        void shouldDefaultStatusToScheduled() {
            interviewRequest.setStatus(null);
            when(interviewRepository.save(any(Interview.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));

            InterviewResponse result = interviewManagementService.scheduleInterview(interviewRequest);

            assertThat(result.getStatus()).isEqualTo(Interview.InterviewStatus.SCHEDULED);
        }

        @Test
        @DisplayName("Should schedule interview with Google Meet when requested")
        void shouldScheduleInterviewWithGoogleMeet() {
            interviewRequest.setCreateGoogleMeet(true);
            interviewRequest.setGoogleAccessToken("mock-token");

            GoogleMeetService.GoogleMeetResult meetResult =
                    new GoogleMeetService.GoogleMeetResult("https://meet.google.com/abc-defg-hij", "event123", true, null);

            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));
            when(googleMeetService.createMeetEvent(any(), any(), any(), any(), anyInt(), any(), any()))
                    .thenReturn(meetResult);
            when(interviewRepository.save(any(Interview.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            InterviewResponse result = interviewManagementService.scheduleInterview(interviewRequest);

            assertThat(result).isNotNull();
            assertThat(result.getGoogleMeetLink()).isEqualTo("https://meet.google.com/abc-defg-hij");
            assertThat(result.getGoogleCalendarEventId()).isEqualTo("event123");
            verify(googleMeetService).createMeetEvent(any(), any(), any(), any(), anyInt(), any(), any());
        }

        @Test
        @DisplayName("Should save interview even when Google Meet creation fails")
        void shouldSaveInterviewWhenGoogleMeetFails() {
            interviewRequest.setCreateGoogleMeet(true);
            interviewRequest.setGoogleAccessToken("mock-token");

            GoogleMeetService.GoogleMeetResult failedResult =
                    new GoogleMeetService.GoogleMeetResult(null, null, false, "API error");

            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));
            when(googleMeetService.createMeetEvent(any(), any(), any(), any(), anyInt(), any(), any()))
                    .thenReturn(failedResult);
            when(interviewRepository.save(any(Interview.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            InterviewResponse result = interviewManagementService.scheduleInterview(interviewRequest);

            assertThat(result).isNotNull();
            assertThat(result.getGoogleMeetLink()).isNull();
            verify(interviewRepository).save(any(Interview.class));
        }

        @Test
        @DisplayName("Should save interview even when Google Meet throws exception")
        void shouldSaveInterviewWhenGoogleMeetThrowsException() {
            interviewRequest.setCreateGoogleMeet(true);
            interviewRequest.setGoogleAccessToken("mock-token");

            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(googleMeetService.createMeetEvent(any(), any(), any(), any(), anyInt(), any(), any()))
                    .thenThrow(new RuntimeException("Network error"));
            when(interviewRepository.save(any(Interview.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));

            InterviewResponse result = interviewManagementService.scheduleInterview(interviewRequest);

            assertThat(result).isNotNull();
            verify(interviewRepository).save(any(Interview.class));
        }

        @Test
        @DisplayName("Should map candidate and job names in response")
        void shouldMapCandidateAndJobNamesInResponse() {
            when(interviewRepository.save(any(Interview.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));

            InterviewResponse result = interviewManagementService.scheduleInterview(interviewRequest);

            assertThat(result.getCandidateName()).isEqualTo(candidate.getFullName());
            assertThat(result.getJobTitle()).isEqualTo("Senior Software Engineer");
            assertThat(result.getInterviewerName()).isEqualTo(interviewer.getFullName());
        }
    }

    @Nested
    @DisplayName("Update Interview")
    class UpdateInterviewTests {

        @Test
        @DisplayName("Should update interview successfully")
        void shouldUpdateInterviewSuccessfully() {
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview));
            when(interviewRepository.save(any(Interview.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));

            interviewRequest.setStatus(Interview.InterviewStatus.COMPLETED);
            interviewRequest.setFeedback("Strong technical skills");
            interviewRequest.setRating(4);
            interviewRequest.setResult(Interview.InterviewResult.SELECTED);

            InterviewResponse result = interviewManagementService.updateInterview(interviewId, interviewRequest);

            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(Interview.InterviewStatus.COMPLETED);
            assertThat(result.getFeedback()).isEqualTo("Strong technical skills");
            assertThat(result.getRating()).isEqualTo(4);
            assertThat(result.getResult()).isEqualTo(Interview.InterviewResult.SELECTED);
            verify(auditLogService).logAction(eq("INTERVIEW"), eq(interviewId), any(), any(), any(), any());
        }

        @Test
        @DisplayName("Should throw exception when interview not found for update")
        void shouldThrowExceptionWhenInterviewNotFoundForUpdate() {
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> interviewManagementService.updateInterview(interviewId, interviewRequest))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");
        }
    }

    @Nested
    @DisplayName("Delete Interview")
    class DeleteInterviewTests {

        @Test
        @DisplayName("Should delete interview successfully")
        void shouldDeleteInterviewSuccessfully() {
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.of(interview));

            interviewManagementService.deleteInterview(interviewId);

            verify(interviewRepository).delete(interview);
            verify(auditLogService).logAction(eq("INTERVIEW"), eq(interviewId), any(), any(), any(), any());
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent interview")
        void shouldThrowExceptionWhenDeletingNonExistentInterview() {
            when(interviewRepository.findByIdAndTenantId(interviewId, tenantId))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> interviewManagementService.deleteInterview(interviewId))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("not found");

            verify(interviewRepository, never()).delete(any(Interview.class));
        }
    }

    @Nested
    @DisplayName("Response Mapping")
    class ResponseMappingTests {

        @Test
        @DisplayName("Should map interview entity to response with all fields")
        void shouldMapAllFieldsToResponse() {
            interview.setFeedback("Good candidate");
            interview.setRating(4);
            interview.setResult(Interview.InterviewResult.SELECTED);
            interview.setNotes("Proceed to next round");
            interview.setMeetingLink("https://meet.google.com/xyz");
            interview.setGoogleMeetLink("https://meet.google.com/xyz");
            interview.setGoogleCalendarEventId("event456");

            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));

            InterviewResponse result = interviewManagementService.mapToInterviewResponse(interview);

            assertThat(result.getId()).isEqualTo(interviewId);
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            assertThat(result.getCandidateId()).isEqualTo(candidateId);
            assertThat(result.getJobOpeningId()).isEqualTo(jobOpeningId);
            assertThat(result.getInterviewerId()).isEqualTo(interviewerId);
            assertThat(result.getFeedback()).isEqualTo("Good candidate");
            assertThat(result.getRating()).isEqualTo(4);
            assertThat(result.getResult()).isEqualTo(Interview.InterviewResult.SELECTED);
            assertThat(result.getNotes()).isEqualTo("Proceed to next round");
            assertThat(result.getGoogleMeetLink()).isEqualTo("https://meet.google.com/xyz");
            assertThat(result.getGoogleCalendarEventId()).isEqualTo("event456");
        }

        @Test
        @DisplayName("Should handle null interviewer ID gracefully")
        void shouldHandleNullInterviewerIdGracefully() {
            interview.setInterviewerId(null);

            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.of(candidate));
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));

            InterviewResponse result = interviewManagementService.mapToInterviewResponse(interview);

            assertThat(result.getInterviewerName()).isNull();
            assertThat(result.getInterviewerId()).isNull();
        }

        @Test
        @DisplayName("Should handle missing candidate gracefully")
        void shouldHandleMissingCandidateGracefully() {
            when(candidateRepository.findById(candidateId))
                    .thenReturn(Optional.empty());
            when(jobOpeningRepository.findById(jobOpeningId))
                    .thenReturn(Optional.of(jobOpening));
            when(employeeRepository.findById(interviewerId))
                    .thenReturn(Optional.of(interviewer));

            InterviewResponse result = interviewManagementService.mapToInterviewResponse(interview);

            assertThat(result.getCandidateName()).isNull();
        }
    }
}
