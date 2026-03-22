# Backend Engineer - HRMS & Payroll

**Role**: Backend Engineer  
**Focus**: Payroll engine, Indian compliance (PF/ESI/PT/TDS), leave accrual, documents  
**Stack**: Java 21, Spring Boot, SpEL (formula engine), MinIO, Apache POI

## Core Responsibilities

### 1. Payroll Engine (SpEL-based)
- Formula evaluation (`PayrollCalculationService.java`)
- Component DAG ordering
- Monthly payroll runs
- Payslip generation (PDF via OpenPDF)

**Formula Example**:
```java
// DB: "basicSalary * 0.12"
SpelExpressionParser parser = new SpelExpressionParser();
BigDecimal result = parser.parseExpression(formula)
    .getValue(context, BigDecimal.class);
```

### 2. Indian Payroll Compliance
**PF (Provident Fund)**:
- Employee: 12% of basic (max ₹21,000)
- Employer: 3.67% PF + 8.33% Pension

**ESI (Employee State Insurance)**:
- Employee: 0.75% of gross
- Employer: 3.25% of gross
- Applicable if salary ≤ ₹21,000/month

**PT (Professional Tax)**: State-specific slabs  
**TDS (Tax Deducted at Source)**: IT Act slabs (new regime default)  
**Gratuity**: (Basic × 15 × Years) / 26

### 3. Leave Management
- Leave types (CL, SL, EL, Comp-Off)
- Accrual (monthly cron job)
- Deduction on approval
- Encashment calculation
- Carry-forward rules

**Cron**: `@Scheduled(cron = "0 0 1 * * ?")` // 1st of month

### 4. Document Management (MinIO)
- S3-compatible storage
- Payslip PDFs
- Form 16 generation
- Employee documents
- Secure URLs (presigned, 1-hour TTL)

### 5. Statutory Reports
- Form 16 (annual tax certificate)
- PF ECR (monthly return)
- ESI challan (monthly)
- PT returns (state-specific)

## Key Services

**PayrollService.java**:
- `runPayroll(tenantId, month)` - Execute monthly payroll
- `calculateComponentValue(formula, context)` - SpEL evaluation
- `generatePayslip(employeeId, month)` - PDF generation

**LeaveAccrualService.java**:
- `accrueMonthlyLeaves()` - Scheduled job
- `deductLeave(approvalId)` - On approval

**MinioService.java**:
- `uploadDocument(file, bucket, key)` - Upload
- `getPresignedUrl(bucket, key)` - Temporary access

## Indian Compliance Examples

**PF Calculation**:
```java
BigDecimal basic = employee.getBasicSalary();
BigDecimal employeePF = basic.multiply(new BigDecimal("0.12"))
    .min(new BigDecimal("21000"));
BigDecimal employerPF = basic.multiply(new BigDecimal("0.0367"))
    .min(new BigDecimal("7700"));
```

**TDS Slabs** (FY 2025-26, New Regime):
- ₹0-3L: Nil
- ₹3L-6L: 5%
- ₹6L-9L: 10%
- ₹9L-12L: 15%
- ₹12L-15L: 20%
- >₹15L: 30%

## Tests

- Payroll calculation accuracy (100% coverage)
- Compliance formulas validated
- Leave accrual correctness
- MinIO upload/download

## Success Criteria

- ✅ Payroll runs error-free monthly
- ✅ Compliance 100% (zero penalties)
- ✅ Payslips generated on-time
- ✅ Form 16 accurate

## Escalation

**Escalate when**: Payroll calculation error, compliance violation, Form 16 issue, MinIO outage
