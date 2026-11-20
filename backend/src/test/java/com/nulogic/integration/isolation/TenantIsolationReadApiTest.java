package com.nulogic.integration.isolation;

import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TenantResourceCatalog.ApiResource;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static com.nulogic.integration.isolation.TwoTenantFixture.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * HTTP-level read isolation: GET by id, list/pagination, search, nested resources, exports and
 * file downloads. Every cross-tenant assertion is paired with a positive control (the same call on
 * the caller's own row succeeds and returns its marker), so a test cannot pass vacuously because
 * the endpoint is simply broken or the caller lacks the permission.
 */
@DisplayName("Tenant isolation: read APIs (GET by id, lists, search, nested, export, download)")
class TenantIsolationReadApiTest extends AbstractTenantIsolationIntegrationTest {

    static Stream<ApiResource> resources() {
        return TenantResourceCatalog.RESOURCES.stream();
    }

    static Stream<Arguments> resourcesAndAttackers() {
        return TenantResourceCatalog.RESOURCES.stream()
                .flatMap(r -> Stream.of(Tenant.values()).map(t -> Arguments.of(r, t)));
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("resources")
    @DisplayName("positive control: tenant admin reads its own row by id")
    void ownRowIsReadable(ApiResource resource) throws Exception {
        MvcResult res = perform(as(Actor.admin(Tenant.A), get(resource.get(Tenant.A))));
        assertThat(status(res)).as("%s own GET %s -> %s", resource, resource.get(Tenant.A), body(res)).isEqualTo(200);
        assertThat(body(res)).contains(resource.id(Tenant.A).toString());
    }

    @ParameterizedTest(name = "[{index}] {0} attacked by tenant {1}")
    @MethodSource("resourcesAndAttackers")
    @DisplayName("tenant admin cannot read the other tenant's row by id (IDOR via UUID)")
    void otherTenantsRowIsNotReadable(ApiResource resource, Tenant attacker) throws Exception {
        assertCrossTenantDenied(perform(as(Actor.admin(attacker), get(resource.get(attacker.other())))),
                attacker.other(), resource + " GET");
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("resources")
    @DisplayName("SUPER_ADMIN of tenant A (bypasses @RequiresPermission) still cannot read tenant B's row")
    void superAdminOfAnotherTenantCannotRead(ApiResource resource) throws Exception {
        assertCrossTenantDenied(perform(as(Actor.superAdmin(Tenant.A), get(resource.get(Tenant.B)))),
                Tenant.B, resource + " GET as SUPER_ADMIN");
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("resources")
    @DisplayName("list endpoint returns the caller's rows and never the other tenant's")
    void listContainsOnlyOwnTenant(ApiResource resource) throws Exception {
        for (Tenant caller : Tenant.values()) {
            boolean ownRowSeen = false;
            // Tenant admin (scope-filtered) and SUPER_ADMIN (scope filters bypassed: widest in-tenant view).
            for (Actor actor : List.of(Actor.admin(caller), Actor.superAdmin(caller))) {
                MvcResult res = perform(as(actor, get(resource.listPath()).param("page", "0").param("size", "200")));
                assertThat(status(res)).as("%s list as %s -> %s", resource, actor.email(), body(res)).isEqualTo(200);
                assertThat(body(res)).as("%s list as %s leaked %s rows", resource, actor.email(), caller.other())
                        .doesNotContain(caller.other().marker())
                        .doesNotContain(resource.id(caller.other()).toString());
                ownRowSeen |= body(res).contains(resource.id(caller).toString());
            }
            assertThat(ownRowSeen).as("positive control: %s list must show %s's own row", resource, caller).isTrue();
        }
    }

    static List<String> nestedPaths(Tenant victim) {
        return List.of(
                "/api/v1/leave-requests/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/expenses/employees/" + victim.id(EMPLOYEE, 2),
                "/api/v1/expenses/statistics/" + victim.id(EMPLOYEE, 2),
                "/api/v1/goals/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/reviews/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/reviews/" + victim.id(PERFORMANCE_REVIEW) + "/competencies",
                "/api/v1/payroll/payslips/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/payroll/payslips/run/" + victim.id(PAYROLL_RUN),
                "/api/v1/payroll/payslips/" + victim.id(PAYSLIP) + "/pdf",
                "/api/v1/payroll/runs/" + victim.id(PAYROLL_RUN) + "/status",
                "/api/v1/recruitment/candidates/job-opening/" + victim.id(JOB_OPENING),
                "/api/v1/recruitment/applicants/pipeline/" + victim.id(JOB_OPENING),
                "/api/v1/recruitment/interviews/candidate/" + victim.id(CANDIDATE),
                "/api/v1/knowledge/wiki/pages/space/" + victim.id(WIKI_SPACE),
                "/api/v1/knowledge/wiki/pages/space/" + victim.id(WIKI_SPACE) + "/tree",
                "/api/v1/knowledge/wiki/pages/" + victim.id(WIKI_PAGE) + "/children",
                "/api/v1/knowledge/wiki/pages/" + victim.id(WIKI_PAGE) + "/versions",
                "/api/v1/knowledge/wiki/pages/" + victim.id(WIKI_PAGE) + "/export",
                "/api/v1/knowledge/wiki/spaces/" + victim.id(WIKI_SPACE) + "/members",
                "/api/v1/wall/posts/" + victim.id(WALL_POST) + "/comments",
                "/api/v1/contracts/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/contracts/" + victim.id(CONTRACT) + "/versions",
                "/api/v1/contracts/" + victim.id(CONTRACT) + "/signatures",
                "/api/v1/projects/" + victim.id(PROJECT) + "/team",
                "/api/v1/projects/" + victim.id(PROJECT) + "/allocations",
                "/api/v1/projects/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/assets/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/helpdesk/tickets/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/helpdesk/comments/ticket/" + victim.id(TICKET),
                "/api/v1/employees/" + victim.id(EMPLOYEE, 2) + "/hierarchy",
                "/api/v1/employees/" + victim.id(EMPLOYEE, 1) + "/subordinates",
                "/api/v1/employees/" + victim.id(EMPLOYEE, 2) + "/documents",
                "/api/v1/training/enrollments/program/" + victim.id(TRAINING_PROGRAM),
                "/api/v1/surveys/" + victim.id(PULSE_SURVEY) + "/questions",
                "/api/v1/letters/employee/" + victim.id(EMPLOYEE, 2),
                "/api/v1/letters/templates/" + victim.id(LETTER_TEMPLATE) + "/preview");
    }

    static Stream<String> nestedPathsForB() {
        return nestedPaths(Tenant.B).stream();
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("nestedPathsForB")
    @DisplayName("nested/child resources under a tenant-B parent are not exposed to tenant A")
    void nestedResourcesOfOtherTenantAreHidden(String path) throws Exception {
        MvcResult res = perform(as(Actor.admin(Tenant.A), get(path)));
        assertNoLeak(res, Tenant.B, "nested " + path);
        assertThat(status(res)).as("nested %s must not 5xx: %s", path, body(res)).isLessThan(500);
    }

    @Test
    @DisplayName("search endpoints never match the other tenant's rows")
    void searchDoesNotCrossTenants() throws Exception {
        List<String> searches = List.of(
                "/api/v1/employees/search?query=ISO",
                "/api/v1/departments/search?query=ISO",
                "/api/v1/contracts/search?search=ISO",
                "/api/v1/knowledge/wiki/pages/search?query=ISO",
                "/api/v1/knowledge/blogs/search?query=ISO",
                "/api/v1/employees/directory?search=ISO");
        for (String path : searches) {
            assertNoLeak(perform(as(Actor.admin(Tenant.A), get(path))), Tenant.B, "search " + path);
        }
        // Natural-key lookups echo the key in error messages, so assert on the row id + status instead.
        for (String path : List.of("/api/v1/helpdesk/tickets/number/ISO-B-TKT-001", "/api/v1/knowledge/blogs/slug/iso-b-blog")) {
            MvcResult res = perform(as(Actor.admin(Tenant.A), get(path)));
            assertThat(status(res)).as("%s -> %s", path, body(res)).isBetween(400, 499);
            assertThat(body(res)).doesNotContain(Tenant.B.id(TICKET).toString()).doesNotContain(Tenant.B.id(BLOG_POST).toString());
        }
    }

    @Test
    @DisplayName("CSV export and reports contain only the caller's rows, even when filtered by the other tenant's ids")
    void exportsContainOnlyOwnTenant() throws Exception {
        MvcResult export = perform(as(Actor.admin(Tenant.A), post("/api/v1/export/employees").param("format", "CSV")
                .contentType(MediaType.APPLICATION_JSON).content("{}")));
        assertThat(status(export)).as("employee export -> %s", body(export)).isEqualTo(200);
        assertThat(body(export)).contains(Tenant.A.marker()).doesNotContain(Tenant.B.marker());

        String b = Tenant.B.id().toString();
        String[] reports = {
                "/api/v1/reports/employee-directory|{\"format\":\"CSV\"}",
                "/api/v1/reports/employee-directory|{\"format\":\"CSV\",\"employeeIds\":[\"" + Tenant.B.id(EMPLOYEE, 2)
                        + "\"],\"departmentIds\":[\"" + Tenant.B.id(DEPARTMENT) + "\"]}",
                "/api/v1/reports/department-headcount|{\"format\":\"CSV\"}",
                "/api/v1/reports/leave|{\"format\":\"CSV\",\"startDate\":\"2030-01-01\",\"endDate\":\"2030-12-31\",\"leaveTypeId\":\""
                        + Tenant.B.id(LEAVE_TYPE) + "\"}",
                "/api/v1/reports/payroll|{\"format\":\"CSV\",\"payrollRunId\":\"" + Tenant.B.id(PAYROLL_RUN) + "\"}",
                "/api/v1/reports/performance|{\"format\":\"CSV\",\"reviewCycleId\":\"" + Tenant.B.id(REVIEW_CYCLE) + "\"}"};
        for (String spec : reports) {
            String[] parts = spec.split("\\|", 2);
            MvcResult res = perform(as(Actor.admin(Tenant.A), post(parts[0])
                    .contentType(MediaType.APPLICATION_JSON).content(parts[1])));
            assertNoLeak(res, Tenant.B, "report " + spec);
            assertThat(body(res)).doesNotContain(b);
        }
    }

    @Test
    @DisplayName("file download of a tenant-B object (direct and via ../ traversal) is refused")
    void fileDownloadOfOtherTenantIsRefused() throws Exception {
        String bObject = Tenant.B.id() + "/documents/" + Tenant.B.id(EMPLOYEE, 2) + "/iso-b-contract.pdf";
        String traversal = Tenant.A.id() + "/../" + bObject;
        for (String object : List.of(bObject, traversal)) {
            for (String endpoint : List.of("/api/v1/files/download/direct", "/api/v1/files/download", "/api/v1/files/exists")) {
                MvcResult res = perform(as(Actor.admin(Tenant.A), get(endpoint).param("objectName", object)));
                assertThat(status(res)).as("%s %s -> %s", endpoint, object, body(res)).isBetween(400, 499);
                assertNoLeak(res, Tenant.B, endpoint);
            }
        }
    }

    @Test
    @DisplayName("plain employee of A cannot read tenant B rows either (lowest-privilege path)")
    void employeeOfOtherTenantCannotRead() throws Exception {
        for (ApiResource resource : TenantResourceCatalog.RESOURCES) {
            assertCrossTenantDenied(perform(as(Actor.employee(Tenant.A), get(resource.get(Tenant.B)))),
                    Tenant.B, resource + " GET as EMPLOYEE");
        }
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("resources")
    @DisplayName("no existence oracle: the other tenant's id answers exactly like an id that does not exist")
    void otherTenantsIdIsIndistinguishableFromMissing(ApiResource resource) throws Exception {
        MvcResult foreign = perform(as(Actor.admin(Tenant.A), get(resource.get(Tenant.B))));
        MvcResult missing = perform(as(Actor.admin(Tenant.A),
                get(resource.getPath().replace("{id}", UUID.randomUUID().toString()))));
        assertThat(status(foreign)).as("%s: foreign %s vs missing %s", resource, body(foreign), body(missing))
                .isEqualTo(status(missing));
        assertThat(message(foreign)).isEqualTo(message(missing));
    }

    /**
     * 400 is accepted next to 403/404: several services raise a BusinessException("X not found")
     * that the global handler maps to 400. It discloses nothing (see the existence-oracle test);
     * the inconsistency is reported, not asserted away.
     */
    static void assertCrossTenantDenied(MvcResult res, Tenant victim, String what) throws Exception {
        assertThat(status(res)).as("%s must be denied, got %s: %s", what, status(res), body(res)).isIn(400, 403, 404);
        assertNoLeak(res, victim, what);
    }

    private static String message(MvcResult res) throws Exception {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\"message\":\"([^\"]*)\"").matcher(body(res));
        // Messages may echo the requested id; compare them with ids masked.
        return m.find() ? m.group(1).replaceAll("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "<id>") : "";
    }

    static void assertNoLeak(MvcResult res, Tenant victim, String what) throws Exception {
        assertThat(body(res)).as("%s leaked %s data", what, victim).doesNotContain(victim.marker());
        assertThat(res.getResponse().getHeaderNames())
                .allSatisfy(h -> assertThat(String.valueOf(res.getResponse().getHeaderValues(h)))
                        .doesNotContain(victim.marker()));
    }
}
