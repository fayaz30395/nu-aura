package com.hrms.api.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.auth.dto.SamlConfigRequest;
import com.hrms.api.auth.dto.SamlConfigResponse;
import com.hrms.api.auth.dto.SamlTestConnectionResponse;
import com.hrms.application.auth.service.SamlConfigurationService;
import com.hrms.common.security.*;
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
import org.springframework.data.domain.AuditorAware;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SamlConfigController.class)
@ContextConfiguration(classes = {SamlConfigController.class, SamlConfigControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("SamlConfigController Tests")
class SamlConfigControllerTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID CONFIG_ID = UUID.randomUUID();
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private SamlConfigurationService samlConfigService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ScopeContextService scopeContextService;
    @MockitoBean
    private EmployeeRepository employeeRepository;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);

        securityContextMock = mockStatic(SecurityContext.class);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(USER_ID);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    private SamlConfigResponse buildMockResponse() {
        return SamlConfigResponse.builder()
                .id(CONFIG_ID)
                .tenantId(TENANT_ID)
                .name("Okta Production")
                .entityId("http://www.okta.com/exk123abc")
                .ssoUrl("https://dev-123.okta.com/app/sso/saml")
                .sloUrl(null)
                .hasCertificate(true)
                .certificateFingerprint("AB:CD:EF:12:34")
                .metadataUrl("https://dev-123.okta.com/app/metadata")
                .isActive(true)
                .autoProvisionUsers(false)
                .defaultRoleId(null)
                .defaultRoleName(null)
                .attributeMapping(null)
                .spEntityId(null)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private SamlConfigRequest buildMockRequest() {
        return SamlConfigRequest.builder()
                .name("Okta Production")
                .entityId("http://www.okta.com/exk123abc")
                .ssoUrl("https://dev-123.okta.com/app/sso/saml")
                .isActive(false)
                .autoProvisionUsers(false)
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/auth/saml/config returns SAML config for tenant")
    void getSamlConfig_ReturnsConfig() throws Exception {
        SamlConfigResponse response = buildMockResponse();
        when(samlConfigService.getSamlConfig(TENANT_ID)).thenReturn(response);

        mockMvc.perform(get("/api/v1/auth/saml/config")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Okta Production"))
                .andExpect(jsonPath("$.entityId").value("http://www.okta.com/exk123abc"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    // ==================== GET /config ====================

    @Test
    @DisplayName("POST /api/v1/auth/saml/config creates new SAML config")
    void createSamlConfig_ReturnsCreated() throws Exception {
        SamlConfigRequest request = buildMockRequest();
        SamlConfigResponse response = buildMockResponse();
        when(samlConfigService.configureSamlProvider(eq(TENANT_ID), any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/auth/saml/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Okta Production"));
    }

    // ==================== POST /config ====================

    @Test
    @DisplayName("POST /api/v1/auth/saml/config validates required fields")
    void createSamlConfig_ValidationError() throws Exception {
        SamlConfigRequest invalidRequest = SamlConfigRequest.builder()
                .name("")
                .entityId("")
                .ssoUrl("")
                .build();

        mockMvc.perform(post("/api/v1/auth/saml/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/v1/auth/saml/config updates SAML config")
    void updateSamlConfig_ReturnsUpdated() throws Exception {
        SamlConfigRequest request = buildMockRequest();
        SamlConfigResponse response = buildMockResponse();
        when(samlConfigService.updateSamlConfig(eq(TENANT_ID), any())).thenReturn(response);

        mockMvc.perform(put("/api/v1/auth/saml/config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Okta Production"));
    }

    // ==================== PUT /config ====================

    @Test
    @DisplayName("DELETE /api/v1/auth/saml/config soft-deletes config")
    void deleteSamlConfig_ReturnsNoContent() throws Exception {
        doNothing().when(samlConfigService).deleteSamlConfig(TENANT_ID);

        mockMvc.perform(delete("/api/v1/auth/saml/config")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(samlConfigService).deleteSamlConfig(TENANT_ID);
    }

    // ==================== DELETE /config ====================

    @Test
    @DisplayName("POST /api/v1/auth/saml/test returns connection test results")
    void testConnection_ReturnsResults() throws Exception {
        SamlTestConnectionResponse testResponse = SamlTestConnectionResponse.builder()
                .success(true)
                .message("Connection test successful")
                .idpEntityId("http://www.okta.com/exk123abc")
                .ssoUrl("https://dev-123.okta.com/app/sso/saml")
                .metadataReachable(true)
                .certificateValid(true)
                .certificateExpiry("2027-12-31T00:00:00")
                .build();

        when(samlConfigService.testConnection(TENANT_ID)).thenReturn(testResponse);

        mockMvc.perform(post("/api/v1/auth/saml/test")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.certificateValid").value(true))
                .andExpect(jsonPath("$.metadataReachable").value(true));
    }

    // ==================== POST /test ====================

    @Test
    @DisplayName("GET /api/v1/auth/saml/metadata returns SP metadata XML")
    void getMetadata_ReturnsXml() throws Exception {
        String metadataXml = "<md:EntityDescriptor>...</md:EntityDescriptor>";
        when(samlConfigService.generateServiceProviderMetadata(TENANT_ID)).thenReturn(metadataXml);

        mockMvc.perform(get("/api/v1/auth/saml/metadata")
                        .accept(MediaType.APPLICATION_XML))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_XML))
                .andExpect(content().string(metadataXml));
    }

    // ==================== GET /metadata ====================

    @Test
    @DisplayName("GET /api/v1/auth/saml/providers returns all providers")
    void getAllProviders_ReturnsList() throws Exception {
        List<SamlConfigResponse> providers = List.of(buildMockResponse());
        when(samlConfigService.getAllProviders()).thenReturn(providers);

        mockMvc.perform(get("/api/v1/auth/saml/providers")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Okta Production"));
    }

    // ==================== GET /providers ====================

    @Configuration
    static class TestConfig {
        @Bean
        public AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
