'use client';

import { useState } from 'react';
import { Users, Plus, X, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FeedbackReviewer, NominatePeersRequest } from '@/lib/types/performance-360';
import { useEmployeeSearch } from '@/lib/hooks/queries/useEmployees';
import { Employee } from '@/lib/types/employee';

interface FeedbackRequestFormProps {
  cycleId: string;
  cycleName: string;
  subjectEmployeeId: string;
  subjectEmployeeName: string;
  minPeers: number;
  maxPeers: number;
  includeManager: boolean;
  includePeers: boolean;
  includeDirectReports: boolean;
  onSubmit: (request: NominatePeersRequest) => Promise<void>;
  onCancel: () => void;
}

export default function FeedbackRequestForm({
  cycleId,
  cycleName,
  subjectEmployeeId,
  subjectEmployeeName,
  minPeers,
  maxPeers,
  includeManager,
  includePeers,
  includeDirectReports,
  onSubmit,
  onCancel,
}: FeedbackRequestFormProps) {
  const [selectedPeers, setSelectedPeers] = useState<FeedbackReviewer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => setDebouncedQuery(value), 300);
    return () => clearTimeout(timer);
  };

  const { data: searchData, isFetching: isSearching } = useEmployeeSearch(
    debouncedQuery,
    0,
    10,
    debouncedQuery.length >= 2
  );

  const searchResults = searchData?.content ?? [];

  const addPeer = (employee: Employee) => {
    if (selectedPeers.length >= maxPeers) {
      setError(`Maximum ${maxPeers} peer reviewers allowed`);
      return;
    }

    if (selectedPeers.some((p) => p.employeeId === employee.id)) {
      setError('This reviewer is already selected');
      return;
    }

    const reviewer: FeedbackReviewer = {
      id: employee.id,
      employeeId: employee.id,
      employeeName: employee.fullName,
      email: employee.workEmail,
      reviewerType: 'PEER',
      department: employee.departmentName,
      designation: employee.designation,
    };

    setSelectedPeers([...selectedPeers, reviewer]);
    setSearchQuery('');
    setDebouncedQuery('');
    setError(null);
  };

  const removePeer = (employeeId: string) => {
    setSelectedPeers(selectedPeers.filter((p) => p.employeeId !== employeeId));
    setError(null);
  };

  const handleSubmit = async () => {
    if (selectedPeers.length < minPeers) {
      setError(`Please select at least ${minPeers} peer reviewers`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const request: NominatePeersRequest = {
        cycleId,
        subjectEmployeeId,
        peerIds: selectedPeers.map((p) => p.employeeId),
      };

      await onSubmit(request);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err) || 'Failed to submit feedback nominations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedPeers.length >= minPeers && selectedPeers.length <= maxPeers;

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4">
      <div className="px-6 py-4 border-b border-[var(--border-main)]">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Request 360 Feedback</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">{cycleName}</p>
      </div>

      <div className="px-6 py-4">
        {/* Subject Employee */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Feedback Subject</p>
              <p className="text-base font-semibold text-[var(--text-primary)]">{subjectEmployeeName}</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">Instructions</h3>
          <div className="space-y-2 text-sm text-[var(--text-secondary)]">
            {includePeers && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>
                  Select {minPeers} to {maxPeers} peer reviewers who work closely with the subject
                </span>
              </div>
            )}
            {includeManager && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Manager feedback will be requested automatically</span>
              </div>
            )}
            {includeDirectReports && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Direct report feedback will be requested automatically</span>
              </div>
            )}
          </div>
        </div>

        {/* Search for Peers */}
        {includePeers && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Add Peer Reviewers ({selectedPeers.length}/{maxPeers})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search employees by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-[var(--border-strong)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={selectedPeers.length >= maxPeers}
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-[var(--border-main)] rounded-lg max-h-48 overflow-y-auto">
                {searchResults.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => addPeer(employee)}
                    className="w-full px-4 py-3 text-left hover:bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] last:border-b-0"
                    disabled={selectedPeers.some((p) => p.employeeId === employee.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{employee.fullName}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {employee.designation} • {employee.departmentName}
                        </p>
                      </div>
                      {selectedPeers.some((p) => p.employeeId === employee.id) && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="mt-2 text-center py-4 text-sm text-[var(--text-muted)]">Searching...</div>
            )}
          </div>
        )}

        {/* Selected Peers */}
        {selectedPeers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Selected Reviewers</h3>
            <div className="space-y-2">
              {selectedPeers.map((peer) => (
                <div
                  key={peer.employeeId}
                  className="flex items-center justify-between p-4 bg-[var(--bg-surface)] rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-700">
                        {peer.employeeName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{peer.employeeName}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {peer.designation} • {peer.department}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePeer(peer.employeeId)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="h-5 w-5 text-[var(--text-muted)]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Validation Status */}
        {includePeers && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              {canSubmit ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-700">
                    Ready to submit ({selectedPeers.length} peers selected)
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Select at least {minPeers} peer reviewer(s) to continue
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-[var(--border-main)] flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          isLoading={isSubmitting}
        >
          <Plus className="h-5 w-5 mr-2" />
          Submit Nominations
        </Button>
      </div>
    </div>
  );
}
