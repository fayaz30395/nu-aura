package com.nulogic.integration.isolation;

import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.UUID;

import static com.nulogic.integration.isolation.TwoTenantFixture.NOTIFICATION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Same-tenant notification ownership: a notification belongs to one user, so another user of the
 * SAME tenant (any role) must get 404 on it, exactly as for an id that does not exist (no existence
 * oracle), and the owner's row must stay byte-for-byte unchanged.
 */
@DisplayName("Tenant isolation: notifications are owner-only inside one tenant")
class TenantIsolationNotificationOwnershipTest extends AbstractTenantIsolationIntegrationTest {

    private static final Actor EMPLOYEE_A = Actor.employee(Tenant.A);
    private static final Actor ADMIN_A = Actor.admin(Tenant.A);
    private static final String BASE = "/api/v1/notifications";

    @Test
    @DisplayName("another user of the same tenant gets 404 on GET/DELETE/mark-read and the row is untouched")
    void sameTenantNonOwnerIsRefused() throws Exception {
        String marker = "ISO-OWN-" + UUID.randomUUID();
        UUID victim = insertNotification(ADMIN_A, marker);
        String before = rowHash(victim);

        for (MockHttpServletRequestBuilder attempt : List.of(get(BASE + "/" + victim), delete(BASE + "/" + victim),
                put(BASE + "/" + victim + "/read"))) {
            MvcResult res = perform(as(EMPLOYEE_A, attempt));
            assertThat(status(res)).as("%s by non-owner: %s", attempt, body(res)).isEqualTo(404);
            assertThat(body(res)).doesNotContain(marker);
            assertThat(rowHash(victim)).as("%s modified the owner's row", attempt).isEqualTo(before);
        }
    }

    @Test
    @DisplayName("tenant admin is not the owner either: 404 on another user's notification")
    void adminIsNotOwner() throws Exception {
        String marker = "ISO-OWN-" + UUID.randomUUID();
        UUID victim = insertNotification(EMPLOYEE_A, marker);
        String before = rowHash(victim);

        for (MockHttpServletRequestBuilder attempt : List.of(get(BASE + "/" + victim), delete(BASE + "/" + victim))) {
            MvcResult res = perform(as(ADMIN_A, attempt));
            assertThat(status(res)).as("%s by admin: %s", attempt, body(res)).isEqualTo(404);
            assertThat(body(res)).doesNotContain(marker);
        }
        assertThat(rowHash(victim)).isEqualTo(before);
    }

    @Test
    @DisplayName("bulk/list endpoints of a non-owner never show or change the owner's rows")
    void bulkAndListAreOwnerScoped() throws Exception {
        String marker = "ISO-OWN-" + UUID.randomUUID();
        UUID victim = insertNotification(ADMIN_A, marker);
        String before = rowHash(victim);

        for (String path : List.of(BASE, BASE + "/unread", BASE + "/recent", BASE + "/my")) {
            MvcResult res = perform(as(EMPLOYEE_A, get(path)));
            assertThat(status(res)).as("GET %s: %s", path, body(res)).isEqualTo(200);
            assertThat(body(res)).as("GET %s leaked another user's notification", path).doesNotContain(marker);
        }
        for (String path : List.of(BASE + "/read-all", BASE + "/my/read-all")) {
            MvcResult res = perform(as(EMPLOYEE_A, put(path)));
            assertThat(status(res)).as("PUT %s: %s", path, body(res)).isEqualTo(200);
        }
        assertThat(rowHash(victim)).as("read-all by non-owner changed the owner's row").isEqualTo(before);

        long ownUnread = superuserJdbc().queryForObject(
                "SELECT count(*) FROM notifications WHERE tenant_id = ? AND user_id = ? AND is_read = false",
                Long.class, Tenant.A.id(), EMPLOYEE_A.userId());
        MvcResult count = perform(as(EMPLOYEE_A, get(BASE + "/unread/count")));
        assertThat(body(count)).isEqualTo(Long.toString(ownUnread));
    }

    @Test
    @DisplayName("random and cross-tenant ids answer 404, same as a non-owned id")
    void unknownAndCrossTenantIdsAre404() throws Exception {
        UUID random = UUID.randomUUID();
        UUID otherTenant = Tenant.B.id(NOTIFICATION);
        String before = rowHash(otherTenant);
        for (UUID id : List.of(random, otherTenant)) {
            assertThat(status(perform(as(EMPLOYEE_A, get(BASE + "/" + id))))).as("GET %s", id).isEqualTo(404);
            assertThat(status(perform(as(EMPLOYEE_A, delete(BASE + "/" + id))))).as("DELETE %s", id).isEqualTo(404);
            assertThat(status(perform(as(EMPLOYEE_A, put(BASE + "/" + id + "/read"))))).as("read %s", id).isEqualTo(404);
        }
        assertThat(rowHash(otherTenant)).isEqualTo(before);
    }

    @Test
    @DisplayName("positive control: the owner reads, lists and deletes their own notification")
    void ownerKeepsAccess() throws Exception {
        for (Actor owner : List.of(EMPLOYEE_A, ADMIN_A)) {
            String marker = "ISO-OWN-" + UUID.randomUUID();
            UUID own = insertNotification(owner, marker);

            MvcResult read = perform(as(owner, get(BASE + "/" + own)));
            assertThat(status(read)).as("owner GET: %s", body(read)).isEqualTo(200);
            assertThat(body(read)).contains(marker).contains(own.toString());
            assertThat(body(perform(as(owner, get(BASE))))).contains(marker);

            MvcResult del = perform(as(owner, delete(BASE + "/" + own)));
            assertThat(status(del)).as("owner DELETE: %s", body(del)).isEqualTo(204);
            assertThat(superuserJdbc().queryForObject("SELECT count(*) FROM notifications WHERE id = ?", Long.class, own))
                    .isZero();
        }
    }

    private static UUID insertNotification(Actor owner, String title) {
        UUID id = UUID.randomUUID();
        superuserJdbc().update("INSERT INTO notifications (id, tenant_id, user_id, type, title, message, is_read, priority) "
                        + "VALUES (?, ?, ?, 'ANNOUNCEMENT', ?, ?, false, 'NORMAL')",
                id, owner.tenant().id(), owner.userId(), title, title + " body");
        return id;
    }

    private static String rowHash(UUID id) {
        return superuserJdbc().queryForObject("SELECT md5(n::text) FROM notifications n WHERE n.id = ?", String.class, id);
    }
}
