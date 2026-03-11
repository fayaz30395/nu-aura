/**
 * Integration Tests for Approval Workflow Flow
 * Tests approval inbox rendering, approval/rejection actions, and status updates
 * Uses mocked workflow service for reliable testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/lib/test-utils';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock types for approval items
interface ApprovalItem {
  id: string;
  entityType: string;
  entityId: string;
  module: string;
  title: string;
  referenceNumber: string;
  requesterName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentStepName: string;
  submittedAt: string;
}

// Mock the workflow service
vi.mock('@/lib/services/workflow.service', () => ({
  workflowService: {
    processApprovalAction: vi.fn(),
    getApprovalInbox: vi.fn(),
    delegateApproval: vi.fn(),
  },
}));

import { workflowService } from '@/lib/services/workflow.service';

const mockedWorkflowService = workflowService as any;

// Mock Approval Inbox Component
interface ApprovalInboxProps {
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}

const MockApprovalInbox: React.FC<ApprovalInboxProps> = ({ onApprove, onReject }) => {
  const [items, setItems] = React.useState<ApprovalItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      try {
        const result = await workflowService.getApprovalInbox();
        setItems(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load approvals');
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, []);

  if (loading) return <div data-testid="loading">Loading approvals...</div>;
  if (error) return <div data-testid="error">{error}</div>;

  return (
    <div data-testid="approval-inbox">
      <h2>Approval Inbox ({items.filter((i) => i.status === 'PENDING').length})</h2>

      {items.length === 0 ? (
        <p data-testid="empty-inbox">No pending approvals</p>
      ) : (
        <div data-testid="approval-items">
          {items.map((item) => (
            <div key={item.id} data-testid={`approval-item-${item.id}`} className={`approval-item approval-${item.status}`}>
              <div className="item-header">
                <h3>{item.title}</h3>
                <span data-testid={`status-${item.id}`} className={`status status-${item.status.toLowerCase()}`}>
                  {item.status}
                </span>
              </div>

              <div className="item-details">
                <p>
                  <strong>Requested by:</strong> {item.requesterName}
                </p>
                <p>
                  <strong>Reference:</strong> {item.referenceNumber}
                </p>
                <p>
                  <strong>Module:</strong> {item.module}
                </p>
                <p>
                  <strong>Current Step:</strong> {item.currentStepName}
                </p>
                <p>
                  <strong>Submitted:</strong> {item.submittedAt}
                </p>
              </div>

              {item.status === 'PENDING' && (
                <div className="item-actions">
                  <button
                    data-testid={`approve-btn-${item.id}`}
                    onClick={() => {
                      onApprove?.(item.id);
                      setItems(items.map((i) => (i.id === item.id ? { ...i, status: 'APPROVED' } : i)));
                    }}
                  >
                    Approve
                  </button>
                  <button
                    data-testid={`reject-btn-${item.id}`}
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    Reject
                  </button>
                </div>
              )}

              {expandedId === item.id && item.status === 'PENDING' && (
                <RejectForm
                  itemId={item.id}
                  onReject={(reason) => {
                    onReject?.(item.id, reason);
                    setItems(items.map((i) => (i.id === item.id ? { ...i, status: 'REJECTED' } : i)));
                    setExpandedId(null);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Mock Reject Form Component
interface RejectFormProps {
  itemId: string;
  onReject: (reason: string) => void;
}

const RejectForm: React.FC<RejectFormProps> = ({ itemId, onReject }) => {
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    try {
      await workflowService.processApprovalAction(itemId, {
        action: 'REJECT',
        comments: reason,
      });
      onReject(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleReject} data-testid={`reject-form-${itemId}`}>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Please provide rejection reason..."
        data-testid={`reject-reason-${itemId}`}
        required
        minLength={10}
      />
      <button type="submit" data-testid={`submit-reject-${itemId}`} disabled={loading || !reason.trim()}>
        {loading ? 'Submitting...' : 'Submit Rejection'}
      </button>
    </form>
  );
};

// Mock approval data
const mockApprovals: ApprovalItem[] = [
  {
    id: 'appr-001',
    entityType: 'LEAVE_REQUEST',
    entityId: 'lr-001',
    module: 'Leave',
    title: 'Leave Request - John Doe',
    referenceNumber: 'LR-2024-001',
    requesterName: 'John Doe',
    status: 'PENDING',
    currentStepName: 'Manager Approval',
    submittedAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'appr-002',
    entityType: 'EXPENSE_CLAIM',
    entityId: 'exp-002',
    module: 'Expense',
    title: 'Expense Claim - Jane Smith',
    referenceNumber: 'EXP-2024-002',
    requesterName: 'Jane Smith',
    status: 'PENDING',
    currentStepName: 'Finance Approval',
    submittedAt: '2024-02-02T14:30:00Z',
  },
  {
    id: 'appr-003',
    entityType: 'TRAVEL_REQUEST',
    entityId: 'tr-003',
    module: 'Travel',
    title: 'Travel Request - Bob Johnson',
    referenceNumber: 'TR-2024-003',
    requesterName: 'Bob Johnson',
    status: 'APPROVED',
    currentStepName: 'Manager Approval',
    submittedAt: '2024-01-31T09:15:00Z',
  },
];

describe('Approval Workflow Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Approval Inbox Rendering', () => {
    it('should render approval inbox with loading state', () => {
      mockedWorkflowService.getApprovalInbox.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve(mockApprovals),
              100
            )
          )
      );

      render(<MockApprovalInbox />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should display all pending approvals', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce(mockApprovals);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('approval-items')).toBeInTheDocument();
      });

      mockApprovals.forEach((approval) => {
        expect(screen.getByTestId(`approval-item-${approval.id}`)).toBeInTheDocument();
      });
    });

    it('should show pending count in inbox header', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce(mockApprovals);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        // 2 pending items in mockApprovals
        expect(screen.getByText('Approval Inbox (2)')).toBeInTheDocument();
      });
    });

    it('should display approval item details', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByText(mockApprovals[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockApprovals[0].requesterName)).toBeInTheDocument();
        expect(screen.getByText(mockApprovals[0].referenceNumber)).toBeInTheDocument();
      });
    });

    it('should show empty inbox when no approvals', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([]);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-inbox')).toBeInTheDocument();
      });
    });

    it('should handle error when fetching approvals', async () => {
      const errorMessage = 'Failed to fetch approvals';
      mockedWorkflowService.getApprovalInbox.mockRejectedValueOnce(new Error(errorMessage));

      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(errorMessage);
      });
    });
  });

  describe('Approval Status Display', () => {
    it('should display approval status correctly', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce(mockApprovals);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`status-${mockApprovals[0].id}`)).toHaveTextContent('PENDING');
        expect(screen.getByTestId(`status-${mockApprovals[2].id}`)).toHaveTextContent('APPROVED');
      });
    });

    it('should apply correct CSS class for status', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce(mockApprovals);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        const approvedItem = screen.getByTestId(`approval-item-${mockApprovals[2].id}`);
        expect(approvedItem).toHaveClass('approval-APPROVED');
      });
    });
  });

  describe('Approve Action', () => {
    it('should show approve button for pending items', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`approve-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });
    });

    it('should call approve action when button clicked', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      const onApprove = vi.fn();
      const user = userEvent.setup();
      render(<MockApprovalInbox onApprove={onApprove} />);

      await waitFor(() => {
        expect(screen.getByTestId(`approve-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`approve-btn-${mockApprovals[0].id}`));

      expect(onApprove).toHaveBeenCalledWith(mockApprovals[0].id);
    });

    it('should update approval status to APPROVED', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      const user = userEvent.setup();
      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`approve-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`approve-btn-${mockApprovals[0].id}`));

      await waitFor(() => {
        expect(screen.getByTestId(`status-${mockApprovals[0].id}`)).toHaveTextContent('APPROVED');
      });
    });

    it('should hide approve button after approval', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      const user = userEvent.setup();
      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`approve-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`approve-btn-${mockApprovals[0].id}`));

      await waitFor(() => {
        expect(screen.queryByTestId(`approve-btn-${mockApprovals[0].id}`)).not.toBeInTheDocument();
      });
    });
  });

  describe('Reject Action', () => {
    it('should show reject button for pending items', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });
    });

    it('should open reject form when reject button clicked', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      const user = userEvent.setup();
      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`));

      await waitFor(() => {
        expect(screen.getByTestId(`reject-form-${mockApprovals[0].id}`)).toBeInTheDocument();
      });
    });

    it('should require rejection reason', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      const user = userEvent.setup();
      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`));

      await waitFor(() => {
        const submitButton = screen.getByTestId(`submit-reject-${mockApprovals[0].id}`);
        expect(submitButton).toBeDisabled();
      });
    });

    it('should enable submit button when reason provided', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);

      const user = userEvent.setup();
      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`));

      await waitFor(() => {
        expect(screen.getByTestId(`reject-reason-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      const reasonInput = screen.getByTestId(`reject-reason-${mockApprovals[0].id}`);
      await user.type(reasonInput, 'Budget constraints prevent approval');

      const submitButton = screen.getByTestId(`submit-reject-${mockApprovals[0].id}`);
      expect(submitButton).not.toBeDisabled();
    });

    it('should submit rejection with reason', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);
      mockedWorkflowService.processApprovalAction.mockResolvedValueOnce({
        ...mockApprovals[0],
        status: 'REJECTED',
      });

      const onReject = vi.fn();
      const user = userEvent.setup();
      render(<MockApprovalInbox onReject={onReject} />);

      await waitFor(() => {
        expect(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`));

      await waitFor(() => {
        expect(screen.getByTestId(`reject-reason-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      const reasonInput = screen.getByTestId(`reject-reason-${mockApprovals[0].id}`);
      await user.type(reasonInput, 'Budget constraints prevent approval');
      await user.click(screen.getByTestId(`submit-reject-${mockApprovals[0].id}`));

      await waitFor(() => {
        expect(mockedWorkflowService.processApprovalAction).toHaveBeenCalledWith(
          mockApprovals[0].id,
          {
            action: 'REJECT',
            comments: 'Budget constraints prevent approval',
          }
        );
      });

      expect(onReject).toHaveBeenCalledWith(mockApprovals[0].id, 'Budget constraints prevent approval');
    });

    it('should update approval status to REJECTED', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[0]]);
      mockedWorkflowService.processApprovalAction.mockResolvedValueOnce({
        ...mockApprovals[0],
        status: 'REJECTED',
      });

      const user = userEvent.setup();
      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      await user.click(screen.getByTestId(`reject-btn-${mockApprovals[0].id}`));

      await waitFor(() => {
        expect(screen.getByTestId(`reject-reason-${mockApprovals[0].id}`)).toBeInTheDocument();
      });

      const reasonInput = screen.getByTestId(`reject-reason-${mockApprovals[0].id}`);
      await user.type(reasonInput, 'Budget constraints prevent approval');
      await user.click(screen.getByTestId(`submit-reject-${mockApprovals[0].id}`));

      await waitFor(() => {
        expect(screen.getByTestId(`status-${mockApprovals[0].id}`)).toHaveTextContent('REJECTED');
      });
    });
  });

  describe('Approval Item Visibility', () => {
    it('should not show action buttons for approved items', async () => {
      mockedWorkflowService.getApprovalInbox.mockResolvedValueOnce([mockApprovals[2]]);

      render(<MockApprovalInbox />);

      await waitFor(() => {
        expect(screen.getByTestId(`approval-item-${mockApprovals[2].id}`)).toBeInTheDocument();
      });

      expect(screen.queryByTestId(`approve-btn-${mockApprovals[2].id}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`reject-btn-${mockApprovals[2].id}`)).not.toBeInTheDocument();
    });
  });
});
