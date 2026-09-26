package com.nulogic.api.workflow.controller;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * B3 regression: workflow DEFINITION reads must not be reachable with an employee-level grant.
 *
 * <p>A workflow definition is the tenant's approval-routing configuration — which approver sees
 * which entity, at which step, with which SLA and escalation target. Those three GETs were
 * annotated {@code @RequiresPermission("WORKFLOW:VIEW")}, and WORKFLOW:VIEW is seeded to
 * EMPLOYEE (they need it for their own approval inbox). Every employee in the tenant could
 * therefore read the routing configuration. The frontend was tightened in the same pass, but a
 * hidden button is not an authorization control — the boundary is the annotation.</p>
 *
 * <p>Verified against the seeded RBAC matrix: WORKFLOW:MANAGE is granted only to HR_ADMIN,
 * SUPER_ADMIN and TENANT_ADMIN, while WORKFLOW:VIEW additionally reaches EMPLOYEE, HR_MANAGER,
 * MANAGER, RECRUITMENT_ADMIN and TEAM_LEAD.</p>
 *
 * <p>The inbox and execution endpoints deliberately stay on WORKFLOW:VIEW: an employee must be
 * able to see their own approvals, and {@code WorkflowExecutionResponse} carries no SLA,
 * escalation or approver configuration.</p>
 */
@DisplayName("Workflow definition reads require WORKFLOW:MANAGE (B3)")
class WorkflowDefinitionAuthorizationTest {

    /** Definition reads: the approval-routing configuration. Management-only. */
    private static final List<String> DEFINITION_READ_PATHS =
            List.of("/definitions", "/definitions/{id}", "/definitions/entity-type/{entityType}");

    /** Employee-reachable reads: an employee's own approvals. Must stay on WORKFLOW:VIEW. */
    private static final List<String> EMPLOYEE_READ_PATHS =
            List.of("/inbox", "/my-pending-approvals", "/my-requests");

    private static List<Method> gets() {
        List<Method> methods = new ArrayList<>();
        for (Method m : WorkflowController.class.getDeclaredMethods()) {
            if (m.isAnnotationPresent(GetMapping.class)) {
                methods.add(m);
            }
        }
        return methods;
    }

    private static Method endpoint(String path) {
        return gets().stream()
                .filter(m -> {
                    String[] value = m.getAnnotation(GetMapping.class).value();
                    return value.length > 0 && value[0].equals(path);
                })
                .findFirst()
                .orElseThrow(() -> new AssertionError("no @GetMapping(\"" + path + "\") on WorkflowController"));
    }

    /** The annotation takes an anyOf-style array; every endpoint here declares exactly one. */
    private static List<String> requiredPermissions(Method m) {
        RequiresPermission ann = m.getAnnotation(RequiresPermission.class);
        assertThat(ann).as("%s must carry @RequiresPermission", m.getName()).isNotNull();
        return List.of(ann.value());
    }

    @Test
    @DisplayName("every definition read requires WORKFLOW:MANAGE, never WORKFLOW:VIEW")
    void definitionReadsRequireManage() {
        for (String path : DEFINITION_READ_PATHS) {
            Method m = endpoint(path);
            assertThat(requiredPermissions(m))
                    .as("GET %s exposes approval-routing configuration; WORKFLOW:VIEW reaches "
                            + "EMPLOYEE and must not open it", path)
                    .containsExactly(Permission.WORKFLOW_MANAGE)
                    .doesNotContain("WORKFLOW:VIEW");
        }
    }

    @Test
    @DisplayName("an employee's own approval endpoints stay on WORKFLOW:VIEW")
    void employeeApprovalReadsStayOnView() {
        for (String path : EMPLOYEE_READ_PATHS) {
            assertThat(requiredPermissions(endpoint(path)))
                    .as("GET %s is the employee's own approval surface; tightening it to MANAGE "
                            + "would break the approval inbox", path)
                    .containsExactly(Permission.WORKFLOW_VIEW);
        }
    }

    @Test
    @DisplayName("WORKFLOW:MANAGE and WORKFLOW:VIEW are distinct permissions")
    void permissionsAreDistinct() {
        // If these ever collapse to the same string the tightening silently becomes a no-op.
        assertThat(Permission.WORKFLOW_MANAGE).isNotEqualTo(Permission.WORKFLOW_VIEW);
        assertThat(Permission.WORKFLOW_MANAGE).isEqualTo("WORKFLOW:MANAGE");
        assertThat(Permission.WORKFLOW_VIEW).isEqualTo("WORKFLOW:VIEW");
    }
}
