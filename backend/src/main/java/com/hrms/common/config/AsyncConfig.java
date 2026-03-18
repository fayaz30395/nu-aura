package com.hrms.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;

/**
 * Configures the platform-wide async executor with tenant and security context propagation.
 *
 * <p>Spring's default {@code @Async} executor ({@code SimpleAsyncTaskExecutor}) spawns a
 * new thread for every invocation and carries <strong>no ThreadLocal context</strong>.
 * This causes {@link com.hrms.common.security.TenantContext} and
 * {@link com.hrms.common.security.SecurityContext} to be null in async threads,
 * leading to RLS bypass or {@code NullPointerException} in services that call
 * {@code TenantContext.requireCurrentTenant()}.</p>
 *
 * <p>By implementing {@link AsyncConfigurer} this class replaces the default executor
 * for ALL {@code @Async} methods that do not explicitly name a different executor.
 * The {@link TenantAwareTaskDecorator} snapshots the calling thread's context and
 * restores it in the worker thread.</p>
 *
 * <p>Thread pool sizing follows the rule-of-thumb for I/O-bound async work
 * (email delivery, webhook dispatch, notifications): {@code CPU * 2 + slack}.</p>
 */
@Configuration
@Slf4j
public class AsyncConfig implements AsyncConfigurer {

    /** Named executor bean — can be referenced explicitly via {@code @Async("taskExecutor")}. */
    @Bean(name = "taskExecutor")
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // Core threads kept alive to serve bursts without thread-creation latency
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("async-tenant-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        // Decorate each task with tenant + security context propagation
        executor.setTaskDecorator(new TenantAwareTaskDecorator());
        executor.initialize();
        log.info("Initialized TenantAware async executor (core={}, max={}, queue={})",
                executor.getCorePoolSize(), executor.getMaxPoolSize(), executor.getQueueCapacity());
        return executor;
    }

    /**
     * Log uncaught exceptions from async methods rather than silently swallowing them.
     */
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new AsyncUncaughtExceptionHandler() {
            @Override
            public void handleUncaughtException(Throwable ex, Method method, Object... params) {
                log.error("Uncaught exception in @Async method {}.{}(): {}",
                        method.getDeclaringClass().getSimpleName(),
                        method.getName(),
                        ex.getMessage(), ex);
            }
        };
    }
}
