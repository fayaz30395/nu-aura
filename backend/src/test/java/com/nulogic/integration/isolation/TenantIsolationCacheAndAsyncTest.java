package com.nulogic.integration.isolation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.security.SecurityService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.infrastructure.kafka.consumer.ApprovalEventConsumer;
import com.nulogic.infrastructure.kafka.consumer.AuditEventConsumer;
import com.nulogic.infrastructure.kafka.consumer.EmployeeLifecycleConsumer;
import com.nulogic.infrastructure.kafka.consumer.NotificationEventConsumer;
import com.nulogic.infrastructure.kafka.consumer.PayrollProcessingConsumer;
import com.nulogic.infrastructure.kafka.events.NotificationEvent;
import com.nulogic.infrastructure.kafka.outbox.OutboxEventProcessor;
import com.nulogic.infrastructure.kafka.outbox.OutboxEventRepository;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.ClassUtils;
import org.springframework.util.ReflectionUtils;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static com.nulogic.integration.isolation.TwoTenantFixture.EMPLOYEE;
import static com.nulogic.integration.isolation.TwoTenantFixture.USER;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Isolation of state that lives outside a single request/transaction: Spring caches (populate as
 * one tenant, read as the other), the {@code @Async} executor's context propagation and cleanup on
 * pooled threads, the transactional outbox dispatcher, and notifications.
 */
@DisplayName("Tenant isolation: caches, @Async, outbox, notifications")
class TenantIsolationCacheAndAsyncTest extends AbstractTenantIsolationIntegrationTest {

    private static final List<String> TENANT_KEY_TOKENS = List.of(
            "TenantContext", "tenantId", "TenantId", "rolesCacheKey", "userCacheKey", "getCurrentTenantKey");

    @Autowired
    private ApplicationContext context;
    @Autowired
    private SecurityService securityService;
    @Autowired
    @Qualifier("taskExecutor")
    private Executor taskExecutor;
    @Autowired
    private DataSource dataSource;
    @Autowired
    private OutboxEventRepository outboxEventRepository;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @AfterEach
    void clearContext() {
        TenantContext.clear();
    }

    // ── Caches ───────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("REGRESSION employeeWithDetails: an employee cached by tenant A is not served to tenant B")
    void employeeDetailsCacheIsTenantScoped() throws Exception {
        String path = "/api/v1/employees/" + Tenant.A.id(EMPLOYEE, 2);
        MvcResult own = perform(as(Actor.admin(Tenant.A), get(path)));
        assertThat(status(own)).as("populate cache as A: %s", body(own)).isEqualTo(200);

        MvcResult foreign = perform(as(Actor.admin(Tenant.B), get(path)));
        assertThat(status(foreign)).as("B read A's cached employee: %s", body(foreign)).isIn(400, 403, 404);
        assertThat(body(foreign)).doesNotContain(Tenant.A.marker());
    }

    @Test
    @DisplayName("every @Cacheable key is tenant-scoped (explicit tenant term or the tenant-aware key generator)")
    void everyCacheableKeyIsTenantScoped() {
        assertThat(isTenantScopedKey("#employeeId", ""))
                .as("negative control: the audit must flag a bare entity-id key").isFalse();

        List<String> offenders = new ArrayList<>();
        List<String> audited = new ArrayList<>();
        for (String name : context.getBeanDefinitionNames()) {
            Class<?> type = context.getType(name, false);
            if (type == null || !type.getName().startsWith("com.nulogic")) {
                continue;
            }
            Class<?> userClass = ClassUtils.getUserClass(type);
            ReflectionUtils.doWithMethods(userClass, m -> {
                Cacheable c = AnnotatedElementUtils.findMergedAnnotation(m, Cacheable.class);
                if (c != null) {
                    audited.add(userClass.getSimpleName() + "." + m.getName());
                    if (!isTenantScopedKey(c.key(), c.keyGenerator())) {
                        offenders.add(userClass.getSimpleName() + "." + m.getName() + " key=" + c.key());
                    }
                }
            });
        }
        assertThat(audited).as("audit must actually see the live @Cacheable methods")
                .contains("EmployeeService.getEmployee", "SecurityService.getCachedPermissionScopes",
                        "TenantStatusCache.findById")
                .hasSizeGreaterThan(20);
        assertThat(offenders).as("cache keys without a tenant component can serve one tenant's value to another")
                .isEmpty();
    }

