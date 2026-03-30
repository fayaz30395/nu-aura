package com.hrms.application.migration.service;

import com.hrms.api.migration.dto.ImportResult;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.employee.Department;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveType;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.employee.repository.DepartmentRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import org.springframework.beans.factory.annotation.Value;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class KekaMigrationService {

    @Value("${app.migration.default-password:Welcome@123}")
    private String defaultMigrationPassword;

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AttendanceRecordRepository attendanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final SalaryStructureRepository salaryStructureRepository;
    private final PasswordEncoder passwordEncoder;

    private static final DateTimeFormatter[] DATE_FORMATTERS = {
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("dd-MMM-yyyy"),
            DateTimeFormatter.ISO_LOCAL_DATE
    };

    // ==================== Import Employees ====================

    @Transactional
    public ImportResult importEmployees(MultipartFile file) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ImportResult result = initResult("EMPLOYEES");

        try {
            List<Map<String, String>> data = parseFile(file);
            result.setTotalRows(data.size());

            Map<String, UUID> departmentCache = new HashMap<>();

            for (int i = 0; i < data.size(); i++) {
                Map<String, String> row = data.get(i);
                int rowNum = i + 2; // Excel rows are 1-indexed + header

                try {
                    importEmployeeRow(row, rowNum, tenantId, departmentCache, result);
                    result.setSuccessCount(result.getSuccessCount() + 1);
                } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
                    result.addError(rowNum, "row", "", e.getMessage());
                    log.error("Error importing employee row {}: {}", rowNum, e.getMessage());
                }
            }
        } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
            result.addError(0, "file", file.getOriginalFilename(), "Failed to parse file: " + e.getMessage());
            log.error("Error parsing employee file: {}", e.getMessage());
        }

        return finalizeResult(result);
    }

    private void importEmployeeRow(Map<String, String> row, int rowNum, UUID tenantId,
            Map<String, UUID> departmentCache, ImportResult result) {
        String employeeCode = getOrError(row, "employee_code", "Employee Code", rowNum, result);
        String email = getOrError(row, "email", "Email", rowNum, result);
        String firstName = getOrError(row, "first_name", "First Name", rowNum, result);
        String lastName = row.getOrDefault("last_name", "");

        if (employeeCode == null || email == null || firstName == null) {
            throw new ValidationException("Missing required fields");
        }

        // Check for existing employee
        if (employeeRepository.existsByEmployeeCodeAndTenantId(employeeCode, tenantId)) {
            result.addWarning("Row " + rowNum + ": Employee " + employeeCode + " already exists, skipping");
            result.setSkippedCount(result.getSkippedCount() + 1);
            return;
        }

        // Get or create department
        UUID departmentId = null;
        String deptName = row.get("department");
        if (deptName != null && !deptName.isBlank()) {
            departmentId = departmentCache.computeIfAbsent(deptName, name -> {
                return departmentRepository.findByNameAndTenantId(name, tenantId)
                        .map(Department::getId)
                        .orElseGet(() -> createDepartment(name, tenantId));
            });
        }

        // Create User (roles will be assigned later by admin)
        User user = User.builder()
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .passwordHash(passwordEncoder.encode(defaultMigrationPassword))
                .status(User.UserStatus.ACTIVE)
                .build();
        user.setId(UUID.randomUUID());
        user.setTenantId(tenantId);
        user = userRepository.save(user);

        // Create Employee
        Employee employee = Employee.builder()
                .employeeCode(employeeCode)
                .firstName(firstName)
                .middleName(row.get("middle_name"))
                .lastName(lastName)
                .personalEmail(row.get("personal_email"))
                .phoneNumber(row.get("phone"))
                .designation(row.get("designation"))
                .departmentId(departmentId)
                .joiningDate(parseDate(row.get("joining_date")))
                .status(Employee.EmployeeStatus.ACTIVE)
                .employmentType(parseEmploymentType(row.get("employment_type")))
                .build();

        employee.setId(UUID.randomUUID());
        employee.setTenantId(tenantId);
        employee.setUser(user);

        // Additional fields
        if (row.get("date_of_birth") != null) {
            employee.setDateOfBirth(parseDate(row.get("date_of_birth")));
        }
        if (row.get("gender") != null) {
            employee.setGender(parseGender(row.get("gender")));
        }
        if (row.get("bank_account") != null) {
            employee.setBankAccountNumber(row.get("bank_account"));
        }
        if (row.get("bank_name") != null) {
            employee.setBankName(row.get("bank_name"));
        }

        employeeRepository.save(employee);
        log.info("Imported employee: {}", employeeCode);
    }

    // ==================== Import Attendance ====================

    @Transactional
    public ImportResult importAttendance(MultipartFile file) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ImportResult result = initResult("ATTENDANCE");

        try {
            List<Map<String, String>> data = parseFile(file);
            result.setTotalRows(data.size());

            Map<String, UUID> employeeCache = new HashMap<>();

            for (int i = 0; i < data.size(); i++) {
                Map<String, String> row = data.get(i);
                int rowNum = i + 2;

                try {
                    importAttendanceRow(row, rowNum, tenantId, employeeCache, result);
                    result.setSuccessCount(result.getSuccessCount() + 1);
                } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
                    result.addError(rowNum, "row", "", e.getMessage());
                }
            }
        } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
            result.addError(0, "file", file.getOriginalFilename(), "Failed to parse file: " + e.getMessage());
        }

        return finalizeResult(result);
    }

    private void importAttendanceRow(Map<String, String> row, int rowNum, UUID tenantId,
            Map<String, UUID> employeeCache, ImportResult result) {
        String employeeCode = getOrError(row, "employee_code", "Employee Code", rowNum, result);
        String dateStr = getOrError(row, "date", "Date", rowNum, result);

        if (employeeCode == null || dateStr == null) {
            throw new ValidationException("Missing required fields");
        }

        UUID employeeId = employeeCache.computeIfAbsent(employeeCode, code -> {
            return employeeRepository.findByEmployeeCodeAndTenantId(code, tenantId)
                    .map(Employee::getId)
                    .orElse(null);
        });

        if (employeeId == null) {
            result.addError(rowNum, "employee_code", employeeCode, "Employee not found");
            return;
        }

        LocalDate date = parseDate(dateStr);
        if (date == null) {
            result.addError(rowNum, "date", dateStr, "Invalid date format");
            return;
        }

        AttendanceRecord record = AttendanceRecord.builder()
                .employeeId(employeeId)
                .attendanceDate(date)
                .checkInTime(parseDateTime(row.get("check_in"), date))
                .checkOutTime(parseDateTime(row.get("check_out"), date))
                .status(parseAttendanceStatus(row.get("status")))
                .checkInSource(row.getOrDefault("source", "KEKA_IMPORT"))
                .build();

        record.setId(UUID.randomUUID());
        record.setTenantId(tenantId);

        // Calculate work duration
        if (record.getCheckInTime() != null && record.getCheckOutTime() != null) {
            long minutes = java.time.Duration.between(record.getCheckInTime(), record.getCheckOutTime()).toMinutes();
            record.setWorkDurationMinutes((int) minutes);
        }

        attendanceRepository.save(record);
    }

    // ==================== Import Leave Balances ====================

    @Transactional
    public ImportResult importLeaveBalances(MultipartFile file) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ImportResult result = initResult("LEAVE_BALANCES");

        try {
            List<Map<String, String>> data = parseFile(file);
            result.setTotalRows(data.size());

            Map<String, UUID> employeeCache = new HashMap<>();
            Map<String, UUID> leaveTypeCache = new HashMap<>();

            for (int i = 0; i < data.size(); i++) {
                Map<String, String> row = data.get(i);
                int rowNum = i + 2;

                try {
                    importLeaveBalanceRow(row, rowNum, tenantId, employeeCache, leaveTypeCache, result);
                    result.setSuccessCount(result.getSuccessCount() + 1);
                } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
                    result.addError(rowNum, "row", "", e.getMessage());
                }
            }
        } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
            result.addError(0, "file", file.getOriginalFilename(), "Failed to parse file: " + e.getMessage());
        }

        return finalizeResult(result);
    }

    private void importLeaveBalanceRow(Map<String, String> row, int rowNum, UUID tenantId,
            Map<String, UUID> employeeCache, Map<String, UUID> leaveTypeCache,
            ImportResult result) {
        String employeeCode = getOrError(row, "employee_code", "Employee Code", rowNum, result);
        String leaveTypeName = getOrError(row, "leave_type", "Leave Type", rowNum, result);

        if (employeeCode == null || leaveTypeName == null)
            return;

        UUID employeeId = employeeCache.computeIfAbsent(employeeCode,
                code -> employeeRepository.findByEmployeeCodeAndTenantId(code, tenantId)
                        .map(Employee::getId).orElse(null));

        if (employeeId == null) {
            result.addError(rowNum, "employee_code", employeeCode, "Employee not found");
            return;
        }

        UUID leaveTypeId = leaveTypeCache.computeIfAbsent(leaveTypeName,
                name -> leaveTypeRepository.findByLeaveNameAndTenantId(name, tenantId)
                        .map(LeaveType::getId)
                        .orElseGet(() -> createLeaveType(name, tenantId)));

        int year = Integer.parseInt(row.getOrDefault("year", String.valueOf(LocalDate.now().getYear())));

        LeaveBalance balance = LeaveBalance.builder()
                .employeeId(employeeId)
                .leaveTypeId(leaveTypeId)
                .year(year)
                .openingBalance(parseBigDecimal(row.get("opening_balance")))
                .accrued(parseBigDecimal(row.get("accrued")))
                .used(parseBigDecimal(row.get("used")))
                .available(parseBigDecimal(row.get("available")))
                .carriedForward(parseBigDecimal(row.get("carried_forward")))
                .build();

        balance.setId(UUID.randomUUID());
        balance.setTenantId(tenantId);

        leaveBalanceRepository.save(balance);
    }

    // ==================== Import Salary Structures ====================

    @Transactional
    public ImportResult importSalaryStructures(MultipartFile file) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ImportResult result = initResult("SALARY_STRUCTURES");

        try {
            List<Map<String, String>> data = parseFile(file);
            result.setTotalRows(data.size());

            Map<String, UUID> employeeCache = new HashMap<>();

            for (int i = 0; i < data.size(); i++) {
                Map<String, String> row = data.get(i);
                int rowNum = i + 2;

                try {
                    importSalaryRow(row, rowNum, tenantId, employeeCache, result);
                    result.setSuccessCount(result.getSuccessCount() + 1);
                } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
                    result.addError(rowNum, "row", "", e.getMessage());
                }
            }
        } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
            result.addError(0, "file", file.getOriginalFilename(), "Failed to parse file: " + e.getMessage());
        }

        return finalizeResult(result);
    }

    private void importSalaryRow(Map<String, String> row, int rowNum, UUID tenantId,
            Map<String, UUID> employeeCache, ImportResult result) {
        String employeeCode = getOrError(row, "employee_code", "Employee Code", rowNum, result);
        String basicStr = getOrError(row, "basic_salary", "Basic Salary", rowNum, result);

        if (employeeCode == null || basicStr == null)
            return;

        UUID employeeId = employeeCache.computeIfAbsent(employeeCode,
                code -> employeeRepository.findByEmployeeCodeAndTenantId(code, tenantId)
                        .map(Employee::getId).orElse(null));

        if (employeeId == null) {
            result.addError(rowNum, "employee_code", employeeCode, "Employee not found");
            return;
        }

        SalaryStructure salary = SalaryStructure.builder()
                .employeeId(employeeId)
                .effectiveDate(parseDate(row.getOrDefault("effective_date", LocalDate.now().toString())))
                .basicSalary(parseBigDecimal(basicStr))
                .hra(parseBigDecimal(row.get("hra")))
                .conveyanceAllowance(parseBigDecimal(row.get("conveyance")))
                .medicalAllowance(parseBigDecimal(row.get("medical")))
                .specialAllowance(parseBigDecimal(row.get("special_allowance")))
                .otherAllowances(parseBigDecimal(row.get("other_allowances")))
                .providentFund(parseBigDecimal(row.get("pf")))
                .professionalTax(parseBigDecimal(row.get("pt")))
                .incomeTax(parseBigDecimal(row.get("income_tax")))
                .isActive(true)
                .build();

        salary.setId(UUID.randomUUID());
        salary.setTenantId(tenantId);

        salaryStructureRepository.save(salary);
    }

    // ==================== Import Departments ====================

    @Transactional
    public ImportResult importDepartments(MultipartFile file) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ImportResult result = initResult("DEPARTMENTS");

        try {
            List<Map<String, String>> data = parseFile(file);
            result.setTotalRows(data.size());

            for (int i = 0; i < data.size(); i++) {
                Map<String, String> row = data.get(i);
                int rowNum = i + 2;

                try {
                    String name = getOrError(row, "name", "Name", rowNum, result);
                    if (name == null)
                        continue;

                    if (departmentRepository.findByNameAndTenantId(name, tenantId).isPresent()) {
                        result.addWarning("Row " + rowNum + ": Department " + name + " already exists, skipping");
                        result.setSkippedCount(result.getSkippedCount() + 1);
                        continue;
                    }

                    Department dept = Department.builder()
                            .name(name)
                            .code(row.get("code"))
                            .description(row.get("description"))
                            .location(row.get("location"))
                            .costCenter(row.get("cost_center"))
                            .isActive(true)
                            .build();

                    dept.setId(UUID.randomUUID());
                    dept.setTenantId(tenantId);

                    departmentRepository.save(dept);
                    result.setSuccessCount(result.getSuccessCount() + 1);
                } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
                    result.addError(rowNum, "row", "", e.getMessage());
                }
            }
        } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
            result.addError(0, "file", file.getOriginalFilename(), "Failed to parse file: " + e.getMessage());
        }

        return finalizeResult(result);
    }

    // ==================== File Parsing Utilities ====================

    private List<Map<String, String>> parseFile(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();
        if (filename == null)
            throw new ValidationException("No filename");

        if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
            return parseExcel(file);
        } else if (filename.endsWith(".csv")) {
            return parseCsv(file);
        } else {
            throw new ValidationException("Unsupported file format. Use .xlsx, .xls, or .csv");
        }
    }

    private List<Map<String, String>> parseExcel(MultipartFile file) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            if (headerRow == null) {
                throw new ValidationException("Empty file or missing headers");
            }

            // Get headers
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(normalizeHeader(getCellValue(cell)));
            }

            // Parse data rows
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                Map<String, String> rowData = new HashMap<>();
                boolean hasData = false;

                for (int j = 0; j < headers.size(); j++) {
                    Cell cell = row.getCell(j);
                    String value = getCellValue(cell);
                    if (value != null && !value.isBlank()) {
                        hasData = true;
                    }
                    rowData.put(headers.get(j), value);
                }

                if (hasData) {
                    rows.add(rowData);
                }
            }
        }

        return rows;
    }

    private List<Map<String, String>> parseCsv(MultipartFile file) throws Exception {
        List<Map<String, String>> rows = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new ValidationException("Empty file");
            }

            String[] headers = headerLine.split(",");
            for (int i = 0; i < headers.length; i++) {
                headers[i] = normalizeHeader(headers[i].trim());
            }

            String line;
            while ((line = reader.readLine()) != null) {
                String[] values = line.split(",", -1);
                Map<String, String> rowData = new HashMap<>();

                for (int i = 0; i < headers.length && i < values.length; i++) {
                    rowData.put(headers[i], values[i].trim());
                }

                rows.add(rowData);
            }
        }

        return rows;
    }

    private String getCellValue(Cell cell) {
        if (cell == null)
            return null;

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                double value = cell.getNumericCellValue();
                if (value == Math.floor(value)) {
                    yield String.valueOf((long) value);
                }
                yield String.valueOf(value);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCachedFormulaResultType() == CellType.NUMERIC
                    ? String.valueOf(cell.getNumericCellValue())
                    : cell.getStringCellValue();
            default -> null;
        };
    }

    private String normalizeHeader(String header) {
        if (header == null)
            return "";
        return header.toLowerCase()
                .replace(" ", "_")
                .replace("-", "_")
                .replaceAll("[^a-z0-9_]", "");
    }

    // ==================== Helper Utilities ====================

    private ImportResult initResult(String dataType) {
        return ImportResult.builder()
                .importId(UUID.randomUUID())
                .dataType(dataType)
                .startTime(LocalDateTime.now())
                .build();
    }

    private ImportResult finalizeResult(ImportResult result) {
        result.setEndTime(LocalDateTime.now());
        result.setDurationMs(java.time.Duration.between(result.getStartTime(), result.getEndTime()).toMillis());
        log.info("Import {} completed: {} success, {} errors, {} skipped out of {} total",
                result.getDataType(), result.getSuccessCount(), result.getErrorCount(),
                result.getSkippedCount(), result.getTotalRows());
        return result;
    }

    private String getOrError(Map<String, String> row, String key, String displayName, int rowNum,
            ImportResult result) {
        String value = row.get(key);
        if (value == null || value.isBlank()) {
            result.addError(rowNum, key, "", displayName + " is required");
            return null;
        }
        return value.trim();
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank())
            return null;
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(value.trim(), formatter);
            } catch (DateTimeParseException ignored) {
                log.debug("Date '{}' did not match formatter '{}', trying next", value, formatter);
            }
        }
        log.warn("Could not parse date: {}", value);
        return null;
    }

    private LocalDateTime parseDateTime(String value, LocalDate date) {
        if (value == null || value.isBlank())
            return null;
        try {
            LocalTime time = LocalTime.parse(value.trim());
            return LocalDateTime.of(date, time);
        } catch (Exception e) { // Intentional broad catch — per-record migration error boundary
            log.debug("Could not parse time '{}': {}", value, e.getMessage());
            return null;
        }
    }

    private BigDecimal parseBigDecimal(String value) {
        if (value == null || value.isBlank())
            return BigDecimal.ZERO;
        try {
            return new BigDecimal(value.trim().replace(",", ""));
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private Employee.EmploymentType parseEmploymentType(String value) {
        if (value == null)
            return Employee.EmploymentType.FULL_TIME;
        return switch (value.toUpperCase().replace(" ", "_").replace("-", "_")) {
            case "PART_TIME", "PARTTIME" -> Employee.EmploymentType.PART_TIME;
            case "CONTRACT", "CONTRACTOR" -> Employee.EmploymentType.CONTRACT;
            case "INTERN", "INTERNSHIP" -> Employee.EmploymentType.INTERN;
            case "CONSULTANT" -> Employee.EmploymentType.CONSULTANT;
            default -> Employee.EmploymentType.FULL_TIME;
        };
    }

    private Employee.Gender parseGender(String value) {
        if (value == null)
            return null;
        return switch (value.toUpperCase()) {
            case "M", "MALE" -> Employee.Gender.MALE;
            case "F", "FEMALE" -> Employee.Gender.FEMALE;
            case "O", "OTHER" -> Employee.Gender.OTHER;
            default -> Employee.Gender.PREFER_NOT_TO_SAY;
        };
    }

    private AttendanceRecord.AttendanceStatus parseAttendanceStatus(String value) {
        if (value == null)
            return AttendanceRecord.AttendanceStatus.PRESENT;
        return switch (value.toUpperCase().replace(" ", "_")) {
            case "ABSENT" -> AttendanceRecord.AttendanceStatus.ABSENT;
            case "HALF_DAY", "HALFDAY" -> AttendanceRecord.AttendanceStatus.HALF_DAY;
            case "ON_LEAVE", "LEAVE" -> AttendanceRecord.AttendanceStatus.ON_LEAVE;
            case "WEEKLY_OFF", "WEEKOFF" -> AttendanceRecord.AttendanceStatus.WEEKLY_OFF;
            case "HOLIDAY" -> AttendanceRecord.AttendanceStatus.HOLIDAY;
            default -> AttendanceRecord.AttendanceStatus.PRESENT;
        };
    }

    private UUID createDepartment(String name, UUID tenantId) {
        Department dept = Department.builder()
                .name(name)
                .code(name.toUpperCase().replace(" ", "_").substring(0, Math.min(10, name.length())))
                .isActive(true)
                .build();
        dept.setId(UUID.randomUUID());
        dept.setTenantId(tenantId);
        return departmentRepository.save(dept).getId();
    }

    private UUID createLeaveType(String name, UUID tenantId) {
        LeaveType type = LeaveType.builder()
                .leaveName(name)
                .leaveCode(name.toUpperCase().replace(" ", "_").substring(0, Math.min(10, name.length())))
                .isPaid(true)
                .annualQuota(BigDecimal.valueOf(12))
                .isActive(true)
                .build();
        type.setId(UUID.randomUUID());
        type.setTenantId(tenantId);
        return leaveTypeRepository.save(type).getId();
    }
}
