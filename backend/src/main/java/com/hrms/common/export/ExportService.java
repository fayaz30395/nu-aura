package com.hrms.common.export;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generic export service for generating CSV, Excel, and PDF files.
 *
 * Playbook Reference: Prompt 33 - CSV/PDF export
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Export data to CSV format
     */
    @Transactional(readOnly = true)
    public byte[] exportToCsv(List<String> headers, List<List<Object>> data) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);

        // Write headers
        pw.println(String.join(",", headers.stream()
                .map(this::escapeCsvField)
                .toList()));

        // Write data rows
        for (List<Object> row : data) {
            pw.println(String.join(",", row.stream()
                    .map(this::formatValue)
                    .map(this::escapeCsvField)
                    .toList()));
        }

        return sw.toString().getBytes();
    }

    /**
     * Export data to Excel format
     */
    @Transactional(readOnly = true)
    public byte[] exportToExcel(String sheetName, List<String> headers, List<List<Object>> data) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet(sheetName);

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Create date style
            CellStyle dateStyle = workbook.createCellStyle();
            CreationHelper createHelper = workbook.getCreationHelper();
            dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("yyyy-mm-dd"));

            // Write headers
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers.get(i));
                cell.setCellStyle(headerStyle);
            }

            // Write data rows
            int rowNum = 1;
            for (List<Object> rowData : data) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
                for (int i = 0; i < rowData.size(); i++) {
                    org.apache.poi.ss.usermodel.Cell cell = row.createCell(i);
                    setCellValue(cell, rowData.get(i), dateStyle);
                }
            }

            // Auto-size columns
            for (int i = 0; i < headers.size(); i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    /**
     * Export data to PDF format
     */
    @Transactional(readOnly = true)
    public byte[] exportToPdf(String title, List<String> headers, List<List<Object>> data) throws DocumentException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate());

        PdfWriter.getInstance(document, baos);
        document.open();

        // Add title
        com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        Paragraph titleParagraph = new Paragraph(title, titleFont);
        titleParagraph.setAlignment(Element.ALIGN_CENTER);
        titleParagraph.setSpacingAfter(20);
        document.add(titleParagraph);

        // Add timestamp
        com.lowagie.text.Font timestampFont = FontFactory.getFont(FontFactory.HELVETICA, 10, com.lowagie.text.Font.ITALIC);
        Paragraph timestampParagraph = new Paragraph(
                "Generated: " + LocalDateTime.now().format(DATETIME_FORMATTER),
                timestampFont
        );
        timestampParagraph.setAlignment(Element.ALIGN_RIGHT);
        timestampParagraph.setSpacingAfter(10);
        document.add(timestampParagraph);

        // Create table
        PdfPTable table = new PdfPTable(headers.size());
        table.setWidthPercentage(100);

        // Add headers
        com.lowagie.text.Font pdfHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
        for (String header : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(header, pdfHeaderFont));
            cell.setBackgroundColor(new java.awt.Color(220, 220, 220));
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(5);
            table.addCell(cell);
        }

        // Add data rows
        com.lowagie.text.Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
        for (List<Object> rowData : data) {
            for (Object value : rowData) {
                PdfPCell cell = new PdfPCell(new Phrase(formatValue(value), dataFont));
                cell.setPadding(4);
                table.addCell(cell);
            }
        }

        document.add(table);
        document.close();

        return baos.toByteArray();
    }

    /**
     * Export a map-based dataset (useful for dynamic columns)
     */
    @Transactional(readOnly = true)
    public byte[] export(ExportFormat format, String title, List<String> headers,
                         List<Map<String, Object>> data, List<String> columnKeys)
            throws IOException, DocumentException {

        List<List<Object>> rows = data.stream()
                .map(row -> columnKeys.stream()
                        .map(key -> row.getOrDefault(key, ""))
                        .toList())
                .toList();

        return switch (format) {
            case CSV -> exportToCsv(headers, rows);
            case EXCEL -> exportToExcel(title, headers, rows);
            case PDF -> exportToPdf(title, headers, rows);
        };
    }

    private String escapeCsvField(String field) {
        if (field == null) return "";
        if (field.contains(",") || field.contains("\"") || field.contains("\n")) {
            return "\"" + field.replace("\"", "\"\"") + "\"";
        }
        return field;
    }

    private String formatValue(Object value) {
        if (value == null) return "";
        if (value instanceof LocalDate date) {
            return date.format(DATE_FORMATTER);
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.format(DATETIME_FORMATTER);
        }
        if (value instanceof Boolean bool) {
            return bool ? "Yes" : "No";
        }
        return value.toString();
    }

    private void setCellValue(org.apache.poi.ss.usermodel.Cell cell, Object value, CellStyle dateStyle) {
        if (value == null) {
            cell.setCellValue("");
        } else if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
        } else if (value instanceof Boolean bool) {
            cell.setCellValue(bool ? "Yes" : "No");
        } else if (value instanceof LocalDate date) {
            cell.setCellValue(date);
            cell.setCellStyle(dateStyle);
        } else if (value instanceof LocalDateTime dateTime) {
            cell.setCellValue(dateTime.format(DATETIME_FORMATTER));
        } else {
            cell.setCellValue(value.toString());
        }
    }
}
