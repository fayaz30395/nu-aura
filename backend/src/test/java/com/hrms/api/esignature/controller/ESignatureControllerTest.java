package com.hrms.api.esignature.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.esignature.dto.*;
import com.hrms.application.esignature.service.ESignatureService;
import com.hrms.common.security.*;
import com.hrms.domain.esignature.SignatureRequest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ESignatureController.class)
@ContextConfiguration(classes = {ESignatureController.class, ESignatureControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ESignatureController Integration Tests")
class ESignatureControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ESignatureService eSignatureService;
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

    private UUID requestId;
    private UUID creatorId;
    private SignatureRequestResponse signatureResponse;

    @BeforeEach
    void setUp() {
        requestId = UUID.randomUUID();
        creatorId = UUID.randomUUID();
        approvalId = UUID.randomUUID();

        signatureResponse = SignatureRequestResponse.builder()
                .id(requestId)
                .title("Offer Letter - John Doe")
                .documentType(SignatureRequest.DocumentType.OFFER_LETTER)
                .status(SignatureRequest.SignatureStatus.DRAFT)
                .createdBy(creatorId)
                .requiredSignatures(2)
                .receivedSignatures(0)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should create signature request successfully")
    void shouldCreateSignatureRequestSuccessfully() throws Exception {
        SignatureRequestRequest request = SignatureRequestRequest.builder()
                .title("Offer Letter - John Doe")
                .documentType(SignatureRequest.DocumentType.OFFER_LETTER)
                .documentUrl("https://storage.example.com/offer.pdf")
                .documentName("offer_letter.pdf")
                .build();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(creatorId);

            when(eSignatureService.createSignatureRequest(any(SignatureRequestRequest.class), eq(creatorId)))
                    .thenReturn(signatureResponse);

            mockMvc.perform(post("/api/v1/esignature/requests")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.title").value("Offer Letter - John Doe"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(eSignatureService).createSignatureRequest(any(SignatureRequestRequest.class), eq(creatorId));
        }
    }

    @Test
    @DisplayName("Should get signature request by ID")
    void shouldGetSignatureRequestById() throws Exception {
        when(eSignatureService.getSignatureRequestById(requestId)).thenReturn(signatureResponse);

        mockMvc.perform(get("/api/v1/esignature/requests/{id}", requestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId.toString()))
                .andExpect(jsonPath("$.title").value("Offer Letter - John Doe"));

        verify(eSignatureService).getSignatureRequestById(requestId);
    }

    @Test
    @DisplayName("Should get all signature requests with pagination")
    void shouldGetAllSignatureRequests() throws Exception {
        Page<SignatureRequestResponse> page = new PageImpl<>(
                Collections.singletonList(signatureResponse),
                PageRequest.of(0, 20),
                1
        );

        when(eSignatureService.getAllSignatureRequests(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/esignature/requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(eSignatureService).getAllSignatureRequests(any(Pageable.class));
    }

    @Test
    @DisplayName("Should send request for signature")
    void shouldSendForSignature() throws Exception {
        SignatureRequestResponse sentResponse = SignatureRequestResponse.builder()
                .id(requestId)
                .status(SignatureRequest.SignatureStatus.PENDING)
                .build();

        when(eSignatureService.sendForSignature(requestId)).thenReturn(sentResponse);

        mockMvc.perform(patch("/api/v1/esignature/requests/{id}/send", requestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        verify(eSignatureService).sendForSignature(requestId);
    }

    @Test
    @DisplayName("Should cancel signature request")
    void shouldCancelSignatureRequest() throws Exception {
        SignatureRequestResponse cancelledResponse = SignatureRequestResponse.builder()
                .id(requestId)
                .status(SignatureRequest.SignatureStatus.CANCELLED)
                .build();

        try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
            secCtx.when(SecurityContext::getCurrentEmployeeId).thenReturn(creatorId);

            when(eSignatureService.cancelSignatureRequest(eq(requestId), eq(creatorId), anyString()))
                    .thenReturn(cancelledResponse);

            mockMvc.perform(patch("/api/v1/esignature/requests/{id}/cancel", requestId)
                            .param("reason", "No longer needed"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CANCELLED"));

            verify(eSignatureService).cancelSignatureRequest(eq(requestId), eq(creatorId), eq("No longer needed"));
        }
    }

    @Test
    @DisplayName("Should get signature requests by status")
    void shouldGetRequestsByStatus() throws Exception {
        when(eSignatureService.getSignatureRequestsByStatus(SignatureRequest.SignatureStatus.PENDING))
                .thenReturn(List.of(signatureResponse));

        mockMvc.perform(get("/api/v1/esignature/requests/status/{status}", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(eSignatureService).getSignatureRequestsByStatus(SignatureRequest.SignatureStatus.PENDING);
    }

    @Test
    @DisplayName("Should delete signature request successfully")
    void shouldDeleteSignatureRequest() throws Exception {
        doNothing().when(eSignatureService).deleteSignatureRequest(requestId);

        mockMvc.perform(delete("/api/v1/esignature/requests/{id}", requestId))
                .andExpect(status().isNoContent());

        verify(eSignatureService).deleteSignatureRequest(requestId);
    }

    @Test
    @DisplayName("Should get external signature info by token")
    void shouldGetExternalSignatureInfo() throws Exception {
        ExternalSignatureInfoResponse infoResponse = new ExternalSignatureInfoResponse();

        when(eSignatureService.getExternalSignatureInfo("abc123token")).thenReturn(infoResponse);

        mockMvc.perform(get("/api/v1/esignature/external/{token}", "abc123token"))
                .andExpect(status().isOk());

        verify(eSignatureService).getExternalSignatureInfo("abc123token");
    }

    @Test
    @DisplayName("Should get requests by creator")
    void shouldGetRequestsByCreator() throws Exception {
        when(eSignatureService.getSignatureRequestsByCreator(creatorId))
                .thenReturn(List.of(signatureResponse));

        mockMvc.perform(get("/api/v1/esignature/requests/creator/{creatorId}", creatorId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(eSignatureService).getSignatureRequestsByCreator(creatorId);
    }

    @Test
    @DisplayName("Should get templates list")
    void shouldGetTemplates() throws Exception {
        SignatureRequestResponse templateResponse = SignatureRequestResponse.builder()
                .id(UUID.randomUUID())
                .isTemplate(true)
                .templateName("Standard Offer Template")
                .build();

        when(eSignatureService.getTemplates()).thenReturn(List.of(templateResponse));

        mockMvc.perform(get("/api/v1/esignature/requests/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(eSignatureService).getTemplates();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
