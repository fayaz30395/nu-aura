package com.nulogic.application.attendance.service;

import com.nulogic.application.overtime.service.OvertimeManagementService;
import com.nulogic.application.shift.service.ShiftSwapService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RoleHierarchy;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import com.nulogic.domain.attendance.CompOffRequest;
import com.nulogic.domain.employee.Department;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.overtime.OvertimeRecord;
import com.nulogic.domain.shift.ShiftSwapRequest;
import com.nulogic.domain.user.RoleScope;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.attendance.repository.CompOffRequestRepository;
import com.nulogic.infrastructure.employee.repository.DepartmentRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.overtime.repository.OvertimeRecordRepository;
import com.nulogic.infrastructure.shift.repository.ShiftSwapRequestRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The pending / all lists for comp-off and shift-swap filter by the caller's scope inside the
 * query. Against real Postgres this proves two things for every scope kind: the list shows
 * exactly the rows the by-id guard ({@link AttendanceActorScope#canApprove} /
 * {@link AttendanceActorScope#requireViewAccess}) allows, and a narrow-scope caller gets full
 * pages with a total that counts only visible rows.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("Attendance scope as a query predicate")
class AttendanceScopeQueryTest extends AbstractPostgresIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final String APPROVE = Permission.ATTENDANCE_APPROVE;
    private static final PageRequest ALL_COMP_OFF = PageRequest.of(0, 500, Sort.by(Sort.Direction.ASC, "attendanceDate"));
    private static final PageRequest ALL_OVERTIME = PageRequest.of(0, 500, Sort.by(Sort.Direction.ASC, "overtimeDate"));
    private static final PageRequest ALL_SWAPS = PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "requestedAt"));

    @Autowired
    private AttendanceActorScope actorScope;
    @Autowired
    private CompOffService compOffService;
    @Autowired
    private ShiftSwapService shiftSwapService;
    @Autowired
    private OvertimeManagementService overtimeService;
    @Autowired
    private OvertimeRecordRepository overtimeRepository;
    @Autowired
    private CompOffRequestRepository compOffRepository;
    @Autowired
    private ShiftSwapRequestRepository swapRepository;
    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private DepartmentRepository departmentRepository;

    private UUID dept1;
    private UUID dept2;
    private UUID dept3;
    private final UUID loc1 = UUID.randomUUID();
    private final UUID loc2 = UUID.randomUUID();

    /** Fixture employees by letter: A is the acting employee. */
    private final Map<String, UUID> emp = new LinkedHashMap<>();
    /** Comp-off rows by employee letter, shift-swap rows by label (requester>target). */
    private final Map<String, UUID> compOffRows = new HashMap<>();
    private final Map<String, UUID> swapRows = new HashMap<>();
    /** Pending overtime rows by employee letter. */
    private final Map<String, UUID> overtimeRows = new HashMap<>();

    @BeforeEach
    void setUp() {
        SecurityContext.clear();
        TenantContext.setCurrentTenant(TENANT_ID);
        dept1 = department("D1");
        dept2 = department("D2");
        dept3 = department("D3");
        //                 letter dept   location
        employee("A", dept1, loc1);   // the actor
        employee("B", dept1, loc2);   // actor's reportee
        employee("C", dept1, loc1);
        employee("D", dept2, loc1);
        employee("E", dept2, loc2);
        employee("F", dept3, null);
        employee("G", null, null);

        int day = 1;
        for (String letter : emp.keySet()) {
            compOffRows.put(letter, compOff(letter, CompOffRequest.CompOffStatus.PENDING, LocalDate.of(2031, 1, day++)));
        }
        compOff("C", CompOffRequest.CompOffStatus.CREDITED, LocalDate.of(2031, 2, 1)); // never pending

        day = 1;
        for (String letter : emp.keySet()) {
            overtimeRows.put(letter, overtime(letter, OvertimeRecord.OvertimeStatus.PENDING, LocalDate.of(2031, 4, day++)));
        }
        overtime("C", OvertimeRecord.OvertimeStatus.APPROVED, LocalDate.of(2031, 5, 1)); // never pending

        swap("B", null, ShiftSwapRequest.SwapStatus.PENDING_APPROVAL, 1);
        swap("B", "C", ShiftSwapRequest.SwapStatus.PENDING_APPROVAL, 2);
        swap("C", "D", ShiftSwapRequest.SwapStatus.PENDING_APPROVAL, 3);
        swap("D", "E", ShiftSwapRequest.SwapStatus.PENDING_APPROVAL, 4);
        swap("A", "B", ShiftSwapRequest.SwapStatus.PENDING_APPROVAL, 5);
        swap("B", "A", ShiftSwapRequest.SwapStatus.PENDING_APPROVAL, 6);
        swap("F", "G", ShiftSwapRequest.SwapStatus.PENDING_APPROVAL, 7);
        swap("G", null, ShiftSwapRequest.SwapStatus.PENDING_APPROVAL, 8);
        swap("E", "F", ShiftSwapRequest.SwapStatus.PENDING, 9);          // not awaiting approval
        swap("C", null, ShiftSwapRequest.SwapStatus.COMPLETED, 10);      // finished
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
        TenantContext.clear();
    }

    /** Each scope kind, with who the fixture says the actor may approve / view as requester. */
    enum Profile {
        SELF_ONLY(Set.of(), Set.of("A")),
        TEAM(Set.of("B"), Set.of("A", "B")),
        DEPARTMENT(Set.of("B", "C"), Set.of("A", "B", "C")),
        LOCATION(Set.of("C", "D"), Set.of("A", "C", "D")),
        // custom targets: employee F, department 2 (D, E), location 2 (B, E)
        CUSTOM(Set.of("B", "D", "E", "F"), Set.of("A", "B", "D", "E", "F")),
        MIXED_VIEW(Set.of("B"), Set.of("A", "B", "C")),   // approve TEAM; view TEAM + DEPARTMENT
        ALL(Set.of("A", "B", "C", "D", "E", "F", "G"), Set.of("A", "B", "C", "D", "E", "F", "G")),
        SUPER_ADMIN(Set.of("A", "B", "C", "D", "E", "F", "G"), Set.of("A", "B", "C", "D", "E", "F", "G")),
        NO_PERMISSIONS(Set.of(), Set.of("A")),
        DEPARTMENT_WITHOUT_ORG_CONTEXT(Set.of(), Set.of("A")),
        NO_EMPLOYEE_CONTEXT(Set.of(), Set.of());

        final Set<String> approvable;
        final Set<String> viewable;

        Profile(Set<String> approvable, Set<String> viewable) {
            this.approvable = approvable;
            this.viewable = viewable;
        }
    }

    @ParameterizedTest
    @EnumSource(Profile.class)
    @DisplayName("comp-off pending list shows exactly the requests the approval guard allows")
    void compOffPendingMatchesGuard(Profile profile) {
        login(profile);

        List<CompOffRequest> listed = compOffService.getPendingRequests(ALL_COMP_OFF).getContent();

        Set<UUID> expected = compOffRepository.findAll().stream()
                .filter(r -> TENANT_ID.equals(r.getTenantId()) && r.getStatus() == CompOffRequest.CompOffStatus.PENDING)
                .filter(r -> actorScope.canApprove(r.getEmployeeId(), APPROVE))
                .map(CompOffRequest::getId).collect(Collectors.toSet());
        assertThat(ids(listed, CompOffRequest::getId)).isEqualTo(expected);

        Set<String> visibleFixtureRows = lettersOf(listed, CompOffRequest::getEmployeeId);
        assertThat(visibleFixtureRows).isEqualTo(profile.approvable);
    }

    @ParameterizedTest
    @EnumSource(Profile.class)
    @DisplayName("shift-swap pending-approval list shows exactly the swaps whose both parties the guard allows")
    void swapPendingApprovalMatchesGuard(Profile profile) {
        login(profile);

        List<ShiftSwapRequest> listed = shiftSwapService.getRequestsPendingApproval();

        Set<UUID> expected = swapRepository.findAll().stream()
                .filter(r -> TENANT_ID.equals(r.getTenantId()) && r.getStatus() == ShiftSwapRequest.SwapStatus.PENDING_APPROVAL)
                .filter(r -> actorScope.canApprove(r.getRequesterEmployeeId(), APPROVE)
                        && (r.getTargetEmployeeId() == null || actorScope.canApprove(r.getTargetEmployeeId(), APPROVE)))
                .map(ShiftSwapRequest::getId).collect(Collectors.toSet());
        assertThat(ids(listed, ShiftSwapRequest::getId)).isEqualTo(expected);

        Set<String> expectedLabels = swapRows.entrySet().stream()
                .filter(e -> swapRepository.findById(e.getValue()).orElseThrow().getStatus()
                        == ShiftSwapRequest.SwapStatus.PENDING_APPROVAL)
                .filter(e -> bothParties(e.getKey(), profile.approvable))
                .map(Map.Entry::getKey).collect(Collectors.toSet());
        assertThat(labelsOf(listed)).isEqualTo(expectedLabels);
    }

    @ParameterizedTest
    @EnumSource(Profile.class)
    @DisplayName("shift-swap all list shows exactly the swaps whose requester the view guard allows")
    void swapAllMatchesGuard(Profile profile) {
        login(profile);

        Page<ShiftSwapRequest> page = shiftSwapService.getAllRequests(ALL_SWAPS);

        Set<UUID> expected = swapRepository.findAll().stream()
                .filter(r -> TENANT_ID.equals(r.getTenantId()))
                .filter(r -> canView(r.getRequesterEmployeeId()))
                .map(ShiftSwapRequest::getId).collect(Collectors.toSet());
        assertThat(ids(page.getContent(), ShiftSwapRequest::getId)).isEqualTo(expected);
        assertThat(page.getTotalElements()).isEqualTo(expected.size());

        Set<String> expectedLabels = swapRows.keySet().stream()
                .filter(label -> profile.viewable.contains(label.substring(0, 1)))
                .collect(Collectors.toSet());
        assertThat(labelsOf(page.getContent())).isEqualTo(expectedLabels);
    }

    @Test
    @DisplayName("narrow scope still gets full pages: the page and its total count only visible rows")
    void narrowScopePagesAreNotSparse() {
        // out-of-scope requests that sort before the approver's own team in ASC attendance-date order
        for (int i = 1; i <= 6; i++) {
            compOff("G", CompOffRequest.CompOffStatus.PENDING, LocalDate.of(2030, 1, i));
        }
        login(Profile.DEPARTMENT);   // approves B and C (D1), not G
        long visible = compOffRepository.findAll().stream()
                .filter(r -> TENANT_ID.equals(r.getTenantId()) && r.getStatus() == CompOffRequest.CompOffStatus.PENDING)
                .filter(r -> actorScope.canApprove(r.getEmployeeId(), APPROVE))
                .count();

        Page<CompOffRequest> first = compOffService.getPendingRequests(
                PageRequest.of(0, 2, Sort.by(Sort.Direction.ASC, "attendanceDate")));

        assertThat(first.getTotalElements()).isEqualTo(visible);
        assertThat(first.getContent()).hasSize((int) Math.min(2, visible));
        assertThat(first.getContent()).allMatch(r -> actorScope.canApprove(r.getEmployeeId(), APPROVE));
    }

    @ParameterizedTest
    @EnumSource(Profile.class)
    @DisplayName("overtime pending and all lists show exactly the records the view guard allows")
    void overtimeListsMatchViewGuard(Profile profile) {
        login(profile);

        Page<?> pending = overtimeService.getPendingOvertimeRecords(ALL_OVERTIME);
        Page<?> all = overtimeService.getAllOvertimeRecords(ALL_OVERTIME);

        Set<OvertimeRecord> visible = overtimeRepository.findAll().stream()
                .filter(r -> TENANT_ID.equals(r.getTenantId()))
                .filter(r -> canView(r.getEmployeeId())).collect(Collectors.toSet());
        Set<UUID> expectedAll = ids(List.copyOf(visible), OvertimeRecord::getId);
        Set<UUID> expectedPending = visible.stream().filter(r -> r.getStatus() == OvertimeRecord.OvertimeStatus.PENDING)
                .map(OvertimeRecord::getId).collect(Collectors.toSet());
        assertThat(overtimeIds(all)).isEqualTo(expectedAll);
        assertThat(all.getTotalElements()).isEqualTo(expectedAll.size());
        assertThat(overtimeIds(pending)).isEqualTo(expectedPending);
        assertThat(pending.getTotalElements()).isEqualTo(expectedPending.size());

        // hand-derived: the pending fixture rows are exactly the viewable employees' letters
        Set<UUID> expectedFixture = profile.viewable.stream().map(overtimeRows::get).collect(Collectors.toSet());
        assertThat(overtimeIds(pending)).containsAll(expectedFixture);
    }

    @Test
    @DisplayName("overtime: a TEAM view caller sees own and reportee rows only, never other employees in the tenant")
    void overtimeTeamCallerNeverSeesNonReportees() {
        login(Profile.TEAM);

        Set<UUID> pending = overtimeIds(overtimeService.getPendingOvertimeRecords(ALL_OVERTIME));
        Set<UUID> all = overtimeIds(overtimeService.getAllOvertimeRecords(ALL_OVERTIME));

        for (String outsider : List.of("C", "D", "E", "F", "G")) {
            assertThat(pending).doesNotContain(overtimeRows.get(outsider));
            assertThat(all).doesNotContain(overtimeRows.get(outsider));
        }
        assertThat(pending).containsExactlyInAnyOrder(overtimeRows.get("A"), overtimeRows.get("B"));
    }

    @Test
    @DisplayName("overtime: a caller with no employee context sees nothing")
    void overtimeNoEmployeeContextSeesNothing() {
        login(Profile.NO_EMPLOYEE_CONTEXT);

        assertThat(overtimeService.getPendingOvertimeRecords(ALL_OVERTIME).getTotalElements()).isZero();
        assertThat(overtimeService.getAllOvertimeRecords(ALL_OVERTIME).getTotalElements()).isZero();
    }

    @Test
    @DisplayName("overtime: narrow scope still gets full pages and a total of visible rows only")
    void overtimePagesAreNotSparse() {
        for (int i = 1; i <= 6; i++) {
            overtime("G", OvertimeRecord.OvertimeStatus.PENDING, LocalDate.of(2030, 1, i));   // sort before A and B
        }
        login(Profile.TEAM);   // A and B only

        Page<?> first = overtimeService.getPendingOvertimeRecords(
                PageRequest.of(0, 2, Sort.by(Sort.Direction.ASC, "overtimeDate")));

        assertThat(first.getTotalElements()).isEqualTo(2);
        assertThat(first.getContent()).hasSize(2);
    }

    // ---------- fixtures ----------

    private void login(Profile profile) {
        UUID actor = profile == Profile.NO_EMPLOYEE_CONTEXT ? null : emp.get("A");
        Map<String, RoleScope> permissions = new HashMap<>();
        Set<String> roles = Set.of("MANAGER");
        switch (profile) {
            case SELF_ONLY -> {
                permissions.put(APPROVE, RoleScope.SELF);
                permissions.put(Permission.ATTENDANCE_VIEW_SELF, RoleScope.SELF);
            }
            case TEAM -> {
                permissions.put(APPROVE, RoleScope.TEAM);
                permissions.put(Permission.ATTENDANCE_VIEW_TEAM, RoleScope.TEAM);
            }
            case DEPARTMENT, DEPARTMENT_WITHOUT_ORG_CONTEXT -> {
                permissions.put(APPROVE, RoleScope.DEPARTMENT);
                permissions.put(Permission.ATTENDANCE_VIEW_ALL, RoleScope.DEPARTMENT);
            }
            case LOCATION -> {
                permissions.put(APPROVE, RoleScope.LOCATION);
                permissions.put(Permission.ATTENDANCE_VIEW_ALL, RoleScope.LOCATION);
            }
            case CUSTOM -> {
                permissions.put(APPROVE, RoleScope.CUSTOM);
                permissions.put(Permission.ATTENDANCE_VIEW_ALL, RoleScope.CUSTOM);
            }
            case MIXED_VIEW -> {
                permissions.put(APPROVE, RoleScope.TEAM);
                permissions.put(Permission.ATTENDANCE_VIEW_TEAM, RoleScope.TEAM);
                permissions.put(Permission.ATTENDANCE_VIEW_ALL, RoleScope.DEPARTMENT);
            }
            case ALL, NO_EMPLOYEE_CONTEXT -> {
                permissions.put(APPROVE, RoleScope.ALL);
                permissions.put(Permission.ATTENDANCE_VIEW_ALL, RoleScope.ALL);
            }
            case SUPER_ADMIN -> roles = Set.of(RoleHierarchy.SUPER_ADMIN);
            case NO_PERMISSIONS -> {
            }
        }
        SecurityContext.setCurrentUser(UUID.randomUUID(), actor, roles, permissions);
        SecurityContext.setAllReporteeIds(Set.of(emp.get("B")));
        if (profile != Profile.DEPARTMENT_WITHOUT_ORG_CONTEXT) {
            SecurityContext.setOrgContext(loc1, dept1, null);
        }
        SecurityContext.setCurrentLocationIds(Set.of(loc1));
        if (profile == Profile.CUSTOM) {
            for (String permission : List.of(APPROVE, Permission.ATTENDANCE_VIEW_ALL)) {
                SecurityContext.setCustomScopeTargets(permission, Set.of(emp.get("F")), Set.of(dept2), Set.of(loc2));
            }
        }
    }

    private boolean canView(UUID employeeId) {
        try {
            actorScope.requireViewAccess(employeeId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    private boolean bothParties(String label, Set<String> allowed) {
        String[] parties = label.substring(0, label.indexOf('#')).split(">");   // "B>C#2" -> B, C; "B>#1" -> B
        return allowed.contains(parties[0]) && (parties.length == 1 || allowed.contains(parties[1]));
    }

    private <T> Set<UUID> ids(List<T> rows, java.util.function.Function<T, UUID> id) {
        return rows.stream().map(id).collect(Collectors.toSet());
    }

    private <T> Set<String> lettersOf(List<T> rows, java.util.function.Function<T, UUID> employeeId) {
        Map<UUID, String> byId = emp.entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
        return rows.stream().map(employeeId).filter(byId::containsKey).map(byId::get).collect(Collectors.toSet());
    }

    private Set<String> labelsOf(List<ShiftSwapRequest> rows) {
        Set<UUID> listed = ids(rows, ShiftSwapRequest::getId);
        return swapRows.entrySet().stream().filter(e -> listed.contains(e.getValue()))
                .map(Map.Entry::getKey).collect(Collectors.toSet());
    }

    private UUID department(String code) {
        Department department = Department.builder()
                .code(code + "-" + UUID.randomUUID().toString().substring(0, 6)).name("Scope " + code).build();
        department.setTenantId(TENANT_ID);
        return departmentRepository.save(department).getId();
    }

    private void employee(String letter, UUID departmentId, UUID locationId) {
        User user = User.builder()
                .email("scope-" + letter.toLowerCase() + "-" + UUID.randomUUID() + "@example.com")
                .firstName("Scope").lastName(letter).passwordHash("test-hash")
                .status(User.UserStatus.ACTIVE).build();
        user.setTenantId(TENANT_ID);
        Employee employee = Employee.builder()
                .employeeCode("SCP-" + letter + "-" + UUID.randomUUID().toString().substring(0, 6))
                .firstName("Scope").lastName(letter)
                .joiningDate(LocalDate.now().minusDays(30))
                .employmentType(Employee.EmploymentType.FULL_TIME)
                .status(Employee.EmployeeStatus.ACTIVE)
                .user(userRepository.save(user))
                .build();
        employee.setTenantId(TENANT_ID);
        employee.setDepartmentId(departmentId);
        employee.setOfficeLocationId(locationId);
        emp.put(letter, employeeRepository.save(employee).getId());
    }

    private Set<UUID> overtimeIds(Page<?> page) {
        return page.getContent().stream()
                .map(r -> ((com.nulogic.api.overtime.dto.OvertimeRecordResponse) r).getId()).collect(Collectors.toSet());
    }

    private UUID overtime(String letter, OvertimeRecord.OvertimeStatus status, LocalDate date) {
        return overtimeRepository.save(OvertimeRecord.builder()
                .tenantId(TENANT_ID).employeeId(emp.get(letter)).overtimeDate(date)
                .regularHours(new BigDecimal("8")).actualHours(new BigDecimal("10")).overtimeHours(new BigDecimal("2"))
                .overtimeType(OvertimeRecord.OvertimeType.REGULAR).multiplier(new BigDecimal("1.5"))
                .effectiveHours(new BigDecimal("3")).status(status).build()).getId();
    }

    private UUID compOff(String letter, CompOffRequest.CompOffStatus status, LocalDate date) {
        return compOffRepository.save(CompOffRequest.builder()
                .tenantId(TENANT_ID).employeeId(emp.get(letter)).attendanceDate(date)
                .overtimeMinutes(480).compOffDays(BigDecimal.ONE).status(status)
                .requestedBy(emp.get(letter)).build()).getId();
    }

    private void swap(String requester, String target, ShiftSwapRequest.SwapStatus status, int hour) {
        ShiftSwapRequest saved = swapRepository.save(ShiftSwapRequest.builder()
                .tenantId(TENANT_ID).requesterEmployeeId(emp.get(requester))
                .requesterAssignmentId(UUID.randomUUID()).requesterShiftDate(LocalDate.of(2031, 3, 1))
                .targetEmployeeId(target == null ? null : emp.get(target))
                .swapType(ShiftSwapRequest.SwapType.SWAP).status(status)
                .requestedAt(LocalDateTime.of(2031, 1, 1, hour, 0)).build());
        swapRows.put(requester + ">" + (target == null ? "" : target) + "#" + hour, saved.getId());
    }
}
