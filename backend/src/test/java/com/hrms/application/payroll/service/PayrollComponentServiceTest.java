package com.hrms.application.payroll.service;

import com.hrms.application.audit.service.AuditLogService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.PayrollComponent;
import com.hrms.domain.payroll.PayrollComponent.ComponentType;
import com.hrms.infrastructure.payroll.repository.PayrollComponentRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PayrollComponentService Tests")
class PayrollComponentServiceTest {

    @Mock
    private PayrollComponentRepository payrollComponentRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private PayrollComponentService payrollComponentService;

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
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
    }

    // ===== Topological Sort Tests =====

    @Test
    @DisplayName("topologicalSort: should sort components with no dependencies")
    void topologicalSort_noFormulas_returnsAll() {
        List<PayrollComponent> components = List.of(
                buildComponent("basic", null),
                buildComponent("hra", null),
                buildComponent("pf", null)
        );

        List<PayrollComponent> sorted = payrollComponentService.topologicalSort(components);

        assertThat(sorted).hasSize(3);
        assertThat(sorted.stream().map(PayrollComponent::getCode))
                .containsExactlyInAnyOrder("basic", "hra", "pf");
    }

    @Test
    @DisplayName("topologicalSort: should order dependent components after their dependencies")
    void topologicalSort_withDependencies_correctOrder() {
        List<PayrollComponent> components = List.of(
                buildComponent("basic", null),
                buildComponent("hra", "basic * 0.4"),
                buildComponent("pf", "basic * 0.12"),
                buildComponent("gross", "basic + hra")
        );

        List<PayrollComponent> sorted = payrollComponentService.topologicalSort(components);

        assertThat(sorted).hasSize(4);
        List<String> codes = sorted.stream().map(PayrollComponent::getCode).toList();

        // basic must come before hra, pf, and gross
        assertThat(codes.indexOf("basic")).isLessThan(codes.indexOf("hra"));
        assertThat(codes.indexOf("basic")).isLessThan(codes.indexOf("pf"));
        assertThat(codes.indexOf("basic")).isLessThan(codes.indexOf("gross"));

        // hra must come before gross (gross depends on hra)
        assertThat(codes.indexOf("hra")).isLessThan(codes.indexOf("gross"));
    }

    @Test
    @DisplayName("topologicalSort: should detect direct circular dependency (A -> B -> A)")
    void topologicalSort_directCycle_throwsBusinessException() {
        List<PayrollComponent> components = List.of(
                buildComponent("comp_a", "comp_b * 0.5"),
                buildComponent("comp_b", "comp_a * 0.3")
        );

        assertThatThrownBy(() -> payrollComponentService.topologicalSort(components))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Circular dependency detected")
                .hasMessageContaining("comp_a")
                .hasMessageContaining("comp_b");
    }

    @Test
    @DisplayName("topologicalSort: should detect indirect circular dependency (A -> B -> C -> A)")
    void topologicalSort_indirectCycle_throwsBusinessException() {
        List<PayrollComponent> components = List.of(
                buildComponent("comp_a", "comp_c * 0.1"),
                buildComponent("comp_b", "comp_a * 0.2"),
                buildComponent("comp_c", "comp_b * 0.3")
        );

        assertThatThrownBy(() -> payrollComponentService.topologicalSort(components))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Circular dependency detected");
    }

    @Test
    @DisplayName("topologicalSort: should detect self-referencing component")
    void topologicalSort_selfReference_throwsBusinessException() {
        List<PayrollComponent> components = List.of(
                buildComponent("basic", null),
                buildComponent("loop", "loop * 2")
        );

        assertThatThrownBy(() -> payrollComponentService.topologicalSort(components))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Circular dependency detected")
                .hasMessageContaining("loop");
    }

    @Test
    @DisplayName("topologicalSort: should handle empty list")
    void topologicalSort_emptyList_returnsEmpty() {
        List<PayrollComponent> sorted = payrollComponentService.topologicalSort(Collections.emptyList());
        assertThat(sorted).isEmpty();
    }

    @Test
    @DisplayName("topologicalSort: should handle deep dependency chain")
    void topologicalSort_deepChain_correctOrder() {
        List<PayrollComponent> components = List.of(
                buildComponent("d", "c * 1.1"),
                buildComponent("c", "b * 1.1"),
                buildComponent("b", "a * 1.1"),
                buildComponent("a", null)
        );

        List<PayrollComponent> sorted = payrollComponentService.topologicalSort(components);
        List<String> codes = sorted.stream().map(PayrollComponent::getCode).toList();

        assertThat(codes).containsExactly("a", "b", "c", "d");
    }

    @Test
    @DisplayName("topologicalSort: should handle diamond dependency pattern without false positive")
    void topologicalSort_diamondDependency_noCycle() {
        // Diamond: basic -> hra, basic -> pf, hra -> gross, pf -> gross
        List<PayrollComponent> components = List.of(
                buildComponent("basic", null),
                buildComponent("hra", "basic * 0.4"),
                buildComponent("pf", "basic * 0.12"),
                buildComponent("gross", "hra + pf")
        );

        List<PayrollComponent> sorted = payrollComponentService.topologicalSort(components);
        List<String> codes = sorted.stream().map(PayrollComponent::getCode).toList();

        assertThat(codes.indexOf("basic")).isLessThan(codes.indexOf("hra"));
        assertThat(codes.indexOf("basic")).isLessThan(codes.indexOf("pf"));
        assertThat(codes.indexOf("hra")).isLessThan(codes.indexOf("gross"));
        assertThat(codes.indexOf("pf")).isLessThan(codes.indexOf("gross"));
    }

    // ===== Formula Reference Extraction Tests =====

    @Test
    @DisplayName("extractFormulaReferences: should extract component codes from formula")
    void extractFormulaReferences_simpleFormula() {
        Set<String> refs = payrollComponentService.extractFormulaReferences("basic * 0.4");
        assertThat(refs).containsExactly("basic");
    }

    @Test
    @DisplayName("extractFormulaReferences: should extract multiple references")
    void extractFormulaReferences_multipleRefs() {
        Set<String> refs = payrollComponentService.extractFormulaReferences("basic + hra + special_allowance");
        assertThat(refs).containsExactlyInAnyOrder("basic", "hra", "special_allowance");
    }

    @Test
    @DisplayName("extractFormulaReferences: should exclude SpEL keywords")
    void extractFormulaReferences_excludesKeywords() {
        Set<String> refs = payrollComponentService.extractFormulaReferences("basic > 0 ? basic * 0.12 : null");
        assertThat(refs).containsExactlyInAnyOrder("basic");
        assertThat(refs).doesNotContain("null");
    }

    @Test
    @DisplayName("extractFormulaReferences: should handle null/blank formula")
    void extractFormulaReferences_nullFormula() {
        assertThat(payrollComponentService.extractFormulaReferences(null)).isEmpty();
        assertThat(payrollComponentService.extractFormulaReferences("")).isEmpty();
        assertThat(payrollComponentService.extractFormulaReferences("   ")).isEmpty();
    }

    // ===== Component Evaluation Tests =====

    @Test
    @DisplayName("evaluateComponents: should compute formula-based components in correct order")
    void evaluateComponents_formulaEvaluation() {
        List<PayrollComponent> components = List.of(
                buildComponentWithOrder("basic", null, BigDecimal.ZERO, 0),
                buildComponentWithOrder("hra", "basic * 0.4", null, 1),
                buildComponentWithOrder("pf", "basic * 0.12", null, 2)
        );

        when(payrollComponentRepository.findAllByTenantIdAndIsActiveTrueOrderByEvaluationOrderAsc(tenantId))
                .thenReturn(components);

        Map<String, BigDecimal> inputs = new HashMap<>();
        inputs.put("basic", new BigDecimal("50000"));

        Map<String, BigDecimal> result = payrollComponentService.evaluateComponents(inputs);

        assertThat(result.get("basic")).isEqualByComparingTo("50000");
        assertThat(result.get("hra")).isEqualByComparingTo("20000.00");
        assertThat(result.get("pf")).isEqualByComparingTo("6000.00");
    }

    // ===== Create Component with Cycle Detection Tests =====

    @Test
    @DisplayName("createComponent: should reject component that creates a cycle")
    void createComponent_cycleDetected_throwsBusinessException() {
        PayrollComponent existingA = buildComponent("comp_a", "comp_b * 0.5");
        existingA.setTenantId(tenantId);
        existingA.setId(UUID.randomUUID());

        PayrollComponent newB = buildComponent("comp_b", "comp_a * 0.3");

        when(payrollComponentRepository.existsByTenantIdAndCode(tenantId, "comp_b")).thenReturn(false);
        when(payrollComponentRepository.findAllByTenantIdOrderByEvaluationOrderAsc(tenantId))
                .thenReturn(new ArrayList<>(List.of(existingA)));

        assertThatThrownBy(() -> payrollComponentService.createComponent(newB))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Circular dependency detected");
    }

    @Test
    @DisplayName("createComponent: should succeed when no cycle exists")
    void createComponent_noCycle_succeeds() {
        PayrollComponent existingBasic = buildComponent("basic", null);
        existingBasic.setTenantId(tenantId);
        existingBasic.setId(UUID.randomUUID());

        PayrollComponent newHra = buildComponent("hra", "basic * 0.4");

        when(payrollComponentRepository.existsByTenantIdAndCode(tenantId, "hra")).thenReturn(false);
        when(payrollComponentRepository.findAllByTenantIdOrderByEvaluationOrderAsc(tenantId))
                .thenReturn(new ArrayList<>(List.of(existingBasic)));
        when(payrollComponentRepository.save(any(PayrollComponent.class))).thenReturn(newHra);

        PayrollComponent result = payrollComponentService.createComponent(newHra);
        assertThat(result.getCode()).isEqualTo("hra");
    }

    // ===== Delete Component Tests =====

    @Test
    @DisplayName("deleteComponent: should prevent deletion of component referenced by others")
    void deleteComponent_referencedByOthers_throwsBusinessException() {
        PayrollComponent basic = buildComponent("basic", null);
        basic.setId(UUID.randomUUID());
        basic.setTenantId(tenantId);

        PayrollComponent hra = buildComponent("hra", "basic * 0.4");
        hra.setId(UUID.randomUUID());
        hra.setTenantId(tenantId);

        when(payrollComponentRepository.findById(basic.getId())).thenReturn(Optional.of(basic));
        when(payrollComponentRepository.findAllByTenantIdOrderByEvaluationOrderAsc(tenantId))
                .thenReturn(List.of(basic, hra));

        assertThatThrownBy(() -> payrollComponentService.deleteComponent(basic.getId()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Cannot delete component 'basic'")
                .hasMessageContaining("referenced by: hra");
    }

    // ===== Helpers =====

    private PayrollComponent buildComponent(String code, String formula) {
        return PayrollComponent.builder()
                .code(code)
                .name(code.toUpperCase())
                .componentType(ComponentType.EARNING)
                .formula(formula)
                .evaluationOrder(0)
                .isActive(true)
                .isTaxable(true)
                .build();
    }

    private PayrollComponent buildComponentWithOrder(String code, String formula,
                                                      BigDecimal defaultValue, int order) {
        return PayrollComponent.builder()
                .code(code)
                .name(code.toUpperCase())
                .componentType(ComponentType.EARNING)
                .formula(formula)
                .defaultValue(defaultValue)
                .evaluationOrder(order)
                .isActive(true)
                .isTaxable(true)
                .build();
    }
}
