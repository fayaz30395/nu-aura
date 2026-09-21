package com.nulogic.application.benefits.service;

import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.benefits.BenefitClaim;
import com.nulogic.domain.benefits.BenefitEnrollment;
import com.nulogic.domain.benefits.FlexBenefitAllocation;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.benefits.repository.BenefitClaimRepository;
import com.nulogic.infrastructure.benefits.repository.BenefitEnrollmentRepository;
import com.nulogic.infrastructure.benefits.repository.FlexBenefitAllocationRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openpdf.text.*;
import org.openpdf.text.Font;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Renders a point-in-time "Total Benefits Statement" PDF for an employee: active
 * enrollments, contributions, coverage, and YTD claims. Reuses the OpenPDF pattern
 * from LetterPdfService/TrainingCertificatePdfService. Generated on demand and
 * streamed directly to the caller — not persisted to storage, since it's a live
 * snapshot rather than an immutable document.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BenefitStatementPdfService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMMM yyyy");
    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 18, Font.BOLD, Color.BLACK);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 11, Font.NORMAL, Color.DARK_GRAY);
    private static final Font HEADING_FONT = new Font(Font.HELVETICA, 13, Font.BOLD, Color.BLACK);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.BLACK);
    private static final Font TABLE_HEADER_FONT = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);

    private final BenefitEnrollmentRepository enrollmentRepository;
    private final BenefitClaimRepository claimRepository;
    private final FlexBenefitAllocationRepository flexAllocationRepository;
    private final EmployeeRepository employeeRepository;
    private final TenantTimeService tenantTimeService;

    public byte[] generateStatement(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));

        List<BenefitEnrollment> activeEnrollments = enrollmentRepository
                .findByTenantIdAndEmployeeIdAndStatus(tenantId, employeeId, BenefitEnrollment.EnrollmentStatus.ACTIVE);
        BigDecimal employeeContribution = enrollmentRepository.calculateTotalEmployeeContribution(tenantId, employeeId);
        BigDecimal employerContribution = enrollmentRepository.calculateTotalEmployerContribution(tenantId, employeeId);

        int currentYear = tenantTimeService.today(tenantId).getYear();
        List<BenefitClaim> ytdClaims = claimRepository.findByTenantIdAndEmployeeId(tenantId, employeeId).stream()
                .filter(c -> c.getServiceDate() != null && c.getServiceDate().getYear() == currentYear)
                .toList();

        FlexBenefitAllocation flexAllocation = flexAllocationRepository
                .findActiveAllocation(tenantId, employeeId).orElse(null);

        return renderPdf(employee, activeEnrollments, employeeContribution, employerContribution,
                ytdClaims, flexAllocation, currentYear, tenantTimeService.today(tenantId));
    }

    private byte[] renderPdf(Employee employee, List<BenefitEnrollment> enrollments,
                             BigDecimal employeeContribution, BigDecimal employerContribution,
                             List<BenefitClaim> ytdClaims, FlexBenefitAllocation flexAllocation,
                             int year, java.time.LocalDate asOf) {
        Document document = new Document(PageSize.A4);
        document.setMargins(40, 40, 50, 50);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Paragraph title = new Paragraph("Total Benefits Statement", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph(
                    employee.getFullName() + " | As of " + asOf.format(DATE_FORMATTER), SUBTITLE_FONT);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20f);
            document.add(subtitle);

            document.add(new Paragraph("Active Enrollments", HEADING_FONT));
            document.add(enrollmentsTable(enrollments));
            document.add(new Paragraph(" "));

            document.add(new Paragraph("Contributions", HEADING_FONT));
            document.add(new Paragraph("Your total contribution: " + formatCurrency(employeeContribution), BODY_FONT));
            document.add(new Paragraph("Employer total contribution: " + formatCurrency(employerContribution), BODY_FONT));
            document.add(new Paragraph(" "));

            if (flexAllocation != null) {
                document.add(new Paragraph("Flex Credits", HEADING_FONT));
                document.add(new Paragraph("Total: " + formatCurrency(flexAllocation.getTotalCredits())
                        + " | Used: " + formatCurrency(flexAllocation.getUsedCredits())
                        + " | Remaining: " + formatCurrency(flexAllocation.getRemainingCredits()), BODY_FONT));
                document.add(new Paragraph(" "));
            }

            document.add(new Paragraph(year + " Claims Summary", HEADING_FONT));
            document.add(claimsTable(ytdClaims));

            // close() flushes the xref table/trailer — must happen before reading the buffer.
            document.close();
            return out.toByteArray();
        } catch (DocumentException e) {
            log.error("Error generating benefits statement for employee {}: {}", employee.getId(), e.getMessage(), e);
            throw new BusinessException("Failed to generate benefits statement: " + e.getMessage());
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    private PdfPTable enrollmentsTable(List<BenefitEnrollment> enrollments) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        addHeaderCell(table, "Plan");
        addHeaderCell(table, "Coverage Level");
        addHeaderCell(table, "Effective Date");
        addHeaderCell(table, "Monthly Premium");

        if (enrollments.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No active enrollments", BODY_FONT));
            empty.setColspan(4);
            table.addCell(empty);
        }
        for (BenefitEnrollment enrollment : enrollments) {
            table.addCell(new Phrase(enrollment.getBenefitPlan() != null ? enrollment.getBenefitPlan().getName() : "-", BODY_FONT));
            table.addCell(new Phrase(enrollment.getCoverageLevel() != null ? enrollment.getCoverageLevel().name() : "-", BODY_FONT));
            table.addCell(new Phrase(enrollment.getEffectiveDate() != null ? enrollment.getEffectiveDate().format(DATE_FORMATTER) : "-", BODY_FONT));
            table.addCell(new Phrase(formatCurrency(enrollment.getTotalPremium()), BODY_FONT));
        }
        return table;
    }

    private PdfPTable claimsTable(List<BenefitClaim> claims) throws DocumentException {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        addHeaderCell(table, "Service Date");
        addHeaderCell(table, "Type");
        addHeaderCell(table, "Claimed");
        addHeaderCell(table, "Status");

        if (claims.isEmpty()) {
            PdfPCell empty = new PdfPCell(new Phrase("No claims this year", BODY_FONT));
            empty.setColspan(4);
            table.addCell(empty);
        }
        for (BenefitClaim claim : claims) {
            table.addCell(new Phrase(claim.getServiceDate() != null ? claim.getServiceDate().format(DATE_FORMATTER) : "-", BODY_FONT));
            table.addCell(new Phrase(claim.getClaimType() != null ? claim.getClaimType().name() : "-", BODY_FONT));
            table.addCell(new Phrase(formatCurrency(claim.getClaimedAmount()), BODY_FONT));
            table.addCell(new Phrase(claim.getStatus() != null ? claim.getStatus().name() : "-", BODY_FONT));
        }
        return table;
    }

    private void addHeaderCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TABLE_HEADER_FONT));
        cell.setBackgroundColor(Color.DARK_GRAY);
        table.addCell(cell);
    }

    private String formatCurrency(BigDecimal amount) {
        return amount != null ? amount.toPlainString() : "0";
    }
}
