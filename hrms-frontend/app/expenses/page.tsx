'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout';
import { Plus, DollarSign, FileText, CheckCircle, XCircle, Receipt, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { expenseService } from '@/lib/services/expense.service';
import { ExpenseClaim, ExpenseCategory, CurrencyCode, CreateExpenseClaimRequest } from '@/lib/types/expense';

type TabType = 'my-claims' | 'pending' | 'all';

export default function ExpenseClaims() {
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('my-claims');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    claimDate: string;
    category: ExpenseCategory;
    description: string;
    amount: string;
    currency: CurrencyCode;
    receiptUrl: string;
    notes: string;
  }>({
    claimDate: new Date().toISOString().split('T')[0],
    category: 'TRAVEL',
    description: '',
    amount: '',
    currency: 'USD',
    receiptUrl: '',
    notes: ''
  });

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setError(null);
    } else {
      setError(message);
      setSuccess(null);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
  };

  const loadClaims = useCallback(async () => {
    if (!user?.employeeId) return;

    setLoading(true);
    setError(null);
    try {
      let data;
      if (activeTab === 'my-claims') {
        data = await expenseService.getMyClaims(user.employeeId);
      } else if (activeTab === 'pending') {
        data = await expenseService.getPendingClaims();
      } else {
        data = await expenseService.getAllClaims();
      }
      setClaims(data.content || []);
    } catch (err) {
      console.error('Error loading claims:', err);
      showNotification('Failed to load expense claims', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.employeeId]);

  useEffect(() => {
    if (hasHydrated && isAuthenticated && user?.employeeId) {
      loadClaims();
    }
  }, [hasHydrated, isAuthenticated, user?.employeeId, loadClaims]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId) {
      showNotification('You must be logged in to create an expense claim', 'error');
      return;
    }

    try {
      const request: CreateExpenseClaimRequest = {
        claimDate: formData.claimDate,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        receiptUrl: formData.receiptUrl || undefined,
        notes: formData.notes || undefined,
      };

      await expenseService.createClaim(user.employeeId, request);

      setFormData({
        claimDate: new Date().toISOString().split('T')[0],
        category: 'TRAVEL',
        description: '',
        amount: '',
        currency: 'USD',
        receiptUrl: '',
        notes: ''
      });
      setShowForm(false);
      loadClaims();
      showNotification('Expense claim created successfully!', 'success');
    } catch (err) {
      console.error('Error creating claim:', err);
      showNotification('Failed to create expense claim', 'error');
    }
  };

  const handleSubmitClaim = async (claimId: string) => {
    try {
      await expenseService.submitClaim(claimId);
      loadClaims();
      showNotification('Expense claim submitted successfully!', 'success');
    } catch (err) {
      console.error('Error submitting claim:', err);
      showNotification('Failed to submit expense claim', 'error');
    }
  };

  const handleApprove = async (claimId: string) => {
    if (!user?.employeeId) return;

    try {
      await expenseService.processApproval(claimId, user.employeeId, { action: 'APPROVE' });
      loadClaims();
      showNotification('Expense claim approved successfully!', 'success');
    } catch (err) {
      console.error('Error approving claim:', err);
      showNotification('Failed to approve expense claim', 'error');
    }
  };

  const handleReject = async (claimId: string) => {
    if (!user?.employeeId) return;

    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    try {
      await expenseService.processApproval(claimId, user.employeeId, {
        action: 'REJECT',
        rejectionReason: reason
      });
      loadClaims();
      showNotification('Expense claim rejected', 'success');
    } catch (err) {
      console.error('Error rejecting claim:', err);
      showNotification('Failed to reject expense claim', 'error');
    }
  };

  const handleDelete = async (claimId: string) => {
    if (!confirm('Are you sure you want to delete this claim?')) return;

    try {
      await expenseService.deleteClaim(claimId);
      loadClaims();
      showNotification('Expense claim deleted', 'success');
    } catch (err) {
      console.error('Error deleting claim:', err);
      showNotification('Failed to delete expense claim', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      PAID: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
    };
    return styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  // Show loading state while hydrating
  if (!hasHydrated) {
    return (
      <AppLayout activeMenuItem="expenses">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeMenuItem="expenses">
      <div className="max-w-7xl mx-auto">
        {/* Notifications */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-300">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
              <DollarSign className="w-8 h-8" />
              Expense Claims
            </h1>
            <p className="text-surface-600 dark:text-surface-400 mt-2">Submit and manage your expense claims</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Claim
          </button>
        </div>

        {/* New Claim Form */}
        {showForm && (
          <div className="bg-surface-50 dark:bg-surface-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Expense Claim</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Claim Date</label>
                <input
                  type="date"
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={formData.claimDate}
                  onChange={(e) => setFormData({ ...formData, claimDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Category</label>
                <select
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                  required
                >
                  <option value="TRAVEL">Travel</option>
                  <option value="ACCOMMODATION">Accommodation</option>
                  <option value="MEALS">Meals</option>
                  <option value="TRANSPORTATION">Transportation</option>
                  <option value="OFFICE_SUPPLIES">Office Supplies</option>
                  <option value="EQUIPMENT">Equipment</option>
                  <option value="TRAINING">Training</option>
                  <option value="COMMUNICATION">Communication</option>
                  <option value="ENTERTAINMENT">Entertainment</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Description</label>
                <textarea
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Describe your expense..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Currency</label>
                <select
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value as CurrencyCode })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Receipt URL (Optional)</label>
                <input
                  type="url"
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  value={formData.receiptUrl}
                  onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Notes (Optional)</label>
                <textarea
                  className="w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border border-surface-300 dark:border-surface-600 rounded-lg p-2"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Create Claim
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-surface-50 dark:bg-surface-800 rounded-t-lg shadow-sm">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('my-claims')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'my-claims'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
              }`}
            >
              My Claims
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
              }`}
            >
              Pending Approval
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
                  : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
              }`}
            >
              All Claims
            </button>
          </div>
        </div>

        {/* Claims List */}
        <div className="bg-surface-50 dark:bg-surface-800 rounded-b-lg shadow-sm p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12 text-surface-600 dark:text-surface-400">
              <FileText className="w-12 h-12 mx-auto mb-4 text-surface-400 dark:text-surface-500" />
              <p>No expense claims found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div key={claim.id} className="border border-surface-200 dark:border-surface-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{claim.claimNumber}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(claim.status)}`}>
                          {claim.status}
                        </span>
                      </div>
                      <p className="text-surface-600 dark:text-surface-400">{claim.description}</p>
                      {claim.employeeName && (
                        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                          By: {claim.employeeName} ({claim.employeeCode})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                        {claim.currency} {claim.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-surface-600 dark:text-surface-400">{claim.category.replace('_', ' ')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-surface-600 dark:text-surface-400">Claim Date:</span>
                      <p className="font-medium">{new Date(claim.claimDate).toLocaleDateString()}</p>
                    </div>
                    {claim.submittedAt && (
                      <div>
                        <span className="text-surface-600 dark:text-surface-400">Submitted:</span>
                        <p className="font-medium">{new Date(claim.submittedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                    {claim.approvedAt && (
                      <div>
                        <span className="text-surface-600 dark:text-surface-400">Approved By:</span>
                        <p className="font-medium">{claim.approverName}</p>
                      </div>
                    )}
                    {claim.rejectionReason && (
                      <div className="col-span-2">
                        <span className="text-surface-600 dark:text-surface-400">Rejection Reason:</span>
                        <p className="font-medium text-red-600">{claim.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    {claim.status === 'DRAFT' && activeTab === 'my-claims' && (
                      <>
                        <button
                          onClick={() => handleSubmitClaim(claim.id)}
                          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm transition-colors"
                        >
                          Submit for Approval
                        </button>
                        <button
                          onClick={() => handleDelete(claim.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}
                    {claim.status === 'SUBMITTED' && activeTab === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(claim.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(claim.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                    {claim.receiptUrl && (
                      <button
                        onClick={() => window.open(claim.receiptUrl, '_blank')}
                        className="px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 text-sm transition-colors flex items-center gap-2"
                      >
                        <Receipt className="w-4 h-4" />
                        View Receipt
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
