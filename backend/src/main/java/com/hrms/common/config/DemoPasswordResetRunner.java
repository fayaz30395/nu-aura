package com.hrms.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Resets all demo user passwords on dev startup.
 * Scheduled for removal once QA workstream completes (tracked in docs/qa/).
 */
@Component
@Profile("dev")
@Slf4j
public class DemoPasswordResetRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public DemoPasswordResetRunner(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        try {
            String hash = passwordEncoder.encode("Welcome@123");
            log.info("DEMO PASSWORD RESET: Generated hash: {}", hash.substring(0, 20) + "...");
            int updated = jdbcTemplate.update(
                    "UPDATE users SET password_hash = ?, failed_login_attempts = 0, " +
                            "status = 'ACTIVE', auth_provider = 'LOCAL', " +
                            "password_changed_at = NOW(), updated_at = NOW() " +
                            "WHERE email LIKE '%@nulogic.io'",
                    hash
            );
            log.info("DEMO PASSWORD RESET: Updated {} demo user passwords", updated);
        } catch (Exception e) {
            log.warn("DEMO PASSWORD RESET: Failed — {}", e.getMessage());
        }
    }
}
