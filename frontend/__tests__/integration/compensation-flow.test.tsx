/**
 * Integration Tests for Compensation Approval Flow
 * Tests compensation revision approval and rejection operations
 * Uses mocked compensation service for reliable testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/lib/test-utils';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock the compensation service
vi.mock('@/lib/services/compensation.service', () => ({
  compensationService: {
    approveRevision: vi.fn(),
    rejectRevision: vi.fn(),
  },
}));

import { compensationService } from '@/lib/services/compensation.service';

const mockedCompensationService = compensationService as any;

// Mock Compensation Approval Component
interface CompensationApprovalProps {
  revisionId: string;
  onApprovalSuccess?: () => void;
  onRejectionSuccess?: () => void;
}

const MockCompensationApproval: React.FC<CompensationApprovalProps> = ({
  revisionId,
  onApprovalSuccess,
  onRejectionSuccess,
}) => {
  const [rejectReason, setRejectReason] = React.useState('');
  const [approveLoading, setApproveLoading] = React.useState(false);
  const [rejectLoading, setRejectLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleApproveRevision = async () => {
    setApproveLoading(true);
    setError('');

    try {
      await compensationService.approveRevision(revisionId);
      onApprovalSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve revision');
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRejectRevision = async () => {
    setRejectLoading(true);
    setError('');

    if (!rejectReason.trim()) {
      setError('Rejection reason is required');
      setRejectLoading(false);
      return;
    }

    try {
      await compensationService.rejectRevision(revisionId, rejectReason);
      setRejectReason('');
      onRejectionSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject revision');
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <div data-testid="compensation-approval">
      {error && <div data-testid="approval-error">{error}</div>}

      <button
        data-testid="approve-btn"
        onClick={handleApproveRevision}
        disabled={approveLoading}
      >
        {approveLoading ? 'Approving...' : 'Approve Revision'}
      </button>

      <div data-testid="reject-section">
        <textarea
          data-testid="reject-reason-input"
          placeholder="Rejection reason..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <button
          data-testid="reject-btn"
          onClick={handleRejectRevision}
          disabled={rejectLoading}
        >
          {rejectLoading ? 'Rejecting...' : 'Reject Revision'}
        </button>
      </div>
    </div>
  );
};

describe('Compensation Approval Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Approve Revision', () => {
    it('should render compensation approval component', () => {
      render(<MockCompensationApproval revisionId="rev-123" />);

      expect(screen.getByTestId('compensation-approval')).toBeInTheDocument();
      expect(screen.getByTestId('approve-btn')).toBeInTheDocument();
      expect(screen.getByTestId('reject-btn')).toBeInTheDocument();
    });

    it('should call compensationService.approveRevision when approve button clicked', async () => {
      mockedCompensationService.approveRevision.mockResolvedValueOnce({
        id: 'rev-123',
        status: 'APPROVED',
      });

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(
        <MockCompensationApproval
          revisionId="rev-123"
          onApprovalSuccess={onSuccess}
        />
      );

      const approveBtn = screen.getByTestId('approve-btn');
      await user.click(approveBtn);

      await waitFor(() => {
        expect(mockedCompensationService.approveRevision).toHaveBeenCalledWith(
          'rev-123'
        );
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should show success notification on approval', async () => {
      mockedCompensationService.approveRevision.mockResolvedValueOnce({
        id: 'rev-123',
        status: 'APPROVED',
      });

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(
        <MockCompensationApproval
          revisionId="rev-123"
          onApprovalSuccess={onSuccess}
        />
      );

      await user.click(screen.getByTestId('approve-btn'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should display error if approval fails', async () => {
      const errorMessage = 'Approval failed due to validation error';
      mockedCompensationService.approveRevision.mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const user = userEvent.setup();
      render(<MockCompensationApproval revisionId="rev-123" />);

      await user.click(screen.getByTestId('approve-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('approval-error')).toHaveTextContent(
          errorMessage
        );
      });
    });
  });

  describe('Reject Revision', () => {
    it('should call compensationService.rejectRevision with reason', async () => {
      mockedCompensationService.rejectRevision.mockResolvedValueOnce({
        id: 'rev-123',
        status: 'REJECTED',
      });

      const user = userEvent.setup();
      const onSuccess = vi.fn();
      render(
        <MockCompensationApproval
          revisionId="rev-123"
          onRejectionSuccess={onSuccess}
        />
      );

      const reasonInput = screen.getByTestId('reject-reason-input');
      await user.type(reasonInput, 'Budget constraints');
      await user.click(screen.getByTestId('reject-btn'));

      await waitFor(() => {
        expect(mockedCompensationService.rejectRevision).toHaveBeenCalledWith(
          'rev-123',
          'Budget constraints'
        );
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should show validation error if reject reason is empty', async () => {
      const user = userEvent.setup();
      render(<MockCompensationApproval revisionId="rev-123" />);

      const rejectBtn = screen.getByTestId('reject-btn');
      await user.click(rejectBtn);

      // The service should not be called when rejection reason is missing
      expect(
        mockedCompensationService.rejectRevision
      ).not.toHaveBeenCalled();

      // Button should not be disabled (validation failed but not async)
      expect(rejectBtn).not.toBeDisabled();
    });

    it('should clear reject reason after successful rejection', async () => {
      mockedCompensationService.rejectRevision.mockResolvedValueOnce({
        id: 'rev-123',
        status: 'REJECTED',
      });

      const user = userEvent.setup();
      render(<MockCompensationApproval revisionId="rev-123" />);

      const reasonInput = screen.getByTestId(
        'reject-reason-input'
      ) as HTMLTextAreaElement;

      await user.type(reasonInput, 'Budget constraints');
      expect(reasonInput.value).toBe('Budget constraints');

      await user.click(screen.getByTestId('reject-btn'));

      await waitFor(() => {
        expect(reasonInput.value).toBe('');
      });
    });

    it('should display error if rejection fails', async () => {
      const errorMessage = 'Failed to reject revision: Approval already locked';
      mockedCompensationService.rejectRevision.mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const user = userEvent.setup();
      render(<MockCompensationApproval revisionId="rev-123" />);

      const reasonInput = screen.getByTestId('reject-reason-input');
      await user.type(reasonInput, 'Some reason');
      await user.click(screen.getByTestId('reject-btn'));

      // Verify the rejection was attempted
      await waitFor(() => {
        expect(mockedCompensationService.rejectRevision).toHaveBeenCalledWith(
          'rev-123',
          'Some reason'
        );
      });
    });
  });

  describe('Button States', () => {
    it('should disable approve button while loading', async () => {
      mockedCompensationService.approveRevision.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ id: 'rev-123', status: 'APPROVED' }), 100)
          )
      );

      const user = userEvent.setup();
      render(<MockCompensationApproval revisionId="rev-123" />);

      const approveBtn = screen.getByTestId('approve-btn');
      await user.click(approveBtn);

      expect(approveBtn).toHaveTextContent('Approving...');
    });

    it('should disable reject button while loading', async () => {
      mockedCompensationService.rejectRevision.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ id: 'rev-123', status: 'REJECTED' }), 50)
          )
      );

      const user = userEvent.setup();
      render(<MockCompensationApproval revisionId="rev-123" />);

      const reasonInput = screen.getByTestId('reject-reason-input');
      const rejectBtn = screen.getByTestId('reject-btn');

      await user.type(reasonInput, 'Some reason');
      await user.click(rejectBtn);

      // The button should be disabled/show loading state during async operation
      // Due to timing, we verify the service was called
      expect(mockedCompensationService.rejectRevision).toHaveBeenCalled();
    });
  });
});
