package com.hrms.api.platform;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.auth.dto.AuthResponse;
import com.hrms.api.platform.dto.TenantRegistrationRequest;
import com.hrms.application.platform.service.TenantProvisioningService;
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

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TenantController.class)
@ContextConfiguration(classes = {TenantController.class, TenantControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("TenantController Integration Tests")
class TenantControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private TenantProvisioningService tenantProvisioningService;
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

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Tenant Registration Tests")
    class TenantRegistrationTests {

        @Test
        @DisplayName("Should register tenant successfully and return 201")
        void shouldRegisterTenantSuccessfullyAndReturn201() throws Exception {
            TenantRegistrationRequest request = new TenantRegistrationRequest();
            request.setCompanyName("Acme Corporation");
            request.setCompanyCode("acme-corp");
            request.setAdminFirstName("John");
            request.setAdminLastName("Doe");
            request.setAdminEmail("john@acme.com");
            request.setPassword("SecurePass123!");
            request.setTimezone("Asia/Kolkata");

            AuthResponse authResponse = AuthResponse.builder()
                    .accessToken("jwt-token-abc")
                    .refreshToken("refresh-token-xyz")
                    .tokenType("Bearer")
                    .expiresIn(3600L)
                    .userId(UUID.randomUUID())
                    .tenantId(UUID.randomUUID())
                    .email("john@acme.com")
                    .fullName("John Doe")
                    .roles(List.of("TENANT_ADMIN"))
                    .build();

            when(tenantProvisioningService.register(any(TenantRegistrationRequest.class)))
                    .thenReturn(authResponse);

            mockMvc.perform(post("/api/v1/tenants/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.accessToken").value("jwt-token-abc"))
                    .andExpect(jsonPath("$.email").value("john@acme.com"))
                    .andExpect(jsonPath("$.fullName").value("John Doe"))
                    .andExpect(jsonPath("$.roles", hasSize(1)));

            verify(tenantProvisioningService).register(any(TenantRegistrationRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when company name is missing")
        void shouldReturn400WhenCompanyNameIsMissing() throws Exception {
            TenantRegistrationRequest request = new TenantRegistrationRequest();
            request.setCompanyCode("acme-corp");
            request.setAdminFirstName("John");
            request.setAdminLastName("Doe");
            request.setAdminEmail("john@acme.com");
            request.setPassword("SecurePass123!");

            mockMvc.perform(post("/api/v1/tenants/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when company code has invalid format")
        void shouldReturn400WhenCompanyCodeHasInvalidFormat() throws Exception {
            TenantRegistrationRequest request = new TenantRegistrationRequest();
            request.setCompanyName("Acme Corporation");
            request.setCompanyCode("Acme Corp!!"); // Invalid: uppercase and special chars
            request.setAdminFirstName("John");
            request.setAdminLastName("Doe");
            request.setAdminEmail("john@acme.com");
            request.setPassword("SecurePass123!");

            mockMvc.perform(post("/api/v1/tenants/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when admin email is invalid")
        void shouldReturn400WhenAdminEmailIsInvalid() throws Exception {
            TenantRegistrationRequest request = new TenantRegistrationRequest();
            request.setCompanyName("Acme Corporation");
            request.setCompanyCode("acme-corp");
            request.setAdminFirstName("John");
            request.setAdminLastName("Doe");
            request.setAdminEmail("not-an-email");
            request.setPassword("SecurePass123!");

            mockMvc.perform(post("/api/v1/tenants/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when password is too short")
        void shouldReturn400WhenPasswordIsTooShort() throws Exception {
            TenantRegistrationRequest request = new TenantRegistrationRequest();
            request.setCompanyName("Acme Corporation");
            request.setCompanyCode("acme-corp");
            request.setAdminFirstName("John");
            request.setAdminLastName("Doe");
            request.setAdminEmail("john@acme.com");
            request.setPassword("short"); // Less than 8 chars

            mockMvc.perform(post("/api/v1/tenants/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when all required fields are missing")
        void shouldReturn400WhenAllRequiredFieldsMissing() throws Exception {
            TenantRegistrationRequest request = new TenantRegistrationRequest();

            mockMvc.perform(post("/api/v1/tenants/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should register tenant with optional fields")
        void shouldRegisterTenantWithOptionalFields() throws Exception {
            TenantRegistrationRequest request = new TenantRegistrationRequest();
            request.setCompanyName("NuLogic Tech");
            request.setCompanyCode("nulogic-tech");
            request.setAdminFirstName("Alice");
            request.setAdminLastName("Johnson");
            request.setAdminEmail("alice@nulogic.com");
            request.setPassword("StrongPassword99!");
            request.setContactPhone("+919876543210");
            request.setTimezone("Asia/Kolkata");

            AuthResponse authResponse = AuthResponse.builder()
                    .accessToken("jwt-token-def")
                    .refreshToken("refresh-token-ghi")
                    .userId(UUID.randomUUID())
                    .tenantId(UUID.randomUUID())
                    .email("alice@nulogic.com")
                    .fullName("Alice Johnson")
                    .roles(List.of("TENANT_ADMIN"))
                    .build();

            when(tenantProvisioningService.register(any(TenantRegistrationRequest.class)))
                    .thenReturn(authResponse);

            mockMvc.perform(post("/api/v1/tenants/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.email").value("alice@nulogic.com"));
        }

        @Test
        @DisplayName("Should handle service exception during registration")
        void shouldHandleServiceExceptionDuringRegistration() throws Exception {
            TenantRegistrationRequest request = new TenantRegistrationRequest();
            request.setCompanyName("Test Company");
            request.setCompanyCode("test-company");
            request.setAdminFirstName("Test");
            request.setAdminLastName("Admin");
            request.setAdminEmail("test@company.com");
            request.setPassword("TestPassword123!");

            when(tenantProvisioningService.register(any(TenantRegistrationRequest.class)))
                    .thenThrow(new RuntimeException("Company code already exists"));

            mockMvc.perform(post("/api/v1/tenants/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isInternalServerError());
        }
    }
}
