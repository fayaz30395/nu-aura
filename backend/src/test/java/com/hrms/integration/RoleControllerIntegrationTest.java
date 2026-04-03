package com.hrms.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.user.dto.AssignPermissionsRequest;
import com.hrms.api.user.dto.CreateRoleRequest;
import com.hrms.api.user.dto.UpdateRoleRequest;
import com.hrms.common.security.Permission;
import com.hrms.common.security.SecurityContext;
import com.hrms.config.TestSecurityConfig;
import com.hrms.infrastructure.user.repository.PermissionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hrms.domain.user.RoleScope;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
class RoleControllerIntegrationTest {

    private static final String BASE_URL = "/api/v1/roles";
    private static final UUID TEST_USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TEST_EMPLOYEE_ID = UUID.fromString("111e8400-e29b-41d4-a716-446655440099");
    private static final UUID TEST_TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private PermissionRepository permissionRepository;

    @BeforeEach
    void setUp() {
        // Set up SecurityContext before each test to ensure ThreadLocal values are available
        Set<String> roles = new HashSet<>();
        roles.add("ADMIN");

        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.SYSTEM_ADMIN, RoleScope.ALL);

        SecurityContext.setCurrentUser(TEST_USER_ID, TEST_EMPLOYEE_ID, roles, permissions);
        SecurityContext.setCurrentTenantId(TEST_TENANT_ID);

