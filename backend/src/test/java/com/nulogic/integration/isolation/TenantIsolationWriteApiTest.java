package com.nulogic.integration.isolation;

import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TenantResourceCatalog.ApiResource;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import static com.nulogic.integration.isolation.TwoTenantFixture.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * HTTP-level write isolation. Every attempt against tenant B is followed by a superuser
 * ground-truth check that B's row is byte-for-byte unchanged (md5 of the full row), so a request
 * that answers 4xx after having written anyway is still caught.
 */
@DisplayName("Tenant isolation: write APIs (update, delete, state changes, create with foreign ids, bulk)")
class TenantIsolationWriteApiTest extends AbstractTenantIsolationIntegrationTest {

    private static final Actor ATTACKER = Actor.admin(Tenant.A);
    /** DELETE answers 204 for any id it cannot see (deleteByIdAndTenantId); reported as an API inconsistency. */
    private static final Set<String> IDEMPOTENT_DELETE = Set.of("notification");

    static Stream<ApiResource> deletable() {
        return TenantResourceCatalog.RESOURCES.stream().filter(r -> r.deletePath() != null);
    }

    static Stream<ApiResource> mutable() {
        return TenantResourceCatalog.RESOURCES.stream().filter(r -> r.mutation() != null);
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("deletable")
    @DisplayName("DELETE on the other tenant's id is refused and the row survives untouched")
    void crossTenantDeleteIsRefused(ApiResource resource) throws Exception {
        String before = rowHash(resource.table(), resource.id(Tenant.B));
        MvcResult res = perform(as(ATTACKER, delete(resource.delete(Tenant.B))));
        if (IDEMPOTENT_DELETE.contains(resource.name()) && status(res) == 204) {
            // Reported, not a leak: answers 204 with no effect, exactly as for an id that does not exist.
            assertThat(rowHash(resource.table(), resource.id(Tenant.B))).isEqualTo(before);
            assertThat(status(perform(as(ATTACKER, delete(resource.deletePath().replace("{id}", UUID.randomUUID().toString()))))))
                    .isEqualTo(204);
            return;
        }
        assertDeniedAndUnchanged(res, resource.table(), resource.id(Tenant.B), before, resource + " DELETE");
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("mutable")
    @DisplayName("state-changing call (approve/publish/pin/status) on the other tenant's id is refused")
    void crossTenantStateChangeIsRefused(ApiResource resource) throws Exception {
        String before = rowHash(resource.table(), resource.id(Tenant.B));
        MvcResult res = perform(as(ATTACKER, mutation(resource, Tenant.B)));
        assertDeniedAndUnchanged(res, resource.table(), resource.id(Tenant.B), before, resource + " " + resource.mutation());
    }

    @ParameterizedTest(name = "[{index}] {0}")
    @MethodSource("mutable")
    @DisplayName("SUPER_ADMIN of tenant A cannot change tenant B's row either")
    void superAdminCrossTenantStateChangeIsRefused(ApiResource resource) throws Exception {
        String before = rowHash(resource.table(), resource.id(Tenant.B));
        MvcResult res = perform(as(Actor.superAdmin(Tenant.A), mutation(resource, Tenant.B)));
        assertDeniedAndUnchanged(res, resource.table(), resource.id(Tenant.B), before, resource + " as SUPER_ADMIN");
    }

    /** PUT with a valid body: proven valid by the positive control on A's own row first. */
    static Stream<Object[]> updates() {
        return Stream.of(
                new Object[]{"departments", DEPARTMENT, "/api/v1/departments/{id}",
                        "{\"code\":\"ISO-X-ENG\",\"name\":\"ISO-X renamed\",\"isActive\":true}", ATTACKER},
                new Object[]{"goals", GOAL, "/api/v1/goals/{id}",
                        "{\"employeeId\":\"" + Tenant.A.id(EMPLOYEE, 2) + "\",\"goalType\":\"OKR\",\"title\":\"ISO-X goal renamed\","
                                + "\"startDate\":\"2030-01-01\",\"dueDate\":\"2030-12-31\"}", ATTACKER},
                // tenant admin roles lack PROJECT:UPDATE; SUPER_ADMIN of A is the strongest in-tenant writer
                new Object[]{"projects", PROJECT, "/api/v1/projects/{id}",
                        "{\"projectCode\":\"ISO-X-PRJ\",\"name\":\"ISO-X project renamed\",\"startDate\":\"2030-01-01\","
                                + "\"status\":\"IN_PROGRESS\",\"priority\":\"HIGH\"}", Actor.superAdmin(Tenant.A)});
    }

    @ParameterizedTest(name = "[{index}] PUT {0}")
    @MethodSource("updates")
    @DisplayName("PUT with a valid body works on own row and is refused on the other tenant's row")
    void crossTenantUpdateIsRefused(String table, int type, String path, String json, Actor actor) throws Exception {
        MvcResult own = perform(as(actor, put(path.replace("{id}", Tenant.A.id(type).toString()))
                .contentType(MediaType.APPLICATION_JSON).content(json.replace("ISO-X", "ISO-A"))));
        assertThat(status(own)).as("positive control PUT own %s -> %s", table, body(own)).isBetween(200, 299);

        UUID victim = Tenant.B.id(type);
        String before = rowHash(table, victim);
        MvcResult res = perform(as(actor, put(path.replace("{id}", victim.toString()))
                .contentType(MediaType.APPLICATION_JSON).content(json.replace("ISO-X", "ISO-A"))));
        assertDeniedAndUnchanged(res, table, victim, before, "PUT " + table);

        // Path/body mismatch: own id in the path, victim id in the body.
        String withBodyId = json.replace("{", "{\"id\":\"" + victim + "\",\"tenantId\":\"" + Tenant.B.id() + "\",")
                .replace("ISO-X", "ISO-A");
        MvcResult mismatch = perform(as(actor, put(path.replace("{id}", Tenant.A.id(type).toString()))
                .contentType(MediaType.APPLICATION_JSON).content(withBodyId)));
        assertThat(rowHash(table, victim)).as("path/body id mismatch on %s modified tenant B (status %s)", table,
                status(mismatch)).isEqualTo(before);
        assertThat(ownerOf(table, Tenant.A.id(type))).as("body tenantId re-homed A's row").isEqualTo(Tenant.A.id());
    }

    @Test
    @DisplayName("create requests referencing tenant-B ids never produce a row that points into tenant B")
    void createWithForeignReferencesIsRejected() throws Exception {
        // {path, body, table, fk column, fk placeholder}; placeholders resolve to the target tenant's ids.
        String[][] attempts = {
                {"/api/v1/leave-requests", "{\"employeeId\":\"{EMP}\",\"leaveTypeId\":\"{LT}\",\"startDate\":\"2031-01-{N}\","
                        + "\"endDate\":\"2031-01-{N}\",\"totalDays\":1,\"reason\":\"ISO-A isolation probe\"}",
                        "leave_requests", "employee_id", "{EMP}"},
                {"/api/v1/goals", "{\"employeeId\":\"{EMP}\",\"goalType\":\"OKR\",\"title\":\"ISO-A probe {N}\","
                        + "\"startDate\":\"2031-01-01\",\"dueDate\":\"2031-02-01\"}", "goals", "employee_id", "{EMP}"},
                {"/api/v1/recruitment/candidates", "{\"candidateCode\":\"ISO-A-X1{N}\",\"jobOpeningId\":\"{JOB}\","
                        + "\"firstName\":\"ISO-A\",\"lastName\":\"X\",\"email\":\"x1{N}@iso.test\"}",
                        "candidates", "job_opening_id", "{JOB}"},
                {"/api/v1/knowledge/wiki/pages", "{\"spaceId\":\"{SPACE}\",\"title\":\"ISO-A probe {N}\",\"slug\":\"iso-a-probe-{N}\","
                        + "\"content\":\"{}\",\"visibility\":\"ORGANIZATION\",\"status\":\"DRAFT\"}", "wiki_pages", "space_id", "{SPACE}"},
                {"/api/v1/departments", "{\"code\":\"ISO-A-X2{N}\",\"name\":\"ISO-A probe\",\"parentDepartmentId\":\"{DEPT}\","
                        + "\"managerId\":\"{EMP}\"}", "departments", "parent_department_id", "{DEPT}"},
                {"/api/v1/expenses/employees/{EMP}", "{\"claimDate\":\"2026-01-{N}\",\"category\":\"TRAVEL\","
                        + "\"description\":\"ISO-A probe\",\"amount\":10}", "expense_claims", "employee_id", "{EMP}"}};
        int n = 1;
        for (String[] a : attempts) {
            // Positive control: the identical request with the caller's own ids succeeds, so the body is valid
            // and a refusal for tenant B's ids is caused by tenancy, not validation.
            MvcResult own = perform(as(ATTACKER, post(ids(a[0], Tenant.A, n)).contentType(MediaType.APPLICATION_JSON)
                    .content(ids(a[1], Tenant.A, n))));
            // Leave creation stops later at "no workflow definition" (synthetic tenants have none): that is
            // past reference resolution, so it still proves the own ids were accepted.
            assertThat(status(own) < 300 || body(own).contains("No active workflow definition"))
                    .as("positive control %s -> %s", a[0], body(own)).isTrue();
            n++;

            String foreignFk = ids(a[4], Tenant.B, n);
            long bRowsBefore = countInTenant(a[2], Tenant.B);
            MvcResult res = perform(as(ATTACKER, post(ids(a[0], Tenant.B, n)).contentType(MediaType.APPLICATION_JSON)
                    .content(ids(a[1], Tenant.B, n))));
            n++;
            assertThat(countInTenant(a[2], Tenant.B)).as("%s inserted into tenant B", a[0]).isEqualTo(bRowsBefore);
            Long dangling = superuserJdbc().queryForObject("SELECT count(*) FROM " + a[2] + " WHERE tenant_id = ? AND "
                    + a[3] + " = ?::uuid", Long.class, Tenant.A.id(), foreignFk);
            assertThat(dangling).as("%s created a tenant-A row pointing at tenant B (%s -> %s)", a[0], status(res), body(res))
                    .isZero();
            assertThat(status(res)).as("%s with tenant-B ids -> %s", a[0], body(res)).isBetween(400, 499);
            assertThat(body(res)).doesNotContain(Tenant.B.marker());
        }
    }

    /** Projects need PROJECT:CREATE, which only SUPER_ADMIN holds in the cloned role set. */
    @Test
    @DisplayName("REGRESSION project create/update cannot point projectManagerId at a tenant-B employee")
    void projectManagerMustStayInTenant() throws Exception {
        Actor superAdmin = Actor.superAdmin(Tenant.A);
        String body = "{\"projectCode\":\"ISO-A-X3%s\",\"name\":\"ISO-A probe\",\"startDate\":\"2031-01-01\","
                + "\"status\":\"PLANNED\",\"priority\":\"LOW\",\"projectManagerId\":\"%s\"}";
        MvcResult own = perform(as(superAdmin, post("/api/v1/projects").contentType(MediaType.APPLICATION_JSON)
                .content(body.formatted("1", Tenant.A.id(EMPLOYEE, 1)))));
        assertThat(status(own)).as("positive control -> %s", body(own)).isBetween(200, 299);
        MvcResult res = perform(as(superAdmin, post("/api/v1/projects").contentType(MediaType.APPLICATION_JSON)
                .content(body.formatted("2", Tenant.B.id(EMPLOYEE, 2)))));
        assertThat(status(res)).as("-> %s", body(res)).isEqualTo(404);
        String before = rowHash("projects", Tenant.A.id(PROJECT));
        MvcResult upd = perform(as(superAdmin, put("/api/v1/projects/" + Tenant.A.id(PROJECT)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"projectManagerId\":\"" + Tenant.B.id(EMPLOYEE, 2) + "\"}")));
        assertThat(status(upd)).as("-> %s", body(upd)).isEqualTo(404);
        assertThat(rowHash("projects", Tenant.A.id(PROJECT))).isEqualTo(before);
        assertThat(superuserJdbc().queryForObject("SELECT count(*) FROM projects WHERE tenant_id = ? AND project_manager_id = ?",
                Long.class, Tenant.A.id(), Tenant.B.id(EMPLOYEE, 2))).isZero();
    }

    private static String ids(String template, Tenant t, int n) {
        return template.replace("{EMP}", t.id(EMPLOYEE, 2).toString())
                .replace("{LT}", t.id(LEAVE_TYPE).toString())
                .replace("{JOB}", t.id(JOB_OPENING).toString())
                .replace("{SPACE}", t.id(WIKI_SPACE).toString())
                .replace("{DEPT}", t.id(DEPARTMENT).toString())
                .replace("{N}", String.format("%02d", n));
    }

    @Test
    @DisplayName("REGRESSION employee create / admin-update cannot attach tenant-B department or manager")
    void employeeReferencesMustStayInTenant() throws Exception {
        UUID bDept = Tenant.B.id(DEPARTMENT);
        UUID bEmp = Tenant.B.id(EMPLOYEE, 2);
        MvcResult create = perform(as(ATTACKER, post("/api/v1/employees").contentType(MediaType.APPLICATION_JSON).content(
                "{\"employeeCode\":\"ISOAX9\",\"firstName\":\"ISO-A\",\"workEmail\":\"iso-a-x9@iso.test\","
                        + "\"joiningDate\":\"2024-06-01\",\"designation\":\"ISO-A x\",\"employmentType\":\"FULL_TIME\","
                        + "\"password\":\"Iso-Synthetic-Pass-2031!\",\"departmentId\":\"" + bDept + "\",\"managerId\":\"" + bEmp + "\"}")));
        assertThat(status(create)).as("create with foreign refs -> %s", body(create)).isEqualTo(404);

        String before = rowHash("employees", Tenant.A.id(EMPLOYEE, 2));
        MvcResult update = perform(as(ATTACKER, put("/api/v1/employees/" + Tenant.A.id(EMPLOYEE, 2) + "/admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"departmentId\":\"" + bDept + "\",\"managerId\":\"" + bEmp + "\",\"dottedLineManager1Id\":\"" + bEmp + "\"}")));
        assertThat(status(update)).as("admin update with foreign refs -> %s", body(update)).isEqualTo(404);
        assertThat(rowHash("employees", Tenant.A.id(EMPLOYEE, 2))).isEqualTo(before);

        Long dangling = superuserJdbc().queryForObject("SELECT count(*) FROM employees WHERE tenant_id = ? AND "
                + "(department_id = ? OR manager_id = ? OR dotted_line_manager1_id = ?)", Long.class, Tenant.A.id(), bDept, bEmp, bEmp);
        assertThat(dangling).isZero();
    }

    @Test
    @DisplayName("POST into a tenant-B parent (comment, assignment, letter generation) is refused")
    void childCreateUnderForeignParentIsRefused() throws Exception {
        // {path, body, child table, fk column, parent placeholder[, SUPER = needs a permission only SUPER_ADMIN
        // holds in the cloned roles]}; own-tenant run first as positive control.
        String[][] attempts = {
                {"/api/v1/wall/posts/{POST}/comments", "{\"content\":\"ISO-A comment\"}", "post_comments", "post_id", "{POST}"},
                {"/api/v1/wall/posts/{POST}/reactions", "{\"reactionType\":\"LIKE\"}", "post_reactions", "post_id", "{POST}"},
                {"/api/v1/helpdesk/comments", "{\"ticketId\":\"{TICKET}\",\"comment\":\"ISO-A c\"}",
                        "ticket_comments", "ticket_id", "{TICKET}"},
                {"/api/v1/projects/{PROJECT}/assign", "{\"employeeId\":\"" + Tenant.A.id(EMPLOYEE, 1)
                        + "\",\"role\":\"DEVELOPER\",\"startDate\":\"2031-01-01\"}", "project_members", "project_id", "{PROJECT}", "SUPER"},
                {"/api/v1/letters/generate", "{\"templateId\":\"{TEMPLATE}\",\"employeeId\":\"" + Tenant.A.id(EMPLOYEE, 2) + "\"}",
                        "generated_letters", "template_id", "{TEMPLATE}"},
                // REGRESSION: used to answer 201 and create a tenant-A question on tenant B's survey.
                {"/api/v1/surveys/{SURVEY}/questions", "{\"questionText\":\"ISO-A q\",\"questionType\":\"TEXT\"}",
                        "pulse_survey_questions", "survey_id", "{SURVEY}"},
                {"/api/v1/knowledge/wiki/spaces/{SPACE}/members", "{\"userId\":\"" + Tenant.A.id(USER, 2)
                        + "\",\"role\":\"EDITOR\"}", "wiki_space_members", "space_id", "{SPACE}", "SUPER"}};
        for (String[] a : attempts) {
            Actor actor = a.length > 5 ? Actor.superAdmin(Tenant.A) : ATTACKER;
            MvcResult own = perform(as(actor, post(parents(a[0], Tenant.A)).contentType(MediaType.APPLICATION_JSON)
                    .content(parents(a[1], Tenant.A))));
            ownChildStatus.put(a[0], status(own));

            long inB = countInTenant(a[2], Tenant.B);
            MvcResult res = perform(as(actor, post(parents(a[0], Tenant.B)).contentType(MediaType.APPLICATION_JSON)
                    .content(parents(a[1], Tenant.B))));
            // Rows of any OTHER tenant pointing at tenant B's parent = cross-tenant reference.
            Long dangling = superuserJdbc().queryForObject("SELECT count(*) FROM " + a[2] + " WHERE " + a[3]
                    + " = ?::uuid AND tenant_id <> ?", Long.class, parents(a[4], Tenant.B), Tenant.B.id());
            assertThat(dangling).as("%s created a row under tenant B's parent (%s: %s)", a[0], status(res), body(res)).isZero();
            assertThat(countInTenant(a[2], Tenant.B)).as("%s wrote into tenant B", a[0]).isEqualTo(inB);
            assertThat(status(res)).as("%s -> %s", a[0], body(res)).isBetween(400, 499);
            assertThat(body(res)).doesNotContain(Tenant.B.marker());
        }
        // Positive controls: the same calls against the caller's own parents are accepted, so the
        // refusals above come from tenancy, not from an invalid body.
        assertThat(ownChildStatus).allSatisfy((path, st) -> assertThat(st).as("own %s", path).isBetween(200, 299));
    }

    @Test
    @DisplayName("REGRESSION a tenant-B user cannot be made a member of a tenant-A wiki space")
    void foreignUserCannotJoinOwnSpace() throws Exception {
        MvcResult res = perform(as(Actor.superAdmin(Tenant.A), post("/api/v1/knowledge/wiki/spaces/" + Tenant.A.id(WIKI_SPACE)
                + "/members").contentType(MediaType.APPLICATION_JSON)
                .content("{\"userId\":\"" + Tenant.B.id(USER, 2) + "\",\"role\":\"VIEWER\"}")));
        assertThat(status(res)).as("-> %s", body(res)).isEqualTo(404);
        assertThat(superuserJdbc().queryForObject("SELECT count(*) FROM wiki_space_members WHERE user_id = ? AND tenant_id <> ?",
                Long.class, Tenant.B.id(USER, 2), Tenant.B.id())).isZero();
    }

    private final java.util.Map<String, Integer> ownChildStatus = new java.util.TreeMap<>();

    private static String parents(String template, Tenant t) {
        return template.replace("{POST}", t.id(WALL_POST).toString())
                .replace("{TICKET}", t.id(TICKET).toString())
                .replace("{PROJECT}", t.id(PROJECT).toString())
                .replace("{TEMPLATE}", t.id(LETTER_TEMPLATE).toString())
                .replace("{SURVEY}", t.id(PULSE_SURVEY).toString())
                .replace("{SPACE}", t.id(WIKI_SPACE).toString());
    }

    @Test
    @DisplayName("bulk endpoints skip/refuse tenant-B ids mixed into the batch")
    void bulkEndpointsIgnoreForeignIds() throws Exception {
        String lr = rowHash("leave_requests", Tenant.B.id(LEAVE_REQUEST));
        String ec = rowHash("expense_claims", Tenant.B.id(EXPENSE_CLAIM));
        String emp = rowHash("employees", Tenant.B.id(EMPLOYEE, 2));
        perform(as(ATTACKER, post("/api/v1/leave-requests/batch-approve").contentType(MediaType.APPLICATION_JSON)
                .content("{\"leaveRequestIds\":[\"" + Tenant.B.id(LEAVE_REQUEST) + "\"]}")));
        perform(as(ATTACKER, post("/api/v1/leave-requests/batch-reject").contentType(MediaType.APPLICATION_JSON)
                .content("{\"leaveRequestIds\":[\"" + Tenant.B.id(LEAVE_REQUEST) + "\"],\"reason\":\"x\"}")));
        perform(as(ATTACKER, post("/api/v1/expenses/batch-approve").contentType(MediaType.APPLICATION_JSON)
                .content("{\"claimIds\":[\"" + Tenant.B.id(EXPENSE_CLAIM) + "\"]}")));
        perform(as(ATTACKER, post("/api/v1/expenses/batch-reject").contentType(MediaType.APPLICATION_JSON)
                .content("{\"claimIds\":[\"" + Tenant.B.id(EXPENSE_CLAIM) + "\"],\"reason\":\"x\"}")));
        MvcResult status = perform(as(ATTACKER, post("/api/v1/employees/batch-status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeIds\":[\"" + Tenant.B.id(EMPLOYEE, 2) + "\"],\"status\":\"TERMINATED\"}")));
        assertThat(body(status)).doesNotContain(Tenant.B.marker());
        assertThat(rowHash("leave_requests", Tenant.B.id(LEAVE_REQUEST))).isEqualTo(lr);
        assertThat(rowHash("expense_claims", Tenant.B.id(EXPENSE_CLAIM))).isEqualTo(ec);
        assertThat(rowHash("employees", Tenant.B.id(EMPLOYEE, 2))).isEqualTo(emp);
    }

    // ── helpers ──────────────────────────────────────────────────────────────────────────────

    private MockHttpServletRequestBuilder mutation(ApiResource resource, Tenant owner) {
        String[] spec = resource.mutation().split("\\|", 2);
        String[] methodAndPath = spec[0].split(" ", 2);
        MockHttpServletRequestBuilder r = request(HttpMethod.valueOf(methodAndPath[0]),
                methodAndPath[1].replace("{id}", resource.id(owner).toString()));
        return spec[1].isEmpty() ? r : r.contentType(MediaType.APPLICATION_JSON).content(spec[1]);
    }

    private static void assertDeniedAndUnchanged(MvcResult res, String table, UUID id, String before, String what)
            throws Exception {
        assertThat(rowHash(table, id)).as("%s modified tenant B's row (status %s: %s)", what, status(res), body(res))
                .isEqualTo(before);
        assertThat(status(res)).as("%s must be refused: %s", what, body(res)).isBetween(400, 499);
        assertThat(body(res)).doesNotContain(Tenant.B.marker());
    }

    /** md5 of the full row as the superuser sees it; null once the row is gone. */
    static String rowHash(String table, UUID id) {
        List<String> h = superuserJdbc().queryForList(
                "SELECT md5(row_to_json(t)::text) FROM " + table + " t WHERE id = ?", String.class, id);
        return h.isEmpty() ? null : h.get(0);
    }

    private static UUID ownerOf(String table, UUID id) {
        return superuserJdbc().queryForObject("SELECT tenant_id FROM " + table + " WHERE id = ?", UUID.class, id);
    }

    private static long countInTenant(String table, Tenant t) {
        return superuserJdbc().queryForObject("SELECT count(*) FROM " + table + " WHERE tenant_id = ?", Long.class, t.id());
    }
}
