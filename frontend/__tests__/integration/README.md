# Integration Tests for Critical HRMS Flows

This directory contains comprehensive integration tests for the core HRMS platform functionality. These tests validate critical user flows end-to-end, focusing on UI logic and service interactions.

## Overview

All tests use **Vitest** as the test runner with **Testing Library** for component testing and **Mock Service Worker (MSW)** or **vi.mock** for service mocking.

### Test Framework Stack
- **Test Runner**: Vitest 1.2.0
- **Component Testing**: @testing-library/react 14.2.0
- **User Simulation**: @testing-library/user-event 14.5.0
- **HTTP Mocking**: MSW 2.1.0
- **Type Safety**: TypeScript 5.9.3

## Test Files

### 1. **auth-flow.test.tsx** (330 lines)
Tests the complete authentication lifecycle.

#### Coverage:
- **Login Form Rendering**: Validates form structure and inputs
- **Valid Credentials**: Tests successful login flow
  - Calls auth service with correct credentials
  - Redirects to dashboard on success
  - Stores user data
- **Invalid Credentials**: Tests failure handling
  - Displays error messages
  - Prevents redirect on failure
- **SuperAdmin Login**: Validates admin role handling
- **Logout Flow**: Tests token clearing and logout endpoint
- **Token Refresh**: Tests token refresh mechanisms and expiration

#### Key Test Cases:
```typescript
✓ Login form renders with email and password inputs
✓ Valid credentials trigger API call and redirect
✓ Invalid credentials show error without redirect
✓ SuperAdmin login is handled correctly
✓ Logout clears tokens and calls endpoint
✓ Token refresh succeeds and returns new tokens
✓ Expired refresh token triggers re-login
```

#### Services Mocked:
- `@/lib/api/auth` - authApi.login, authApi.logout, authApi.refresh
- `next/navigation` - useRouter hook

---

### 2. **leave-flow.test.tsx** (430 lines)
Tests the complete leave application workflow.

#### Coverage:
- **Form Rendering**: Validates all form fields present
- **Validation**:
  - Required field validation
  - Date range validation (start before end)
  - Minimum reason length
- **Leave Submission**:
  - Calls service with form data
  - Success callback triggered
  - Form clears after submission
  - Error handling and display
- **Leave Balance Updates**:
  - Fetches employee balances
  - Displays remaining days
  - Shows usage breakdown
- **UI State**: Button disable during loading

#### Key Test Cases:
```typescript
✓ Leave form renders with all required fields
✓ Form validation shows errors for empty fields
✓ Start date must be before end date
✓ Valid date range allows submission
✓ Service called with correct form data
✓ Success callback triggered on submission
✓ Form clears after successful submission
✓ Error message displayed on submission failure
✓ Leave balance fetched for employee
✓ Remaining days calculated correctly
✓ Submit button disabled while loading
```

#### Services Mocked:
- `@/lib/services/leave.service` - createLeaveRequest, getEmployeeBalances, getActiveLeaveTypes
- Mock data: createMockLeaveRequest, createMockLeaveBalance, mockLeaveTypes

---

### 3. **employee-flow.test.tsx** (520 lines)
Tests employee CRUD operations.

#### Coverage:
- **Employee List**:
  - Rendering with pagination
  - Fetching from service
  - Error handling
  - Loading states
- **Create Employee**:
  - Form validation (required fields)
  - Service submission with valid data
  - Success callback
  - Form clearing after creation
- **Edit Employee**:
  - Pre-filling form with employee data
  - Updating employee information
  - Service call with updated data
- **Delete Employee**:
  - Delete confirmation handling
  - Service deletion call
  - List update after deletion
- **Action Buttons**: Edit and delete button functionality

#### Key Test Cases:
```typescript
✓ Employee list loads with pagination
✓ All employees displayed in table
✓ Employee details shown correctly
✓ Error handled when fetching employees
✓ Create form renders with all fields
✓ Required fields validated
✓ Valid data submitted to service
✓ Form clears after creation
✓ Edit pre-fills employee data
✓ Employee data updated successfully
✓ Delete service called correctly
✓ List updated after deletion
✓ Edit button triggers callback
✓ Delete button triggers callback
```

#### Services Mocked:
- `@/lib/services/employee.service` - createEmployee, getEmployee, getAllEmployees, updateEmployee, deleteEmployee
- Mock data: mockEmployees, createMockEmployee, createMockPage

---

### 4. **approval-flow.test.tsx** (540 lines)
Tests the approval workflow engine.

