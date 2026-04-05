package com.hrms.application.knowledge.service;

import com.hrms.domain.knowledge.WikiPage;
import com.lowagie.text.Document;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class WikiExportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("MMMM d, yyyy");

    public byte[] exportToPdf(WikiPage page) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24);
            document.add(new Paragraph(page.getTitle(), titleFont));

            Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Font.ITALIC);
            String meta = "Status: " + page.getStatus();
            if (page.getPublishedAt() != null) {
                meta += " | Published: " + page.getPublishedAt().format(DATE_FMT);
            }
            document.add(new Paragraph(meta, metaFont));
            document.add(new Paragraph(" "));

            if (page.getExcerpt() != null && !page.getExcerpt().isBlank()) {
                Font excerptFont = FontFactory.getFont(FontFactory.HELVETICA, 12, Font.ITALIC);
                document.add(new Paragraph(page.getExcerpt(), excerptFont));
                document.add(new Paragraph(" "));
            }

            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
            document.add(new Paragraph(stripMarkup(page.getContent()), bodyFont));

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to export wiki page {} to PDF: {}", page.getId(), e.getMessage());
            throw new RuntimeException("PDF export failed", e);
        }
    }

    public byte[] exportToDocx(WikiPage page) {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            XWPFParagraph titlePara = document.createParagraph();
            XWPFRun titleRun = titlePara.createRun();
            titleRun.setText(page.getTitle());
            titleRun.setBold(true);
            titleRun.setFontSize(24);

            XWPFParagraph metaPara = document.createParagraph();
            XWPFRun metaRun = metaPara.createRun();
            String meta = "Status: " + page.getStatus();
            if (page.getPublishedAt() != null) {
                meta += " | Published: " + page.getPublishedAt().format(DATE_FMT);
            }
            metaRun.setText(meta);
            metaRun.setItalic(true);
            metaRun.setFontSize(10);

            document.createParagraph();

            if (page.getExcerpt() != null && !page.getExcerpt().isBlank()) {
                XWPFParagraph excerptPara = document.createParagraph();
                XWPFRun excerptRun = excerptPara.createRun();
                excerptRun.setText(page.getExcerpt());
                excerptRun.setItalic(true);
                excerptRun.setFontSize(12);
                document.createParagraph();
            }

            String plainText = stripMarkup(page.getContent());
            for (String paragraph : plainText.split("\n\n")) {
                XWPFParagraph bodyPara = document.createParagraph();
                XWPFRun bodyRun = bodyPara.createRun();
                bodyRun.setText(paragraph.trim());
                bodyRun.setFontSize(12);
            }

            document.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to export wiki page {} to DOCX: {}", page.getId(), e.getMessage());
            throw new RuntimeException("DOCX export failed", e);
        }
    }

    private String stripMarkup(String content) {
        if (content == null || content.isBlank()) return "";
        return content
                .replaceAll("<[^>]*>", " ")
                .replaceAll("\\{[^}]*}", " ")
                .replaceAll("\\[[^]]*]", " ")
                .replaceAll("\"[a-zA-Z]+\":", " ")
                .replaceAll("\\\\n", "\n")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