    @Test
    @DisplayName("source scan: no @Cacheable in src/main (incl. beans absent from this context) has a tenant-less key")
    void everyCacheableKeyInSourceIsTenantScoped() throws java.io.IOException {
        java.util.regex.Pattern annotation = java.util.regex.Pattern.compile("@Cacheable\\(([^@]*?)\\)\\s*\\n",
                java.util.regex.Pattern.DOTALL);
        java.util.regex.Pattern key = java.util.regex.Pattern.compile("\\bkey\\s*=\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
        java.util.regex.Pattern generator = java.util.regex.Pattern.compile("keyGenerator\\s*=\\s*\"([^\"]*)\"");
        List<String> offenders = new ArrayList<>();
        int seen = 0;
        try (var files = java.nio.file.Files.walk(java.nio.file.Path.of("src/main/java"))) {
            for (java.nio.file.Path p : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                java.util.regex.Matcher m = annotation.matcher(java.nio.file.Files.readString(p));
                while (m.find()) {
                    seen++;
                    java.util.regex.Matcher k = key.matcher(m.group(1));
                    java.util.regex.Matcher g = generator.matcher(m.group(1));
                    if (!isTenantScopedKey(k.find() ? k.group(1) : "", g.find() ? g.group(1) : "")) {
                        offenders.add(p.getFileName() + ": " + m.group(1).replaceAll("\\s+", " "));
                    }
                }
            }
        }
        assertThat(seen).as("scan must find the @Cacheable annotations (25 at V355)").isGreaterThan(20);
        assertThat(offenders).isEmpty();
    }

    private static boolean isTenantScopedKey(String key, String keyGenerator) {
        if (key.isEmpty()) {
            // Default generator is CacheConfig.keyGenerator(): "tenant:{tenantId}:..." prefix.
            return keyGenerator.isEmpty() || "tenantAwareKeyGenerator".equals(keyGenerator);
        }
        return TENANT_KEY_TOKENS.stream().anyMatch(key::contains);
    }

    @Test
    @DisplayName("role-permission cache: same role code, different tenants, never served across")
    void rolePermissionCacheIsTenantScoped() {
        UUID bOnlyFirst = UUID.randomUUID();
        UUID bOnlySecond = UUID.randomUUID();
        JdbcTemplate su = superuserJdbc();
        UUID permissionId = su.queryForObject(
                "SELECT id FROM permissions WHERE tenant_id IS NULL ORDER BY code LIMIT 1", UUID.class);
        for (Object[] role : new Object[][]{{bOnlyFirst, "ISO_B_ONLY_1"}, {bOnlySecond, "ISO_B_ONLY_2"}}) {
            su.update("INSERT INTO roles (id, tenant_id, code, name) VALUES (?, ?, ?, ?)",
                    role[0], Tenant.B.id(), role[1], "ISO-B only role");
            su.update("INSERT INTO role_permissions (tenant_id, role_id, permission_id, scope) VALUES (?, ?, ?, 'ALL')",
                    Tenant.B.id(), role[0], permissionId);
        }

        // A first (caches an empty grant under A), then B must still get B's grant.
        Map<String, RoleScope> aFirst = scopesAs(Tenant.A, "ISO_B_ONLY_1");
        Map<String, RoleScope> bSecond = scopesAs(Tenant.B, "ISO_B_ONLY_1");
        assertThat(aFirst).isEmpty();
        assertThat(bSecond).hasSize(1);

        // B first (caches a real grant under B), then A must not receive it.
        assertThat(scopesAs(Tenant.B, "ISO_B_ONLY_2")).hasSize(1);
        assertThat(scopesAs(Tenant.A, "ISO_B_ONLY_2")).as("B's cached grant served to A").isEmpty();
    }

    private Map<String, RoleScope> scopesAs(Tenant tenant, String role) {
        TenantContext.setCurrentTenant(tenant.id());
        try {
            return securityService.getCachedPermissionScopes(Set.of(role));
        } finally {
            TenantContext.clear();
        }
    }

    // ── @Async ───────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("@Async executor propagates the submitter's tenant and leaves pooled threads clean")
    void asyncExecutorPropagatesAndClearsTenant() throws Exception {
        JdbcTemplate app = new JdbcTemplate(dataSource);
        for (Tenant t : Tenant.values()) {
            TenantContext.setCurrentTenant(t.id());
            List<CompletableFuture<Object[]>> withTenant = new ArrayList<>();
            for (int i = 0; i < 12; i++) {
                withTenant.add(CompletableFuture.supplyAsync(() -> new Object[]{TenantContext.getCurrentTenant(),
                        app.queryForObject("SELECT count(*) FROM employees WHERE tenant_id <> ?", Long.class, t.id()),
                        app.queryForObject("SELECT count(*) FROM employees", Long.class)}, taskExecutor));
            }
            TenantContext.clear();
            for (CompletableFuture<Object[]> f : withTenant) {
                Object[] r = f.get(30, TimeUnit.SECONDS);
                assertThat(r[0]).isEqualTo(t.id());
                assertThat(r[1]).as("async task of %s saw other tenants' employees", t).isEqualTo(0L);
                assertThat((Long) r[2]).as("async task of %s must see its own employees", t).isPositive();
            }
        }

        // Same pool, no submitter tenant: no residue from the previous tasks on reused threads.
        List<CompletableFuture<Object[]>> without = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            without.add(CompletableFuture.supplyAsync(() -> new Object[]{TenantContext.getCurrentTenant(),
                    app.queryForObject("SELECT count(*) FROM employees", Long.class)}, taskExecutor));
        }
        for (CompletableFuture<Object[]> f : without) {
            Object[] r = f.get(30, TimeUnit.SECONDS);
            assertThat(r[0]).as("tenant leaked onto a pooled thread").isNull();
            assertThat(r[1]).as("no tenant context must see zero tenant rows").isEqualTo(0L);
        }
    }

