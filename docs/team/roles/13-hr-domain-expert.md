# HR Domain Expert

**Role**: HR Domain Expert  
**Scope**: Indian payroll compliance, labor laws, statutory requirements  
**Engagement**: Consulting basis (part-time)

## Core Responsibilities

### 1. Indian Payroll Compliance

- Provident Fund (PF) rules and calculations
- Employee State Insurance (ESI) regulations
- Professional Tax (PT) slab-based calculations
- Tax Deducted at Source (TDS) compliance
- Gratuity calculations
- Form 16 generation

### 2. Leave Policy Rules

- Leave types (casual, sick, earned, comp-off)
- Accrual rules (monthly, annual)
- Carry-forward and encashment policies
- Maternity/paternity leave compliance

### 3. Statutory Requirements

- India-specific compliance (Shops and Establishments Act)
- Tax regulations (Income Tax Act)
- Labor law compliance (Minimum Wages, Payment of Wages)

### 4. Performance Review Best Practices

- Review cycle design (annual, quarterly, continuous)
- Competency frameworks
- Rating scales and calibration
- 360-degree feedback design

## Indian Payroll Compliance

### Provident Fund (PF)

**Applicability**: Organizations with 20+ employees

**Contribution**:

```
Employee PF = 12% of basic salary
Employer PF = 3.67% of basic salary
Employer Pension = 8.33% of basic salary

Maximum: ₹21,000/month (12% of ₹1,75,000)
```

**Formula**:

```java
BigDecimal basic = employee.getBasicSalary();
BigDecimal employeePF = basic.multiply(new BigDecimal("0.12"))
    .min(new BigDecimal("21000"));
BigDecimal employerPF = basic.multiply(new BigDecimal("0.0367"))
    .min(new BigDecimal("7700"));
BigDecimal employerPension = basic.multiply(new BigDecimal("0.0833"))
    .min(new BigDecimal("17500"));
```

**Compliance**: Monthly ECR, Annual Form 5, Form 10, UAN generation

### Employee State Insurance (ESI)

**Applicability**: Organizations with 10+ employees, salary ≤ ₹21,000/month

**Contribution**:

```
Employee ESI = 0.75% of gross salary
Employer ESI = 3.25% of gross salary
```

**Benefits**: Medical care, sickness benefit, maternity benefit, disability benefit

### Professional Tax (PT)

**Karnataka Slabs**:

```
Monthly Salary     PT Amount
≤ ₹15,000          Nil
₹15,001 - ₹20,000  ₹150
> ₹20,000          ₹200
```

### Tax Deducted at Source (TDS)

**Tax Slabs (FY 2025-26, New Regime)**:

```
Annual Income      Tax Rate
₹0 - ₹3,00,000     Nil
₹3,00,001 - ₹6,00,000   5%
₹6,00,001 - ₹9,00,000   10%
₹9,00,001 - ₹12,00,000  15%
₹12,00,001 - ₹15,00,000 20%
> ₹15,00,000       30%
```

**Deductions (Old Regime)**:

- Section 80C: ₹1,50,000 (PF, PPF, ELSS, LIC)
- Section 80D: ₹25,000 (Health Insurance)
- HRA: Exempt based on rent paid
- Standard Deduction: ₹50,000

**Compliance**: Quarterly TDS return (Form 24Q), Annual Form 16

### Gratuity

**Applicability**: Organizations with 10+ employees, 5+ years service

**Formula**:

```
Gratuity = (Last drawn salary × 15 × Years of service) / 26

Where:
- Last drawn salary = Basic + DA
- 15 = 15 days per year of service
- 26 = 26 working days per month

Maximum: ₹20,00,000
```

**Tax Treatment**: Exempt up to ₹20 lakhs

## Leave Policy Best Practices

### Leave Types

**Casual Leave (CL)**:

- Accrual: 1 day per month (12 days/year)
- Carry-forward: 0 days
- Encashment: Not allowed

**Sick Leave (SL)**:

- Accrual: 0.5 days per month (6 days/year)
- Carry-forward: Up to 12 days
- Encashment: Not allowed (except retirement)

**Earned Leave (EL)**:

- Accrual: 1.5 days per month (18 days/year)
- Carry-forward: Up to 30 days
- Encashment: Allowed

**Comp-Off**:

- Accrual: Based on hours worked on weekends/holidays
- Expiry: 30 days
- Encashment: Not allowed

**Maternity Leave**:

- Statutory: 26 weeks (first two children)
- Paid: 100% of salary

**Paternity Leave**:

- Statutory: 15 days (within 6 months of birth)
- Paid: 100% of salary

### Leave Accrual Rules

```
CL: 1 day per month (credited on 1st)
SL: 0.5 days per month (credited on 1st)
EL: 1.5 days per month (credited on 1st)

Carry-Forward:
CL: 0 days (lapse at year-end)
SL: Max 12 days (excess lapses)
EL: Max 30 days (excess eligible for encashment)
```

## Performance Review Best Practices

### Rating Scale (5-Point)

```
5 - Exceptional: Consistently exceeds expectations (Top 5%)
4 - Exceeds Expectations: Frequently exceeds (Top 20%)
3 - Meets Expectations: Meets all expectations (60%)
2 - Needs Improvement: Meets some expectations (10%)
1 - Unsatisfactory: Does not meet expectations (5%)
```

**Calibration**: Managers meet to ensure distribution aligns with company policy

### Competency Framework

**Core Competencies** (All employees):

1. Communication
2. Teamwork
3. Problem-solving
4. Adaptability
5. Accountability

**Leadership Competencies** (Managers):

1. Strategic thinking
2. People management
3. Decision-making
4. Coaching & mentoring

## Compliance Reporting

### Monthly Reports

- Payroll Register (salary breakdown, PF, ESI, PT, TDS)
- PF ECR (Employee + Employer + Pension contributions)
- ESI Challan (Employee + Employer contributions)

### Quarterly Reports

- TDS Return (Form 24Q)

### Annual Reports

- Form 16 (Annual salary certificate + TDS certificate)
- PF Form 5 (Annual contribution statement)
- PF Form 10 (Annual declaration of excluded employees)

## Success Criteria

- ✅ All payroll calculations comply with Indian statutory requirements
- ✅ Form 16 generation accurate and timely
- ✅ Leave policies align with labor laws
- ✅ Zero compliance violations or penalties
- ✅ Audit support provided during statutory audits

## Escalation Path

**Report to**: Product Manager / CEO  
**Escalate when**: Major compliance changes, tax regulation updates, statutory penalty, employee
grievances
