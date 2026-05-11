package com.hrms.common.config;

/**
 * Placeholder marker — intentionally left as documentation only.
 *
 * <p>
 * For read-replica routing (wave-3 H7 / C7) we deliberately do <em>not</em>
 * declare a second {@code PlatformTransactionManager}. The combination of
 * {@link RoutingDataSourceConfig} (an {@code AbstractRoutingDataSource} wrapped
 * in a {@code LazyConnectionDataSourceProxy}) and the existing
 * {@link TenantRlsTransactionManager} (declared in {@link JpaConfig}) already
 * gives us what we need:
 * </p>
 *
 * <ol>
 *   <li>Spring's {@code @Transactional(readOnly = true)} interceptor binds the
 *       read-only flag to the thread via
 *       {@code TransactionSynchronizationManager.setCurrentTransactionReadOnly()}.</li>
 *   <li>JPA / Hibernate then asks for a JDBC connection from our {@code @Primary}
 *       routing data source.</li>
 *   <li>The {@code LazyConnectionDataSourceProxy} defers the physical
 *       {@code getConnection()} until the first JDBC call, at which point the
 *       routing key (`replica` vs `primary`) is determined.</li>
 *   <li>{@link TenantAwareDataSourceConfig} has already wrapped both pools, so
 *       {@code app.current_tenant_id} is injected on the connection regardless
 *       of which target was selected — RLS enforcement still applies on the replica.</li>
 * </ol>
 *
 * <h2>Why no second transaction manager?</h2>
 * <p>
 * Introducing a second {@code @Qualifier("replica")} transaction manager would
 * fragment the transactional surface area: callers would have to remember to
 * write {@code @Transactional("replica", readOnly = true)} on every read path.
 * That breaks call-site simplicity, conflicts with the cross-cutting
 * {@code TenantRlsTransactionManager.setLocal(app.current_tenant_id)} hook, and
 * doubles the chance of bugs where a read-only intent is silently lost because
 * a developer wrote plain {@code @Transactional(readOnly = true)} (still routed
 * to the primary). The {@code AbstractRoutingDataSource} approach captures the
 * intent declaratively from {@code readOnly = true} alone.
 * </p>
 *
 * <h2>If we ever need a separate manager</h2>
 * <p>
 * The only reason to add a real class here would be if we wanted asynchronous
 * replication-lag tracking (e.g. waiting for a write LSN before routing reads,
 * "read-your-writes" guarantee). That is a deliberate follow-up — see ADR-026
 * and Neon's replication-lag docs — and would belong in a dedicated transaction
 * manager that consults the LSN before deciding the routing key, not in a
 * generic replica manager.
 * </p>
 *
 * @see RoutingDataSourceConfig
 * @see TenantRlsTransactionManager
 * @see JpaConfig
 */
final class ReplicaAwareTransactionManager {

    private ReplicaAwareTransactionManager() {
        // marker class only
    }
}