        // Seed test permissions if not already present
        if (permissionRepository.findByCode("EMPLOYEE:READ").isEmpty()) {
            seedTestPermissions();
        }
    }

    private void seedTestPermissions() {
        com.hrms.domain.user.Permission readPerm = new com.hrms.domain.user.Permission();
        readPerm.setCode("EMPLOYEE:READ");
        readPerm.setName("Read Employee");
        readPerm.setDescription("View employee details");
        readPerm.setResource("EMPLOYEE");
        readPerm.setAction("READ");
        permissionRepository.save(readPerm);

        com.hrms.domain.user.Permission updatePerm = new com.hrms.domain.user.Permission();
        updatePerm.setCode("EMPLOYEE:UPDATE");
        updatePerm.setName("Update Employee");
        updatePerm.setDescription("Update employee details");
        updatePerm.setResource("EMPLOYEE");
        updatePerm.setAction("UPDATE");
        permissionRepository.save(updatePerm);

        com.hrms.domain.user.Permission createPerm = new com.hrms.domain.user.Permission();
        createPerm.setCode("EMPLOYEE:CREATE");
        createPerm.setName("Create Employee");
        createPerm.setDescription("Create new employee");
        createPerm.setResource("EMPLOYEE");
        createPerm.setAction("CREATE");
        permissionRepository.save(createPerm);

        com.hrms.domain.user.Permission deletePerm = new com.hrms.domain.user.Permission();
        deletePerm.setCode("EMPLOYEE:DELETE");
        deletePerm.setName("Delete Employee");
        deletePerm.setDescription("Delete employee");
        deletePerm.setResource("EMPLOYEE");
        deletePerm.setAction("DELETE");
        permissionRepository.save(deletePerm);
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void getAllRoles_Success() throws Exception {
        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void createRole_Success() throws Exception {
        CreateRoleRequest request = new CreateRoleRequest();
        request.setCode("TEST_ROLE_" + UUID.randomUUID().toString().substring(0, 8));
        request.setName("Test Role");
        request.setDescription("A test role");
        // Note: Not setting permissionCodes as permissions table is empty in test DB

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value(request.getCode()))
                .andExpect(jsonPath("$.name").value("Test Role"))
                .andExpect(jsonPath("$.description").value("A test role"))
                .andExpect(jsonPath("$.isSystemRole").value(false));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void createRole_MissingRequiredFields_ReturnsBadRequest() throws Exception {
        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Incomplete Role");
        // Missing required 'code' field

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void getRoleById_Success() throws Exception {
        // First create a role
        CreateRoleRequest createRequest = new CreateRoleRequest();
        createRequest.setCode("GET_TEST_ROLE_" + UUID.randomUUID().toString().substring(0, 8));
        createRequest.setName("Get Test Role");
        createRequest.setDescription("Role for get test");

        String createResponse = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String roleId = objectMapper.readTree(createResponse).get("id").asText();

        // Then get the role
        mockMvc.perform(get(BASE_URL + "/" + roleId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roleId))
                .andExpect(jsonPath("$.code").value(createRequest.getCode()))
                .andExpect(jsonPath("$.name").value("Get Test Role"));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void getRoleById_NotFound_ReturnsNotFound() throws Exception {
        String nonExistentId = UUID.randomUUID().toString();

        mockMvc.perform(get(BASE_URL + "/" + nonExistentId))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void updateRole_Success() throws Exception {
        // First create a role
        CreateRoleRequest createRequest = new CreateRoleRequest();
        createRequest.setCode("UPDATE_TEST_ROLE_" + UUID.randomUUID().toString().substring(0, 8));
        createRequest.setName("Original Name");
        createRequest.setDescription("Original Description");

        String createResponse = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String roleId = objectMapper.readTree(createResponse).get("id").asText();

        // Then update the role
        UpdateRoleRequest updateRequest = new UpdateRoleRequest();
        updateRequest.setName("Updated Name");
        updateRequest.setDescription("Updated Description");

        mockMvc.perform(put(BASE_URL + "/" + roleId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roleId))
                .andExpect(jsonPath("$.name").value("Updated Name"))
                .andExpect(jsonPath("$.description").value("Updated Description"));
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void deleteRole_Success() throws Exception {
        // First create a role
        CreateRoleRequest createRequest = new CreateRoleRequest();
        createRequest.setCode("DELETE_TEST_ROLE_" + UUID.randomUUID().toString().substring(0, 8));
        createRequest.setName("Delete Test Role");
        createRequest.setDescription("Role to be deleted");

        String createResponse = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String roleId = objectMapper.readTree(createResponse).get("id").asText();

        // Then delete the role
        mockMvc.perform(delete(BASE_URL + "/" + roleId))
                .andExpect(status().isNoContent());

        // Verify the role is deleted
        mockMvc.perform(get(BASE_URL + "/" + roleId))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void assignPermissions_Success() throws Exception {
        // First create a role
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        CreateRoleRequest createRequest = new CreateRoleRequest();
        createRequest.setCode("PERM_TEST_ROLE_" + uniqueSuffix);
        createRequest.setName("Permission Test Role " + uniqueSuffix);

        String createResponse = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String roleId = objectMapper.readTree(createResponse).get("id").asText();

        // Then assign permissions (use permission codes from test data.sql)
        AssignPermissionsRequest permissionsRequest = new AssignPermissionsRequest();
        permissionsRequest.setPermissionCodes(new HashSet<>(Arrays.asList("EMPLOYEE:READ", "EMPLOYEE:UPDATE")));

        mockMvc.perform(put(BASE_URL + "/" + roleId + "/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(permissionsRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roleId))
                .andExpect(jsonPath("$.permissions").isArray());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void addPermissions_Success() throws Exception {
        // First create a role with one permission
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        CreateRoleRequest createRequest = new CreateRoleRequest();
        createRequest.setCode("ADD_PERM_ROLE_" + uniqueSuffix);
        createRequest.setName("Add Permission Test Role " + uniqueSuffix);
        createRequest.setPermissionCodes(new HashSet<>(Arrays.asList("EMPLOYEE:READ")));

        String createResponse = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String roleId = objectMapper.readTree(createResponse).get("id").asText();

        // Then add more permissions
        AssignPermissionsRequest permissionsRequest = new AssignPermissionsRequest();
        permissionsRequest.setPermissionCodes(new HashSet<>(Arrays.asList("EMPLOYEE:UPDATE")));

        mockMvc.perform(post(BASE_URL + "/" + roleId + "/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(permissionsRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roleId))
                .andExpect(jsonPath("$.permissions").isArray());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void removePermissions_Success() throws Exception {
        // First create a role with multiple permissions
        String uniqueSuffix = UUID.randomUUID().toString().substring(0, 8);
        CreateRoleRequest createRequest = new CreateRoleRequest();
        createRequest.setCode("REMOVE_PERM_ROLE_" + uniqueSuffix);
        createRequest.setName("Remove Permission Test Role " + uniqueSuffix);
        createRequest.setPermissionCodes(new HashSet<>(Arrays.asList("EMPLOYEE:READ", "EMPLOYEE:UPDATE")));

        String createResponse = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String roleId = objectMapper.readTree(createResponse).get("id").asText();

        // Then remove a permission
        AssignPermissionsRequest permissionsRequest = new AssignPermissionsRequest();
        permissionsRequest.setPermissionCodes(new HashSet<>(Arrays.asList("EMPLOYEE:READ")));

        mockMvc.perform(delete(BASE_URL + "/" + roleId + "/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(permissionsRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(roleId))
                .andExpect(jsonPath("$.permissions").isArray());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void createRole_DuplicateCode_ReturnsConflict() throws Exception {
        // First create a role
        CreateRoleRequest createRequest = new CreateRoleRequest();
        createRequest.setCode("DUPLICATE_ROLE_" + UUID.randomUUID().toString().substring(0, 8));
        createRequest.setName("Duplicate Role");

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated());

        // Try to create another role with the same code
        CreateRoleRequest duplicateRequest = new CreateRoleRequest();
        duplicateRequest.setCode(createRequest.getCode());
        duplicateRequest.setName("Duplicate Role 2");

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateRequest)))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = {"ADMIN"})
    void assignPermissions_InvalidPermissionCode_ReturnsBadRequest() throws Exception {
        // First create a role
        CreateRoleRequest createRequest = new CreateRoleRequest();
        createRequest.setCode("INVALID_PERM_ROLE_" + UUID.randomUUID().toString().substring(0, 8));
        createRequest.setName("Invalid Permission Test Role");

        String createResponse = mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String roleId = objectMapper.readTree(createResponse).get("id").asText();

        // Try to assign invalid permission code
        AssignPermissionsRequest permissionsRequest = new AssignPermissionsRequest();
        permissionsRequest.setPermissionCodes(new HashSet<>(Arrays.asList("INVALID_PERMISSION_CODE_XYZ")));

        mockMvc.perform(put(BASE_URL + "/" + roleId + "/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(permissionsRequest)))
                .andExpect(status().isBadRequest());
    }
}
