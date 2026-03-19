
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Calendar, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmployeeSearchAutocomplete } from '@/components/ui/EmployeeSearchAutocomplete';
import { onboardingService } from '@/lib/services/onboarding.service';
import { OnboardingProcessRequest } from '@/lib/types/onboarding';
export default function NewOnboardingPage() {
    const router = useRouter();
    const { hasHydrated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
    const [selectedBuddy, setSelectedBuddy] = useState<{ id: string; name: string } | null>(null);
    const [formData, setFormData] = useState({
        startDate: '',
        expectedCompletionDate: '',
        notes: ''
    });
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !formData.startDate) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const payload: OnboardingProcessRequest = {
                employeeId: selectedEmployee.id,
                processType: 'ONBOARDING',
                startDate: formData.startDate,
                expectedCompletionDate: formData.expectedCompletionDate || undefined,
                assignedBuddyId: selectedBuddy?.id,
                notes: formData.notes
            };

            await onboardingService.createProcess(payload);
            router.push('/onboarding');
        } catch (err: any) {
            console.error('Failed to create onboarding process:', err);
            setError(err.response?.data?.message || 'Failed to initiate onboarding');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout
            activeMenuItem="recruitment"
            breadcrumbs={[
                { label: 'Onboarding', href: '/onboarding' },
                { label: 'New Onboarding', href: '/onboarding/new' }
            ]}
        >
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Initiate Onboarding</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Onboarding Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                        Select Employee <span className="text-red-500">*</span>
                                    </label>
                                    <EmployeeSearchAutocomplete
                                        placeholder="Search for new joiner..."
                                        onChange={(emp) => setSelectedEmployee(emp)}
                                        value={selectedEmployee}
                                    />
                                    <p className="text-xs text-surface-500 mt-1">
                                        Search by name or employee ID. Employee must be created in the system first.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                            Start Date <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                            Expected Completion
                                        </label>
                                        <Input
                                            type="date"
                                            value={formData.expectedCompletionDate}
                                            onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                        Assign Buddy
                                    </label>
                                    <EmployeeSearchAutocomplete
                                        placeholder="Search for a buddy..."
                                        onChange={(emp) => setSelectedBuddy(emp)}
                                        value={selectedBuddy}
                                    />
                                    <p className="text-xs text-surface-500 mt-1">
                                        Optional. Assign a mentor or buddy to help the new joiner.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-50 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                                        rows={4}
                                        placeholder="Add any specific instructions or notes..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-700">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={loading}
                                    leftIcon={<CheckCircle className="h-4 w-4" />}
                                >
                                    Initiate Process
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
