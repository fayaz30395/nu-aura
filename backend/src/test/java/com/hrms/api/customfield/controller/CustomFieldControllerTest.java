package com.hrms.api.customfield.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.customfield.dto.*;
import com.hrms.application.customfield.service.CustomFieldService;
import com.hrms.common.security.*;
import com.hrms.domain.customfield.CustomFieldDefinition.EntityType;
import com.hrms.domain.customfield.CustomFieldDefinition.FieldType;
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

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CustomFieldController.class)
@ContextConfiguration(classes = {CustomFieldController.class, CustomFieldControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("CustomFieldController Tests")
class CustomFieldControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private CustomFieldService customFieldService;
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

    private UUID definitionId;
    private UUID entityId;
    private CustomFieldDefinitionResponse definitionResponse;

    @BeforeEach
    void setUp() {
        definitionId = UUID.randomUUID();
        entityId = UUID.randomUUID();

        definitionResponse = CustomFieldDefinitionResponse.builder()
                .id(definitionId)
                .fieldCode("emp_shirt_size")
                .fieldName("Shirt Size")
                .entityType(EntityType.EMPLOYEE)
                .fieldType(FieldType.DROPDOWN)
                .isActive(true)
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
    @DisplayName("Should create custom field definition successfully")
    void shouldCreateFieldDefinition() throws Exception {
        CustomFieldDefinitionRequest request = CustomFieldDefinitionRequest.builder()
                .fieldCode("emp_shirt_size")
                .fieldName("Shirt Size")
                .entityType(EntityType.EMPLOYEE)
                .fieldType(FieldType.DROPDOWN)
                .options(List.of("S", "M", "L", "XL"))
                .build();

        when(customFieldService.createFieldDefinition(any(CustomFieldDefinitionRequest.class)))
                .thenReturn(definitionResponse);

        mockMvc.perform(post("/api/v1/custom-fields/definitions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fieldCode").value("emp_shirt_size"))
                .andExpect(jsonPath("$.fieldName").value("Shirt Size"));

        verify(customFieldService).createFieldDefinition(any(CustomFieldDefinitionRequest.class));
    }

    @Test
    @DisplayName("Should get field definition by ID")
    void shouldGetFieldDefinitionById() throws Exception {
        when(customFieldService.getFieldDefinition(definitionId)).thenReturn(definitionResponse);

        mockMvc.perform(get("/api/v1/custom-fields/definitions/{id}", definitionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(definitionId.toString()));

        verify(customFieldService).getFieldDefinition(definitionId);
    }

    @Test
    @DisplayName("Should get field definition by code")
    void shouldGetFieldDefinitionByCode() throws Exception {
        when(customFieldService.getFieldDefinitionByCode("emp_shirt_size"))
                .thenReturn(definitionResponse);

        mockMvc.perform(get("/api/v1/custom-fields/definitions/code/{fieldCode}", "emp_shirt_size"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fieldCode").value("emp_shirt_size"));
    }

    @Test
    @DisplayName("Should get all field definitions with pagination")
    void shouldGetAllFieldDefinitions() throws Exception {
        Page<CustomFieldDefinitionResponse> page = new PageImpl<>(
                List.of(definitionResponse), PageRequest.of(0, 20), 1);
        when(customFieldService.getAllFieldDefinitions(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/custom-fields/definitions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("Should search field definitions by query")
    void shouldSearchFieldDefinitions() throws Exception {
        Page<CustomFieldDefinitionResponse> page = new PageImpl<>(
                List.of(definitionResponse), PageRequest.of(0, 20), 1);
        when(customFieldService.searchFieldDefinitions(eq("shirt"), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/custom-fields/definitions/search")
                        .param("query", "shirt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));
    }

    @Test
    @DisplayName("Should deactivate field definition")
    void shouldDeactivateFieldDefinition() throws Exception {
        doNothing().when(customFieldService).deactivateFieldDefinition(definitionId);

        mockMvc.perform(post("/api/v1/custom-fields/definitions/{id}/deactivate", definitionId))
                .andExpect(status().isNoContent());

        verify(customFieldService).deactivateFieldDefinition(definitionId);
    }

    @Test
    @DisplayName("Should delete field definition")
    void shouldDeleteFieldDefinition() throws Exception {
        doNothing().when(customFieldService).deleteFieldDefinition(definitionId);

        mockMvc.perform(delete("/api/v1/custom-fields/definitions/{id}", definitionId))
                .andExpect(status().isNoContent());

        verify(customFieldService).deleteFieldDefinition(definitionId);
    }

    @Test
    @DisplayName("Should check if field code is available")
    void shouldCheckFieldCodeAvailability() throws Exception {
        when(customFieldService.isFieldCodeAvailable("new_field", null)).thenReturn(true);

        mockMvc.perform(get("/api/v1/custom-fields/definitions/check-code")
                        .param("fieldCode", "new_field"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(true));
    }

    @Test
    @DisplayName("Should get entity types enum values")
    void shouldGetEntityTypes() throws Exception {
        mockMvc.perform(get("/api/v1/custom-fields/entity-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    @Test
    @DisplayName("Should get field values for entity")
    void shouldGetFieldValuesForEntity() throws Exception {
        when(customFieldService.getFieldValues(EntityType.EMPLOYEE, entityId))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/custom-fields/values/{entityType}/{entityId}",
                        "EMPLOYEE", entityId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
