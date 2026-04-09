package com.hrms.api.publicapi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.publicapi.dto.PublicOfferAcceptRequest;
import com.hrms.api.publicapi.dto.PublicOfferDeclineRequest;
import com.hrms.api.publicapi.dto.PublicOfferResponse;
import com.hrms.application.publicapi.service.PublicOfferService;
import com.hrms.common.security.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PublicOfferController.class)
@ContextConfiguration(classes = {PublicOfferController.class, PublicOfferControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PublicOfferController Tests")
class PublicOfferControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private PublicOfferService publicOfferService;
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

    private String token;
    private PublicOfferResponse offerResponse;

    @BeforeEach
    void setUp() {
        token = "abc123-offer-token";
        offerResponse = PublicOfferResponse.builder()
                .candidateId(UUID.randomUUID())
                .candidateName("John Doe")
                .email("john@example.com")
                .jobTitle("Software Engineer")
                .offeredCtc(new BigDecimal("1200000"))
                .proposedJoiningDate(LocalDate.now().plusMonths(1))
                .tokenValid(true)
                .companyName("NULogic")
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Test
    @DisplayName("Should get offer by token successfully")
    void shouldGetOfferByToken() throws Exception {
        when(publicOfferService.getOfferByToken(token)).thenReturn(offerResponse);

        mockMvc.perform(get("/api/v1/public/offers/{token}", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateName").value("John Doe"))
                .andExpect(jsonPath("$.jobTitle").value("Software Engineer"))
                .andExpect(jsonPath("$.tokenValid").value(true));

        verify(publicOfferService).getOfferByToken(token);
    }

    @Test
    @DisplayName("Should accept offer successfully")
    void shouldAcceptOffer() throws Exception {
        PublicOfferAcceptRequest request = PublicOfferAcceptRequest.builder()
                .email("john@example.com")
                .confirmedJoiningDate(LocalDate.now().plusMonths(1))
                .build();

        when(publicOfferService.acceptOffer(eq(token), any(PublicOfferAcceptRequest.class)))
                .thenReturn(offerResponse);

        mockMvc.perform(post("/api/v1/public/offers/{token}/accept", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateName").value("John Doe"));

        verify(publicOfferService).acceptOffer(eq(token), any(PublicOfferAcceptRequest.class));
    }

    @Test
    @DisplayName("Should decline offer successfully")
    void shouldDeclineOffer() throws Exception {
        PublicOfferDeclineRequest request = PublicOfferDeclineRequest.builder()
                .email("john@example.com")
                .declineReason("Found another opportunity")
                .build();

        when(publicOfferService.declineOffer(eq(token), any(PublicOfferDeclineRequest.class)))
                .thenReturn(offerResponse);

        mockMvc.perform(post("/api/v1/public/offers/{token}/decline", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.candidateName").value("John Doe"));

        verify(publicOfferService).declineOffer(eq(token), any(PublicOfferDeclineRequest.class));
    }

    @Test
    @DisplayName("Should return 400 when accepting offer without email")
    void shouldReturn400WhenAcceptWithoutEmail() throws Exception {
        PublicOfferAcceptRequest request = PublicOfferAcceptRequest.builder()
                .confirmedJoiningDate(LocalDate.now().plusMonths(1))
                .build();

        mockMvc.perform(post("/api/v1/public/offers/{token}/accept", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 when declining offer without email")
    void shouldReturn400WhenDeclineWithoutEmail() throws Exception {
        PublicOfferDeclineRequest request = PublicOfferDeclineRequest.builder()
                .declineReason("Not interested")
                .build();

        mockMvc.perform(post("/api/v1/public/offers/{token}/decline", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 when accepting with invalid email format")
    void shouldReturn400WhenAcceptWithInvalidEmail() throws Exception {
        PublicOfferAcceptRequest request = PublicOfferAcceptRequest.builder()
                .email("not-an-email")
                .build();

        mockMvc.perform(post("/api/v1/public/offers/{token}/accept", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
