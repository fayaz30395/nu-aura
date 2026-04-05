# Frontend Engineer - NU-HRMS

**Role**: Frontend Engineer - NU-HRMS  
**Scope**: Employees, attendance, leave, payroll, benefits UI  
**Tech**: Next.js 14, React Hook Form, Zod, React Query, Mantine UI

## Core Responsibilities

### 1. Employee Management UI

- Employee directory (table with 1000+ rows)
- Employee profile pages (personal, employment, documents)
- Onboarding forms (multi-step wizard)
- Bulk actions (export, import, archive)

### 2. Attendance UI

- Attendance calendar (monthly view)
- Clock in/out widget (real-time)
- Attendance reports (filters, date range)
- Manual attendance entry form

### 3. Leave Management UI

- Leave request form (type, dates, reason)
- Leave calendar (team view)
- Leave balance widget (MY SPACE)
- Approval workflow UI (approve/reject)

### 4. Payroll UI

- Payslip viewer (PDF preview)
- Payroll reports (filters, export)
- Payroll component configuration (SpEL formulas)
- Tax declaration forms (IT, 80C, 80D)

### 5. Benefits UI

- Benefits enrollment form
- Benefits dashboard (coverage, claims)
- Dependent management

## Key Patterns

### Employee Directory Table

```tsx
// frontend/app/employees/page.tsx
export default function EmployeesPage() {
  const [pagination, setPagination] = useState({ page: 0, size: 25 });
  const [filters, setFilters] = useState<EmployeeFilters>({});
  
  const { data, isLoading } = useQuery({
    queryKey: ['employees', pagination, filters],
    queryFn: () => employeeApi.getAll({ ...pagination, ...filters }),
  });
  
  return (
    <DataTable
      columns={[
        { accessor: 'fullName', header: 'Name', sortable: true },
        { accessor: 'email', header: 'Email' },
        { accessor: 'department', header: 'Department', filter: true },
        { accessor: 'position', header: 'Position' },
        { accessor: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { accessor: 'actions', header: 'Actions', render: (row) => <RowActions id={row.id} /> },
      ]}
      data={data?.content || []}
      totalRecords={data?.totalElements || 0}
      pagination={pagination}
      onPaginationChange={setPagination}
      onFilterChange={setFilters}
      loading={isLoading}
    />
  );
}
```

### Leave Request Form

```tsx
// frontend/components/leave/LeaveRequestForm.tsx
const schema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.date(),
  endDate: z.date(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  attachment: z.instanceof(File).optional(),
});

export function LeaveRequestForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });
  
  const mutation = useMutation({
    mutationFn: leaveApi.createRequest,
    onSuccess: () => {
      toast.success('Leave request submitted');
      queryClient.invalidateQueries(['leave-requests']);
    },
  });
  
  const onSubmit = (data: LeaveRequestInput) => {
    mutation.mutate(data);
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Select
        label="Leave Type"
        {...form.register('leaveTypeId')}
        error={form.formState.errors.leaveTypeId?.message}
      >
        {leaveTypes.map(type => (
          <option key={type.id} value={type.id}>{type.name}</option>
        ))}
      </Select>
      
      <DateRangePicker
        label="Dates"
        startDate={form.watch('startDate')}
        endDate={form.watch('endDate')}
        onChange={(start, end) => {
          form.setValue('startDate', start);
          form.setValue('endDate', end);
        }}
      />
      
      <Textarea
        label="Reason"
        {...form.register('reason')}
        error={form.formState.errors.reason?.message}
      />
      
      <FileInput
        label="Attachment (optional)"
        {...form.register('attachment')}
        accept=".pdf,.jpg,.png"
        maxSize={5 * 1024 * 1024}
      />
      
      <Button type="submit" loading={mutation.isPending}>
        Submit Request
      </Button>
    </form>
  );
}
```

### Attendance Calendar

```tsx
// frontend/components/attendance/AttendanceCalendar.tsx
export function AttendanceCalendar({ month, year }: Props) {
  const { data: records } = useQuery({
    queryKey: ['attendance', month, year],
    queryFn: () => attendanceApi.getMonthly(month, year),
  });
  
  const days = getDaysInMonth(month, year);
  
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(day => {
        const record = records?.find(r => isSameDay(r.date, day));
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "p-4 border rounded",
              record?.status === 'PRESENT' && "bg-green-50 border-green-200",
              record?.status === 'ABSENT' && "bg-red-50 border-red-200",
              record?.status === 'LEAVE' && "bg-blue-50 border-blue-200"
            )}
          >
            <div className="text-sm font-semibold">{format(day, 'd')}</div>
            {record && (
              <div className="text-xs text-slate-600">
                {record.clockIn} - {record.clockOut}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### Payslip Viewer

```tsx
// frontend/components/payroll/PayslipViewer.tsx
export function PayslipViewer({ payslipId }: Props) {
  const { data: payslip } = useQuery({
    queryKey: ['payslip', payslipId],
    queryFn: () => payrollApi.getPayslip(payslipId),
  });
  
  const downloadPDF = async () => {
    const blob = await payrollApi.downloadPayslipPDF(payslipId);
    saveAs(blob, `payslip-${payslip.month}-${payslip.year}.pdf`);
  };
  
  return (
    <Card>
      <h2>Payslip - {payslip.month}/{payslip.year}</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3>Earnings</h3>
          {payslip.earnings.map(e => (
            <div key={e.componentCode}>
              <span>{e.componentName}</span>
              <span>₹{e.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="font-bold">Total: ₹{payslip.grossSalary.toLocaleString()}</div>
        </div>
        
        <div>
          <h3>Deductions</h3>
          {payslip.deductions.map(d => (
            <div key={d.componentCode}>
              <span>{d.componentName}</span>
              <span>₹{d.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="font-bold">Total: ₹{payslip.totalDeductions.toLocaleString()}</div>
        </div>
      </div>
      
      <div className="text-2xl font-bold text-sky-700">
        Net Pay: ₹{payslip.netSalary.toLocaleString()}
      </div>
      
      <Button onClick={downloadPDF}>Download PDF</Button>
    </Card>
  );
}
```

## Success Criteria

- ✅ Employee directory renders <2s (1000+ rows)
- ✅ Form validation instant (<100ms)
- ✅ Leave calendar renders <1s
- ✅ Payslip PDF download <3s
- ✅ Mobile responsive (all pages)

## Escalation Path

**Report to**: Engineering Manager  
**Escalate when**: Performance degradation, API errors >5%, accessibility issues
