'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { Plus, DollarSign, FileText, Calendar, CheckCircle, XCircle, Clock, Receipt } from 'lucide-react';

interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  claimDate: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  receiptUrl: string;
  submittedAt: string;
  approvedBy: string;
  approverName: string;
  approvedAt: string;
  rejectedBy: string;
  rejectorName: string;
  rejectedAt: string;
  rejectionReason: string;
  paymentDate: string;
  paymentReference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const EMPLOYEE_ID = '550e8400-e29b-41d4-a716-446655440001'; // Replace with actual logged-in employee ID
const APPROVER_ID = '550e8400-e29b-41d4-a716-446655440002'; // Replace with actual approver ID

export default function ExpenseClaims() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-claims' | 'pending' | 'all'>('my-claims');

  const [formData, setFormData] = useState({
    claimDate: new Date().toISOString().split('T')[0],
    category: 'TRAVEL',
    description: '',
    amount: '',
    currency: 'USD',
    receiptUrl: '',
    notes: ''
  });

  useEffect(() => {
    loadClaims();
  }, [activeTab]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      let url = '';
      if (activeTab === 'my-claims') {
        url = `http://localhost:8080/api/v1/expenses/my-claims?employeeId=${EMPLOYEE_ID}&size=50`;
      } else if (activeTab === 'pending') {
        url = 'http://localhost:8080/api/v1/expenses/pending?size=50';
      } else {
        url = 'http://localhost:8080/api/v1/expenses?size=50';
      }

      const response = await fetch(url, {
        headers: {
          'X-Tenant-ID': '550e8400-e29b-41d4-a716-446655440000'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClaims(data.content || []);
      }
    } catch (error) {
      console.error('Error loading claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:8080/api/v1/expenses?employeeId=${EMPLOYEE_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': '550e8400-e29b-41d4-a716-446655440000'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
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
        alert('Expense claim created successfully!');
      } else {
        alert('Failed to create expense claim');
      }
    } catch (error) {
      console.error('Error creating claim:', error);
      alert('Error creating expense claim');
    }
  };

  const handleSubmitClaim = async (claimId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/expenses/${claimId}/submit`, {
        method: 'POST',
        headers: {
          'X-Tenant-ID': '550e8400-e29b-41d4-a716-446655440000'
        }
      });

      if (response.ok) {
        loadClaims();
        alert('Expense claim submitted successfully!');
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
    }
  };

  const handleApprove = async (claimId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/expenses/${claimId}/approve?approverId=${APPROVER_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': '550e8400-e29b-41d4-a716-446655440000'
        },
        body: JSON.stringify({ action: 'APPROVE' })
      });

      if (response.ok) {
        loadClaims();
        alert('Expense claim approved successfully!');
      }
    } catch (error) {
      console.error('Error approving claim:', error);
    }
  };

  const handleReject = async (claimId: string) => {
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;

    try {
      const response = await fetch(`http://localhost:8080/api/v1/expenses/${claimId}/approve?approverId=${APPROVER_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': '550e8400-e29b-41d4-a716-446655440000'
        },
        body: JSON.stringify({ action: 'REJECT', rejectionReason: reason })
      });

      if (response.ok) {
        loadClaims();
        alert('Expense claim rejected');
      }
    } catch (error) {
      console.error('Error rejecting claim:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      PAID: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <AppLayout activeMenuItem="expenses">
      <div className="max-w-7xl mx-auto">
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
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
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
                  type="text"
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
                      <button
                        onClick={() => handleSubmitClaim(claim.id)}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm transition-colors"
                      >
                        Submit for Approval
                      </button>
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