    // ── Outbox ───────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("outbox: tenant-B event is dispatched under B only, never under a leftover tenant-A context")
    void outboxDispatchesUnderTheEventsTenant() throws Exception {
        UUID rowId = UUID.randomUUID();
        NotificationEvent event = new NotificationEvent();
        event.setEventId("iso-b-outbox-" + rowId);
        event.setEventType("NOTIFICATION");
        event.setTenantId(Tenant.B.id());
        event.setRecipientId(Tenant.B.id(USER, 1));
        event.setChannel("IN_APP");
        event.setSubject("ISO-B outbox");
        superuserJdbc().update("INSERT INTO outbox_events (id, event_id, topic, event_class, payload, status, tenant_id) "
                        + "VALUES (?, ?, 'nu-aura.notifications', ?, ?::jsonb, 'PENDING', ?)",
                rowId, event.getEventId(), NotificationEvent.class.getName(), objectMapper.writeValueAsString(event),
                Tenant.B.id());

        NotificationEventConsumer consumer = mock(NotificationEventConsumer.class);
        AtomicReference<Object[]> seen = new AtomicReference<>();
        JdbcTemplate app = new JdbcTemplate(dataSource);
        doAnswer(inv -> {
            seen.set(new Object[]{TenantContext.getCurrentTenant(),
                    app.queryForObject("SELECT current_setting('app.current_tenant_id', true)", String.class)});
            return null;
        }).when(consumer).process(any());
        OutboxEventProcessor processor = new OutboxEventProcessor(null, outboxEventRepository, objectMapper, consumer,
                mock(ApprovalEventConsumer.class), mock(AuditEventConsumer.class), mock(EmployeeLifecycleConsumer.class),
                mock(PayrollProcessingConsumer.class), Optional.empty());
        TransactionTemplate requiresNew = new TransactionTemplate(transactionManager);
        requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        // Poller thread polluted with tenant A: B's row is invisible, so it is not processed under A.
        TenantContext.setCurrentTenant(Tenant.A.id());
        requiresNew.executeWithoutResult(s -> processor.processOneEvent(rowId));
        TenantContext.clear();
        verify(consumer, never()).process(any());
        assertThat(outboxStatus(rowId)).isEqualTo("PENDING");

        // Clean poller (production shape): dispatched under B with the B GUC, context cleared after.
        requiresNew.executeWithoutResult(s -> processor.processOneEvent(rowId));
        assertThat(seen.get()).as("consumer was not invoked").isNotNull();
        assertThat(seen.get()[0]).isEqualTo(Tenant.B.id());
        assertThat(seen.get()[1]).isEqualTo(Tenant.B.id().toString());
        assertThat(TenantContext.getCurrentTenant()).as("outbox left a tenant on the poller thread").isNull();
        assertThat(outboxStatus(rowId)).isEqualTo("PROCESSED");
    }

