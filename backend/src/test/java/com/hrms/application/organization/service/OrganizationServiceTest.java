package com.hrms.application.organization.service;

import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.organization.*;
import com.hrms.infrastructure.organization.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("OrganizationService Tests")
class OrganizationServiceTest {

    @Mock private OrganizationUnitRepository unitRepository;
    @Mock private PositionRepository positionRepository;
    @Mock private SuccessionPlanRepository planRepository;
    @Mock private SuccessionCandidateRepository candidateRepository;
    @Mock private TalentPoolRepository poolRepository;
    @Mock private TalentPoolMemberRepository memberRepository;

    @InjectMocks
    private OrganizationService organizationService;

    private static MockedStatic<TenantContext> tenantContextMock;
    private UUID tenantId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
    }

    // ==================== Organization Unit Tests ====================

    @Nested
    @DisplayName("createUnit")
    class CreateUnitTests {

        @Test
        @DisplayName("Should create root unit successfully")
        void shouldCreateRootUnit() {
            OrganizationUnit unit = new OrganizationUnit();
            unit.setName("Engineering");
            unit.setCode("ENG");
            unit.setType(OrganizationUnit.UnitType.DEPARTMENT);

            when(unitRepository.existsByCodeAndTenantId("ENG", tenantId)).thenReturn(false);
            when(unitRepository.save(any(OrganizationUnit.class))).thenAnswer(inv -> {
                OrganizationUnit saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            OrganizationUnit result = organizationService.createUnit(unit);

            assertThat(result.getLevel()).isEqualTo(0);
            assertThat(result.getPath()).isEqualTo("ENG");
            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(unitRepository).save(any(OrganizationUnit.class));
        }

        @Test
        @DisplayName("Should create child unit with correct level and path")
        void shouldCreateChildUnit() {
            UUID parentId = UUID.randomUUID();
            OrganizationUnit parent = new OrganizationUnit();
            parent.setId(parentId);
            parent.setLevel(0);
            parent.setPath("ENG");

            OrganizationUnit child = new OrganizationUnit();
            child.setName("Backend Team");
            child.setCode("BACKEND");
            child.setType(OrganizationUnit.UnitType.TEAM);
            child.setParentId(parentId);

            when(unitRepository.existsByCodeAndTenantId("BACKEND", tenantId)).thenReturn(false);
            when(unitRepository.findByIdAndTenantId(parentId, tenantId)).thenReturn(Optional.of(parent));
            when(unitRepository.save(any(OrganizationUnit.class))).thenAnswer(inv -> inv.getArgument(0));

            OrganizationUnit result = organizationService.createUnit(child);

            assertThat(result.getLevel()).isEqualTo(1);
            assertThat(result.getPath()).isEqualTo("ENG/BACKEND");
        }

        @Test
        @DisplayName("Should throw when code already exists")
        void shouldThrowWhenCodeExists() {
            OrganizationUnit unit = new OrganizationUnit();
            unit.setCode("ENG");

            when(unitRepository.existsByCodeAndTenantId("ENG", tenantId)).thenReturn(true);

            assertThatThrownBy(() -> organizationService.createUnit(unit))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already exists");
        }
    }

    @Nested
    @DisplayName("getUnitById")
    class GetUnitByIdTests {

        @Test
        @DisplayName("Should return unit when found")
        void shouldReturnUnit() {
            UUID unitId = UUID.randomUUID();
            OrganizationUnit unit = new OrganizationUnit();
            unit.setId(unitId);
            when(unitRepository.findByIdAndTenantId(unitId, tenantId)).thenReturn(Optional.of(unit));

            OrganizationUnit result = organizationService.getUnitById(unitId);

            assertThat(result.getId()).isEqualTo(unitId);
        }

        @Test
        @DisplayName("Should throw when unit not found")
        void shouldThrowWhenNotFound() {
            UUID unitId = UUID.randomUUID();
            when(unitRepository.findByIdAndTenantId(unitId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> organizationService.getUnitById(unitId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Test
    @DisplayName("getOrgChart should return root units")
    void shouldGetOrgChart() {
        List<OrganizationUnit> roots = List.of(new OrganizationUnit());
        when(unitRepository.findRootUnits(tenantId)).thenReturn(roots);

        List<OrganizationUnit> result = organizationService.getOrgChart();

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getChildUnits should delegate to repository")
    void shouldGetChildUnits() {
        UUID parentId = UUID.randomUUID();
        when(unitRepository.findByParent(tenantId, parentId)).thenReturn(List.of(new OrganizationUnit()));

        List<OrganizationUnit> result = organizationService.getChildUnits(parentId);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getAllActiveUnits should return active units")
    void shouldGetAllActiveUnits() {
        when(unitRepository.findByTenantIdAndIsActiveTrue(tenantId)).thenReturn(List.of(new OrganizationUnit()));

        List<OrganizationUnit> result = organizationService.getAllActiveUnits();

        assertThat(result).hasSize(1);
    }

    // ==================== Position Tests ====================

    @Nested
    @DisplayName("createPosition")
    class CreatePositionTests {

        @Test
        @DisplayName("Should create position successfully")
        void shouldCreatePosition() {
            Position position = new Position();
            position.setCode("SWE-SR");

            when(positionRepository.existsByCodeAndTenantId("SWE-SR", tenantId)).thenReturn(false);
            when(positionRepository.save(any(Position.class))).thenAnswer(inv -> {
                Position saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            Position result = organizationService.createPosition(position);

            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(positionRepository).save(any(Position.class));
        }

        @Test
        @DisplayName("Should throw when position code exists")
        void shouldThrowWhenPositionCodeExists() {
            Position position = new Position();
            position.setCode("SWE-SR");

            when(positionRepository.existsByCodeAndTenantId("SWE-SR", tenantId)).thenReturn(true);

            assertThatThrownBy(() -> organizationService.createPosition(position))
                    .isInstanceOf(BusinessException.class);
        }
    }

    @Test
    @DisplayName("getPositionById should return position when found")
    void shouldGetPositionById() {
        UUID positionId = UUID.randomUUID();
        Position position = new Position();
        position.setId(positionId);
        when(positionRepository.findByIdAndTenantId(positionId, tenantId)).thenReturn(Optional.of(position));

        Position result = organizationService.getPositionById(positionId);

        assertThat(result.getId()).isEqualTo(positionId);
    }

    @Test
    @DisplayName("getAllPositions should return paged positions")
    void shouldGetAllPositions() {
        Page<Position> page = new PageImpl<>(List.of(new Position()));
        when(positionRepository.findByTenantId(eq(tenantId), any())).thenReturn(page);

        Page<Position> result = organizationService.getAllPositions(PageRequest.of(0, 10));

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getCriticalPositions should delegate to repository")
    void shouldGetCriticalPositions() {
        when(positionRepository.findCriticalPositions(tenantId)).thenReturn(List.of(new Position()));

        List<Position> result = organizationService.getCriticalPositions();

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("getPositionsWithVacancies should delegate to repository")
    void shouldGetPositionsWithVacancies() {
        when(positionRepository.findWithVacancies(tenantId)).thenReturn(List.of(new Position()));

        List<Position> result = organizationService.getPositionsWithVacancies();

        assertThat(result).hasSize(1);
    }

    // ==================== Succession Plan Tests ====================

    @Nested
    @DisplayName("createSuccessionPlan")
    class CreateSuccessionPlanTests {

        @Test
        @DisplayName("Should create plan when no active plan exists for position")
        void shouldCreatePlan() {
            UUID positionId = UUID.randomUUID();
            SuccessionPlan plan = new SuccessionPlan();
            plan.setPositionId(positionId);

            when(planRepository.findByPositionIdAndTenantIdAndStatus(positionId, tenantId, SuccessionPlan.PlanStatus.ACTIVE))
                    .thenReturn(Optional.empty());
            when(planRepository.save(any(SuccessionPlan.class))).thenAnswer(inv -> {
                SuccessionPlan saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            SuccessionPlan result = organizationService.createSuccessionPlan(plan);

            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(planRepository).save(any(SuccessionPlan.class));
        }

        @Test
        @DisplayName("Should throw when active plan already exists")
        void shouldThrowWhenActivePlanExists() {
            UUID positionId = UUID.randomUUID();
            SuccessionPlan plan = new SuccessionPlan();
            plan.setPositionId(positionId);

            when(planRepository.findByPositionIdAndTenantIdAndStatus(positionId, tenantId, SuccessionPlan.PlanStatus.ACTIVE))
                    .thenReturn(Optional.of(new SuccessionPlan()));

            assertThatThrownBy(() -> organizationService.createSuccessionPlan(plan))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already exists");
        }
    }

    @Test
    @DisplayName("getSuccessionPlanById should return plan when found")
    void shouldGetSuccessionPlanById() {
        UUID planId = UUID.randomUUID();
        SuccessionPlan plan = new SuccessionPlan();
        plan.setId(planId);
        when(planRepository.findByIdAndTenantId(planId, tenantId)).thenReturn(Optional.of(plan));

        SuccessionPlan result = organizationService.getSuccessionPlanById(planId);

        assertThat(result.getId()).isEqualTo(planId);
    }

    // ==================== Succession Candidate Tests ====================

    @Nested
    @DisplayName("addCandidate")
    class AddCandidateTests {

        @Test
        @DisplayName("Should add candidate successfully")
        void shouldAddCandidate() {
            UUID planId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            SuccessionCandidate candidate = new SuccessionCandidate();
            candidate.setCandidateId(candidateId);

            when(candidateRepository.existsByTenantIdAndSuccessionPlanIdAndCandidateId(tenantId, planId, candidateId))
                    .thenReturn(false);
            when(candidateRepository.save(any(SuccessionCandidate.class))).thenAnswer(inv -> inv.getArgument(0));

            SuccessionCandidate result = organizationService.addCandidate(planId, candidate);

            assertThat(result.getSuccessionPlanId()).isEqualTo(planId);
            assertThat(result.getTenantId()).isEqualTo(tenantId);
        }

        @Test
        @DisplayName("Should throw when candidate already in plan")
        void shouldThrowWhenCandidateAlreadyInPlan() {
            UUID planId = UUID.randomUUID();
            UUID candidateId = UUID.randomUUID();
            SuccessionCandidate candidate = new SuccessionCandidate();
            candidate.setCandidateId(candidateId);

            when(candidateRepository.existsByTenantIdAndSuccessionPlanIdAndCandidateId(tenantId, planId, candidateId))
                    .thenReturn(true);

            assertThatThrownBy(() -> organizationService.addCandidate(planId, candidate))
                    .isInstanceOf(BusinessException.class);
        }
    }

    // ==================== Talent Pool Tests ====================

    @Nested
    @DisplayName("createTalentPool")
    class CreateTalentPoolTests {

        @Test
        @DisplayName("Should create talent pool")
        void shouldCreatePool() {
            TalentPool pool = new TalentPool();
            pool.setName("High Performers");

            when(poolRepository.save(any(TalentPool.class))).thenAnswer(inv -> {
                TalentPool saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            TalentPool result = organizationService.createTalentPool(pool);

            assertThat(result.getTenantId()).isEqualTo(tenantId);
            verify(poolRepository).save(any(TalentPool.class));
        }
    }

    @Nested
    @DisplayName("addToPool")
    class AddToPoolTests {

        @Test
        @DisplayName("Should add employee to pool")
        void shouldAddEmployeeToPool() {
            UUID poolId = UUID.randomUUID();
            UUID employeeId = UUID.randomUUID();
            UUID addedBy = UUID.randomUUID();
            TalentPool pool = new TalentPool();
            pool.setId(poolId);
            pool.setMemberCount(2);

            when(poolRepository.findByIdAndTenantId(poolId, tenantId)).thenReturn(Optional.of(pool));
            when(memberRepository.existsByTalentPoolIdAndEmployeeId(poolId, employeeId)).thenReturn(false);
            when(memberRepository.save(any(TalentPoolMember.class))).thenAnswer(inv -> inv.getArgument(0));
            when(poolRepository.save(any(TalentPool.class))).thenAnswer(inv -> inv.getArgument(0));

            TalentPoolMember result = organizationService.addToPool(poolId, employeeId, addedBy);

            assertThat(result.getTalentPoolId()).isEqualTo(poolId);
            assertThat(result.getEmployeeId()).isEqualTo(employeeId);
        }

        @Test
        @DisplayName("Should throw when employee already in pool")
        void shouldThrowWhenEmployeeAlreadyInPool() {
            UUID poolId = UUID.randomUUID();
            UUID employeeId = UUID.randomUUID();
            TalentPool pool = new TalentPool();
            pool.setId(poolId);

            when(poolRepository.findByIdAndTenantId(poolId, tenantId)).thenReturn(Optional.of(pool));
            when(memberRepository.existsByTalentPoolIdAndEmployeeId(poolId, employeeId)).thenReturn(true);

            assertThatThrownBy(() -> organizationService.addToPool(poolId, employeeId, UUID.randomUUID()))
                    .isInstanceOf(BusinessException.class);
        }
    }

    @Nested
    @DisplayName("removeFromPool")
    class RemoveFromPoolTests {

        @Test
        @DisplayName("Should remove employee from pool")
        void shouldRemoveFromPool() {
            UUID poolId = UUID.randomUUID();
            UUID employeeId = UUID.randomUUID();
            TalentPool pool = new TalentPool();
            pool.setId(poolId);
            pool.setMemberCount(3);
            TalentPoolMember member = new TalentPoolMember();

            when(poolRepository.findByIdAndTenantId(poolId, tenantId)).thenReturn(Optional.of(pool));
            when(memberRepository.findByTalentPoolIdAndEmployeeId(poolId, employeeId)).thenReturn(Optional.of(member));
            when(memberRepository.save(any(TalentPoolMember.class))).thenAnswer(inv -> inv.getArgument(0));
            when(poolRepository.save(any(TalentPool.class))).thenAnswer(inv -> inv.getArgument(0));

            organizationService.removeFromPool(poolId, employeeId);

            assertThat(member.getStatus()).isEqualTo(TalentPoolMember.MemberStatus.REMOVED);
        }

        @Test
        @DisplayName("Should throw when pool not found")
        void shouldThrowWhenPoolNotFound() {
            UUID poolId = UUID.randomUUID();
            when(poolRepository.findByIdAndTenantId(poolId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> organizationService.removeFromPool(poolId, UUID.randomUUID()))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ==================== Analytics Tests ====================

    @Test
    @DisplayName("getSuccessionAnalytics should aggregate plan and candidate data")
    void shouldGetSuccessionAnalytics() {
        when(planRepository.countActivePlans(tenantId)).thenReturn(5L);
        when(planRepository.findHighRiskPlans(tenantId)).thenReturn(List.of(new SuccessionPlan()));
        when(positionRepository.findCriticalPositions(tenantId)).thenReturn(List.of());
        when(candidateRepository.countByReadiness(tenantId)).thenReturn(List.of());
        when(poolRepository.findByTenantIdAndIsActiveTrue(tenantId)).thenReturn(List.of());

        var result = organizationService.getSuccessionAnalytics();

        assertThat(result.getActivePlans()).isEqualTo(5L);
        assertThat(result.getHighRiskPlans()).isEqualTo(1);
    }

    @Test
    @DisplayName("getNineBoxData should compute distribution")
    void shouldGetNineBoxData() {
        when(planRepository.findActivePlans(tenantId)).thenReturn(List.of());

        var result = organizationService.getNineBoxData();

        assertThat(result.getTotalCandidates()).isEqualTo(0);
    }
}
