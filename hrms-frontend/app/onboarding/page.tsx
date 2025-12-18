
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users,
    UserPlus,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreVertical,
    Search,
    Filter,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { onboardingService } from '@/lib/services/onboarding.service';
import { OnboardingProcess } from '@/lib/types/onboarding';
import { Skeleton } from '@/components/ui/Skeleton';

export default function OnboardingPage() {
    const router = useRouter();
    const { user, hasHydrated } = useAuth();
    const [loading, setLoading] = useState(true);
    const [processes, setProcesses] = useState<OnboardingProcess[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    useEffect(() => {
        if (hasHydrated) {
            loadProcesses();
        }
    }, [hasHydrated]);

    const loadProcesses = async () => {
        try {
            setLoading(true);
            const data = await onboardingService.getAllProcesses();
            setProcesses(data.content);
        } catch (error) {
            console.error('Failed to load onboarding processes:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'NOT_STARTED': return 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300';
            case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-surface-100 text-surface-800';
        }
    };

    const filteredProcesses = processes.filter(proc => {
        const matchesSearch = proc.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            proc.employeeId.includes(searchQuery);
        const matchesStatus = statusFilter === 'ALL' || proc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <AppLayout activeMenuItem="recruitment" breadcrumbs={[{ label: 'Onboarding', href: '/onboarding' }]}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Onboarding</h1>
                        <p className="text-sm text-surface-500 mt-1">Manage new joiners and their onboarding progress</p>
                    </div>
                    <Button
                        variant="primary"
                        leftIcon={<UserPlus className="h-4 w-4" />}
                        onClick={() => router.push('/onboarding/new')}
                    >
                        Initiate Onboarding
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-surface-500">Active Onboarding</p>
                                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                                    {processes.filter(p => p.status === 'IN_PROGRESS').length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-surface-500">Starting This Week</p>
                                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                                    {/* Mock logic for now */}
                                    {processes.filter(p => p.status === 'NOT_STARTED').length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-surface-500">Completed (Month)</p>
                                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                                    {processes.filter(p => p.status === 'COMPLETED').length}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-surface-500">Avg. Duration</p>
                                <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">14 Days</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and List */}
                <Card className="overflow-hidden">
                    <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                            <Input
                                placeholder="Search by candidate or employee ID..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter className="h-4 w-4 text-surface-500" />
                            <select
                                className="bg-transparent border-none text-sm font-medium text-surface-600 dark:text-surface-300 focus:ring-0 cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All Status</option>
                                <option value="NOT_STARTED">Not Started</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="divide-y divide-surface-200 dark:divide-surface-700">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-5 w-24" />
                                    </div>
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            ))
                        ) : filteredProcesses.length === 0 ? (
                            <div className="p-12 text-center text-surface-500">
                                <p>No onboarding processes found</p>
                            </div>
                        ) : (
                            filteredProcesses.map((process) => (
                                <div
                                    key={process.id}
                                    className="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer group"
                                    onClick={() => router.push(`/onboarding/${process.id}`)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 font-medium text-lg">
                                                {process.employeeName?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-surface-900 dark:text-surface-50 group-hover:text-primary-600 transition-colors">
                                                    {process.employeeName || `Employee ${process.employeeId.substring(0, 8)}`}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-surface-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        Start: {new Date(process.startDate).toLocaleDateString()}
                                                    </span>
                                                    {process.assignedBuddyName && (
                                                        <span className="flex items-center gap-1">
                                                            <UserPlus className="h-3.5 w-3.5" />
                                                            Buddy: {process.assignedBuddyName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <span className="text-xs font-medium text-surface-500 block mb-1">Progress</span>
                                                <div className="w-32 h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary-500 rounded-full"
                                                        style={{ width: `${process.completionPercentage}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(process.status)}`}>
                                                {process.status.replace('_', ' ')}
                                            </span>

                                            <ChevronRight className="h-5 w-5 text-surface-400 group-hover:text-surface-600" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
}