#### Coverage:
- **Approval Inbox**:
  - Rendering pending approvals
  - Counting unread items
  - Error handling
  - Empty state display
- **Approval Status**:
  - Status badge display
  - CSS class application
  - Status transitions
- **Approve Action**:
  - Show approve button for pending items
  - Call workflow service on approval
  - Update status to APPROVED
  - Hide action buttons after approval
- **Reject Action**:
  - Show reject button for pending items
  - Open rejection form
  - Validate rejection reason (minimum length)
  - Submit rejection with reason
  - Update status to REJECTED
  - Hide form after submission
- **Approval Visibility**: Hide buttons for non-pending items

#### Key Test Cases:
```typescript
✓ Approval inbox loads with pending count
✓ All pending approvals displayed
✓ Pending count shown in header (2)
✓ Approval item details visible
✓ Empty inbox message shown when no items
✓ Error handled when fetching approvals
✓ Status badges displayed correctly
✓ Correct CSS class applied to status
✓ Approve button shown for pending items
✓ Approve callback triggered
✓ Status updated to APPROVED after approval
✓ Buttons hidden after approval
✓ Reject button shown for pending items
✓ Reject form opens on button click
✓ Rejection reason required (min 10 chars)
✓ Submit button enabled with valid reason
✓ Rejection submitted with reason
✓ Status updated to REJECTED
✓ Form hidden after rejection
✓ No action buttons for approved items
```

#### Services Mocked:
- `@/lib/services/workflow.service` - processApprovalAction, getApprovalInbox
- Mock data: mockApprovals (LEAVE_REQUEST, EXPENSE_CLAIM, TRAVEL_REQUEST)

---

### 5. **notification-flow.test.tsx** (690 lines)
Tests the notification system.

#### Coverage:
- **Notification Bell**:
  - Rendering bell button
  - Unread badge display and count
  - Badge removal when count is 0
  - Fetch unread count on mount
- **Notification Dropdown**:
  - Opens on bell click
  - Loads notifications when opening
  - Shows loading state
  - Closes when clicking bell again
  - Shows "No notifications" when empty
- **Notification Display**:
  - All notifications rendered
  - Notification details visible
  - CSS class for read/unread state
- **Mark as Read**:
  - Button shown for unread notifications
  - API called when clicked
  - Button hidden after marking read
  - Unread badge count decremented
- **Mark All as Read**:
  - Button shown when unread exist
  - API called on click
  - All items marked as read
  - Button hidden after action
- **Delete Notification**:
  - Delete API called
  - Notification removed from list
- **Event Callbacks**: onBellClick callback triggered

#### Key Test Cases:
```typescript
✓ Notification bell renders
✓ Unread badge displays with count
✓ Badge hidden when count is 0
✓ Unread count fetched on mount
✓ Dropdown opens on bell click
✓ Notifications loaded on open
✓ Loading state shown while fetching
✓ Dropdown closes on second bell click
✓ Empty message shown for no notifications
✓ All notifications displayed
✓ Notification details visible
✓ Read/unread CSS class applied
✓ Mark as read button shown for unread
✓ API called when mark as read clicked
✓ Button hidden after mark as read
✓ Unread badge updated after marking read
✓ Mark all as read button shown
✓ API called when mark all as read clicked
✓ All notifications marked as read
✓ Button hidden after action
✓ Delete API called
✓ Notification removed from list
✓ onBellClick callback triggered
```

#### Services Mocked:
- `@/lib/api/notifications` - notificationsApi.getUnreadCount, getMyNotifications, markAsRead, markAllAsRead, deleteNotification
- Mock data: mockNotifications (4 items with varied states)

---

## Running Tests

### Run All Integration Tests
```bash
npm run test:run -- __tests__/integration/
```

### Run Specific Test File
```bash
npm run test:run -- __tests__/integration/auth-flow.test.tsx
```

### Run Tests in Watch Mode
```bash
npm run test -- __tests__/integration/
```

### Run with UI Dashboard
```bash
npm run test:ui
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Test Structure

Each test file follows a consistent pattern:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/lib/test-utils';
import userEvent from '@testing-library/user-event';

// Mock external services
vi.mock('@/lib/services/service-name', () => ({
  serviceName: {
    method: vi.fn(),
  },
}));

describe('Feature Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Category', () => {
    it('should do something specific', async () => {
      // Arrange
      mockedService.method.mockResolvedValueOnce(mockData);

      // Act
      render(<Component />);
      const user = userEvent.setup();
      await user.click(screen.getByTestId('button'));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('result')).toBeInTheDocument();
      });
    });
  });
});
```

