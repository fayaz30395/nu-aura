package com.hrms.api.selfservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.selfservice.dto.*;
import com.hrms.application.selfservice.service.SelfServiceService;
import com.hrms.common.security.*;
import com.hrms.domain.selfservice.DocumentRequest.DocumentType;
import com.hrms.domain.selfservice.ProfileUpdateRequest.UpdateCategory;
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

import java.time.LocalDate;
import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SelfServiceController.class)
@ContextConfiguration(classes = {SelfServiceController.class, SelfServiceControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("SelfServiceController Tests")
class SelfServiceControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private SelfServiceService selfServiceService;
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

    private UUID employeeId;
    private UUID requestId;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        requestId = UUID.randomUUID();
    }

    @Test
    @DisplayName("Should create profile update request successfully")
    void shouldCreateProfileUpdateRequest() throws Exception {
        ProfileUpdateRequestDto request = ProfileUpdateRequestDto.builder()
                .category(UpdateCategory.PERSONAL_INFO)
                .fieldName("phone")
                .requestedValue("+91-9876543210")
                .currentValue("+91-1234567890")
                .build();

        ProfileUpdateResponse response = ProfileUpdateResponse.builder()
                .id(requestId)
                .employeeId(employeeId)
                .category(UpdateCategory.PERSONAL_INFO)
                .fieldName("phone")
                .build();

        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            when(selfServiceService.createProfileUpdateRequest(eq(employeeId), any(ProfileUpdateRequestDto.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/self-service/profile-updates")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));
        }
    }

    @Test
    @DisplayName("Should get profile update request by ID")
    void shouldGetProfileUpdateRequestById() throws Exception {
        ProfileUpdateResponse response = ProfileUpdateResponse.builder()
                .id(requestId)
                .employeeId(employeeId)
                .build();

        when(selfServiceService.getProfileUpdateRequestById(requestId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/self-service/profile-updates/{requestId}", requestId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(requestId.toString()));
    }

    @Test
    @DisplayName("Should get pending profile update requests with pagination")
    void shouldGetPendingProfileUpdateRequests() throws Exception {
        Page<ProfileUpdateResponse> page = new PageImpl<>(
                Collections.emptyList(), PageRequest.of(0, 20), 0);
        when(selfServiceService.getPendingProfileUpdateRequests(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/self-service/profile-updates/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    @DisplayName("Should cancel profile update request")
    void shouldCancelProfileUpdateRequest() throws Exception {
        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            doNothing().when(selfServiceService).cancelProfileUpdateRequest(requestId, employeeId);

            mockMvc.perform(post("/api/v1/self-service/profile-updates/{requestId}/cancel", requestId))
                    .andExpect(status().isNoContent());

            verify(selfServiceService).cancelProfileUpdateRequest(requestId, employeeId);
        }
    }

    @Test
    @DisplayName("Should create document request successfully")
    void shouldCreateDocumentRequest() throws Exception {
        DocumentRequestDto request = DocumentRequestDto.builder()
                .documentType(DocumentType.EMPLOYMENT_CERTIFICATE)
                .purpose("Visa application")
                .requiredByDate(LocalDate.now().plusDays(14))
                .build();

        DocumentRequestResponse response = DocumentRequestResponse.builder()
                .id(requestId)
                .employeeId(employeeId)
                .documentType(DocumentType.EMPLOYMENT_CERTIFICATE)
                .build();

        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            when(selfServiceService.createDocumentRequest(eq(employeeId), any(DocumentRequestDto.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/self-service/document-requests")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.documentType").value("EMPLOYMENT_CERTIFICATE"));
        }
    }

    @Test
    @DisplayName("Should get urgent document requests")
    void shouldGetUrgentDocumentRequests() throws Exception {
        when(selfServiceService.getUrgentDocumentRequests()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/self-service/document-requests/urgent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @DisplayName("Should get dashboard for current employee")
    void shouldGetDashboard() throws Exception {
        SelfServiceDashboardResponse dashboard = new SelfServiceDashboardResponse();

        try (MockedStatic<SecurityContext> mocked = mockStatic(SecurityContext.class)) {
            mocked.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
            when(selfServiceService.getDashboard(employeeId)).thenReturn(dashboard);

            mockMvc.perform(get("/api/v1/self-service/dashboard"))
                    .andExpect(status().isOk());

            verify(selfServiceService).getDashboard(employeeId);
        }
    }

    @Test
    @DisplayName("Should get update categories enum values")
    void shouldGetUpdateCategories() throws Exception {
        mockMvc.perform(get("/api/v1/self-service/update-categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    @Test
    @DisplayName("Should get document types enum values")
    void shouldGetDocumentTypes() throws Exception {
        mockMvc.perform(get("/api/v1/self-service/document-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
