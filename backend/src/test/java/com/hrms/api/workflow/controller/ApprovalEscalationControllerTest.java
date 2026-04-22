package com.hrms.api.workflow.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.workflow.dto.EscalationConfigRequest;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.user.EscalationType;
import com.hrms.domain.workflow.ApprovalEscalationConfig;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.workflow.repository.ApprovalEscalationConfigRepository;
import com.hrms.infrastructure.workflow.repository.WorkflowDefinitionRepository;
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
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ApprovalEscalationController.class)
@ContextConfiguration(classes = {ApprovalEscalationController.class, GlobalExceptionHandler.class, ApprovalEscalationControllerTest.TestConfig.class})
@org.springframework.context.annotation.Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ApprovalEscalationController Integration Tests")
class ApprovalEscalationControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ApprovalEscalationConfigRepository escalationConfigRepository;
    @MockitoBean
    private WorkflowDefinitionRepository workflowDefinitionRepository;
    @MockitoBean
    private RoleRepository roleRepository;
    @MockitoBean
    private UserRepository userRepository;
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

    private UUID workflowId;
    private UUID tenantId;
    private UUID configId;
    private EscalationConfigRequest validRequest;

    @BeforeEach
    void setUp() {
        workflowId = UUID.randomUUID();
        tenantId = UUID.randomUUID();
        configId = UUID.randomUUID();

        validRequest = new EscalationConfigRequest();
        validRequest.setTimeoutHours(24);
        validRequest.setEscalationType(EscalationType.SKIP_LEVEL_MANAGER);
        validRequest.setMaxEscalations(3);
        validRequest.setNotifyOnEscalation(true);
        validRequest.setIsActive(true);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Get Escalation Config Tests")
    class GetConfigTests {

        @Test
        @DisplayName("Should get escalation config for workflow")
        void shouldGetConfigForWorkflow() throws Exception {
            ApprovalEscalationConfig config = new ApprovalEscalationConfig();
            config.setId(configId);
            config.setWorkflowDefinitionId(workflowId);
            config.setTenantId(tenantId);
            config.setTimeoutHours(24);
            config.setEscalationType(EscalationType.SKIP_LEVEL_MANAGER);
            config.setMaxEscalations(3);
            config.setNotifyOnEscalation(true);
            config.setIsActive(true);

            WorkflowDefinition wf = new WorkflowDefinition();
            wf.setId(workflowId);
            wf.setName("Leave Approval");

            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(escalationConfigRepository.findByWorkflowDefinitionIdAndTenantId(workflowId, tenantId))
                        .thenReturn(Optional.of(config));
                when(workflowDefinitionRepository.findByIdAndTenantId(workflowId, tenantId))
                        .thenReturn(Optional.of(wf));

                mockMvc.perform(get("/api/v1/escalation/workflows/{workflowId}/config", workflowId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.workflowDefinitionId").value(workflowId.toString()))
                        .andExpect(jsonPath("$.timeoutHours").value(24))
                        .andExpect(jsonPath("$.escalationType").value("SKIP_LEVEL_MANAGER"))
                        .andExpect(jsonPath("$.workflowName").value("Leave Approval"));
            }
        }

        @Test
        @DisplayName("Should return 404 when config not found")
        void shouldReturn404WhenConfigNotFound() throws Exception {
            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(escalationConfigRepository.findByWorkflowDefinitionIdAndTenantId(workflowId, tenantId))
                        .thenReturn(Optional.empty());

                mockMvc.perform(get("/api/v1/escalation/workflows/{workflowId}/config", workflowId))
                        .andExpect(status().isNotFound());
            }
        }
    }

    @Nested
    @DisplayName("Upsert Escalation Config Tests")
    class UpsertConfigTests {

        @Test
        @DisplayName("Should create new escalation config")
        void shouldCreateNewConfig() throws Exception {
            WorkflowDefinition wf = new WorkflowDefinition();
            wf.setId(workflowId);
            wf.setName("Expense Approval");

            ApprovalEscalationConfig savedConfig = new ApprovalEscalationConfig();
            savedConfig.setId(configId);
            savedConfig.setWorkflowDefinitionId(workflowId);
            savedConfig.setTenantId(tenantId);
            savedConfig.setTimeoutHours(24);
            savedConfig.setEscalationType(EscalationType.SKIP_LEVEL_MANAGER);
            savedConfig.setMaxEscalations(3);
            savedConfig.setNotifyOnEscalation(true);
            savedConfig.setIsActive(true);

            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(workflowDefinitionRepository.findByIdAndTenantId(workflowId, tenantId))
                        .thenReturn(Optional.of(wf));
                when(escalationConfigRepository.findByWorkflowDefinitionIdAndTenantId(workflowId, tenantId))
                        .thenReturn(Optional.empty());
                when(escalationConfigRepository.save(any(ApprovalEscalationConfig.class)))
                        .thenReturn(savedConfig);

                mockMvc.perform(put("/api/v1/escalation/workflows/{workflowId}/config", workflowId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(validRequest)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.timeoutHours").value(24))
                        .andExpect(jsonPath("$.maxEscalations").value(3));

                verify(escalationConfigRepository).save(any(ApprovalEscalationConfig.class));
            }
        }

        @Test
        @DisplayName("Should return 404 when workflow not found on upsert")
        void shouldReturn404WhenWorkflowNotFound() throws Exception {
            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(workflowDefinitionRepository.findByIdAndTenantId(workflowId, tenantId))
                        .thenReturn(Optional.empty());

                mockMvc.perform(put("/api/v1/escalation/workflows/{workflowId}/config", workflowId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(validRequest)))
                        .andExpect(status().isNotFound());
            }
        }

        @Test
        @DisplayName("Should return 400 for invalid timeout hours")
        void shouldReturn400ForInvalidTimeoutHours() throws Exception {
            EscalationConfigRequest invalidRequest = new EscalationConfigRequest();
            invalidRequest.setTimeoutHours(0);
            invalidRequest.setEscalationType(EscalationType.SKIP_LEVEL_MANAGER);

            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                mockMvc.perform(put("/api/v1/escalation/workflows/{workflowId}/config", workflowId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(invalidRequest)))
                        .andExpect(status().isBadRequest());
            }
        }
    }

    @Nested
    @DisplayName("Delete Escalation Config Tests")
    class DeleteConfigTests {

        @Test
        @DisplayName("Should delete escalation config successfully")
        void shouldDeleteConfig() throws Exception {
            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(escalationConfigRepository.deleteByWorkflowDefinitionIdAndTenantId(workflowId, tenantId))
                        .thenReturn(1);

                mockMvc.perform(delete("/api/v1/escalation/workflows/{workflowId}/config", workflowId))
                        .andExpect(status().isNoContent());

                verify(escalationConfigRepository).deleteByWorkflowDefinitionIdAndTenantId(workflowId, tenantId);
            }
        }

        @Test
        @DisplayName("Should return 404 when deleting non-existent config")
        void shouldReturn404WhenDeletingNonExistent() throws Exception {
            try (MockedStatic<SecurityContext> secCtx = mockStatic(SecurityContext.class)) {
                secCtx.when(SecurityContext::getCurrentTenantId).thenReturn(tenantId);

                when(escalationConfigRepository.deleteByWorkflowDefinitionIdAndTenantId(workflowId, tenantId))
                        .thenReturn(0);

                mockMvc.perform(delete("/api/v1/escalation/workflows/{workflowId}/config", workflowId))
                        .andExpect(status().isNotFound());
            }
        }
    }
}
