package com.nulogic.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.api.expense.dto.ExpenseClaimRequest;
import com.nulogic.api.expense.dto.ExpenseItemRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.expense.ExpenseClaim;
import com.nulogic.domain.expense.ExpenseItem;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.expense.repository.ExpenseClaimRepository;
import com.nulogic.infrastructure.expense.repository.ExpenseItemRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * SEC-E1..SEC-E4 regression suite for the expense-item endpoints, driven through the real
 * controller + PermissionAspect + service stack against a real Postgres.
 *
 * <p>Background. The 2026-09-25 review found that {@code updateItem}, {@code getItemsByClaimId}
 * and {@code openReceipt} had been given a claim-ownership gate while the two sibling mutating
 * paths had not:
 * <ul>
 *   <li>{@code POST .../claims/{claimId}/items} resolved the claim by (claimId, tenantId) only,
 *       so any holder of EXPENSE:CREATE could append line items to another employee's DRAFT
 *       claim and inflate a total that employee was about to submit.</li>
 *   <li>{@code DELETE .../claims/{claimId}/items/{itemId}} accepted the {claimId} path variable
 *       and discarded it, and never checked the owner — so any item in the tenant attached to a
 *       DRAFT claim could be destroyed through any claim id.</li>
 * </ul>
 *
 * <p>Every test here uses a SELF-scoped EMPLOYEE, which is exactly what V96/V66 seed for the
 * EMPLOYEE role (EXPENSE:CREATE = SELF, EXPENSE:VIEW = SELF — verified against the migrated
 * schema). Tenant scoping is deliberately NOT the thing under test: victim and attacker share a
 * tenant, because same-tenant cross-employee reach was the actual defect.
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("SEC-E1..E4: expense-item authorization")
class ExpenseItemAuthorizationIntegrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final String BASE = "/api/v1/expenses/claims";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private ExpenseClaimRepository claimRepository;
    @Autowired
    private ExpenseItemRepository itemRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private UUID attackerEmployeeId;
    private UUID victimEmployeeId;
    private ExpenseClaim attackerClaim;
    private ExpenseClaim victimClaim;
    private ExpenseItem victimItem;
    private ExpenseItem attackerItem;

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);

        attackerEmployeeId = createEmployee("ATTACKER");
        victimEmployeeId = createEmployee("VICTIM");

        attackerClaim = createDraftClaim(attackerEmployeeId, "Attacker's own claim");
        victimClaim = createDraftClaim(victimEmployeeId, "Victim's claim");
        attackerItem = createItem(attackerClaim.getId(), "Attacker's own line");
        victimItem = createItem(victimClaim.getId(), "Victim's line");

        loginAsSelfScopedEmployee(attackerEmployeeId);
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    // ───────────────────────── SEC-E4: cross-employee ADD ─────────────────────────

    @Nested
    @DisplayName("SEC-E4 — POST items")
    class AddItem {

        @Test
        @DisplayName("an EMPLOYEE cannot add an item to another employee's DRAFT claim")
        void cannotAddItemToAnotherEmployeesDraftClaim() throws Exception {
            long before = itemRepository.findAllByExpenseClaimId(victimClaim.getId()).size();

            mockMvc.perform(post(BASE + "/{claimId}/items", victimClaim.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest())))
                    .andExpect(status().isForbidden());

            assertThat(itemRepository.findAllByExpenseClaimId(victimClaim.getId()))
                    .as("the victim's claim must be untouched")
                    .hasSize((int) before);
        }

        @Test
        @DisplayName("an EMPLOYEE can still add an item to their own DRAFT claim")
        void canAddItemToOwnDraftClaim() throws Exception {
            mockMvc.perform(post(BASE + "/{claimId}/items", attackerClaim.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest())))
                    .andExpect(status().isCreated());
        }
    }

    // ───────────────────────── SEC-E3/E4: cross-employee DELETE ────────────────────

    @Nested
    @DisplayName("SEC-E3/E4 — DELETE items")
    class DeleteItem {

        @Test
        @DisplayName("an EMPLOYEE cannot delete another employee's DRAFT item")
        void cannotDeleteAnotherEmployeesItem() throws Exception {
            mockMvc.perform(delete(BASE + "/{claimId}/items/{itemId}",
                            victimClaim.getId(), victimItem.getId()))
                    .andExpect(status().isForbidden());

            assertThat(rowExists(victimItem.getId()))
                    .as("the victim's item must survive")
                    .isTrue();
        }

        @Test
        @DisplayName("routing the delete through the attacker's OWN claim id does not help")
        void cannotDeleteAnotherEmployeesItemViaOwnClaimId() throws Exception {
            // The pre-fix code ignored {claimId} entirely, so this was the cheapest exploit:
            // quote a claim you own, name any item id in the tenant.
            mockMvc.perform(delete(BASE + "/{claimId}/items/{itemId}",
                            attackerClaim.getId(), victimItem.getId()))
                    .andExpect(status().isNotFound());

            assertThat(rowExists(victimItem.getId())).isTrue();
        }

        @Test
        @DisplayName("an EMPLOYEE can still delete their own DRAFT item")
        void canDeleteOwnItem() throws Exception {
            mockMvc.perform(delete(BASE + "/{claimId}/items/{itemId}",
                            attackerClaim.getId(), attackerItem.getId()))
                    .andExpect(status().isNoContent());

            assertThat(rowExists(attackerItem.getId())).isFalse();
        }
    }

    // ───────────────────────── SEC-E2: cross-employee READ ─────────────────────────

    @Nested
    @DisplayName("SEC-E2 — GET items")
    class ListItems {

        @Test
        @DisplayName("an EMPLOYEE cannot list another employee's claim items")
        void cannotListAnotherEmployeesItems() throws Exception {
            mockMvc.perform(get(BASE + "/{claimId}/items", victimClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("an EMPLOYEE can still list their own claim items")
        void canListOwnItems() throws Exception {
            mockMvc.perform(get(BASE + "/{claimId}/items", attackerClaim.getId()))
                    .andExpect(status().isOk());
        }
    }

    // ───────────────────────── SEC-E1: receipt path tampering ──────────────────────

    @Nested
    @DisplayName("SEC-E1 — receipt storage paths")
    class ReceiptPaths {

        @Test
        @DisplayName("a receipt path pointing at the payslips area is rejected")
        void rejectsPayslipPath() throws Exception {
            assertReceiptPathRejected(TENANT_ID + "/payslips/" + victimEmployeeId + "/march.pdf");
        }

        @Test
        @DisplayName("a receipt path belonging to another tenant is rejected")
        void rejectsForeignTenantPath() throws Exception {
            assertReceiptPathRejected(UUID.randomUUID() + "/receipts/x/lunch.pdf");
        }

        @Test
        @DisplayName("a traversal receipt path is rejected outright, not normalised")
        void rejectsTraversalPath() throws Exception {
            assertReceiptPathRejected(TENANT_ID + "/receipts/../payslips/march.pdf");
        }

        @Test
        @DisplayName("a legitimate receipts path in the caller's tenant is accepted")
        void acceptsOwnReceiptsPath() throws Exception {
            ExpenseItemRequest request = validRequest();
            request.setReceiptStoragePath(TENANT_ID + "/receipts/" + attackerClaim.getId() + "/1699_ab.pdf");
            request.setReceiptFileName("lunch.pdf");

            mockMvc.perform(post(BASE + "/{claimId}/items", attackerClaim.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        private void assertReceiptPathRejected(String storagePath) throws Exception {
            ExpenseItemRequest request = validRequest();
            request.setReceiptStoragePath(storagePath);
            request.setReceiptFileName("whatever.pdf");

            // Own claim on purpose: the ownership gate must not be what rejects this — the
            // path validation has to stand on its own.
            mockMvc.perform(post(BASE + "/{claimId}/items", attackerClaim.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    // ────────────────── SEC-E5/E6/E7: claim-level authorization ────────────────────

    /**
     * The claim-level counterpart of the item tests above. The item paths were gated in the
     * 2026-09-25 pass; the claim paths they hang off were not:
     * <ul>
     *   <li><b>SEC-E5</b> — {@code POST /expenses/employees/{employeeId}} took the employee id
     *       straight from the path. EXPENSE:CREATE is a baseline employee grant, so any employee
     *       could open a DRAFT claim in a colleague's name — the same reach SEC-E4 closed for
     *       line items, one level up.</li>
     *   <li><b>SEC-E6</b> — update / submit / cancel / delete read their scope from
     *       EXPENSE:VIEW. A read scope authorized a mutation, and TENANT_ADMIN (which holds
     *       EXPENSE:VIEW_ALL but not the literal EXPENSE:VIEW) was denied its own endpoints.</li>
     *   <li><b>SEC-E7</b> — the single-claim read hardcoded EXPENSE:VIEW and denied
     *       TENANT_ADMIN for the same reason.</li>
     * </ul>
     */
    @Nested
    @DisplayName("SEC-E5/E6/E7 — claim-level authorization")
    class ClaimLevelAuthorization {

        private static final String CLAIMS = "/api/v1/expenses";

        @Test
        @DisplayName("SEC-E5: an EMPLOYEE cannot open a claim in another employee's name")
        void cannotCreateClaimForAnotherEmployee() throws Exception {
            int before = claimCountFor(victimEmployeeId);

            mockMvc.perform(post(CLAIMS + "/employees/{employeeId}", victimEmployeeId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validClaimRequest())))
                    .andExpect(status().isForbidden());

            assertThat(claimCountFor(victimEmployeeId))
                    .as("no claim may be created against the victim")
                    .isEqualTo(before);
        }

        @Test
        @DisplayName("SEC-E5: an EMPLOYEE can still open their own claim")
        void canCreateOwnClaim() throws Exception {
            int before = claimCountFor(attackerEmployeeId);

            mockMvc.perform(post(CLAIMS + "/employees/{employeeId}", attackerEmployeeId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validClaimRequest())))
                    .andExpect(status().isCreated());

            assertThat(claimCountFor(attackerEmployeeId)).isEqualTo(before + 1);
        }

        @Test
        @DisplayName("SEC-E6: an EMPLOYEE cannot update another employee's DRAFT claim")
        void cannotUpdateAnotherEmployeesClaim() throws Exception {
            mockMvc.perform(put(CLAIMS + "/{claimId}", victimClaim.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validClaimRequest())))
                    .andExpect(status().isForbidden());

            assertThat(claimDescription(victimClaim.getId()))
                    .as("the victim's claim must be unmodified")
                    .isEqualTo("Victim's claim");
        }

        @Test
        @DisplayName("SEC-E6: an EMPLOYEE cannot submit another employee's claim into approval")
        void cannotSubmitAnotherEmployeesClaim() throws Exception {
            mockMvc.perform(post(CLAIMS + "/{claimId}/submit", victimClaim.getId()))
                    .andExpect(status().isForbidden());

            assertThat(claimStatus(victimClaim.getId()))
                    .as("the victim's claim must still be a DRAFT they control")
                    .isEqualTo("DRAFT");
        }

        @Test
        @DisplayName("SEC-E6: an EMPLOYEE cannot cancel another employee's claim")
        void cannotCancelAnotherEmployeesClaim() throws Exception {
            mockMvc.perform(post(CLAIMS + "/{claimId}/cancel", victimClaim.getId()))
                    .andExpect(status().isForbidden());

            assertThat(claimStatus(victimClaim.getId())).isEqualTo("DRAFT");
        }

        @Test
        @DisplayName("SEC-E6: an EMPLOYEE cannot delete another employee's claim")
        void cannotDeleteAnotherEmployeesClaim() throws Exception {
            mockMvc.perform(delete(CLAIMS + "/{claimId}", victimClaim.getId()))
                    .andExpect(status().isForbidden());

            assertThat(claimExists(victimClaim.getId()))
                    .as("the victim's claim must survive")
                    .isTrue();
        }

        @Test
        @DisplayName("SEC-E6: an EMPLOYEE can still update their own claim")
        void canMutateOwnClaim() throws Exception {
            mockMvc.perform(put(CLAIMS + "/{claimId}", attackerClaim.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validClaimRequest())))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("SEC-E6: submitting one's OWN claim is not blocked by the authorization gate")
        void submitOfOwnClaimPassesAuthorization() throws Exception {
            // Asserts the authorization outcome only, not the submit outcome. Submitting a claim
            // starts an approval workflow, and the seeded definition resolves a REPORTING_MANAGER
            // approver that these synthetic employees do not have — so this returns 400
            // ("Unable to determine approver for step 'Manager Approval'") in the test schema.
            // That is a workflow-configuration concern, not an authorization one. Pinning 403 vs
            // not-403 is the property under test here; asserting 200 would couple this security
            // test to approval-chain seed data and make it fail for the wrong reason.
            int status = mockMvc.perform(post(CLAIMS + "/{claimId}/submit", attackerClaim.getId()))
                    .andReturn().getResponse().getStatus();

            assertThat(status)
                    .as("the owner must clear the EXPENSE:CREATE scope gate on their own claim")
                    .isNotEqualTo(403);
        }

        @Test
        @DisplayName("SEC-E6: TENANT_ADMIN can mutate a claim while holding VIEW_ALL and no literal EXPENSE:VIEW")
        void tenantAdminCanMutateWithoutLiteralExpenseView() throws Exception {
            loginAsTenantAdmin();

            mockMvc.perform(put(CLAIMS + "/{claimId}", victimClaim.getId())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validClaimRequest())))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("SEC-E6: TENANT_ADMIN can delete a DRAFT claim without the literal EXPENSE:VIEW")
        void tenantAdminCanDeleteWithoutLiteralExpenseView() throws Exception {
            loginAsTenantAdmin();

            mockMvc.perform(delete(CLAIMS + "/{claimId}", victimClaim.getId()))
                    .andExpect(status().isNoContent());

            assertThat(claimExists(victimClaim.getId())).isFalse();
        }

        @Test
        @DisplayName("SEC-E7: TENANT_ADMIN can read a claim without the literal EXPENSE:VIEW")
        void tenantAdminCanReadWithoutLiteralExpenseView() throws Exception {
            loginAsTenantAdmin();

            mockMvc.perform(get(CLAIMS + "/{claimId}", victimClaim.getId()))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("SEC-E7: an EMPLOYEE still cannot read another employee's claim")
        void employeeCannotReadAnotherEmployeesClaim() throws Exception {
            mockMvc.perform(get(CLAIMS + "/{claimId}", victimClaim.getId()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("SEC-E5: a VIEW-only caller holding no EXPENSE:CREATE cannot create at all")
        void viewOnlyCallerCannotCreate() throws Exception {
            loginAsViewOnly();

            // The controller's own @RequiresPermission(EXPENSE:CREATE) stops this first; the
            // service gate behind it is asserted by the unit tests. Either way: forbidden.
            mockMvc.perform(post(CLAIMS + "/employees/{employeeId}", victimEmployeeId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validClaimRequest())))
                    .andExpect(status().isForbidden());
        }

        private ExpenseClaimRequest validClaimRequest() {
            ExpenseClaimRequest request = new ExpenseClaimRequest();
            request.setClaimDate(LocalDate.now());
            request.setCategory(ExpenseClaim.ExpenseCategory.TRAVEL);
            request.setDescription("Conference travel");
            request.setAmount(new BigDecimal("250.00"));
            request.setCurrency("INR");
            return request;
        }
    }

    // ───────────────────────────────── fixtures ────────────────────────────────────

    /**
     * "Is this item still live?" — read through JDBC rather than the repository, because these
     * assertions run inside the test's own transaction where a repository lookup can be answered
     * from the persistence context.
     *
     * <p>Two details the naive form gets wrong: JPA defers the delete until flush, and
     * ExpenseItem is soft-deleted (the row stays, {@code is_deleted} flips, and
     * {@code @SQLRestriction("is_deleted = false")} hides it), so a plain {@code count(*)} on the
     * id reports a deleted item as present.</p>
     */
    private boolean rowExists(UUID itemId) {
        itemRepository.flush();
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM expense_items WHERE id = ? AND is_deleted = false",
                Integer.class, itemId);
        return count != null && count > 0;
    }

    private ExpenseItemRequest validRequest() {
        ExpenseItemRequest request = new ExpenseItemRequest();
        request.setDescription("Team lunch");
        request.setAmount(new BigDecimal("100.00"));
        request.setExpenseDate(LocalDate.now().minusDays(1));
        request.setCurrency("INR");
        return request;
    }

    /**
     * expense_claims.employee_id is FK-constrained, so both actors have to be real rows.
     * They share a tenant on purpose — cross-tenant reach was never the defect here.
     */
    private UUID createEmployee(String codePrefix) {
        UUID employeeId = UUID.randomUUID();

        User user = User.builder()
                .email(codePrefix.toLowerCase() + "-" + employeeId.toString().substring(0, 8) + "@example.com")
                .firstName("Test")
                .lastName(codePrefix)
                .passwordHash("test-hash")
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setTenantId(TENANT_ID);
        User savedUser = userRepository.saveAndFlush(user);

        jdbcTemplate.update(
                "INSERT INTO employees ("
                        + "id, tenant_id, employee_code, user_id, first_name, last_name, "
                        + "joining_date, employment_type, status, "
                        + "created_at, updated_at, version, is_deleted) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, 'FULL_TIME', 'ACTIVE', NOW(), NOW(), 0, false) "
                        + "ON CONFLICT (id) DO NOTHING",
                employeeId,
                TENANT_ID,
                codePrefix + "-" + employeeId.toString().substring(0, 6),
                savedUser.getId(),
                "Test",
                codePrefix,
                LocalDate.now().minusDays(30));

        return employeeId;
    }

    private ExpenseClaim createDraftClaim(UUID employeeId, String description) {
        ExpenseClaim claim = ExpenseClaim.builder()
                .employeeId(employeeId)
                .claimNumber("EXP-" + UUID.randomUUID().toString().substring(0, 8))
                .claimDate(LocalDate.now())
                .category(ExpenseClaim.ExpenseCategory.TRAVEL)
                .description(description)
                .amount(BigDecimal.valueOf(500.00))
                .currency("INR")
                .status(ExpenseClaim.ExpenseStatus.DRAFT)
                .build();
        claim.setTenantId(TENANT_ID);
        return claimRepository.saveAndFlush(claim);
    }

    private ExpenseItem createItem(UUID claimId, String description) {
        ExpenseItem item = ExpenseItem.builder()
                .expenseClaimId(claimId)
                .description(description)
                .amount(new BigDecimal("50.00"))
                .currency("INR")
                .expenseDate(LocalDate.now().minusDays(1))
                .build();
        item.setTenantId(TENANT_ID);
        return itemRepository.saveAndFlush(item);
    }

    /**
     * Exactly the EMPLOYEE grant the migrated schema seeds: EXPENSE:CREATE and EXPENSE:VIEW,
     * both at SELF. No EXPENSE:VIEW_TEAM / VIEW_ALL — an employee holds neither.
     */
    private void loginAsSelfScopedEmployee(UUID employeeId) {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.SELF);
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.SELF);

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("EMPLOYEE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    /**
     * TENANT_ADMIN as the migrations actually seed it: EXPENSE:VIEW_ALL and EXPENSE:CREATE at ALL
     * scope, and NOT the literal EXPENSE:VIEW code. Any path that hardcodes EXPENSE:VIEW reads a
     * null scope for this user and denies them.
     */
    private void loginAsTenantAdmin() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_VIEW_ALL, RoleScope.ALL);
        permissions.put(Permission.EXPENSE_CREATE, RoleScope.ALL);

        SecurityContext.setCurrentUser(UUID.randomUUID(), attackerEmployeeId, Set.of("TENANT_ADMIN"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    /** Broad read reach, no write permission at all — the shape SEC-E6 used to let through. */
    private void loginAsViewOnly() {
        Map<String, RoleScope> permissions = new HashMap<>();
        permissions.put(Permission.EXPENSE_VIEW_ALL, RoleScope.ALL);
        permissions.put(Permission.EXPENSE_VIEW, RoleScope.ALL);

        SecurityContext.setCurrentUser(UUID.randomUUID(), attackerEmployeeId, Set.of("HR_EXECUTIVE"), permissions);
        SecurityContext.setCurrentTenantId(TENANT_ID);
    }

    private int claimCountFor(UUID employeeId) {
        claimRepository.flush();
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM expense_claims WHERE employee_id = ? AND is_deleted = false",
                Integer.class, employeeId);
        return count == null ? 0 : count;
    }

    private boolean claimExists(UUID claimId) {
        claimRepository.flush();
        Integer count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM expense_claims WHERE id = ? AND is_deleted = false",
                Integer.class, claimId);
        return count != null && count > 0;
    }

    private String claimDescription(UUID claimId) {
        claimRepository.flush();
        return jdbcTemplate.queryForObject(
                "SELECT description FROM expense_claims WHERE id = ?", String.class, claimId);
    }

    private String claimStatus(UUID claimId) {
        claimRepository.flush();
        return jdbcTemplate.queryForObject(
                "SELECT status FROM expense_claims WHERE id = ?", String.class, claimId);
    }
}
