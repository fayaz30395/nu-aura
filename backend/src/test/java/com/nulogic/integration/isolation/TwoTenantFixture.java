package com.nulogic.integration.isolation;

import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.domain.user.User;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Two independent synthetic tenants (A and B) seeded once per JVM, as the Postgres
 * superuser, from {@code db/tenant-isolation/seed-tenant.sql}.
 *
 * <p>Every id is deterministic ({@code <prefix>-<type>-4000-8000-<n>}) so tests can address
 * the other tenant's rows directly, and every human-readable column carries the marker
 * {@code ISO-A} / {@code ISO-B} so a leak is detectable by grepping any response body.</p>
 */
public final class TwoTenantFixture {

    public static final int USER = 0x1;
    public static final int EMPLOYEE = 0x3;
    public static final int DEPARTMENT = 0x4;
    public static final int LEAVE_TYPE = 0x5;
    public static final int LEAVE_REQUEST = 0x6;
    public static final int EXPENSE_CLAIM = 0x7;
    public static final int ANNOUNCEMENT = 0x8;
    public static final int TICKET_CATEGORY = 0x9;
    public static final int TICKET = 0xa;
    public static final int HOLIDAY = 0xb;
    public static final int ASSET = 0xc;
    public static final int LOAN = 0xd;
    public static final int CONTRACT = 0xe;
    public static final int JOB_OPENING = 0xf;
    public static final int CANDIDATE = 0x10;
    public static final int APPLICANT = 0x11;
    public static final int GOAL = 0x12;
    public static final int REVIEW_CYCLE = 0x13;
    public static final int PERFORMANCE_REVIEW = 0x14;
    public static final int TRAINING_PROGRAM = 0x15;
    public static final int PULSE_SURVEY = 0x16;
    public static final int WIKI_SPACE = 0x17;
    public static final int WIKI_PAGE = 0x18;
    public static final int BLOG_POST = 0x19;
    public static final int WALL_POST = 0x1a;
    public static final int PAYROLL_RUN = 0x1b;
    public static final int PAYSLIP = 0x1c;
    public static final int PROJECT = 0x1d;
    public static final int NOTIFICATION = 0x1e;
    public static final int LETTER_TEMPLATE = 0x1f;
    public static final int GENERATED_LETTER = 0x20;
    public static final int CONTRACT_VERSION = 0x21;

    private static final String SEED_SCRIPT = "db/tenant-isolation/seed-tenant.sql";
    private static volatile boolean seeded;

    private TwoTenantFixture() {
    }

    public enum Tenant {
        A("aaaaaaaa", "A", "a", "1"),
        B("bbbbbbbb", "B", "b", "2");

        private final String prefix;
        private final String letter;
        private final String lower;
        private final String digit;

        Tenant(String prefix, String letter, String lower, String digit) {
            this.prefix = prefix;
            this.letter = letter;
            this.lower = lower;
            this.digit = digit;
        }

        public UUID id() {
            return id(0, 0);
        }

        /** Deterministic id of the n-th seeded row of the given type for this tenant. */
        public UUID id(int type, int n) {
            return UUID.fromString(String.format("%s-%04x-4000-8000-%012x", prefix, type, n));
        }

        public UUID id(int type) {
            return id(type, 1);
        }

        /** Marker present in every human-readable column of this tenant's seeded rows. */
        public String marker() {
            return "ISO-" + letter;
        }

        public Tenant other() {
            return this == A ? B : A;
        }

        String render(String template) {
            return template.replace("{{P}}", prefix)
                    .replace("{{T}}", id().toString())
                    .replace("{{N}}", letter)
                    .replace("{{n}}", lower)
                    .replace("{{D}}", digit);
        }
    }

    /** An authenticated principal of one tenant. */
    public record Actor(Tenant tenant, UUID userId, UUID employeeId, String email, Set<String> roles) {

        public static Actor admin(Tenant t) {
            return new Actor(t, t.id(USER, 1), t.id(EMPLOYEE, 1), "tenant-" + t.lower + "-admin@iso.test",
                    Set.of("TENANT_ADMIN", "HR_ADMIN", "PAYROLL_ADMIN", "RECRUITMENT_ADMIN", "FINANCE_ADMIN"));
        }

        public static Actor employee(Tenant t) {
            return new Actor(t, t.id(USER, 2), t.id(EMPLOYEE, 2), "tenant-" + t.lower + "-employee@iso.test",
                    Set.of("EMPLOYEE"));
        }

        public static Actor superAdmin(Tenant t) {
            return new Actor(t, t.id(USER, 3), null, "tenant-" + t.lower + "-super@iso.test", Set.of("SUPER_ADMIN"));
        }
    }

    /** Seeds both tenants exactly once per JVM (the Spring context and container are shared). */
    public static synchronized void seedOnce(JdbcTemplate superuser) {
        if (seeded) {
            return;
        }
        String template;
        try {
            template = new ClassPathResource(SEED_SCRIPT).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        for (Tenant t : Tenant.values()) {
            superuser.execute(t.render(template));
        }
        seeded = true;
    }

    /** Mints an access token through the production {@link JwtTokenProvider}, as AuthService does. */
    public static String token(JwtTokenProvider provider, Actor actor) {
        User user = new User();
        user.setId(actor.userId());
        user.setEmail(actor.email());
        return provider.generateTokenWithAppPermissions(user, actor.tenant().id(), "HRMS", Map.of(), actor.roles(),
                Set.of("HRMS", "HIRE", "GROW", "FLUENCE"), actor.employeeId(), null,
                actor.employeeId() == null ? null : actor.tenant().id(DEPARTMENT), null);
    }
}