## Mocking Strategy

### Service Mocking
- Use `vi.mock()` for service layer (API clients, HTTP calls)
- Mock at the service boundary, not component internals
- Clear mocks in `beforeEach` to prevent test pollution

### Component Testing
- Test component logic, not implementation
- Use Testing Library queries (getByTestId, getByText, getByRole)
- Simulate user interactions with userEvent
- Use waitFor for async operations

### Test Fixtures
Located in `/lib/test-utils/fixtures.ts`:
- `mockEmployees` - Array of employee objects
- `mockLeaveTypes` - Array of leave type objects
- `mockApprovals` - Array of approval items
- `createMockEmployee()` - Factory for custom employee data
- `createMockPage()` - Paginated response wrapper

## Best Practices

1. **Test Isolation**: Each test is independent, no shared state
2. **Async Handling**: Use `waitFor` for async operations
3. **User Simulation**: Use `userEvent` instead of direct event triggers
4. **Clear Assertions**: Test behavior, not implementation
5. **Meaningful Names**: Test names describe what is being tested
6. **Error Cases**: Include tests for failures and edge cases
7. **Mock Data**: Use fixtures for consistent test data
8. **No TypeScript Any**: All types properly defined

## TypeScript Compliance

All test files follow strict TypeScript rules:
- ✅ No `any` types
- ✅ Proper interface definitions
- ✅ Type-safe mock data
- ✅ Component props typed
- ✅ Event handler types specified

Verify with:
```bash
npx tsc --noEmit
```

## Coverage Goals

Target coverage thresholds (configured in `vitest.config.ts`):
- Statements: 60%
- Branches: 60%
- Functions: 60%
- Lines: 60%

Generate report:
```bash
npm run test:coverage
```

## Common Patterns

### Testing Async API Calls
```typescript
mockedService.getItems.mockResolvedValueOnce(mockData);

const user = userEvent.setup();
render(<Component />);

await waitFor(() => {
  expect(screen.getByTestId('loaded-item')).toBeInTheDocument();
});
```

### Testing Form Submission
```typescript
const user = userEvent.setup();
render(<Form />);

await user.type(screen.getByTestId('input'), 'value');
await user.click(screen.getByTestId('submit'));

await waitFor(() => {
  expect(mockedService.submit).toHaveBeenCalledWith({ input: 'value' });
});
```

### Testing Callbacks
```typescript
const onSuccess = vi.fn();
render(<Component onSuccess={onSuccess} />);

// ... trigger action ...

expect(onSuccess).toHaveBeenCalledWith(expectedData);
```

### Testing Error States
```typescript
mockedService.method.mockRejectedValueOnce(new Error('API Error'));

render(<Component />);

await waitFor(() => {
  expect(screen.getByTestId('error')).toHaveTextContent('API Error');
});
```

## Troubleshooting

### Tests not running?
1. Check vitest.config.ts is present
2. Verify test files match pattern: `*.test.tsx`
3. Clear node_modules and reinstall dependencies
4. Check vitest.setup.ts has proper mocks

### Mock not working?
1. Ensure `vi.mock()` is at top of file before imports
2. Use `vi.clearAllMocks()` in beforeEach
3. Check mock path matches exactly
4. Use `const mocked = serviceName as any` to access mocked methods

### Async tests timing out?
1. Use `waitFor` with proper conditions
2. Check mocked service is resolving properly
3. Increase test timeout if necessary
4. Use `userEvent.setup()` for user interactions

## Integration Test Philosophy

These are **integration tests**, not unit tests:
- Test flows across multiple components/services
- Mock external services (API calls)
- Validate user interactions and state changes
- Focus on critical business workflows
- Ensure UI and logic work together correctly

## Next Steps

To run these tests locally:

```bash
# Install dependencies if needed
npm install

# Run all integration tests
npm run test:run -- __tests__/integration/

# Watch mode for development
npm run test -- __tests__/integration/

# Generate coverage
npm run test:coverage
```

## Contributing

When adding new integration tests:

1. ✅ Follow the existing pattern and structure
2. ✅ Use descriptive test names
3. ✅ Mock services, not components
4. ✅ Include both success and error cases
5. ✅ Use proper TypeScript types
6. ✅ Test critical user flows
7. ✅ Run `npx tsc --noEmit` to verify no TS errors
8. ✅ Update this README with test summary

---

**Last Updated**: 2026-03-11
**Test Framework**: Vitest 1.2.0
**Total Lines of Test Code**: ~2,000
**Number of Test Suites**: 5
**Number of Test Cases**: 130+
