package com.hrms.api.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.user.dto.*;
import com.hrms.application.user.service.ImplicitRoleEngine;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.user.ImplicitRoleCondition;
import com.hrms.domain.user.ImplicitRoleRule;
import com.hrms.domain.user.ImplicitUserRole;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.RoleScope;
import com.hrms.common.security.Permission;
import com.hrms.infrastructure.user.repository.ImplicitRoleRuleRepository;
import com.hrms.infrastructure.user.repository.ImplicitUserRoleRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Method;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for ImplicitRoleRuleController.
 * Tests CRUD for implicit role rules, bulk operations, recompute, and @RequiresPermission annotations.
 * <p>
 * NOTE: This controller directly injects repositories (not a service layer),
 * so we mock the repositories with @MockitoBean.
 */
@WebMvcTest(ImplicitRoleRuleController.class)
@ContextConfiguration(classes = {ImplicitRoleRuleController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("ImplicitRoleRuleController Unit Tests")
class ImplicitRoleRuleControllerTest {

    private static final String BASE_URL = "/api/v1/implicit-role-rules";
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();
    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID RULE_ID = UUID.randomUUID();
    private static final UUID ROLE_ID = UUID.randomUUID();

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @MockitoBean
    private ImplicitRoleRuleRepository ruleRepository;

    @MockitoBean
    private ImplicitUserRoleRepository implicitUserRoleRepository;

    @MockitoBean
    private RoleRepository roleRepository;

    @MockitoBean
    private ImplicitRoleEngine implicitRoleEngine;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private ImplicitRoleRule sampleRule;
    private Role sampleRole;

    @BeforeEach
    void setUp() {
        Map<String, RoleScope> permissions = Map.of(
                Permission.ROLE_MANAGE, RoleScope.ALL
        );
        SecurityContext.setCurrentUser(USER_ID, EMPLOYEE_ID, Set.of("ADMIN"), permissions);
        TenantContext.setCurrentTenant(TENANT_ID);

        sampleRole = new Role();
        sampleRole.setId(ROLE_ID);
        sampleRole.setName("Reporting Manager");
        sampleRole.setCode("REPORTING_MANAGER");

        sampleRule = new ImplicitRoleRule();
        sampleRule.setId(RULE_ID);
        sampleRule.setTenantId(TENANT_ID);
        sampleRule.setRuleName("Reporting Managers get Manager Role");
        sampleRule.setDescription("Assign manager role to users with direct reports");
        sampleRule.setConditionType(ImplicitRoleCondition.IS_REPORTING_MANAGER);
        sampleRule.setTargetRoleId(ROLE_ID);
        sampleRule.setScope(RoleScope.TEAM);
        sampleRule.setPriority(1);
        sampleRule.setIsActive(true);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    // Helper — stub the mapToResponse calls needed by most endpoints
    private void stubRuleMapping() {
        when(roleRepository.findById(ROLE_ID)).thenReturn(Optional.of(sampleRole));
        when(implicitUserRoleRepository.countAffectedUsers(eq(RULE_ID), eq(TENANT_ID))).thenReturn(3L);
    }

    // ==================== @RequiresPermission Annotation Tests ====================

    @Nested
    @DisplayName("Permission Annotation Verification — All endpoints require ROLE_MANAGE")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("listRules should require ROLE_MANAGE permission")
        void listRules_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = ImplicitRoleRuleController.class.getMethod("listRules",
                    Boolean.class, int.class, int.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("getRuleById should require ROLE_MANAGE permission")
        void getRuleById_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = ImplicitRoleRuleController.class.getMethod("getRuleById", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("createRule should require ROLE_MANAGE permission")
        void createRule_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = ImplicitRoleRuleController.class.getMethod("createRule",
                    ImplicitRoleRuleRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("updateRule should require ROLE_MANAGE permission")
        void updateRule_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = ImplicitRoleRuleController.class.getMethod("updateRule",
                    UUID.class, ImplicitRoleRuleRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("deleteRule should require ROLE_MANAGE permission")
        void deleteRule_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = ImplicitRoleRuleController.class.getMethod("deleteRule", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("recomputeAll should require ROLE_MANAGE permission")
        void recomputeAll_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = ImplicitRoleRuleController.class.getMethod("recomputeAll");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("bulkActivate should require ROLE_MANAGE permission")
        void bulkActivate_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = ImplicitRoleRuleController.class.getMethod("bulkActivate",
                    BulkRuleIdsRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }

        @Test
        @DisplayName("bulkDeactivate should require ROLE_MANAGE permission")
        void bulkDeactivate_shouldRequireRoleManagePermission() throws NoSuchMethodException {
            Method method = ImplicitRoleRuleController.class.getMethod("bulkDeactivate",
                    BulkRuleIdsRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);

            assertThat(annotation).isNotNull();
            assertThat(annotation.value()[0]).contains(Permission.ROLE_MANAGE);
        }
    }

    // ==================== GET /api/v1/implicit-role-rules ====================

    @Nested
    @DisplayName("GET / — List Rules")
    class ListRulesTests {

        @Test
        @DisplayName("Should return paginated rules with HTTP 200")
        void listRules_returnsPaginatedRules() throws Exception {
            Page<ImplicitRoleRule> page = new PageImpl<>(List.of(sampleRule), PageRequest.of(0, 20), 1);
            when(ruleRepository.findByTenantId(eq(TENANT_ID), any(Pageable.class))).thenReturn(page);
            stubRuleMapping();

            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "20")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(ruleRepository).findByTenantId(eq(TENANT_ID), any(Pageable.class));
        }

        @Test
        @DisplayName("Should filter by active status when active param provided")
        void listRules_filtersActiveRules() throws Exception {
            Page<ImplicitRoleRule> page = new PageImpl<>(List.of(sampleRule), PageRequest.of(0, 20), 1);
            when(ruleRepository.findByTenantIdAndIsActive(eq(TENANT_ID), eq(true), any(Pageable.class)))
                    .thenReturn(page);
            stubRuleMapping();

            mockMvc.perform(get(BASE_URL)
                            .param("active", "true")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(ruleRepository).findByTenantIdAndIsActive(eq(TENANT_ID), eq(true), any(Pageable.class));
            verify(ruleRepository, never()).findByTenantId(any(), any());
        }

        @Test
        @DisplayName("Should return empty page when no rules exist")
        void listRules_returnsEmptyPage() throws Exception {
            Page<ImplicitRoleRule> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 20), 0);
            when(ruleRepository.findByTenantId(eq(TENANT_ID), any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(0));
        }
    }

    // ==================== GET /api/v1/implicit-role-rules/{id} ====================

    @Nested
    @DisplayName("GET /{id} — Get Rule By ID")
    class GetRuleByIdTests {

        @Test
        @DisplayName("Should return rule when found")
        void getRuleById_returnsRule() throws Exception {
            when(ruleRepository.findByIdAndTenantId(RULE_ID, TENANT_ID)).thenReturn(Optional.of(sampleRule));
            stubRuleMapping();

            mockMvc.perform(get(BASE_URL + "/" + RULE_ID).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(RULE_ID.toString()))
                    .andExpect(jsonPath("$.ruleName").value("Reporting Managers get Manager Role"));

            verify(ruleRepository).findByIdAndTenantId(RULE_ID, TENANT_ID);
        }

        @Test
        @DisplayName("Should return 404 when rule not found")
        void getRuleById_returns404_whenNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            when(ruleRepository.findByIdAndTenantId(unknownId, TENANT_ID)).thenReturn(Optional.empty());

            mockMvc.perform(get(BASE_URL + "/" + unknownId).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== POST /api/v1/implicit-role-rules ====================

    @Nested
    @DisplayName("POST / — Create Rule")
    class CreateRuleTests {

        private ImplicitRoleRuleRequest buildCreateRequest() {
            ImplicitRoleRuleRequest request = new ImplicitRoleRuleRequest();
            request.setRuleName("New Rule");
            request.setDescription("Test rule");
            request.setConditionType(ImplicitRoleCondition.IS_REPORTING_MANAGER);
            request.setTargetRoleId(ROLE_ID);
            request.setScope(RoleScope.TEAM);
            request.setPriority(0);
            return request;
        }

        @Test
        @DisplayName("Should create rule and return HTTP 201")
        void createRule_returns201_withCreatedRule() throws Exception {
            ImplicitRoleRuleRequest request = buildCreateRequest();

            // Target role must exist for tenant
            when(roleRepository.findById(ROLE_ID)).thenReturn(Optional.of(sampleRole));
            when(ruleRepository.save(any(ImplicitRoleRule.class))).thenReturn(sampleRule);
            when(implicitUserRoleRepository.countAffectedUsers(any(), any())).thenReturn(0L);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(ruleRepository).save(any(ImplicitRoleRule.class));
        }

        @Test
        @DisplayName("Should return 404 when target role does not exist")
        void createRule_returns404_whenTargetRoleNotFound() throws Exception {
            ImplicitRoleRuleRequest request = buildCreateRequest();
            when(roleRepository.findById(ROLE_ID)).thenReturn(Optional.empty());

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("Should return 400 when ruleName is blank")
        void createRule_returns400_whenRuleNameBlank() throws Exception {
            ImplicitRoleRuleRequest request = buildCreateRequest();
            request.setRuleName("");

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when conditionType is null")
        void createRule_returns400_whenConditionTypeNull() throws Exception {
            ImplicitRoleRuleRequest request = buildCreateRequest();
            request.setConditionType(null);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ==================== PUT /api/v1/implicit-role-rules/{id} ====================

    @Nested
    @DisplayName("PUT /{id} — Update Rule")
    class UpdateRuleTests {

        private ImplicitRoleRuleRequest buildUpdateRequest() {
            ImplicitRoleRuleRequest request = new ImplicitRoleRuleRequest();
            request.setRuleName("Updated Rule Name");
            request.setDescription("Updated description");
            request.setConditionType(ImplicitRoleCondition.IS_DEPARTMENT_HEAD);
            request.setTargetRoleId(ROLE_ID);
            request.setScope(RoleScope.ALL);
            request.setPriority(2);
            return request;
        }

        @Test
        @DisplayName("Should update rule and return HTTP 200")
        void updateRule_returnsUpdatedRule() throws Exception {
            ImplicitRoleRuleRequest request = buildUpdateRequest();

            when(ruleRepository.findByIdAndTenantId(RULE_ID, TENANT_ID)).thenReturn(Optional.of(sampleRule));
            when(roleRepository.findById(ROLE_ID)).thenReturn(Optional.of(sampleRole));
            when(ruleRepository.save(any(ImplicitRoleRule.class))).thenReturn(sampleRule);
            when(implicitUserRoleRepository.countAffectedUsers(any(), any())).thenReturn(0L);

            mockMvc.perform(put(BASE_URL + "/" + RULE_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk());

            verify(ruleRepository).save(any(ImplicitRoleRule.class));
        }

        @Test
        @DisplayName("Should return 404 when rule not found")
        void updateRule_returns404_whenRuleNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            when(ruleRepository.findByIdAndTenantId(unknownId, TENANT_ID)).thenReturn(Optional.empty());

            mockMvc.perform(put(BASE_URL + "/" + unknownId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(buildUpdateRequest())))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== DELETE /api/v1/implicit-role-rules/{id} ====================

    @Nested
    @DisplayName("DELETE /{id} — Delete Rule (Soft Delete)")
    class DeleteRuleTests {

        @Test
        @DisplayName("Should soft-delete rule (set isActive=false) and return HTTP 204")
        void deleteRule_returns204_andSetsInactive() throws Exception {
            when(ruleRepository.findByIdAndTenantId(RULE_ID, TENANT_ID)).thenReturn(Optional.of(sampleRule));
            when(ruleRepository.save(any(ImplicitRoleRule.class))).thenReturn(sampleRule);

            mockMvc.perform(delete(BASE_URL + "/" + RULE_ID))
                    .andExpect(status().isNoContent());

            // Verify soft delete: isActive must be set to false before saving
            verify(ruleRepository).save(argThat(rule -> !rule.getIsActive()));
        }

        @Test
        @DisplayName("Should return 404 when rule not found")
        void deleteRule_returns404_whenNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            when(ruleRepository.findByIdAndTenantId(unknownId, TENANT_ID)).thenReturn(Optional.empty());

            mockMvc.perform(delete(BASE_URL + "/" + unknownId))
                    .andExpect(status().isNotFound());
        }
    }

    // ==================== POST /api/v1/implicit-role-rules/recompute-all ====================

    @Nested
    @DisplayName("POST /recompute-all — Trigger Full Recomputation")
    class RecomputeAllTests {

        @Test
        @DisplayName("Should trigger recompute and return HTTP 202 Accepted")
        void recomputeAll_returns202() throws Exception {
            doNothing().when(implicitRoleEngine).recomputeAll(TENANT_ID);

            mockMvc.perform(post(BASE_URL + "/recompute-all")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isAccepted())
                    .andExpect(jsonPath("$.status").value("ACCEPTED"))
                    .andExpect(jsonPath("$.tenantId").value(TENANT_ID.toString()));

            verify(implicitRoleEngine).recomputeAll(TENANT_ID);
        }
    }

    // ==================== POST /api/v1/implicit-role-rules/bulk-activate ====================

    @Nested
    @DisplayName("POST /bulk-activate — Bulk Activate Rules")
    class BulkActivateTests {

        @Test
        @DisplayName("Should activate inactive rules and return count of activated rules")
        void bulkActivate_activatesInactiveRules() throws Exception {
            ImplicitRoleRule inactiveRule = new ImplicitRoleRule();
            inactiveRule.setId(UUID.randomUUID());
            inactiveRule.setTenantId(TENANT_ID);
            inactiveRule.setIsActive(false);

            BulkRuleIdsRequest request = new BulkRuleIdsRequest();
            request.setRuleIds(List.of(inactiveRule.getId()));

            when(ruleRepository.findByIdInAndTenantId(anyList(), eq(TENANT_ID)))
                    .thenReturn(List.of(inactiveRule));
            when(ruleRepository.save(any(ImplicitRoleRule.class))).thenReturn(inactiveRule);

            mockMvc.perform(post(BASE_URL + "/bulk-activate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.operationType").value("ACTIVATE"))
                    .andExpect(jsonPath("$.totalRequested").value(1))
                    .andExpect(jsonPath("$.totalProcessed").value(1));

            verify(ruleRepository).save(argThat(ImplicitRoleRule::getIsActive));
        }

        @Test
        @DisplayName("Should skip already-active rules in bulk activate")
        void bulkActivate_skipsAlreadyActiveRules() throws Exception {
            ImplicitRoleRule alreadyActive = new ImplicitRoleRule();
            alreadyActive.setId(RULE_ID);
            alreadyActive.setTenantId(TENANT_ID);
            alreadyActive.setIsActive(true);  // already active

            BulkRuleIdsRequest request = new BulkRuleIdsRequest();
            request.setRuleIds(List.of(RULE_ID));

            when(ruleRepository.findByIdInAndTenantId(anyList(), eq(TENANT_ID)))
                    .thenReturn(List.of(alreadyActive));

            mockMvc.perform(post(BASE_URL + "/bulk-activate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalProcessed").value(0));

            verify(ruleRepository, never()).save(any());
        }
    }

    // ==================== POST /api/v1/implicit-role-rules/bulk-deactivate ====================

    @Nested
    @DisplayName("POST /bulk-deactivate — Bulk Deactivate Rules")
    class BulkDeactivateTests {

        @Test
        @DisplayName("Should deactivate active rules and return count of deactivated rules")
        void bulkDeactivate_deactivatesActiveRules() throws Exception {
            ImplicitRoleRule activeRule = new ImplicitRoleRule();
            activeRule.setId(RULE_ID);
            activeRule.setTenantId(TENANT_ID);
            activeRule.setIsActive(true);

            BulkRuleIdsRequest request = new BulkRuleIdsRequest();
            request.setRuleIds(List.of(RULE_ID));

            when(ruleRepository.findByIdInAndTenantId(anyList(), eq(TENANT_ID)))
                    .thenReturn(List.of(activeRule));
            when(ruleRepository.save(any(ImplicitRoleRule.class))).thenReturn(activeRule);

            mockMvc.perform(post(BASE_URL + "/bulk-deactivate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.operationType").value("DEACTIVATE"))
                    .andExpect(jsonPath("$.totalRequested").value(1))
                    .andExpect(jsonPath("$.totalProcessed").value(1));

            verify(ruleRepository).save(argThat(rule -> !rule.getIsActive()));
        }

        @Test
        @DisplayName("Should skip already-inactive rules in bulk deactivate")
        void bulkDeactivate_skipsAlreadyInactiveRules() throws Exception {
            ImplicitRoleRule alreadyInactive = new ImplicitRoleRule();
            alreadyInactive.setId(RULE_ID);
            alreadyInactive.setTenantId(TENANT_ID);
            alreadyInactive.setIsActive(false);  // already inactive

            BulkRuleIdsRequest request = new BulkRuleIdsRequest();
            request.setRuleIds(List.of(RULE_ID));

            when(ruleRepository.findByIdInAndTenantId(anyList(), eq(TENANT_ID)))
                    .thenReturn(List.of(alreadyInactive));

            mockMvc.perform(post(BASE_URL + "/bulk-deactivate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalProcessed").value(0));

            verify(ruleRepository, never()).save(any());
        }
    }

    // ==================== GET /api/v1/implicit-role-rules/{id}/affected-users ====================

    @Nested
    @DisplayName("GET /{id}/affected-users — Affected Users")
    class GetAffectedUsersTests {

        @Test
        @DisplayName("Should return count and list of affected users")
        void getAffectedUsers_returnsAffectedUsers() throws Exception {
            ImplicitUserRole userRole = new ImplicitUserRole();
            userRole.setId(UUID.randomUUID());
            userRole.setUserId(UUID.randomUUID());
            userRole.setRoleId(ROLE_ID);
            userRole.setIsActive(true);

            when(ruleRepository.findByIdAndTenantId(RULE_ID, TENANT_ID)).thenReturn(Optional.of(sampleRule));
            when(implicitUserRoleRepository.findByDerivedFromRuleIdAndTenantId(RULE_ID, TENANT_ID))
                    .thenReturn(List.of(userRole));
            when(roleRepository.findById(ROLE_ID)).thenReturn(Optional.of(sampleRole));

            mockMvc.perform(get(BASE_URL + "/" + RULE_ID + "/affected-users")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.ruleId").value(RULE_ID.toString()))
                    .andExpect(jsonPath("$.affectedUserCount").value(1));
        }

        @Test
        @DisplayName("Should return 404 when rule not found")
        void getAffectedUsers_returns404_whenRuleNotFound() throws Exception {
            UUID unknownId = UUID.randomUUID();
            when(ruleRepository.findByIdAndTenantId(unknownId, TENANT_ID)).thenReturn(Optional.empty());

            mockMvc.perform(get(BASE_URL + "/" + unknownId + "/affected-users")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }
}
