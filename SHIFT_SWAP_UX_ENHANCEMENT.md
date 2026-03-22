# Shift Swap UX Enhancement - Frontend Requirement

**Issue**: Users must manually enter raw UUIDs for shift swap requests
**Priority**: Medium (UX improvement)
**Module**: Attendance > Shift Swaps
**Status**: Backend Ready, Frontend Enhancement Needed

---

## Current Implementation (Backend)

**Controller**: `ShiftSwapController.java` (Line 129-138)

The `SwapRequestDto` requires the following UUID fields:
```java
@Data
public static class SwapRequestDto {
    @NotNull private UUID requesterEmployeeId;      // ← User must paste UUID
    @NotNull private UUID requesterAssignmentId;    // ← User must paste UUID
    @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) private LocalDate requesterShiftDate;
    private UUID targetEmployeeId;                   // ← User must paste UUID (optional)
    private UUID targetAssignmentId;                 // ← User must paste UUID (optional)
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) private LocalDate targetShiftDate;
    @NotNull private String swapType;                // SWAP, GIVE_AWAY, PICK_UP
    private String reason;
}
```

**Problem**: Raw UUID inputs create a terrible user experience:
- Users don't know their own employee UUID
- Users can't discover other employees' UUIDs
- No visibility into shift assignment UUIDs
- High error rate due to copy-paste mistakes
- Violates accessibility guidelines (no semantic labels)

---

## Recommended Frontend Solution

### 1. Employee Picker Component

Create or reuse an employee autocomplete dropdown:

```typescript
<EmployeeSelect
  label="Select Employee"
  value={employeeId}
  onChange={(id, employee) => {
    setFieldValue('requesterEmployeeId', id);
    // Auto-populate shift assignments for this employee
    loadShiftAssignments(id, requesterShiftDate);
  }}
  placeholder="Search by name or employee code..."
  aria-label="Requester employee"
/>
```

**Features**:
- Autocomplete search by name or employee code
- Display: "Jane Doe (EMP-001) - Engineering"
- Returns: UUID internally
- Keyboard navigable (↑↓ Enter)
- Screen reader friendly

**Backend API**: `GET /api/v1/employees/search?query={name}` already exists (EmployeeController.java:73-90)

---

### 2. Shift Assignment Picker Component

Create a shift assignment dropdown tied to the selected employee and date:

```typescript
<ShiftAssignmentSelect
  label="Select Shift"
  employeeId={employeeId}
  date={shiftDate}
  value={assignmentId}
  onChange={(id, assignment) => {
    setFieldValue('requesterAssignmentId', id);
  }}
  placeholder="Loading shifts for {date}..."
  aria-label="Requester shift assignment"
/>
```

**Features**:
- Automatically loads shifts for selected employee + date
- Display: "Morning Shift (8:00 AM - 4:00 PM)"
- Returns: Assignment UUID internally
- Disabled until employee and date are selected
- Shows "No shifts assigned" if empty

**Backend API Needed**:
```java
GET /api/v1/shift-assignments/employee/{employeeId}/date/{date}
→ Returns List<ShiftAssignment> with {id, shiftName, startTime, endTime}
```

---

### 3. Swap Type Selection

Replace raw string with a proper radio group or dropdown:

```typescript
<RadioGroup
  label="Swap Type"
  value={swapType}
  onChange={(value) => setFieldValue('swapType', value)}
  options={[
    { value: 'SWAP', label: 'Swap shifts with another employee' },
    { value: 'GIVE_AWAY', label: 'Give away my shift' },
    { value: 'PICK_UP', label: 'Pick up an available shift' }
  ]}
  aria-label="Shift swap type"
/>
```

---

## Implementation Checklist

### Phase 1: Component Creation
- [ ] Create or reuse `EmployeeAutocomplete.tsx` (may already exist at `frontend/components/ui/EmployeeSearchAutocomplete.tsx`)
- [ ] Create `ShiftAssignmentSelect.tsx` component
- [ ] Create shift assignment API endpoint in `ShiftAssignmentController.java`

### Phase 2: Form Integration
- [ ] Replace UUID text inputs with employee pickers
- [ ] Replace UUID text inputs with shift assignment pickers
- [ ] Add conditional logic (target fields only show for SWAP type)
- [ ] Add form validation feedback (red borders, error messages)

### Phase 3: Testing
- [ ] Test with keyboard navigation only (no mouse)
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Verify focus-visible styles on all inputs
- [ ] Test error states (empty selection, API failures)
- [ ] Test with real employee data (50+ employees)

### Phase 4: Accessibility Compliance
- [ ] All form controls have associated labels (explicit <label> or aria-label)
- [ ] Tab order follows logical reading order
- [ ] Error messages are announced by screen readers
- [ ] Required fields marked with aria-required="true"
- [ ] Invalid fields marked with aria-invalid="true"

---

## Alternative: Guided Wizard Flow

For better UX, consider a step-by-step wizard instead of a single form:

**Step 1**: Select your shift
- Employee (auto-filled with current user)
- Date picker
- Shift assignment dropdown (loads after date selected)

**Step 2**: Choose swap type
- Radio group: Swap / Give Away / Pick Up

**Step 3** (if SWAP selected): Select target employee & shift
- Employee autocomplete
- Target date picker
- Target shift assignment dropdown

**Step 4**: Confirm & submit
- Review summary
- Add optional reason
- Submit button

---

## Related Files

### Backend
- `ShiftSwapController.java` - Line 129-138 (DTO definitions)
- `ShiftSwapService.java` - Business logic
- `EmployeeController.java` - Line 73-90 (employee search endpoint)
- Need to create: Shift assignment by employee/date endpoint

### Frontend
- Likely exists: `frontend/app/attendance/shift-swaps/page.tsx` (shift swap form)
- Reusable: `frontend/components/ui/EmployeeSearchAutocomplete.tsx`
- To create: `frontend/components/ui/ShiftAssignmentSelect.tsx`

---

## Priority Justification

**Medium Priority** because:
- ✅ Feature is functional (backend validation works)
- ❌ UX is severely degraded (manual UUID entry)
- ❌ Accessibility violation (no semantic labels)
- 🔄 Workaround exists (users can find UUIDs via browser dev tools or database exports)

**Blocks**:
- Internal beta adoption (employees won't use it if UX is bad)
- WCAG 2.1 AA compliance certification

---

**Created**: 2026-03-22
**Author**: Wave 3 Bug Fixes - Co-Working Mode
**Last Updated**: 2026-03-22
