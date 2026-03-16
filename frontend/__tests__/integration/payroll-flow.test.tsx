/**
 * Integration Tests for Payroll Run Creation Flow
 * Tests payroll run form submission and service calls
 * Uses mocked payroll service for reliable testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/lib/test-utils';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock the payroll service
vi.mock('@/lib/services/payroll.service', () => ({
  payrollService: {
    createPayrollRun: vi.fn(),
  },
}));

import { payrollService } from '@/lib/services/payroll.service';

const mockedPayrollService = vi.mocked(payrollService);

// Mock Payroll Run Form Component
interface PayrollRunFormProps {
  onSuccess?: () => void;
}

const MockPayrollRunForm: React.FC<PayrollRunFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = React.useState({
    runName: '',
    payrollMonth: '',
    payrollYear: '',
    startDate: '',
    endDate: '',
    paymentDate: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (
        !formData.runName ||
        !formData.payrollMonth ||
        !formData.payrollYear ||
        !formData.startDate ||
        !formData.endDate ||
        !formData.paymentDate
      ) {
        setError('All fields are required');
        setLoading(false);
        return;
      }

      // Validate date order
      if (formData.startDate >= formData.endDate) {
        setError('Start date must be before end date');
        setLoading(false);
        return;
      }

      await payrollService.createPayrollRun({
        runName: formData.runName,
        payrollMonth: parseInt(formData.payrollMonth),
        payrollYear: parseInt(formData.payrollYear),
        startDate: formData.startDate,
        endDate: formData.endDate,
        paymentDate: formData.paymentDate,
      });

      // Reset form on success
      setFormData({
        runName: '',
        payrollMonth: '',
        payrollYear: '',
        startDate: '',
        endDate: '',
        paymentDate: '',
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payroll run');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="payroll-form">
      {error && <div data-testid="form-error">{error}</div>}

      <div>
        <label htmlFor="run-name">Run Name:</label>
        <input
          id="run-name"
          type="text"
          value={formData.runName}
          onChange={(e) =>
            setFormData({ ...formData, runName: e.target.value })
          }
          data-testid="run-name-input"
          required
        />
      </div>

      <div>
        <label htmlFor="payroll-month">Payroll Month:</label>
        <select
          id="payroll-month"
          value={formData.payrollMonth}
          onChange={(e) =>
            setFormData({ ...formData, payrollMonth: e.target.value })
          }
          data-testid="payroll-month-select"
          required
        >
          <option value="">Select Month</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2024, i, 1).toLocaleString('en-US', {
                month: 'long',
              })}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="payroll-year">Payroll Year:</label>
        <input
          id="payroll-year"
          type="number"
          value={formData.payrollYear}
          onChange={(e) =>
            setFormData({ ...formData, payrollYear: e.target.value })
          }
          data-testid="payroll-year-input"
          min="2020"
          max="2100"
          required
        />
      </div>

      <div>
        <label htmlFor="start-date">Start Date:</label>
        <input
          id="start-date"
          type="date"
          value={formData.startDate}
          onChange={(e) =>
            setFormData({ ...formData, startDate: e.target.value })
          }
          data-testid="start-date-input"
          required
        />
      </div>

      <div>
        <label htmlFor="end-date">End Date:</label>
        <input
          id="end-date"
          type="date"
          value={formData.endDate}
          onChange={(e) =>
            setFormData({ ...formData, endDate: e.target.value })
          }
          data-testid="end-date-input"
          required
        />
      </div>

      <div>
        <label htmlFor="payment-date">Payment Date:</label>
        <input
          id="payment-date"
          type="date"
          value={formData.paymentDate}
          onChange={(e) =>
            setFormData({ ...formData, paymentDate: e.target.value })
          }
          data-testid="payment-date-input"
          required
        />
      </div>

      <button type="submit" data-testid="form-submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Payroll Run'}
      </button>
    </form>
  );
};

describe('Payroll Run Creation Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render payroll run form with all fields', () => {
      render(<MockPayrollRunForm />);

      expect(screen.getByTestId('payroll-form')).toBeInTheDocument();
      expect(screen.getByTestId('run-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('payroll-month-select')).toBeInTheDocument();
      expect(screen.getByTestId('payroll-year-input')).toBeInTheDocument();
      expect(screen.getByTestId('start-date-input')).toBeInTheDocument();
      expect(screen.getByTestId('end-date-input')).toBeInTheDocument();
      expect(screen.getByTestId('payment-date-input')).toBeInTheDocument();
      expect(screen.getByTestId('form-submit')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate that all fields are required', async () => {
      const user = userEvent.setup();
      render(<MockPayrollRunForm />);

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      // The form should not call the service when validation fails
      expect(
        mockedPayrollService.createPayrollRun
      ).not.toHaveBeenCalled();

      // Verify button returns to enabled state after validation
      expect(submitButton).not.toBeDisabled();
    });

    it('should validate that start date is before end date', async () => {
      const user = userEvent.setup();
      render(<MockPayrollRunForm />);

      await user.type(screen.getByTestId('run-name-input'), 'Payroll March 2024');
      await user.selectOptions(
        screen.getByTestId('payroll-month-select'),
        '3'
      );
      await user.type(screen.getByTestId('payroll-year-input'), '2024');
      await user.type(screen.getByTestId('start-date-input'), '2024-03-31');
      await user.type(screen.getByTestId('end-date-input'), '2024-03-01');
      await user.type(screen.getByTestId('payment-date-input'), '2024-04-05');
      await user.click(screen.getByTestId('form-submit'));

      // The service should not be called when date validation fails
      expect(
        mockedPayrollService.createPayrollRun
      ).not.toHaveBeenCalled();
    });
  });

  describe('Payroll Run Creation', () => {
    it('should submit form with valid data', async () => {
      mockedPayrollService.createPayrollRun.mockResolvedValueOnce({
        id: 'pr-123',
        runName: 'Payroll March 2024',
        status: 'DRAFT',
      });

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(<MockPayrollRunForm onSuccess={onSuccess} />);

      await user.type(
        screen.getByTestId('run-name-input'),
        'Payroll March 2024'
      );
      await user.selectOptions(
        screen.getByTestId('payroll-month-select'),
        '3'
      );
      await user.type(screen.getByTestId('payroll-year-input'), '2024');
      await user.type(screen.getByTestId('start-date-input'), '2024-03-01');
      await user.type(screen.getByTestId('end-date-input'), '2024-03-31');
      await user.type(screen.getByTestId('payment-date-input'), '2024-04-05');
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(mockedPayrollService.createPayrollRun).toHaveBeenCalledWith({
          runName: 'Payroll March 2024',
          payrollMonth: 3,
          payrollYear: 2024,
          startDate: '2024-03-01',
          endDate: '2024-03-31',
          paymentDate: '2024-04-05',
        });
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should call payrollService.createPayrollRun on form submission', async () => {
      mockedPayrollService.createPayrollRun.mockResolvedValueOnce({
        id: 'pr-456',
        runName: 'Payroll April 2024',
        status: 'DRAFT',
      });

      const user = userEvent.setup();
      render(<MockPayrollRunForm />);

      await user.type(
        screen.getByTestId('run-name-input'),
        'Payroll April 2024'
      );
      await user.selectOptions(
        screen.getByTestId('payroll-month-select'),
        '4'
      );
      await user.type(screen.getByTestId('payroll-year-input'), '2024');
      await user.type(screen.getByTestId('start-date-input'), '2024-04-01');
      await user.type(screen.getByTestId('end-date-input'), '2024-04-30');
      await user.type(screen.getByTestId('payment-date-input'), '2024-05-05');
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(mockedPayrollService.createPayrollRun).toHaveBeenCalled();
      });
    });

    it('should reset form after successful creation', async () => {
      mockedPayrollService.createPayrollRun.mockResolvedValueOnce({
        id: 'pr-123',
        runName: 'Payroll March 2024',
        status: 'DRAFT',
      });

      const user = userEvent.setup();
      render(<MockPayrollRunForm />);

      const runNameInput = screen.getByTestId('run-name-input') as HTMLInputElement;
      const yearInput = screen.getByTestId('payroll-year-input') as HTMLInputElement;

      await user.type(runNameInput, 'Payroll March 2024');
      await user.selectOptions(
        screen.getByTestId('payroll-month-select'),
        '3'
      );
      await user.type(yearInput, '2024');
      await user.type(screen.getByTestId('start-date-input'), '2024-03-01');
      await user.type(screen.getByTestId('end-date-input'), '2024-03-31');
      await user.type(screen.getByTestId('payment-date-input'), '2024-04-05');
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(runNameInput.value).toBe('');
        expect(yearInput.value).toBe('');
      });
    });

    it('should display error if creation fails', async () => {
      const errorMessage = 'Failed to create payroll run: Invalid payroll period';
      mockedPayrollService.createPayrollRun.mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const user = userEvent.setup();
      render(<MockPayrollRunForm />);

      await user.type(
        screen.getByTestId('run-name-input'),
        'Payroll March 2024'
      );
      await user.selectOptions(
        screen.getByTestId('payroll-month-select'),
        '3'
      );
      await user.type(screen.getByTestId('payroll-year-input'), '2024');
      await user.type(screen.getByTestId('start-date-input'), '2024-03-01');
      await user.type(screen.getByTestId('end-date-input'), '2024-03-31');
      await user.type(screen.getByTestId('payment-date-input'), '2024-04-05');
      await user.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('form-error')).toHaveTextContent(
          errorMessage
        );
      });
    });
  });

  describe('Button States', () => {
    it('should disable submit button while loading', async () => {
      mockedPayrollService.createPayrollRun.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  id: 'pr-123',
                  runName: 'Payroll March 2024',
                  status: 'DRAFT',
                }),
              100
            )
          )
      );

      const user = userEvent.setup();
      render(<MockPayrollRunForm />);

      await user.type(
        screen.getByTestId('run-name-input'),
        'Payroll March 2024'
      );
      await user.selectOptions(
        screen.getByTestId('payroll-month-select'),
        '3'
      );
      await user.type(screen.getByTestId('payroll-year-input'), '2024');
      await user.type(screen.getByTestId('start-date-input'), '2024-03-01');
      await user.type(screen.getByTestId('end-date-input'), '2024-03-31');
      await user.type(screen.getByTestId('payment-date-input'), '2024-04-05');

      const submitButton = screen.getByTestId('form-submit');
      await user.click(submitButton);

      expect(submitButton).toHaveTextContent('Creating...');
    });
  });
});
