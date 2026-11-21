package com.nulogic.integration.isolation;

import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static com.nulogic.integration.isolation.TwoTenantFixture.EXPENSE_CLAIM;
import static com.nulogic.integration.isolation.TwoTenantFixture.EXPENSE_ITEM;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Phase 3 #5: child resources addressed through a parent path, including the parent/child
 * mismatch (own parent id in the path, other tenant's child id) and receipt downloads.
 */
@DisplayName("Tenant isolation: nested resources and receipt download (Phase 3 #5)")
class TenantIsolationNestedResourceTest extends AbstractTenantIsolationIntegrationTest {

    private static final Actor ATTACKER = Actor.admin(Tenant.A);

    private static String items(Tenant claimOwner) {
        return "/api/v1/expenses/claims/" + claimOwner.id(EXPENSE_CLAIM) + "/items";
    }

    @Test
    @DisplayName("expense items: own claim lists own item; other tenant's claim/item never readable, writable or downloadable")
    void expenseItemsAndReceipts() throws Exception {
        MvcResult own = perform(as(ATTACKER, get(items(Tenant.A))));
        assertThat(status(own)).as(body(own)).isEqualTo(200);
        assertThat(body(own)).contains(Tenant.A.id(EXPENSE_ITEM).toString());

        String bItem = Tenant.B.id(EXPENSE_ITEM).toString();
        String before = TenantIsolationWriteApiTest.rowHash("expense_items", Tenant.B.id(EXPENSE_ITEM));
        String[] reads = {items(Tenant.B), items(Tenant.B) + "/" + bItem + "/receipt", items(Tenant.A) + "/" + bItem + "/receipt"};
        for (String path : reads) {
            MvcResult res = perform(as(ATTACKER, get(path)));
            assertThat(body(res)).as(path).doesNotContain(Tenant.B.marker()).doesNotContain("iso-b-receipt");
            if (path.endsWith("/receipt")) {
                assertThat(status(res)).as("%s -> %s", path, body(res)).isBetween(400, 499);
            }
        }
        // Parent/child mismatch: A's claim in the path, B's item id.
        MvcResult upd = perform(as(ATTACKER, put(items(Tenant.A) + "/" + bItem).contentType(MediaType.APPLICATION_JSON)
                .content("{\"description\":\"ISO-A pwned\",\"amount\":1,\"expenseDate\":\"2026-01-01\"}")));
        MvcResult del = perform(as(ATTACKER, delete(items(Tenant.A) + "/" + bItem)));
        MvcResult delB = perform(as(ATTACKER, delete(items(Tenant.B) + "/" + bItem)));
        for (MvcResult r : new MvcResult[]{upd, del, delB}) {
            assertThat(status(r)).as(body(r)).isBetween(400, 499);
        }
        assertThat(TenantIsolationWriteApiTest.rowHash("expense_items", Tenant.B.id(EXPENSE_ITEM))).isEqualTo(before);
    }
}
