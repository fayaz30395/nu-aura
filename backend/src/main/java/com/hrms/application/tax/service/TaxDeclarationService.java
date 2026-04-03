package com.hrms.application.tax.service;

import com.hrms.api.tax.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.tax.TaxDeclaration;
import com.hrms.domain.tax.TaxProof;
import com.hrms.domain.tax.TaxRegimeComparison;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.tax.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TaxDeclarationService {

    private static final BigDecimal SEC_80C_LIMIT = new BigDecimal("150000");

    private final TaxDeclarationRepository taxDeclarationRepository;
    private final TaxProofRepository taxProofRepository;
    private final TaxRegimeComparisonRepository taxRegimeComparisonRepository;
    private final EmployeeRepository employeeRepository;

    // ==================== Tax Declaration Operations ====================

    @Transactional
    public TaxDeclarationResponse createTaxDeclaration(TaxDeclarationRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating tax declaration for employee {} for FY {}", request.getEmployeeId(), request.getFinancialYear());

        employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        // Check if declaration already exists for this FY
        taxDeclarationRepository.findByTenantIdAndEmployeeIdAndFinancialYear(
                        tenantId, request.getEmployeeId(), request.getFinancialYear())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Tax declaration already exists for this financial year");
                });

        TaxDeclaration declaration = mapToEntity(request, tenantId);
        declaration.setId(UUID.randomUUID());
        declaration.setStatus(TaxDeclaration.DeclarationStatus.DRAFT);
        calculateTotals(declaration);

        TaxDeclaration saved = taxDeclarationRepository.save(declaration);
        return mapToResponse(saved);
    }

    @Transactional
    public TaxDeclarationResponse updateTaxDeclaration(UUID id, TaxDeclarationRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating tax declaration {}", id);

        TaxDeclaration declaration = taxDeclarationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tax declaration not found"));

        if (declaration.getStatus() == TaxDeclaration.DeclarationStatus.LOCKED) {
            throw new IllegalStateException("Cannot update locked tax declaration");
        }

        updateEntityFromRequest(declaration, request);
        calculateTotals(declaration);

        TaxDeclaration updated = taxDeclarationRepository.save(declaration);
        return mapToResponse(updated);
    }

    @Transactional
    public TaxDeclarationResponse submitTaxDeclaration(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Submitting tax declaration {}", id);

        TaxDeclaration declaration = taxDeclarationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tax declaration not found"));

        if (declaration.getStatus() != TaxDeclaration.DeclarationStatus.DRAFT &&
                declaration.getStatus() != TaxDeclaration.DeclarationStatus.REJECTED) {
            throw new IllegalStateException("Only draft or rejected declarations can be submitted");
        }

        declaration.setStatus(TaxDeclaration.DeclarationStatus.SUBMITTED);
        declaration.setSubmittedAt(LocalDateTime.now());

        TaxDeclaration updated = taxDeclarationRepository.save(declaration);
        return mapToResponse(updated);
    }

    @Transactional
    public TaxDeclarationResponse approveTaxDeclaration(UUID id, UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Approving tax declaration {} by {}", id, approverId);

        TaxDeclaration declaration = taxDeclarationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tax declaration not found"));

        if (declaration.getStatus() != TaxDeclaration.DeclarationStatus.SUBMITTED) {
            throw new IllegalStateException("Only submitted declarations can be approved");
        }

        declaration.setStatus(TaxDeclaration.DeclarationStatus.APPROVED);
        declaration.setApprovedBy(approverId);
        declaration.setApprovedAt(LocalDateTime.now());

        TaxDeclaration updated = taxDeclarationRepository.save(declaration);
        return mapToResponse(updated);
    }

    @Transactional
    public TaxDeclarationResponse rejectTaxDeclaration(UUID id, UUID rejectedBy, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Rejecting tax declaration {} by {}", id, rejectedBy);

        TaxDeclaration declaration = taxDeclarationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tax declaration not found"));

        declaration.setStatus(TaxDeclaration.DeclarationStatus.REJECTED);
        declaration.setRejectedBy(rejectedBy);
        declaration.setRejectedAt(LocalDateTime.now());
        declaration.setRejectionReason(reason);

        TaxDeclaration updated = taxDeclarationRepository.save(declaration);
        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public TaxDeclarationResponse getTaxDeclarationById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TaxDeclaration declaration = taxDeclarationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tax declaration not found"));
        return mapToResponse(declaration);
    }

    @Transactional(readOnly = true)
    public List<TaxDeclarationResponse> getTaxDeclarationsByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return taxDeclarationRepository.findByTenantIdAndEmployeeIdOrderByFinancialYearDesc(tenantId, employeeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<TaxDeclarationResponse> getAllTaxDeclarations(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return taxDeclarationRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToResponse);
    }

    @Transactional
    public void deleteTaxDeclaration(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TaxDeclaration declaration = taxDeclarationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tax declaration not found"));

        if (declaration.getStatus() != TaxDeclaration.DeclarationStatus.DRAFT) {
            throw new IllegalStateException("Only draft declarations can be deleted");
        }

        taxDeclarationRepository.delete(declaration);
    }

    // ==================== Tax Proof Operations ====================

    @Transactional
    public TaxProofResponse addTaxProof(UUID employeeId, TaxProofRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Adding tax proof for declaration {}", request.getTaxDeclarationId());

        taxDeclarationRepository.findByIdAndTenantId(request.getTaxDeclarationId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tax declaration not found"));

        TaxProof proof = new TaxProof();
        proof.setId(UUID.randomUUID());
        proof.setTenantId(tenantId);
        proof.setTaxDeclarationId(request.getTaxDeclarationId());
        proof.setEmployeeId(employeeId);
        proof.setProofType(request.getProofType());
        proof.setInvestmentSection(request.getInvestmentSection());
        proof.setProofDescription(request.getProofDescription());
        proof.setDeclaredAmount(request.getDeclaredAmount());
        proof.setDocumentName(request.getDocumentName());
        proof.setDocumentUrl(request.getDocumentUrl());
        proof.setDocumentType(request.getDocumentType());
        proof.setDocumentSize(request.getDocumentSize());
        proof.setIssuerName(request.getIssuerName());
        proof.setPolicyNumber(request.getPolicyNumber());
        proof.setCertificateNumber(request.getCertificateNumber());
        proof.setStartDate(request.getStartDate());
        proof.setEndDate(request.getEndDate());
        proof.setStatus(TaxProof.ProofStatus.DRAFT);

        TaxProof saved = taxProofRepository.save(proof);
        return mapToProofResponse(saved);
    }

    public TaxProofResponse verifyTaxProof(UUID proofId, UUID verifiedBy, BigDecimal approvedAmount, String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Verifying tax proof {} by {}", proofId, verifiedBy);

        TaxProof proof = taxProofRepository.findByIdAndTenantId(proofId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tax proof not found"));

        proof.setStatus(TaxProof.ProofStatus.VERIFIED);
        proof.setApprovedAmount(approvedAmount != null ? approvedAmount : proof.getDeclaredAmount());
        proof.setVerifiedBy(verifiedBy);
        proof.setVerifiedAt(LocalDateTime.now());
        proof.setVerificationNotes(notes);

        TaxProof updated = taxProofRepository.save(proof);
        return mapToProofResponse(updated);
    }

    @Transactional(readOnly = true)
    public List<TaxProofResponse> getTaxProofsByDeclaration(UUID declarationId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return taxProofRepository.findByTenantIdAndTaxDeclarationId(tenantId, declarationId).stream()
                .map(this::mapToProofResponse)
                .collect(Collectors.toList());
    }

    // ==================== Helper Methods ====================

    private void calculateTotals(TaxDeclaration decl) {
        // Calculate Section 80C total (max 150,000)
        BigDecimal sec80cTotal = BigDecimal.ZERO
                .add(nvl(decl.getSec80cPpf()))
                .add(nvl(decl.getSec80cEpf()))
                .add(nvl(decl.getSec80cLifeInsurance()))
                .add(nvl(decl.getSec80cElss()))
                .add(nvl(decl.getSec80cNsc()))
                .add(nvl(decl.getSec80cHomeLoanPrincipal()))
                .add(nvl(decl.getSec80cTuitionFees()))
                .add(nvl(decl.getSec80cSukanyaSamriddhi()))
                .add(nvl(decl.getSec80cNpsEmployee()));
        decl.setSec80cTotal(sec80cTotal.min(SEC_80C_LIMIT));

        // Calculate Section 80D total
        BigDecimal sec80dTotal = nvl(decl.getSec80dSelfFamily())
                .add(nvl(decl.getSec80dParents()))
                .add(nvl(decl.getSec80dPreventiveHealth()));
        decl.setSec80dTotal(sec80dTotal);

        // Calculate other income total
        BigDecimal otherIncomeTotal = nvl(decl.getOtherIncomeInterest())
                .add(nvl(decl.getOtherIncomeRental()))
                .add(nvl(decl.getOtherIncomeCapitalGains()));
        decl.setOtherIncomeTotal(otherIncomeTotal);

        // Calculate total deductions (only for old regime)
        if (decl.getTaxRegime() == TaxDeclaration.TaxRegimeType.OLD_REGIME) {
            BigDecimal totalDeductions = decl.getSec80cTotal()
                    .add(nvl(decl.getSec80ccd1bNpsAdditional()))
                    .add(decl.getSec80dTotal())
                    .add(nvl(decl.getSec80eEducationLoan()))
                    .add(nvl(decl.getSec80gDonations()))
                    .add(nvl(decl.getSec80ggRentPaid()))
                    .add(nvl(decl.getSec24HomeLoanInterest()))
                    .add(nvl(decl.getHraExemption()));
            decl.setTotalDeductions(totalDeductions);
        } else {
            decl.setTotalDeductions(BigDecimal.ZERO);
        }
    }

    private BigDecimal nvl(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private TaxDeclaration mapToEntity(TaxDeclarationRequest request, UUID tenantId) {
        TaxDeclaration decl = new TaxDeclaration();
        decl.setTenantId(tenantId);
        updateEntityFromRequest(decl, request);
        return decl;
    }

    private void updateEntityFromRequest(TaxDeclaration decl, TaxDeclarationRequest request) {
        decl.setEmployeeId(request.getEmployeeId());
        decl.setFinancialYear(request.getFinancialYear());
        decl.setTaxRegime(request.getTaxRegime());
        decl.setSec80cPpf(request.getSec80cPpf());
        decl.setSec80cEpf(request.getSec80cEpf());
        decl.setSec80cLifeInsurance(request.getSec80cLifeInsurance());
        decl.setSec80cElss(request.getSec80cElss());
        decl.setSec80cNsc(request.getSec80cNsc());
        decl.setSec80cHomeLoanPrincipal(request.getSec80cHomeLoanPrincipal());
        decl.setSec80cTuitionFees(request.getSec80cTuitionFees());
        decl.setSec80cSukanyaSamriddhi(request.getSec80cSukanyaSamriddhi());
        decl.setSec80cNpsEmployee(request.getSec80cNpsEmployee());
        decl.setSec80ccd1bNpsAdditional(request.getSec80ccd1bNpsAdditional());
        decl.setSec80dSelfFamily(request.getSec80dSelfFamily());
        decl.setSec80dParents(request.getSec80dParents());
        decl.setSec80dPreventiveHealth(request.getSec80dPreventiveHealth());
        decl.setSec80eEducationLoan(request.getSec80eEducationLoan());
        decl.setSec80gDonations(request.getSec80gDonations());
        decl.setSec80ggRentPaid(request.getSec80ggRentPaid());
        decl.setSec24HomeLoanInterest(request.getSec24HomeLoanInterest());
        decl.setHraMetroCity(request.getHraMetroCity());
        decl.setHraRentPaid(request.getHraRentPaid());
        decl.setOtherIncomeInterest(request.getOtherIncomeInterest());
        decl.setOtherIncomeRental(request.getOtherIncomeRental());
        decl.setOtherIncomeCapitalGains(request.getOtherIncomeCapitalGains());
        decl.setPreviousEmployerName(request.getPreviousEmployerName());
        decl.setPreviousEmployerPan(request.getPreviousEmployerPan());
        decl.setPreviousEmployerIncome(request.getPreviousEmployerIncome());
        decl.setPreviousEmployerTax(request.getPreviousEmployerTax());
        decl.setNotes(request.getNotes());
    }

    private TaxDeclarationResponse mapToResponse(TaxDeclaration decl) {
        String employeeName = employeeRepository.findByIdAndTenantId(decl.getEmployeeId(), decl.getTenantId())
                .map(Employee::getFullName)
                .orElse(null);

        String approvedByName = decl.getApprovedBy() != null
                ? employeeRepository.findByIdAndTenantId(decl.getApprovedBy(), decl.getTenantId()).map(Employee::getFullName).orElse(null)
                : null;

        String rejectedByName = decl.getRejectedBy() != null
                ? employeeRepository.findByIdAndTenantId(decl.getRejectedBy(), decl.getTenantId()).map(Employee::getFullName).orElse(null)
                : null;

        List<TaxProofResponse> proofs = taxProofRepository
                .findByTenantIdAndTaxDeclarationId(decl.getTenantId(), decl.getId()).stream()
                .map(this::mapToProofResponse)
                .collect(Collectors.toList());

        return TaxDeclarationResponse.builder()
                .id(decl.getId())
                .tenantId(decl.getTenantId())
                .employeeId(decl.getEmployeeId())
                .employeeName(employeeName)
                .financialYear(decl.getFinancialYear())
                .taxRegime(decl.getTaxRegime())
                .status(decl.getStatus())
                .sec80cTotal(decl.getSec80cTotal())
                .sec80ccd1bNpsAdditional(decl.getSec80ccd1bNpsAdditional())
                .sec80dTotal(decl.getSec80dTotal())
                .sec80eEducationLoan(decl.getSec80eEducationLoan())
                .sec80gDonations(decl.getSec80gDonations())
                .sec80ggRentPaid(decl.getSec80ggRentPaid())
                .sec24HomeLoanInterest(decl.getSec24HomeLoanInterest())
                .hraExemption(decl.getHraExemption())
                .otherIncomeTotal(decl.getOtherIncomeTotal())
                .previousEmployerName(decl.getPreviousEmployerName())
                .previousEmployerIncome(decl.getPreviousEmployerIncome())
                .previousEmployerTax(decl.getPreviousEmployerTax())
                .totalDeductions(decl.getTotalDeductions())
                .taxableIncome(decl.getTaxableIncome())
                .estimatedTax(decl.getEstimatedTax())
                .submittedAt(decl.getSubmittedAt())
                .approvedBy(decl.getApprovedBy())
                .approvedByName(approvedByName)
                .approvedAt(decl.getApprovedAt())
                .rejectedBy(decl.getRejectedBy())
                .rejectedByName(rejectedByName)
                .rejectedAt(decl.getRejectedAt())
                .rejectionReason(decl.getRejectionReason())
                .lockedAt(decl.getLockedAt())
                .notes(decl.getNotes())
                .createdAt(decl.getCreatedAt())
                .updatedAt(decl.getUpdatedAt())
                .proofs(proofs)
                .build();
    }

    private TaxProofResponse mapToProofResponse(TaxProof proof) {
        String employeeName = employeeRepository.findByIdAndTenantId(proof.getEmployeeId(), proof.getTenantId())
                .map(Employee::getFullName)
                .orElse(null);

        String verifiedByName = proof.getVerifiedBy() != null
                ? employeeRepository.findByIdAndTenantId(proof.getVerifiedBy(), proof.getTenantId()).map(Employee::getFullName).orElse(null)
                : null;

        String rejectedByName = proof.getRejectedBy() != null
                ? employeeRepository.findByIdAndTenantId(proof.getRejectedBy(), proof.getTenantId()).map(Employee::getFullName).orElse(null)
                : null;

        return TaxProofResponse.builder()
                .id(proof.getId())
                .tenantId(proof.getTenantId())
                .taxDeclarationId(proof.getTaxDeclarationId())
                .employeeId(proof.getEmployeeId())
                .employeeName(employeeName)
                .proofType(proof.getProofType())
                .investmentSection(proof.getInvestmentSection())
                .proofDescription(proof.getProofDescription())
                .declaredAmount(proof.getDeclaredAmount())
                .approvedAmount(proof.getApprovedAmount())
                .documentName(proof.getDocumentName())
                .documentUrl(proof.getDocumentUrl())
                .documentType(proof.getDocumentType())
                .documentSize(proof.getDocumentSize())
                .issuerName(proof.getIssuerName())
                .policyNumber(proof.getPolicyNumber())
                .certificateNumber(proof.getCertificateNumber())
                .startDate(proof.getStartDate())
                .endDate(proof.getEndDate())
                .status(proof.getStatus())
                .submittedAt(proof.getSubmittedAt())
                .verifiedBy(proof.getVerifiedBy())
                .verifiedByName(verifiedByName)
                .verifiedAt(proof.getVerifiedAt())
                .verificationNotes(proof.getVerificationNotes())
                .rejectedBy(proof.getRejectedBy())
                .rejectedByName(rejectedByName)
                .rejectedAt(proof.getRejectedAt())
                .rejectionReason(proof.getRejectionReason())
                .createdAt(proof.getCreatedAt())
                .updatedAt(proof.getUpdatedAt())
                .build();
    }
}