    private static String outboxStatus(UUID id) {
        return superuserJdbc().queryForObject("SELECT status FROM outbox_events WHERE id = ?", String.class, id);
    }

    // ── Notifications ────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("a tenant-B notification row is invisible to tenant A even when it names A's user id")
    void notificationOfOtherTenantIsInvisible() throws Exception {
        UUID forged = UUID.randomUUID();
        superuserJdbc().update("INSERT INTO notifications (id, tenant_id, user_id, type, title, message, is_read, priority) "
                        + "VALUES (?, ?, ?, 'ANNOUNCEMENT', 'ISO-B forged', 'ISO-B cross-tenant notification', false, 'HIGH')",
                forged, Tenant.B.id(), Tenant.A.id(USER, 1));
        Actor a = Actor.admin(Tenant.A);
        for (String path : List.of("/api/v1/notifications", "/api/v1/notifications/unread", "/api/v1/notifications/recent")) {
            MvcResult res = perform(as(a, get(path)));
            assertThat(status(res)).as(path).isEqualTo(200);
            assertThat(body(res)).as(path).doesNotContain(Tenant.B.marker()).doesNotContain(forged.toString());
        }
        MvcResult byId = perform(as(a, get("/api/v1/notifications/" + forged)));
        assertThat(status(byId)).as("forged notification by id: %s", body(byId)).isIn(400, 403, 404);
        assertThat(body(byId)).doesNotContain(Tenant.B.marker());
        Long ownUnread = superuserJdbc().queryForObject(
                "SELECT count(*) FROM notifications WHERE tenant_id = ? AND user_id = ? AND is_read = false",
                Long.class, Tenant.A.id(), Tenant.A.id(USER, 1));
        MvcResult count = perform(as(a, get("/api/v1/notifications/unread/count")));
        assertThat(status(count)).isEqualTo(200);
        com.fasterxml.jackson.databind.JsonNode node = objectMapper.readTree(body(count));
        long reported = node.isNumber() ? node.asLong()
                : java.util.stream.StreamSupport.stream(node.spliterator(), false)
                .filter(com.fasterxml.jackson.databind.JsonNode::isNumber).findFirst().orElseThrow().asLong();
        assertThat(reported).as("unread count must only count tenant A rows: %s", body(count)).isEqualTo(ownUnread);
    }
}
