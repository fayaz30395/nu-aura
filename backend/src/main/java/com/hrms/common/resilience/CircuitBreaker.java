package com.hrms.common.resilience;

import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

/**
 * Simple circuit breaker implementation for external service calls.
 *
 * <p>States:</p>
 * <ul>
 *   <li>CLOSED: Normal operation, requests pass through</li>
 *   <li>OPEN: Circuit is broken, requests fail fast</li>
 *   <li>HALF_OPEN: Testing if service recovered, limited requests allowed</li>
 * </ul>
 *
 * <p><strong>RESILIENCE:</strong> Prevents cascading failures when external
 * services are unavailable or degraded.</p>
 */
@Slf4j
public class CircuitBreaker {

    public enum State {
        CLOSED,
        OPEN,
        HALF_OPEN
    }

    private final String name;
    private final int failureThreshold;
    private final int successThreshold;
    private final Duration openDuration;

    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicInteger failureCount = new AtomicInteger(0);
    private final AtomicInteger successCount = new AtomicInteger(0);
    private final AtomicReference<Instant> lastStateChange = new AtomicReference<>(Instant.now());

    /**
     * Create a circuit breaker with default settings.
     */
    public CircuitBreaker(String name) {
        this(name, 5, 2, Duration.ofSeconds(30));
    }

    /**
     * Create a circuit breaker with custom settings.
     *
     * @param name Service name for logging
     * @param failureThreshold Number of failures before opening circuit
     * @param successThreshold Number of successes in half-open before closing
     * @param openDuration Duration to keep circuit open before allowing tests
     */
    public CircuitBreaker(String name, int failureThreshold, int successThreshold, Duration openDuration) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.successThreshold = successThreshold;
        this.openDuration = openDuration;
    }

    /**
     * Execute a supplier with circuit breaker protection.
     *
     * @param supplier The operation to execute
     * @param fallback Fallback value if circuit is open or operation fails
     * @return Result from supplier or fallback
     */
    public <T> T execute(Supplier<T> supplier, T fallback) {
        if (!allowRequest()) {
            log.debug("Circuit breaker [{}] is OPEN, returning fallback", name);
            return fallback;
        }

        try {
            T result = supplier.get();
            recordSuccess();
            return result;
        } catch (RuntimeException e) { // Intentional broad catch — circuit breaker wraps arbitrary supplier calls
            recordFailure(e);
            return fallback;
        }
    }

    /**
     * Execute a supplier with circuit breaker protection.
     * Throws exception if circuit is open or operation fails.
     *
     * @param supplier The operation to execute
     * @return Result from supplier
     */
    public <T> T execute(Supplier<T> supplier) {
        if (!allowRequest()) {
            log.debug("Circuit breaker [{}] is OPEN, failing fast", name);
            throw new RuntimeException("Circuit breaker is OPEN for service: " + name);
        }

        try {
            T result = supplier.get();
            recordSuccess();
            return result;
        } catch (RuntimeException e) {
            recordFailure(e);
            throw e;
        }
    }

    /**
     * Execute a runnable with circuit breaker protection.
     *
     * @param runnable The operation to execute
     * @return true if executed successfully, false if skipped or failed
     */
    public boolean execute(Runnable runnable) {
        if (!allowRequest()) {
            log.debug("Circuit breaker [{}] is OPEN, skipping execution", name);
            return false;
        }

        try {
            runnable.run();
            recordSuccess();
            return true;
        } catch (RuntimeException e) { // Intentional broad catch — circuit breaker wraps arbitrary runnable calls
            recordFailure(e);
            return false;
        }
    }

    /**
     * Check if a request should be allowed through.
     */
    public boolean allowRequest() {
        State currentState = state.get();

        switch (currentState) {
            case CLOSED:
                return true;

            case OPEN:
                // Check if we should transition to half-open
                if (shouldAttemptReset()) {
                    if (state.compareAndSet(State.OPEN, State.HALF_OPEN)) {
                        log.info("Circuit breaker [{}] transitioned to HALF_OPEN", name);
                        successCount.set(0);
                    }
                    return true;
                }
                return false;

            case HALF_OPEN:
                // Allow limited requests for testing
                return true;

            default:
                return true;
        }
    }

    /**
     * Record a successful operation.
     */
    public void recordSuccess() {
        State currentState = state.get();

        if (currentState == State.HALF_OPEN) {
            int successes = successCount.incrementAndGet();
            if (successes >= successThreshold) {
                if (state.compareAndSet(State.HALF_OPEN, State.CLOSED)) {
                    log.info("Circuit breaker [{}] transitioned to CLOSED after {} successes", name, successes);
                    reset();
                }
            }
        } else if (currentState == State.CLOSED) {
            // Reset failure count on success
            failureCount.set(0);
        }
    }

    /**
     * Record a failed operation.
     */
    public void recordFailure(Exception e) {
        State currentState = state.get();
        log.warn("Circuit breaker [{}] recorded failure: {}", name, e.getMessage());

        if (currentState == State.HALF_OPEN) {
            // Any failure in half-open goes back to open
            if (state.compareAndSet(State.HALF_OPEN, State.OPEN)) {
                log.warn("Circuit breaker [{}] transitioned to OPEN from HALF_OPEN", name);
                lastStateChange.set(Instant.now());
            }
        } else if (currentState == State.CLOSED) {
            int failures = failureCount.incrementAndGet();
            if (failures >= failureThreshold) {
                if (state.compareAndSet(State.CLOSED, State.OPEN)) {
                    log.warn("Circuit breaker [{}] transitioned to OPEN after {} failures", name, failures);
                    lastStateChange.set(Instant.now());
                }
            }
        }
    }

    /**
     * Check if enough time has passed to attempt a reset.
     */
    private boolean shouldAttemptReset() {
        Instant lastChange = lastStateChange.get();
        return Duration.between(lastChange, Instant.now()).compareTo(openDuration) > 0;
    }

    /**
     * Reset the circuit breaker counters.
     */
    private void reset() {
        failureCount.set(0);
        successCount.set(0);
        lastStateChange.set(Instant.now());
    }

    /**
     * Force the circuit to open (for testing or manual intervention).
     */
    public void forceOpen() {
        state.set(State.OPEN);
        lastStateChange.set(Instant.now());
        log.warn("Circuit breaker [{}] forced OPEN", name);
    }

    /**
     * Force the circuit to close (for testing or manual intervention).
     */
    public void forceClose() {
        state.set(State.CLOSED);
        reset();
        log.info("Circuit breaker [{}] forced CLOSED", name);
    }

    /**
     * Get current state.
     */
    public State getState() {
        return state.get();
    }

    /**
     * Get the service name.
     */
    public String getName() {
        return name;
    }

    /**
     * Get current failure count.
     */
    public int getFailureCount() {
        return failureCount.get();
    }
}
