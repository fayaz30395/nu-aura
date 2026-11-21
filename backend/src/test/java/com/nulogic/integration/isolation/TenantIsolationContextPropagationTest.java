package com.nulogic.integration.isolation;

import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.kafka.TenantContextRecordInterceptor;
import com.nulogic.infrastructure.kafka.events.NotificationEvent;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 3 #4: tenant context propagation outside the request thread. The @Async executor and the
 * outbox dispatcher are proven end-to-end in {@link TenantIsolationCacheAndAsyncTest}; this class
 * covers the Kafka listener interceptor and pins the source-level invariants that keep every other
 * thread hop safe (all @Async on the decorated executor, no ForkJoinPool hops, every scheduled job
 * that sets a tenant also clears it).
 */
@DisplayName("Tenant isolation: context propagation across threads (Phase 3 #4)")
class TenantIsolationContextPropagationTest {

    private static final Path MAIN = Path.of("src/main/java");

    @AfterEach
    void clear() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("Kafka record interceptor: sets the record's tenant, clears after, never carries a tenant to the next record")
    void kafkaInterceptorScopesTenantPerRecord() {
        TenantContextRecordInterceptor<String, Object> interceptor = new TenantContextRecordInterceptor<>();
        NotificationEvent bEvent = new NotificationEvent();
        bEvent.setTenantId(Tenant.B.id());

        TenantContext.setCurrentTenant(Tenant.A.id()); // leftover from a previous poll on this consumer thread
        interceptor.intercept(new ConsumerRecord<>("t", 0, 0L, "k", bEvent), null);
        assertThat(TenantContext.getCurrentTenant()).isEqualTo(Tenant.B.id());
        interceptor.success(new ConsumerRecord<>("t", 0, 0L, "k", bEvent), null);
        assertThat(TenantContext.getCurrentTenant()).isNull();

        interceptor.intercept(new ConsumerRecord<>("t", 0, 1L, "k", bEvent), null);
        interceptor.failure(new ConsumerRecord<>("t", 0, 1L, "k", bEvent), new RuntimeException("x"), null);
        assertThat(TenantContext.getCurrentTenant()).isNull();

        // A tenant-less record after a tenant-B record must not inherit B.
        TenantContext.setCurrentTenant(Tenant.B.id());
        interceptor.intercept(new ConsumerRecord<>("t", 0, 2L, "k", new NotificationEvent()), null);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    @DisplayName("every @Async runs on the tenant-propagating taskExecutor and nothing hops to the ForkJoinPool")
    void asyncPathsUseTheDecoratedExecutor() throws IOException {
        List<String> offenders = new ArrayList<>();
        Pattern namedAsync = Pattern.compile("@Async\\(\"([^\"]+)\"\\)");
        Pattern bareCompletable = Pattern.compile("CompletableFuture\\.(supplyAsync|runAsync)\\((?:[^()]|\\([^()]*\\))*\\);",
                Pattern.DOTALL);
        for (Path p : javaFiles()) {
            String src = Files.readString(p, StandardCharsets.UTF_8);
            Matcher m = namedAsync.matcher(src);
            while (m.find()) {
                if (!"taskExecutor".equals(m.group(1))) {
                    offenders.add(p.getFileName() + " @Async(\"" + m.group(1) + "\")");
                }
            }
            Matcher c = bareCompletable.matcher(src);
            while (c.find()) {
                if (!c.group().matches("(?s).*,\\s*\\w*[Ee]xecutor\\w*\\s*\\);")) {
                    offenders.add(p.getFileName() + " " + c.group().replaceAll("\\s+", " "));
                }
            }
            if (src.contains(".parallelStream()") || src.contains("Executors.new") || src.contains("new Thread(")) {
                offenders.add(p.getFileName() + " creates an undecorated thread/pool");
            }
        }
        assertThat(offenders).as("async hops that lose TenantContext").isEmpty();
    }

    @Test
    @DisplayName("every @Scheduled class that sets a tenant also clears it (no tenant left on scheduler threads)")
    void scheduledJobsClearTheTenantTheySet() throws IOException {
        Map<String, String> offenders = new TreeMap<>();
        for (Path p : javaFiles()) {
            String src = Files.readString(p, StandardCharsets.UTF_8);
            if (!src.contains("@Scheduled")) {
                continue;
            }
            int sets = count(src, "TenantContext.setCurrentTenant(");
            int clears = count(src, "TenantContext.clear()");
            if (sets > 0 && clears == 0) {
                offenders.put(p.getFileName().toString(), sets + " set / 0 clear");
            }
        }
        assertThat(offenders).isEmpty();
    }

    private static List<Path> javaFiles() throws IOException {
        try (Stream<Path> s = Files.walk(MAIN)) {
            return s.filter(f -> f.toString().endsWith(".java")).toList();
        }
    }

    private static int count(String haystack, String needle) {
        int n = 0;
        for (int i = haystack.indexOf(needle); i >= 0; i = haystack.indexOf(needle, i + 1)) {
            n++;
        }
        return n;
    }
}
