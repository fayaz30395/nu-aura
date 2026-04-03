package com.hrms.application.contract.service;

import com.hrms.api.contract.dto.ContractTemplateDto;
import com.hrms.api.contract.dto.CreateContractTemplateRequest;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.contract.ContractTemplate;
import com.hrms.domain.contract.ContractType;
import com.hrms.infrastructure.contract.repository.ContractTemplateRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ContractTemplateService.
 * Covers template CRUD, search, active toggle, and tenant isolation.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ContractTemplateService Tests")
class ContractTemplateServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID TEMPLATE_ID = UUID.randomUUID();

    @Mock
    private ContractTemplateRepository templateRepository;

    @InjectMocks
    private ContractTemplateService templateService;

    @Captor
    private ArgumentCaptor<ContractTemplate> templateCaptor;

    private MockedStatic<SecurityContext> securityContextMock;
    private MockedStatic<TenantContext> tenantContextMock;

    @BeforeEach
    void setUp() {
        securityContextMock = mockStatic(SecurityContext.class);
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(TENANT_ID);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(USER_ID);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        securityContextMock.close();
        tenantContextMock.close();
    }

    private ContractTemplate buildTemplate(String name, ContractType type) {
        ContractTemplate template = ContractTemplate.builder()
                .name(name)
                .type(type)
                .content(Map.of("default", "clause"))
                .isActive(true)
                .build();
        template.setId(TEMPLATE_ID);
        template.setTenantId(TENANT_ID);
        return template;
    }

    @Nested
    @DisplayName("createTemplate")
    class CreateTemplate {

        @Test
        @DisplayName("Should create template with all fields")
        void shouldCreateTemplateWithAllFields() {
            // Given
            CreateContractTemplateRequest request = new CreateContractTemplateRequest();
            request.setName("Standard Employment");
            request.setType(ContractType.EMPLOYMENT);
            request.setContent(Map.of("clause1", "Non-compete", "clause2", "Termination"));

            ContractTemplate savedTemplate = ContractTemplate.builder()
                    .name("Standard Employment")
                    .type(ContractType.EMPLOYMENT)
                    .content(request.getContent())
                    .isActive(true)
                    .build();
            savedTemplate.setId(TEMPLATE_ID);
            savedTemplate.setTenantId(TENANT_ID);

            when(templateRepository.save(any(ContractTemplate.class))).thenReturn(savedTemplate);

            // When
            ContractTemplateDto result = templateService.createTemplate(request);

            // Then
            verify(templateRepository).save(templateCaptor.capture());
            ContractTemplate captured = templateCaptor.getValue();

            assertThat(captured.getTenantId()).isEqualTo(TENANT_ID);
            assertThat(captured.getName()).isEqualTo("Standard Employment");
            assertThat(captured.getType()).isEqualTo(ContractType.EMPLOYMENT);
            assertThat(captured.getIsActive()).isTrue();
            assertThat(captured.getCreatedBy()).isEqualTo(USER_ID);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Standard Employment");
        }
    }

    @Nested
    @DisplayName("getTemplateById")
    class GetTemplateById {

        @Test
        @DisplayName("Should return template when found")
        void shouldReturnTemplateWhenFound() {
            // Given
            ContractTemplate template = buildTemplate("NDA Template", ContractType.NDA);

            when(templateRepository.findByIdAndTenantId(TEMPLATE_ID, TENANT_ID))
                    .thenReturn(Optional.of(template));

            // When
            ContractTemplateDto result = templateService.getTemplateById(TEMPLATE_ID);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("NDA Template");
            assertThat(result.getType()).isEqualTo(ContractType.NDA);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when template not found")
        void shouldThrowWhenTemplateNotFound() {
            // Given
            when(templateRepository.findByIdAndTenantId(TEMPLATE_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> templateService.getTemplateById(TEMPLATE_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Template not found");
        }
    }

    @Nested
    @DisplayName("getAllTemplates")
    class GetAllTemplates {

        @Test
        @DisplayName("Should return paginated templates for tenant")
        void shouldReturnPaginatedTemplates() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            ContractTemplate template = buildTemplate("Test Template", ContractType.EMPLOYMENT);
            Page<ContractTemplate> page = new PageImpl<>(List.of(template));

            when(templateRepository.findByTenantId(TENANT_ID, pageable)).thenReturn(page);

            // When
            Page<ContractTemplateDto> result = templateService.getAllTemplates(pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getName()).isEqualTo("Test Template");
        }
    }

    @Nested
    @DisplayName("getActiveTemplates")
    class GetActiveTemplates {

        @Test
        @DisplayName("Should return only active templates")
        void shouldReturnOnlyActiveTemplates() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            ContractTemplate template = buildTemplate("Active Template", ContractType.VENDOR);
            template.setIsActive(true);
            Page<ContractTemplate> page = new PageImpl<>(List.of(template));

            when(templateRepository.findByTenantIdAndIsActive(TENANT_ID, true, pageable)).thenReturn(page);

            // When
            Page<ContractTemplateDto> result = templateService.getActiveTemplates(pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getIsActive()).isTrue();
        }
    }

    @Nested
    @DisplayName("getTemplatesByType")
    class GetTemplatesByType {

        @Test
        @DisplayName("Should return templates filtered by type")
        void shouldReturnTemplatesByType() {
            // Given
            ContractTemplate template = buildTemplate("NDA", ContractType.NDA);
            when(templateRepository.findByTenantIdAndType(TENANT_ID, ContractType.NDA))
                    .thenReturn(List.of(template));

            // When
            List<ContractTemplateDto> result = templateService.getTemplatesByType(ContractType.NDA);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getType()).isEqualTo(ContractType.NDA);
        }
    }

    @Nested
    @DisplayName("updateTemplate")
    class UpdateTemplate {

        @Test
        @DisplayName("Should update template fields")
        void shouldUpdateTemplateFields() {
            // Given
            ContractTemplate existing = buildTemplate("Old Name", ContractType.EMPLOYMENT);
            when(templateRepository.findByIdAndTenantId(TEMPLATE_ID, TENANT_ID))
                    .thenReturn(Optional.of(existing));
            when(templateRepository.save(any(ContractTemplate.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            CreateContractTemplateRequest request = new CreateContractTemplateRequest();
            request.setName("New Name");
            request.setType(ContractType.NDA);
            request.setContent(Map.of("updated", "content"));

            // When
            ContractTemplateDto result = templateService.updateTemplate(TEMPLATE_ID, request);

            // Then
            verify(templateRepository).save(templateCaptor.capture());
            ContractTemplate updated = templateCaptor.getValue();
            assertThat(updated.getName()).isEqualTo("New Name");
            assertThat(updated.getType()).isEqualTo(ContractType.NDA);
        }

        @Test
        @DisplayName("Should throw when template not found")
        void shouldThrowWhenTemplateNotFound() {
            // Given
            when(templateRepository.findByIdAndTenantId(TEMPLATE_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            CreateContractTemplateRequest request = new CreateContractTemplateRequest();
            request.setName("Updated");
            request.setType(ContractType.NDA);
            request.setContent(Map.of());

            // When/Then
            assertThatThrownBy(() -> templateService.updateTemplate(TEMPLATE_ID, request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("deleteTemplate")
    class DeleteTemplate {

        @Test
        @DisplayName("Should delete existing template")
        void shouldDeleteExistingTemplate() {
            // Given
            ContractTemplate template = buildTemplate("To Delete", ContractType.EMPLOYMENT);
            when(templateRepository.findByIdAndTenantId(TEMPLATE_ID, TENANT_ID))
                    .thenReturn(Optional.of(template));

            // When
            templateService.deleteTemplate(TEMPLATE_ID);

            // Then
            verify(templateRepository).delete(template);
        }

        @Test
        @DisplayName("Should throw when template not found")
        void shouldThrowWhenDeletingNonexistentTemplate() {
            // Given
            when(templateRepository.findByIdAndTenantId(TEMPLATE_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> templateService.deleteTemplate(TEMPLATE_ID))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("toggleActive")
    class ToggleActive {

        @Test
        @DisplayName("Should toggle active from true to false")
        void shouldToggleActiveFromTrueToFalse() {
            // Given
            ContractTemplate template = buildTemplate("Toggle Me", ContractType.EMPLOYMENT);
            template.setIsActive(true);
            when(templateRepository.findByIdAndTenantId(TEMPLATE_ID, TENANT_ID))
                    .thenReturn(Optional.of(template));
            when(templateRepository.save(any(ContractTemplate.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            ContractTemplateDto result = templateService.toggleActive(TEMPLATE_ID);

            // Then
            verify(templateRepository).save(templateCaptor.capture());
            assertThat(templateCaptor.getValue().getIsActive()).isFalse();
        }

        @Test
        @DisplayName("Should toggle active from false to true")
        void shouldToggleActiveFromFalseToTrue() {
            // Given
            ContractTemplate template = buildTemplate("Toggle Me", ContractType.EMPLOYMENT);
            template.setIsActive(false);
            when(templateRepository.findByIdAndTenantId(TEMPLATE_ID, TENANT_ID))
                    .thenReturn(Optional.of(template));
            when(templateRepository.save(any(ContractTemplate.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            ContractTemplateDto result = templateService.toggleActive(TEMPLATE_ID);

            // Then
            verify(templateRepository).save(templateCaptor.capture());
            assertThat(templateCaptor.getValue().getIsActive()).isTrue();
        }
    }

    // ===================== Helper Methods =====================

    @Nested
    @DisplayName("searchTemplates")
    class SearchTemplates {

        @Test
        @DisplayName("Should search templates by query string")
        void shouldSearchTemplatesByQuery() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            ContractTemplate template = buildTemplate("Employment Standard", ContractType.EMPLOYMENT);
            Page<ContractTemplate> page = new PageImpl<>(List.of(template));

            when(templateRepository.searchActiveTemplates(TENANT_ID, "Employment", pageable))
                    .thenReturn(page);

            // When
            Page<ContractTemplateDto> result = templateService.searchTemplates("Employment", pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getName()).isEqualTo("Employment Standard");
        }
    }
}
