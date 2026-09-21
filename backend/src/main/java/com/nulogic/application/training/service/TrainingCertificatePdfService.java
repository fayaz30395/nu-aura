package com.nulogic.application.training.service;

import com.nulogic.application.document.service.FileStorageService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.exception.ResourceNotFoundException;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.training.TrainingEnrollment;
import com.nulogic.domain.training.TrainingProgram;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.training.repository.TrainingEnrollmentRepository;
import com.nulogic.infrastructure.training.repository.TrainingProgramRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openpdf.text.*;
import org.openpdf.text.Font;
import org.openpdf.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Renders a real completion-certificate PDF and uploads it to storage.
 * Mirrors {@link com.nulogic.application.letter.service.LetterPdfService}: intentionally
 * NOT {@code @Transactional} so the CPU-bound render + remote upload don't hold a DB
 * connection open.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrainingCertificatePdfService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMMM yyyy");
    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 24, Font.BOLD, Color.BLACK);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 14, Font.NORMAL, Color.DARK_GRAY);
    private static final Font NAME_FONT = new Font(Font.HELVETICA, 20, Font.BOLDITALIC, Color.BLACK);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 12, Font.NORMAL, Color.BLACK);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.GRAY);

    private final TrainingEnrollmentRepository enrollmentRepository;
    private final TrainingProgramRepository programRepository;
    private final EmployeeRepository employeeRepository;
    private final FileStorageService fileStorageService;

    /**
     * Generate the certificate PDF for a completed enrollment and upload it to storage.
     *
     * @return the download URL, to be persisted on the enrollment by the caller
     */
    public String generateCertificatePdf(TrainingEnrollment enrollment) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TrainingProgram program = programRepository.findByIdAndTenantId(enrollment.getProgramId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Training program not found"));
        Employee employee = employeeRepository.findByIdAndTenantId(enrollment.getEmployeeId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        byte[] pdfBytes = renderPdf(enrollment, program, employee);
        String filename = "certificate-" + enrollment.getId() + ".pdf";

        FileStorageService.FileUploadResult uploadResult = fileStorageService.uploadFile(
                new ByteArrayInputStream(pdfBytes),
                filename,
                "application/pdf",
                pdfBytes.length,
                FileStorageService.CATEGORY_CERTIFICATES,
                enrollment.getId());

        String downloadUrl = fileStorageService.getDownloadUrl(uploadResult.getObjectName());
        log.info("Generated certificate PDF for enrollment {}: {}", enrollment.getId(), uploadResult.getObjectName());
        return downloadUrl;
    }

    private byte[] renderPdf(TrainingEnrollment enrollment, TrainingProgram program, Employee employee) {
        Document document = new Document(PageSize.A4.rotate());
        document.setMargins(60, 60, 60, 60);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            Paragraph title = new Paragraph("Certificate of Completion", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20f);
            document.add(title);

            Paragraph subtitle = new Paragraph("This certifies that", SUBTITLE_FONT);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(15f);
            document.add(subtitle);

            Paragraph name = new Paragraph(employee.getFullName(), NAME_FONT);
            name.setAlignment(Element.ALIGN_CENTER);
            name.setSpacingAfter(15f);
            document.add(name);

            Paragraph body = new Paragraph(
                    "has successfully completed the training program \"" + program.getProgramName() + "\""
                            + (enrollment.getCompletionDate() != null
                            ? " on " + enrollment.getCompletionDate().format(DATE_FORMATTER) : ""),
                    BODY_FONT);
            body.setAlignment(Element.ALIGN_CENTER);
            body.setSpacingAfter(10f);
            document.add(body);

            if (enrollment.getAssessmentScore() != null) {
                Paragraph score = new Paragraph("Assessment score: " + enrollment.getAssessmentScore() + "%", BODY_FONT);
                score.setAlignment(Element.ALIGN_CENTER);
                score.setSpacingAfter(30f);
                document.add(score);
            }

            Paragraph footer = new Paragraph("Certificate ID: " + enrollment.getId(), SMALL_FONT);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            return out.toByteArray();
        } catch (DocumentException e) {
            log.error("Error generating certificate PDF for enrollment {}: {}", enrollment.getId(), e.getMessage(), e);
            throw new BusinessException("Failed to generate certificate PDF: " + e.getMessage());
        } finally {
            if (document.isOpen()) document.close();
        }
    }
}
