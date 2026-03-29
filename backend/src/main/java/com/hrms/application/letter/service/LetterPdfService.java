package com.hrms.application.letter.service;

import com.hrms.application.document.service.FileStorageService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.letter.GeneratedLetter;
import com.hrms.domain.letter.LetterTemplate;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.letter.repository.GeneratedLetterRepository;
import com.hrms.infrastructure.letter.repository.LetterTemplateRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * Service for generating PDF documents from letter content.
 * Converts HTML/text letter content to a formatted PDF and uploads to storage.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LetterPdfService {

    private final GeneratedLetterRepository letterRepository;
    private final LetterTemplateRepository templateRepository;
    private final CandidateRepository candidateRepository;
    private final EmployeeRepository employeeRepository;
    private final FileStorageService fileStorageService;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    // Font definitions
    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 16, Font.BOLD, Color.BLACK);
    private static final Font HEADING_FONT = new Font(Font.HELVETICA, 12, Font.BOLD, Color.BLACK);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 11, Font.NORMAL, Color.BLACK);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.GRAY);

    /**
     * Generate PDF for an existing letter and upload to storage.
     * Updates the letter's pdfUrl with the storage location.
     *
     * @param letterId the ID of the letter to generate PDF for
     * @return the URL of the generated PDF
     */
    @Transactional
    public String generatePdf(UUID letterId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        GeneratedLetter letter = letterRepository.findByIdAndTenantId(letterId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Letter not found: " + letterId));

        // Get template for additional formatting options
        LetterTemplate template = templateRepository.findByIdAndTenantId(letter.getTemplateId(), tenantId)
                .orElse(null);

        // Generate PDF content
        byte[] pdfBytes = generatePdfBytes(letter, template);

        // Generate filename
        String filename = generateFilename(letter);

        // Upload to storage
        FileStorageService.FileUploadResult uploadResult = fileStorageService.uploadFile(
                new ByteArrayInputStream(pdfBytes),
                filename,
                "application/pdf",
                pdfBytes.length,
                FileStorageService.CATEGORY_LETTERS,
                letter.getId()
        );

        // Get download URL and update letter
        String pdfUrl = fileStorageService.getDownloadUrl(uploadResult.getObjectName());
        letter.setPdfUrl(pdfUrl);
        letterRepository.save(letter);

        log.info("Generated PDF for letter {}: {}", letterId, uploadResult.getObjectName());

        return pdfUrl;
    }

    /**
     * Generate PDF bytes from letter content.
     */
    private byte[] generatePdfBytes(GeneratedLetter letter, LetterTemplate template) {
        Document document = new Document(PageSize.A4);
        document.setMargins(50, 50, 50, 50);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Add company header if template specifies
            if (template != null && Boolean.TRUE.equals(template.getIncludeCompanyLogo())) {
                addCompanyHeader(document);
            }

            // Add letter date
            addLetterDate(document, letter.getLetterDate());

            // Add reference number
            addReferenceNumber(document, letter.getReferenceNumber());

            // Add recipient info based on letter type
            if (letter.getCandidateId() != null) {
                addCandidateRecipient(document, letter.getCandidateId());
            } else if (letter.getEmployeeId() != null) {
                addEmployeeRecipient(document, letter.getEmployeeId());
            }

            // Add letter title
            addLetterTitle(document, letter.getLetterTitle());

            // Add main content
            addLetterContent(document, letter.getGeneratedContent());

            // Add signature section if template specifies
            if (template != null && Boolean.TRUE.equals(template.getIncludeSignature())) {
                addSignatureSection(document, template);
            }

            return out.toByteArray();

        } catch (DocumentException e) {
            log.error("Error generating PDF for letter {}: {}", letter.getId(), e.getMessage(), e);
            throw new BusinessException("Failed to generate PDF: " + e.getMessage());
        } finally {
            if (document.isOpen()) document.close();
        }
    }

    private void addCompanyHeader(Document document) throws DocumentException {
        Paragraph header = new Paragraph("COMPANY NAME", TITLE_FONT);
        header.setAlignment(Element.ALIGN_CENTER);
        header.setSpacingAfter(5f);
        document.add(header);

        Paragraph subHeader = new Paragraph("Human Resources Department", SMALL_FONT);
        subHeader.setAlignment(Element.ALIGN_CENTER);
        subHeader.setSpacingAfter(20f);
        document.add(subHeader);

        // Add a line separator
        document.add(new Paragraph(" "));
        document.add(new Chunk(new com.lowagie.text.pdf.draw.LineSeparator()));
        document.add(new Paragraph(" "));
    }

    private void addLetterDate(Document document, LocalDate date) throws DocumentException {
        String formattedDate = date != null ? date.format(DATE_FORMATTER) : LocalDate.now().format(DATE_FORMATTER);
        Paragraph datePara = new Paragraph("Date: " + formattedDate, BODY_FONT);
        datePara.setAlignment(Element.ALIGN_RIGHT);
        datePara.setSpacingAfter(15f);
        document.add(datePara);
    }

    private void addReferenceNumber(Document document, String refNumber) throws DocumentException {
        Paragraph refPara = new Paragraph("Ref: " + refNumber, SMALL_FONT);
        refPara.setSpacingAfter(15f);
        document.add(refPara);
    }

    private void addCandidateRecipient(Document document, UUID candidateId) throws DocumentException {
        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElse(null);

        if (candidate != null) {
            Paragraph toPara = new Paragraph("To,", BODY_FONT);
            toPara.setSpacingAfter(5f);
            document.add(toPara);

            Paragraph namePara = new Paragraph(candidate.getFullName(), HEADING_FONT);
            namePara.setSpacingAfter(3f);
            document.add(namePara);

            if (candidate.getEmail() != null) {
                Paragraph emailPara = new Paragraph(candidate.getEmail(), BODY_FONT);
                emailPara.setSpacingAfter(3f);
                document.add(emailPara);
            }

            if (candidate.getCurrentLocation() != null) {
                Paragraph locationPara = new Paragraph(candidate.getCurrentLocation(), BODY_FONT);
                locationPara.setSpacingAfter(15f);
                document.add(locationPara);
            } else {
                document.add(new Paragraph(" "));
            }
        }
    }

    private void addEmployeeRecipient(Document document, UUID employeeId) throws DocumentException {
        UUID tenantId = TenantContext.getCurrentTenant();
        employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                .ifPresent(employee -> {
                    try {
                        Paragraph toPara = new Paragraph("To,", BODY_FONT);
                        toPara.setSpacingAfter(5f);
                        document.add(toPara);

                        Paragraph namePara = new Paragraph(
                                employee.getFirstName() + " " + employee.getLastName(), HEADING_FONT);
                        namePara.setSpacingAfter(3f);
                        document.add(namePara);

                        if (employee.getEmployeeCode() != null) {
                            Paragraph codePara = new Paragraph(
                                    "Employee ID: " + employee.getEmployeeCode(), BODY_FONT);
                            codePara.setSpacingAfter(3f);
                            document.add(codePara);
                        }

                        if (employee.getDesignation() != null) {
                            Paragraph desgPara = new Paragraph(employee.getDesignation(), BODY_FONT);
                            desgPara.setSpacingAfter(15f);
                            document.add(desgPara);
                        }
                    } catch (DocumentException e) {
                        log.error("Error adding employee recipient", e);
                    }
                });
    }

    private void addLetterTitle(Document document, String title) throws DocumentException {
        Paragraph titlePara = new Paragraph(title, HEADING_FONT);
        titlePara.setAlignment(Element.ALIGN_CENTER);
        titlePara.setSpacingBefore(10f);
        titlePara.setSpacingAfter(20f);
        document.add(titlePara);
    }

    private void addLetterContent(Document document, String content) throws DocumentException {
        // Convert content to paragraphs (split by double newlines)
        String[] paragraphs = content.split("\n\n");

        for (String para : paragraphs) {
            if (!para.trim().isEmpty()) {
                // Handle single newlines within a paragraph
                String processedPara = para.replace("\n", " ").trim();
                Paragraph p = new Paragraph(processedPara, BODY_FONT);
                p.setAlignment(Element.ALIGN_JUSTIFIED);
                p.setSpacingAfter(10f);
                p.setFirstLineIndent(0f);
                document.add(p);
            }
        }
    }

    private void addSignatureSection(Document document, LetterTemplate template) throws DocumentException {
        document.add(new Paragraph(" "));
        document.add(new Paragraph(" "));

        // Add regards
        Paragraph regards = new Paragraph("Best Regards,", BODY_FONT);
        regards.setSpacingAfter(30f);
        document.add(regards);

        // Add signature line
        Paragraph sigLine = new Paragraph("_______________________", BODY_FONT);
        document.add(sigLine);

        // Add signatory name
        if (template.getSignatoryName() != null) {
            Paragraph sigName = new Paragraph(template.getSignatoryName(), HEADING_FONT);
            sigName.setSpacingBefore(5f);
            document.add(sigName);
        }

        // Add signatory designation
        if (template.getSignatoryDesignation() != null) {
            Paragraph sigDesg = new Paragraph(template.getSignatoryDesignation(), BODY_FONT);
            document.add(sigDesg);
        }

        // Add signature title
        if (template.getSignatureTitle() != null) {
            Paragraph sigTitle = new Paragraph(template.getSignatureTitle(), SMALL_FONT);
            document.add(sigTitle);
        }
    }

    private String generateFilename(GeneratedLetter letter) {
        String timestamp = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String refClean = letter.getReferenceNumber()
                .replace("/", "_")
                .replace(" ", "_");
        return String.format("%s_%s.pdf", refClean, timestamp);
    }
}
