package com.nulogic.application;

import com.nulogic.application.attendance.scheduler.AutoRegularizationScheduler;
import com.nulogic.application.attendance.service.CompOffService;
import com.nulogic.application.compliance.scheduler.PolicyAcknowledgmentReminderScheduler;
import com.nulogic.application.contract.scheduler.ContractLifecycleScheduler;
import com.nulogic.application.document.scheduler.DocumentExpiryScheduler;
import com.nulogic.application.recruitment.scheduler.HireReminderScheduler;
import com.nulogic.common.security.TenantContext;
import com.nulogic.infrastructure.tenant.repository.TenantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessResourceFailureException;

import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * The per-tenant loop shared by the scheduled jobs that read {@code TenantRepository.findActiveTenantIds()}:
 * every tenant's steps run through the Spring proxy (so {@code @Transactional} opens a transaction after
 * TenantContext is set, i.e. with that tenant's RLS GUC), under that tenant's context only; a tenant that
 * throws does not stop the next; the context is cleared afterwards; and a failing tenant list is loud
 * instead of a silent zero-tenant success. Real-database behaviour lives in ScheduledJobsTenantIterationTest.
 */
@DisplayName("Scheduled jobs: per-tenant loop")
class ScheduledJobTenantLoopTest {

    private static final UUID T1 = UUID.fromString("00000000-0000-4000-8000-0000000000c1");
    private static final UUID T2 = UUID.fromString("00000000-0000-4000-8000-0000000000c2");

    /** A job, the bean its per-tenant steps are called on (the self proxy or a collaborator), and those steps. */
    record Job(String name, Class<?> type, Class<?> stepTarget, Consumer<Object> run, List<BiConsumer<Object, UUID>> steps) {
        @Override
        public String toString() {
            return name;
        }
    }

    static Stream<Job> jobs() {
        return Stream.of(
                new Job("contract lifecycle", ContractLifecycleScheduler.class, ContractLifecycleScheduler.class,
                        j -> ((ContractLifecycleScheduler) j).processContractLifecycle(), List.of(
                        (p, t) -> ((ContractLifecycleScheduler) p).autoExpireContracts(t),
                        (p, t) -> ((ContractLifecycleScheduler) p).autoRenewContracts(t),
                        (p, t) -> ((ContractLifecycleScheduler) p).createExpiryReminders(t),
                        (p, t) -> ((ContractLifecycleScheduler) p).dispatchDueReminders(t))),
                new Job("auto-regularization", AutoRegularizationScheduler.class, AutoRegularizationScheduler.class,
                        j -> ((AutoRegularizationScheduler) j).autoRegularizeAttendance(), List.of(
                        (p, t) -> ((AutoRegularizationScheduler) p).regularizeTenantAttendance(t))),
                new Job("comp-off auto-approve", AutoRegularizationScheduler.class, CompOffService.class,
                        j -> ((AutoRegularizationScheduler) j).autoApproveCompOff(), List.of(
                        (p, t) -> ((CompOffService) p).autoApproveEligibleRequests(t, anyInt()))),
                new Job("document expiry", DocumentExpiryScheduler.class, DocumentExpiryScheduler.class,
                        j -> ((DocumentExpiryScheduler) j).processDocumentExpiryReminders(), List.of(
                        (p, t) -> ((DocumentExpiryScheduler) p).dispatchDueReminders(t))),
                new Job("hire reminders", HireReminderScheduler.class, HireReminderScheduler.class,
                        j -> ((HireReminderScheduler) j).processHireReminders(), List.of(
                        (p, t) -> ((HireReminderScheduler) p).sendOnboardingTaskReminders(t),
                        (p, t) -> ((HireReminderScheduler) p).sendInterviewReminders(t))),
                new Job("policy reminders", PolicyAcknowledgmentReminderScheduler.class,
                        PolicyAcknowledgmentReminderScheduler.class,
                        j -> ((PolicyAcknowledgmentReminderScheduler) j).sendReminders(), List.of(
                        (p, t) -> ((PolicyAcknowledgmentReminderScheduler) p).remindTenant(t))));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("jobs")
    @DisplayName("each tenant runs through the proxy under its own context; tenant 1 throwing does not stop tenant 2")
    void perTenantContextAndFailureIsolation(Job job) {
        TenantRepository tenants = mock(TenantRepository.class);
        when(tenants.findActiveTenantIds()).thenReturn(List.of(T1, T2));
        Object target = mock(job.stepTarget());
        List<String> calls = new ArrayList<>();
        for (int i = 0; i < job.steps().size(); i++) {
            int step = i;
            job.steps().get(i).accept(doAnswer(inv -> {
                UUID tenant = inv.getArgument(0);
                calls.add(step + " " + tenant + " ctx=" + TenantContext.getCurrentTenant());
                if (T1.equals(tenant) && step == 0) {
                    throw new IllegalStateException("tenant 1 broken");
                }
                return 1;
            }).when(target), any());
        }

        job.run().accept(build(job, tenants, target));

        List<String> expected = new ArrayList<>(List.of("0 " + T1 + " ctx=" + T1));
        for (int i = 0; i < job.steps().size(); i++) {
            expected.add(i + " " + T2 + " ctx=" + T2);
        }
        assertThat(calls).containsExactlyElementsOf(expected);
        assertThat(TenantContext.getCurrentTenant()).as("context cleared after the run").isNull();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("jobs")
    @DisplayName("a failing tenant list propagates (ShedLock records FAILED) instead of a silent zero-tenant run")
    void tenantFetchFailureIsLoud(Job job) {
        TenantRepository tenants = mock(TenantRepository.class);
        when(tenants.findActiveTenantIds()).thenThrow(new DataAccessResourceFailureException("db down"));
        Object target = mock(job.stepTarget());

        assertThatThrownBy(() -> job.run().accept(build(job, tenants, target)))
                .isInstanceOf(DataAccessResourceFailureException.class);
        verifyNoInteractions(target);
    }

    /** Builds the scheduler through its only constructor, mocking every collaborator it does not care about. */
    @SuppressWarnings("unchecked")
    private static Object build(Job job, TenantRepository tenants, Object target) {
        ObjectProvider<Object> self = mock(ObjectProvider.class);
        when(self.getObject()).thenReturn(job.stepTarget() == job.type() ? target : mock(job.type()));
        Constructor<?> ctor = job.type().getDeclaredConstructors()[0];
        Object[] args = Arrays.stream(ctor.getParameterTypes())
                .map(p -> p == TenantRepository.class ? tenants
                        : p == ObjectProvider.class ? self
                        : p == job.stepTarget() ? target
                        : mock(p))
                .toArray();
        try {
            return ctor.newInstance(args);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
