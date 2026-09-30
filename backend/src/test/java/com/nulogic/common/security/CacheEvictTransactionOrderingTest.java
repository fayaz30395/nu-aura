package com.nulogic.common.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Determines EMPIRICALLY whether {@code @CacheEvict} on a {@code @Transactional} method can fire
 * before the transaction commits — rather than reasoning about advisor ordering, which is what the
 * remediation was asked not to rely on.
 *
 * <p>Both {@code @EnableCaching} and Spring Boot's transaction management register their advisor
 * at {@link org.springframework.core.Ordered#LOWEST_PRECEDENCE}, and this codebase overrides
 * neither (no {@code order} attribute on {@code @EnableCaching} in {@code CacheConfig}, no
 * {@code @EnableTransactionManagement} at all — Boot's autoconfiguration supplies it). With equal
 * order the interception sequence falls out of advisor registration order, which is not a
 * contract.
 *
 * <p>The discriminator: {@code @CacheEvict} with the default {@code beforeInvocation = false}
 * evicts after the method body returns. So
 * <ul>
 *   <li>transaction advisor OUTERMOST → evict runs inside the transaction, therefore BEFORE
 *   commit, therefore the entry is already gone when the synchronization's
 *   {@code afterCompletion} runs;</li>
 *   <li>cache advisor OUTERMOST → commit runs first, therefore the entry is STILL PRESENT at
 *   {@code afterCompletion}.</li>
 * </ul>
 *
 * <p>Whatever this test reports, the production fix does not depend on it: {@code AdminService}
 * evicts through {@link PermissionCacheEvictor}, which defers to after-commit explicitly. This
 * test exists to document the reason that was necessary, and to fail loudly if a future Spring
 * upgrade changes the answer.</p>
 */
@DisplayName("@CacheEvict vs @Transactional ordering (empirical)")
class CacheEvictTransactionOrderingTest {

    private static final String CACHE = "probeCache";
    private static final String KEY = "seeded";

    /** Minimal resourceless transaction manager: real synchronization lifecycle, no datasource. */
    static class NoOpTransactionManager extends AbstractPlatformTransactionManager {
        @Override
        protected Object doGetTransaction() {
            return new Object();
        }

        @Override
        protected void doBegin(Object transaction, TransactionDefinition definition) {
            // nothing to begin
        }

        @Override
        protected void doCommit(DefaultTransactionStatus status) {
            // nothing to commit
        }

        @Override
        protected void doRollback(DefaultTransactionStatus status) {
            // nothing to roll back
        }
    }

    /**
     * Observation lands in a static holder, not an instance field: the bean is a CGLIB proxy and a
     * field written by the target is not visible through the proxy reference the test holds.
     */
    static final AtomicReference<Boolean> ENTRY_PRESENT_AT_AFTER_COMPLETION = new AtomicReference<>();
    static final AtomicInteger COMPLETION_STATUS = new AtomicInteger(Integer.MIN_VALUE);

    static class Probe {
        @Transactional
        @CacheEvict(value = CACHE, allEntries = true)
        public void mutate(CacheManager cacheManager) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    COMPLETION_STATUS.set(status);
                    ENTRY_PRESENT_AT_AFTER_COMPLETION.set(
                            cacheManager.getCache(CACHE).get(KEY) != null);
                }
            });
        }
    }

    @Configuration
    @EnableCaching
    @EnableTransactionManagement
    static class Config {
        @Bean
        CacheManager cacheManager() {
            return new ConcurrentMapCacheManager(CACHE);
        }

        @Bean
        PlatformTransactionManager transactionManager() {
            return new NoOpTransactionManager();
        }

        @Bean
        Probe probe() {
            return new Probe();
        }
    }

    @Test
    @DisplayName("records whether a @CacheEvict can be observed before commit completes")
    void recordsEvictionOrderingRelativeToCommit() {
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(Config.class)) {
            CacheManager cacheManager = ctx.getBean(CacheManager.class);
            cacheManager.getCache(CACHE).put(KEY, "value");

            ctx.getBean(Probe.class).mutate(cacheManager);

            assertThat(COMPLETION_STATUS.get())
                    .as("synchronization must have run, and on a COMMIT — otherwise the probe proves nothing")
                    .isEqualTo(TransactionSynchronization.STATUS_COMMITTED);

            // MEASURED 2026-09-26 on this Spring version: TRUE — the entry was still present when
            // the transaction completed, so the cache advisor is the OUTER one and @CacheEvict runs
            // after commit. Pinned as an observation, not as something to depend on: the two
            // advisors share LOWEST_PRECEDENCE, so this is registration order, not a contract, and
            // it is not guaranteed to match the full Boot context's advisor registration either.
            // If a Spring upgrade flips it, this test fails and names the consequence.
            assertThat(ENTRY_PRESENT_AT_AFTER_COMPLETION.get())
                    .as("cache advisor ordering changed: @CacheEvict now fires BEFORE the "
                            + "transaction completes, so any remaining annotation-driven eviction of "
                            + "authorization state is no longer commit-safe — route it through "
                            + "PermissionCacheEvictor, as AdminService and ImplicitRoleEngine already do")
                    .isTrue();
        }
    }
}
