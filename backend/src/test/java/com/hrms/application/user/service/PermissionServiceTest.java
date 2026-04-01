package com.hrms.application.user.service;

import com.hrms.api.user.dto.PermissionResponse;
import com.hrms.domain.user.Permission;
import com.hrms.infrastructure.user.repository.PermissionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PermissionService Tests")
class PermissionServiceTest {

    @Mock
    private PermissionRepository permissionRepository;

    @InjectMocks
    private PermissionService permissionService;

    private Permission buildPermission(UUID id, String code, String name,
                                       String description, String resource, String action) {
        Permission p = new Permission();
        p.setId(id);
        p.setCode(code);
        p.setName(name);
        p.setDescription(description);
        p.setResource(resource);
        p.setAction(action);
        return p;
    }

    @Nested
    @DisplayName("getAllPermissions")
    class GetAllPermissionsTests {

        @Test
        @DisplayName("Should return all permissions mapped to PermissionResponse")
        void shouldReturnAllPermissions() {
            // Given
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();
            Permission p1 = buildPermission(id1, "EMPLOYEE:READ", "Employee Read",
                    "Read employee data", "EMPLOYEE", "READ");
            Permission p2 = buildPermission(id2, "EMPLOYEE:CREATE", "Employee Create",
                    "Create employees", "EMPLOYEE", "CREATE");

            when(permissionRepository.findAllByOrderByResourceAscActionAsc())
                    .thenReturn(List.of(p1, p2));

            // When
            List<PermissionResponse> result = permissionService.getAllPermissions();

            // Then
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getCode()).isEqualTo("EMPLOYEE:READ");
            assertThat(result.get(0).getResource()).isEqualTo("EMPLOYEE");
            assertThat(result.get(0).getAction()).isEqualTo("READ");
            assertThat(result.get(0).getId()).isEqualTo(id1);
            assertThat(result.get(1).getCode()).isEqualTo("EMPLOYEE:CREATE");

            verify(permissionRepository).findAllByOrderByResourceAscActionAsc();
        }

        @Test
        @DisplayName("Should return empty list when no permissions exist")
        void shouldReturnEmptyListWhenNoPermissions() {
            // Given
            when(permissionRepository.findAllByOrderByResourceAscActionAsc())
                    .thenReturn(Collections.emptyList());

            // When
            List<PermissionResponse> result = permissionService.getAllPermissions();

            // Then
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getPermissionsByResource")
    class GetPermissionsByResourceTests {

        @Test
        @DisplayName("Should return permissions filtered by resource")
        void shouldReturnPermissionsForResource() {
            // Given
            Permission p = buildPermission(UUID.randomUUID(), "PAYROLL:PROCESS",
                    "Payroll Process", "Process payroll", "PAYROLL", "PROCESS");

            when(permissionRepository.findByResource("PAYROLL"))
                    .thenReturn(List.of(p));

            // When
            List<PermissionResponse> result = permissionService.getPermissionsByResource("PAYROLL");

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getResource()).isEqualTo("PAYROLL");
            assertThat(result.get(0).getAction()).isEqualTo("PROCESS");
            verify(permissionRepository).findByResource("PAYROLL");
        }

        @Test
        @DisplayName("Should return empty list when resource has no permissions")
        void shouldReturnEmptyListForUnknownResource() {
            // Given
            when(permissionRepository.findByResource("NONEXISTENT"))
                    .thenReturn(Collections.emptyList());

            // When
            List<PermissionResponse> result = permissionService.getPermissionsByResource("NONEXISTENT");

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Should map all PermissionResponse fields correctly")
        void shouldMapAllFieldsCorrectly() {
            // Given
            UUID id = UUID.randomUUID();
            Permission p = buildPermission(id, "LEAVE:APPROVE", "Leave Approve",
                    "Approve leave requests", "LEAVE", "APPROVE");
            when(permissionRepository.findByResource("LEAVE")).thenReturn(List.of(p));

            // When
            List<PermissionResponse> result = permissionService.getPermissionsByResource("LEAVE");

            // Then
            PermissionResponse resp = result.get(0);
            assertThat(resp.getId()).isEqualTo(id);
            assertThat(resp.getCode()).isEqualTo("LEAVE:APPROVE");
            assertThat(resp.getName()).isEqualTo("Leave Approve");
            assertThat(resp.getDescription()).isEqualTo("Approve leave requests");
            assertThat(resp.getResource()).isEqualTo("LEAVE");
            assertThat(resp.getAction()).isEqualTo("APPROVE");
        }
    }
}
