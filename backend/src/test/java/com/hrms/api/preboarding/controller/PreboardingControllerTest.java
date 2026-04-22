package com.hrms.api.preboarding.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.preboarding.dto.*;
import com.hrms.application.preboarding.service.PreboardingService;
import com.hrms.common.security.*;
import com.hrms.domain.preboarding.PreboardingCandidate;
import com.hrms.domain.preboarding.PreboardingCandidate.PreboardingStatus;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PreboardingController.class)
@ContextConfiguration(classes = {PreboardingController.class, PreboardingControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PreboardingController Tests")
class PreboardingControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private PreboardingService preboardingService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID candidateId;
    private PreboardingCandidate candidate;

    @BeforeEach
    void setUp() {
        candidateId = UUID.randomUUID();

        candidate = PreboardingCandidate.builder()
                .id(candidateId)
                .firstName("Jane")
                .lastName("Smith")
                .email("jane.smith@example.com")
                .expectedJoiningDate(LocalDate.now().plusDays(14))
                .designation("Software Engineer")
                .status(PreboardingStatus.INVITED)
                .completionPercentage(0)
                .photoUploaded(false)
                .idProofUploaded(false)
                .addressProofUploaded(false)
                .educationDocsUploaded(false)
                .offerLetterSigned(false)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should create preboarding invitation successfully")
    void shouldCreateInvitation() throws Exception {
        CreatePreboardingRequest request = new CreatePreboardingRequest();
        request.setFirstName("Jane");
        request.setLastName("Smith");
        request.setEmail("jane.smith@example.com");
        request.setExpectedJoiningDate(LocalDate.now().plusDays(14));

        when(preboardingService.createInvitation(
                eq("Jane"), eq("Smith"), eq("jane.smith@example.com"),
                any(LocalDate.class), isNull(), isNull(), isNull()))
                .thenReturn(candidate);

        mockMvc.perform(post("/api/v1/preboarding/candidates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Jane"))
                .andExpect(jsonPath("$.email").value("jane.smith@example.com"));

        verify(preboardingService).createInvitation(
                eq("Jane"), eq("Smith"), eq("jane.smith@example.com"),
                any(LocalDate.class), isNull(), isNull(), isNull());
    }

    @Test
    @DisplayName("Should return 400 for missing required fields")
    void shouldReturn400ForMissingFields() throws Exception {
        CreatePreboardingRequest request = new CreatePreboardingRequest();

        mockMvc.perform(post("/api/v1/preboarding/candidates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should get all candidates with pagination")
    void shouldGetAllCandidates() throws Exception {
        Page<PreboardingCandidate> page = new PageImpl<>(
                Collections.singletonList(candidate), PageRequest.of(0, 20), 1);

        when(preboardingService.getAllCandidates(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/preboarding/candidates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(preboardingService).getAllCandidates(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get candidates by status")
    void shouldGetCandidatesByStatus() throws Exception {
        Page<PreboardingCandidate> page = new PageImpl<>(
                Collections.singletonList(candidate), PageRequest.of(0, 20), 1);

        when(preboardingService.getCandidatesByStatus(eq(PreboardingStatus.INVITED), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/preboarding/candidates/status/{status}", "INVITED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(preboardingService).getCandidatesByStatus(eq(PreboardingStatus.INVITED), any(Pageable.class));
    }

    @Test
    @DisplayName("Should get upcoming joiners")
    void shouldGetUpcomingJoiners() throws Exception {
        when(preboardingService.getUpcomingJoiners(any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(Collections.singletonList(candidate));

        mockMvc.perform(get("/api/v1/preboarding/candidates/upcoming")
                        .param("days", "14"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(preboardingService).getUpcomingJoiners(any(LocalDate.class), any(LocalDate.class));
    }

    @Test
    @DisplayName("Should cancel preboarding invitation")
    void shouldCancelInvitation() throws Exception {
        doNothing().when(preboardingService).cancelInvitation(candidateId);

        mockMvc.perform(post("/api/v1/preboarding/candidates/{id}/cancel", candidateId))
                .andExpect(status().isOk());

        verify(preboardingService).cancelInvitation(candidateId);
    }

    @Test
    @DisplayName("Should resend preboarding invitation")
    void shouldResendInvitation() throws Exception {
        doNothing().when(preboardingService).resendInvitation(candidateId);

        mockMvc.perform(post("/api/v1/preboarding/candidates/{id}/resend", candidateId))
                .andExpect(status().isOk());

        verify(preboardingService).resendInvitation(candidateId);
    }

    @Test
    @DisplayName("Should get portal data by token")
    void shouldGetPortalData() throws Exception {
        String token = "valid-access-token";
        when(preboardingService.getByAccessToken(token)).thenReturn(candidate);

        mockMvc.perform(get("/api/v1/preboarding/portal/{token}", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Jane"));

        verify(preboardingService).getByAccessToken(token);
    }

    @Test
    @DisplayName("Should sign offer letter via portal")
    void shouldSignOfferLetter() throws Exception {
        String token = "valid-access-token";
        PreboardingCandidate signedCandidate = PreboardingCandidate.builder()
                .id(candidateId)
                .firstName("Jane")
                .lastName("Smith")
                .email("jane.smith@example.com")
                .expectedJoiningDate(LocalDate.now().plusDays(14))
                .status(PreboardingStatus.IN_PROGRESS)
                .offerLetterSigned(true)
                .completionPercentage(20)
                .createdAt(LocalDateTime.now())
                .build();

        when(preboardingService.signOfferLetter(token)).thenReturn(signedCandidate);

        mockMvc.perform(post("/api/v1/preboarding/portal/{token}/sign-offer", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offerLetterSigned").value(true));

        verify(preboardingService).signOfferLetter(token);
    }

    @Test
    @DisplayName("Should mark converted to employee")
    void shouldMarkConverted() throws Exception {
        UUID employeeId = UUID.randomUUID();
        Map<String, UUID> body = Map.of("employeeId", employeeId);

        doNothing().when(preboardingService).markConverted(candidateId, employeeId);

        mockMvc.perform(post("/api/v1/preboarding/candidates/{id}/convert", candidateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk());

        verify(preboardingService).markConverted(candidateId, employeeId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
