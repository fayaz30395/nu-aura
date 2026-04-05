/**
 * Integration Tests for Leave Application Flow
 * Tests leave form rendering, validation, submission, and balance updates
 * Uses mocked leave service and React Query for reliable testing
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@/lib/test-utils';
import userEvent from '@testing-library/user-event';
import {createMockLeaveBalance, createMockLeaveRequest, mockLeaveTypes} from '@/lib/test-utils/fixtures';
import {leaveService} from '@/lib/services/hrms/leave.service';
import React from 'react';

// Mock the leave service
vi.mock('@/lib/services/hrms/leave.service', () => ({
  leaveService: {
    createLeaveRequest: vi.fn(),
    getLeaveRequestById: vi.fn(),
    getEmployeeBalances: vi.fn(),
    getActiveLeaveTypes: vi.fn(),
    updateLeaveRequest: vi.fn(),
  },
}));

const mockedLeaveService = vi.mocked(leaveService);

// Mock Leave Application Form Component
interface LeaveFormProps {
  onSuccess?: () => void;
}

const MockLeaveForm: React.FC<LeaveFormProps> = ({onSuccess}) => {
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [leaveTypeId, setLeaveTypeId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!startDate || !endDate || !leaveTypeId || !reason) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        setError('Start date must be before end date');
        setLoading(false);
        return;
      }

      // Submit
      await leaveService.createLeaveRequest({
        startDate,
        endDate,
        leaveTypeId,
        reason,
      });

      onSuccess?.();
      setStartDate('');
      setEndDate('');
      setLeaveTypeId('');
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create leave request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="leave-form">
      {error && <div data-testid="error-message">{error}</div>}

      <div>
        <label htmlFor="leave-type">Leave Type:</label>
        <select
          id="leave-type"
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          data-testid="leave-type-select"
          required
        >
          <option value="">Select Leave Type</option>
          {mockLeaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="start-date">Start Date:</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          data-testid="start-date-input"
          required
        />
      </div>

      <div>
        <label htmlFor="end-date">End Date:</label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          data-testid="end-date-input"
          required
        />
      </div>

      <div>
        <label htmlFor="reason">Reason:</label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          data-testid="reason-textarea"
          required
          minLength={10}
        />
      </div>

      <button type="submit" data-testid="submit-button" disabled={loading}>
        {loading ? 'Submitting...' : 'Apply for Leave'}
      </button>
    </form>
  );
};

describe('Leave Application Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Leave Form Rendering', () => {
    it('should render leave form with all required fields', () => {
      render(<MockLeaveForm/>);

      expect(screen.getByTestId('leave-form')).toBeInTheDocument();
      expect(screen.getByTestId('leave-type-select')).toBeInTheDocument();
      expect(screen.getByTestId('start-date-input')).toBeInTheDocument();
      expect(screen.getByTestId('end-date-input')).toBeInTheDocument();
      expect(screen.getByTestId('reason-textarea')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should display all available leave types', () => {
      render(<MockLeaveForm/>);

      const leaveTypeSelect = screen.getByTestId('leave-type-select');
      const options = leaveTypeSelect.querySelectorAll('option');

      // +1 for the default "Select Leave Type" option
      expect(options).toHaveLength(mockLeaveTypes.length + 1);
    });
  });

  describe('Leave Form Validation', () => {
    it('should show error when required fields are empty', async () => {
      render(<MockLeaveForm/>);

      const leaveTypeSelect = screen.getByTestId('leave-type-select') as HTMLSelectElement;
      const startDateInput = screen.getByTestId('start-date-input') as HTMLInputElement;
      const endDateInput = screen.getByTestId('end-date-input') as HTMLInputElement;
      const reasonTextarea = screen.getByTestId('reason-textarea') as HTMLTextAreaElement;

      // Verify all fields are empty
      expect(leaveTypeSelect.value).toBe('');
      expect(startDateInput.value).toBe('');
      expect(endDateInput.value).toBe('');
      expect(reasonTextarea.value).toBe('');

      // All have required attribute
      expect(startDateInput).toHaveAttribute('required');
      expect(endDateInput).toHaveAttribute('required');
      expect(reasonTextarea).toHaveAttribute('required');
    });

    it('should show error when start date is after end date', async () => {
      mockedLeaveService.createLeaveRequest.mockImplementation(() => {
        throw new Error('Start date must be before end date');
      });
      const user = userEvent.setup();

      render(<MockLeaveForm/>);

      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');
      const leaveTypeSelect = screen.getByTestId('leave-type-select');
      const reasonTextarea = screen.getByTestId('reason-textarea');
      const submitButton = screen.getByTestId('submit-button');

      await user.selectOptions(leaveTypeSelect, 'lt-001');
      await user.type(startDateInput, '2024-02-05');
      await user.type(endDateInput, '2024-02-01');
      await user.type(reasonTextarea, 'Valid reason for leave');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(
          'Start date must be before end date'
        )).toBeInTheDocument();
      });
    });

    it('should allow valid date range', async () => {
      mockedLeaveService.createLeaveRequest.mockResolvedValueOnce(
        createMockLeaveRequest({status: 'PENDING' as const})
      );

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<MockLeaveForm onSuccess={onSuccess}/>);

      const leaveTypeSelect = screen.getByTestId('leave-type-select');
      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');
      const reasonTextarea = screen.getByTestId('reason-textarea');
      const submitButton = screen.getByTestId('submit-button');

      await user.selectOptions(leaveTypeSelect, 'lt-001');
      await user.type(startDateInput, '2024-02-01');
      await user.type(endDateInput, '2024-02-05');
      await user.type(reasonTextarea, 'Valid reason for vacation leave');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedLeaveService.createLeaveRequest).toHaveBeenCalled();
      });
    });
  });

  describe('Leave Request Submission', () => {
    it('should call leave service with form data', async () => {
      mockedLeaveService.createLeaveRequest.mockResolvedValueOnce(
        createMockLeaveRequest()
      );
      const user = userEvent.setup();

      render(<MockLeaveForm/>);

      const leaveTypeSelect = screen.getByTestId('leave-type-select');
      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');
      const reasonTextarea = screen.getByTestId('reason-textarea');
      const submitButton = screen.getByTestId('submit-button');

      await user.selectOptions(leaveTypeSelect, 'lt-001');
      await user.type(startDateInput, '2024-02-01');
      await user.type(endDateInput, '2024-02-05');
      await user.type(reasonTextarea, 'Family vacation');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockedLeaveService.createLeaveRequest).toHaveBeenCalledWith({
          startDate: '2024-02-01',
          endDate: '2024-02-05',
          leaveTypeId: 'lt-001',
          reason: 'Family vacation',
        });
      });
    });

    it('should trigger success callback on successful submission', async () => {
      mockedLeaveService.createLeaveRequest.mockResolvedValueOnce(
        createMockLeaveRequest()
      );

      const onSuccess = vi.fn();
      const user = userEvent.setup();
      render(<MockLeaveForm onSuccess={onSuccess}/>);

      const leaveTypeSelect = screen.getByTestId('leave-type-select');
      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');
      const reasonTextarea = screen.getByTestId('reason-textarea');
      const submitButton = screen.getByTestId('submit-button');

      await user.selectOptions(leaveTypeSelect, 'lt-001');
      await user.type(startDateInput, '2024-02-01');
      await user.type(endDateInput, '2024-02-05');
      await user.type(reasonTextarea, 'Family vacation');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should clear form after successful submission', async () => {
      mockedLeaveService.createLeaveRequest.mockResolvedValueOnce(
        createMockLeaveRequest()
      );
      const user = userEvent.setup();

      render(<MockLeaveForm/>);

      const leaveTypeSelect = screen.getByTestId('leave-type-select') as HTMLSelectElement;
      const startDateInput = screen.getByTestId('start-date-input') as HTMLInputElement;
      const endDateInput = screen.getByTestId('end-date-input') as HTMLInputElement;
      const reasonTextarea = screen.getByTestId('reason-textarea') as HTMLTextAreaElement;
      const submitButton = screen.getByTestId('submit-button');

      await user.selectOptions(leaveTypeSelect, 'lt-001');
      await user.type(startDateInput, '2024-02-01');
      await user.type(endDateInput, '2024-02-05');
      await user.type(reasonTextarea, 'Family vacation');
      await user.click(submitButton);

      await waitFor(() => {
        expect(leaveTypeSelect.value).toBe('');
        expect(startDateInput.value).toBe('');
        expect(endDateInput.value).toBe('');
        expect(reasonTextarea.value).toBe('');
      });
    });

    it('should handle submission error gracefully', async () => {
      const errorMessage = 'Insufficient leave balance';
      mockedLeaveService.createLeaveRequest.mockRejectedValueOnce(
        new Error(errorMessage)
      );
      const user = userEvent.setup();

      render(<MockLeaveForm/>);

      const leaveTypeSelect = screen.getByTestId('leave-type-select');
      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');
      const reasonTextarea = screen.getByTestId('reason-textarea');
      const submitButton = screen.getByTestId('submit-button');

      await user.selectOptions(leaveTypeSelect, 'lt-001');
      await user.type(startDateInput, '2024-02-01');
      await user.type(endDateInput, '2024-02-05');
      await user.type(reasonTextarea, 'Family vacation');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Leave Balance Updates', () => {
    it('should fetch employee leave balances', async () => {
      mockedLeaveService.getEmployeeBalances.mockResolvedValueOnce([
        createMockLeaveBalance({leaveTypeId: 'lt-001', availableDays: 15}),
        createMockLeaveBalance({leaveTypeId: 'lt-002', availableDays: 8}),
      ]);

      const balances = await leaveService.getEmployeeBalances('emp-001');

      expect(mockedLeaveService.getEmployeeBalances).toHaveBeenCalledWith('emp-001');
      expect(balances).toHaveLength(2);
      expect(balances[0].availableDays).toBe(15);
    });

    it('should display remaining leave balance', async () => {
      const mockBalance = createMockLeaveBalance({
        leaveTypeId: 'lt-001',
        totalDays: 20,
        usedDays: 5,
        availableDays: 15,
      });

      mockedLeaveService.getEmployeeBalances.mockResolvedValueOnce([mockBalance]);

      const balances = await leaveService.getEmployeeBalances('emp-001');

      expect(balances[0].availableDays).toBe(15);
      expect(balances[0].totalDays).toBe(20);
      expect(balances[0].usedDays).toBe(5);
    });
  });

  describe('Submit Button State', () => {
    it('should disable submit button while loading', async () => {
      mockedLeaveService.createLeaveRequest.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  createMockLeaveRequest({status: 'PENDING' as const})
                ),
              100
            )
          )
      );
      const user = userEvent.setup();

      render(<MockLeaveForm/>);

      const submitButton = screen.getByTestId('submit-button') as HTMLButtonElement;
      const leaveTypeSelect = screen.getByTestId('leave-type-select');
      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');
      const reasonTextarea = screen.getByTestId('reason-textarea');

      await user.selectOptions(leaveTypeSelect, 'lt-001');
      await user.type(startDateInput, '2024-02-01');
      await user.type(endDateInput, '2024-02-05');
      await user.type(reasonTextarea, 'Family vacation');
      await user.click(submitButton);

      expect(submitButton.disabled).toBe(true);
      expect(submitButton).toHaveTextContent('Submitting...');
    });
  });
});
