package com.nulogic.integration;

import com.nulogic.common.entity.TenantAware;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.expense.ExpenseClaim;
import com.nulogic.domain.expense.ExpenseItem;
import com.nulogic.infrastructure.expense.repository.ExpenseClaimRepository;
import com.nulogic.infrastructure.expense.repository.ExpenseItemRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression for the defect found while verifying BUG-E1 end to end: adding ANY item to an
 * expense claim failed for every user with
 *
 * <pre>null value in column "tenant_id" of relation "expense_items" violates not-null constraint</pre>
 *
 * <p>{@code expense_items.tenant_id} is NOT NULL (V88), but {@link ExpenseItem} extended
 * {@code BaseEntity}, which carries no tenant column and no {@code TenantEntityListener}, so the
 * INSERT never supplied one. Every unit test in the module mocks the repository, so nothing
 * caught it — only a real INSERT does. This test does a real INSERT.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("ExpenseItem tenant stamping — real Postgres INSERT")
class ExpenseItemTenantStampingTest extends AbstractPostgresIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");

    @Autowired
    ExpenseItemRepository itemRepository;

    @Autowired
    ExpenseClaimRepository claimRepository;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_ID);
        jdbcTemplate.execute("SELECT set_config('app.current_tenant_id', '" + TENANT_ID + "', true)");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("ExpenseItem is TenantAware so the listener can stamp tenant_id")
    void expenseItemIsTenantAware() {
        assertThat(TenantAware.class)
                .as("expense_items.tenant_id is NOT NULL; a BaseEntity-only mapping can never satisfy it")
                .isAssignableFrom(ExpenseItem.class);
    }

    @Test
    @DisplayName("saving an item stamps tenant_id from TenantContext instead of violating NOT NULL")
    void savingAnItemStampsTenantId() {
        // A real parent claim: expense_items.expense_claim_id is a FK, and expense_claims
        // has its own FK to employees — so borrow a seeded employee of this tenant.
        UUID employeeId = jdbcTemplate.queryForObject(
                "SELECT id FROM employees WHERE tenant_id = ? LIMIT 1", UUID.class, TENANT_ID);
        org.junit.jupiter.api.Assumptions.assumeTrue(employeeId != null,
                "no seeded employee in this tenant to hang a claim off");

        ExpenseClaim claim = new ExpenseClaim();
        claim.setEmployeeId(employeeId);
        claim.setClaimNumber("EXP-TEST-" + UUID.randomUUID().toString().substring(0, 8));
        claim.setClaimDate(LocalDate.of(2026, 9, 1));
        claim.setCategory(ExpenseClaim.ExpenseCategory.MEALS);
        claim.setDescription("tenant stamping fixture");
        claim.setAmount(new BigDecimal("100.00"));
        claim.setCurrency("INR");
        ExpenseClaim savedClaim = claimRepository.saveAndFlush(claim);

        ExpenseItem item = new ExpenseItem();
        item.setExpenseClaimId(savedClaim.getId());
        item.setDescription("Team lunch");
        item.setAmount(new BigDecimal("100.00"));
        item.setCurrency("INR");
        item.setExpenseDate(LocalDate.of(2026, 9, 1));
        item.setReceiptStoragePath(TENANT_ID + "/receipts/x/lunch.pdf");
        item.setReceiptFileName("lunch.pdf");

        ExpenseItem saved = itemRepository.saveAndFlush(item);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getTenantId()).isEqualTo(TENANT_ID);
        // The receipt columns BUG-E1 added round-trip with it.
        assertThat(saved.getReceiptFileName()).isEqualTo("lunch.pdf");
        assertThat(saved.getReceiptStoragePath()).isEqualTo(TENANT_ID + "/receipts/x/lunch.pdf");
    }
}
