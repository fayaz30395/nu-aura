package com.hrms.api.contract.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.contract.dto.ContractTemplateDto;
import com.hrms.api.contract.dto.CreateContractTemplateRequest;
import com.hrms.application.contract.service.ContractTemplateService;
import com.hrms.common.security.*;
import com.hrms.domain.contract.ContractType;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContractTemplateController.class)
@ContextConfiguration(classes = {ContractTemplateController.class, ContractTemplateControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ContractTemplateController Integration Tests")
class ContractTemplateControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private ContractTemplateService templateService;
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

    private UUID templateId;
    private ContractTemplateDto templateDto;

    @BeforeEach
    void setUp() {
        templateId = UUID.randomUUID();

        templateDto = ContractTemplateDto.builder()
                .id(templateId)
                .name("Standard Employment Contract")
                .type(ContractType.EMPLOYMENT)
                .content(Map.of("body", "Contract content here"))
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should create contract template successfully")
    void shouldCreateTemplateSuccessfully() throws Exception {
        CreateContractTemplateRequest request = new CreateContractTemplateRequest();
        request.setName("Standard Employment Contract");
        request.setType(ContractType.EMPLOYMENT);
        request.setContent(Map.of("body", "Contract content here"));

        when(templateService.createTemplate(any(CreateContractTemplateRequest.class)))
                .thenReturn(templateDto);

        mockMvc.perform(post("/api/v1/contracts/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("Standard Employment Contract"))
                .andExpect(jsonPath("$.type").value("EMPLOYMENT"));

        verify(templateService).createTemplate(any(CreateContractTemplateRequest.class));
    }

    @Test
    @DisplayName("Should get template by ID")
    void shouldGetTemplateById() throws Exception {
        when(templateService.getTemplateById(templateId)).thenReturn(templateDto);

        mockMvc.perform(get("/api/v1/contracts/templates/{templateId}", templateId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(templateId.toString()))
                .andExpect(jsonPath("$.name").value("Standard Employment Contract"));

        verify(templateService).getTemplateById(templateId);
    }

    @Test
    @DisplayName("Should get all templates with pagination")
    void shouldGetAllTemplatesWithPagination() throws Exception {
        Page<ContractTemplateDto> page = new PageImpl<>(
                Collections.singletonList(templateDto),
                PageRequest.of(0, 20),
                1
        );

        when(templateService.getAllTemplates(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/contracts/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(1));

        verify(templateService).getAllTemplates(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get active templates")
    void shouldGetActiveTemplates() throws Exception {
        Page<ContractTemplateDto> page = new PageImpl<>(
                Collections.singletonList(templateDto),
                PageRequest.of(0, 20),
                1
        );

        when(templateService.getActiveTemplates(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/contracts/templates/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(templateService).getActiveTemplates(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get templates by type")
    void shouldGetTemplatesByType() throws Exception {
        when(templateService.getTemplatesByType(ContractType.EMPLOYMENT))
                .thenReturn(List.of(templateDto));

        mockMvc.perform(get("/api/v1/contracts/templates/type/{type}", "EMPLOYMENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].type").value("EMPLOYMENT"));

        verify(templateService).getTemplatesByType(ContractType.EMPLOYMENT);
    }

    @Test
    @DisplayName("Should search templates")
    void shouldSearchTemplates() throws Exception {
        Page<ContractTemplateDto> page = new PageImpl<>(
                Collections.singletonList(templateDto),
                PageRequest.of(0, 20),
                1
        );

        when(templateService.searchTemplates(eq("Employment"), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/contracts/templates/search")
                        .param("search", "Employment"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        verify(templateService).searchTemplates(eq("Employment"), any(Pageable.class));
    }

    @Test
    @DisplayName("Should update template successfully")
    void shouldUpdateTemplateSuccessfully() throws Exception {
        CreateContractTemplateRequest request = new CreateContractTemplateRequest();
        request.setName("Updated Employment Contract");
        request.setType(ContractType.EMPLOYMENT);
        request.setContent(Map.of("body", "Updated content"));

        ContractTemplateDto updated = ContractTemplateDto.builder()
                .id(templateId)
                .name("Updated Employment Contract")
                .type(ContractType.EMPLOYMENT)
                .build();

        when(templateService.updateTemplate(eq(templateId), any(CreateContractTemplateRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/contracts/templates/{templateId}", templateId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Employment Contract"));

        verify(templateService).updateTemplate(eq(templateId), any(CreateContractTemplateRequest.class));
    }

    @Test
    @DisplayName("Should delete template successfully")
    void shouldDeleteTemplateSuccessfully() throws Exception {
        doNothing().when(templateService).deleteTemplate(templateId);

        mockMvc.perform(delete("/api/v1/contracts/templates/{templateId}", templateId))
                .andExpect(status().isNoContent());

        verify(templateService).deleteTemplate(templateId);
    }

    @Test
    @DisplayName("Should toggle template active status")
    void shouldToggleActiveStatus() throws Exception {
        ContractTemplateDto toggled = ContractTemplateDto.builder()
                .id(templateId)
                .name("Standard Employment Contract")
                .isActive(false)
                .build();

        when(templateService.toggleActive(templateId)).thenReturn(toggled);

        mockMvc.perform(patch("/api/v1/contracts/templates/{templateId}/toggle-active", templateId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));

        verify(templateService).toggleActive(templateId);
    }

    @Test
    @DisplayName("Should return 400 for invalid create request")
    void shouldReturn400ForInvalidCreateRequest() throws Exception {
        CreateContractTemplateRequest request = new CreateContractTemplateRequest();
        // Missing required fields: name, type, content

        mockMvc.perform(post("/api/v1/contracts/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }
}
