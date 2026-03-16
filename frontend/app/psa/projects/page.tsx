'use client';

import { AppLayout } from '@/components/layout';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Loading';
import { useRouter } from 'next/navigation';
import { PSAProject, ProjectStatus } from '@/lib/types/psa';
import { usePsaProjects } from '@/lib/hooks/queries/usePsa';
import { Plus, Briefcase, Clock, DollarSign, PieChart, MoreVertical, AlertCircle } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function PsaProjectsPage() {
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(0);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const { data, isLoading, error } = usePsaProjects();

    const projects = data ?? [];

    const stats = useMemo(() => {
        if (!projects.length) {
            return { active: 0, planned: 0, completed: 0, totalBudget: 0 };
        }
        const active = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
        const planned = projects.filter(p => p.status === ProjectStatus.PLANNED).length;
        const completed = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
        const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
        return { active, planned, completed, totalBudget };
    }, [projects]);

    const statusVariant = (status: ProjectStatus) => {
        switch (status) {
            case ProjectStatus.ACTIVE: return 'success';
            case ProjectStatus.PLANNED: return 'info';
            case ProjectStatus.ON_HOLD: return 'warning';
            case ProjectStatus.COMPLETED: return 'default';
            case ProjectStatus.CANCELLED: return 'danger';
            default: return 'default';
        }
    };

    // Pagination
    const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
    const paginatedProjects = projects.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    const formatCurrency = (amount: number | undefined) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatCompactCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
        }).format(amount);
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="px-4 py-6 md:px-6 lg:px-8">
                    {/* Header */}
                    <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Manage client projects, resources, and billing</p>
                        </div>
                        <Button
                            variant="primary"
                            size="md"
                            leftIcon={<Plus className="h-5 w-5" />}
                            onClick={() => router.push('/psa/projects/new')}
                        >
                            New Project
                        </Button>
                    </div>

                    {/* Stats skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="card-aura p-4 h-32 animate-pulse bg-[var(--bg-surface)]" />
                        ))}
                    </div>

                    {/* Table skeleton */}
                    <SkeletonTable rows={5} columns={7} />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="px-4 py-6 md:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Manage client projects, resources, and billing</p>
                    </div>
                    <Button
                        variant="primary"
                        size="md"
                        leftIcon={<Plus className="h-5 w-5" />}
                        onClick={() => router.push('/psa/projects/new')}
                    >
                        New Project
                    </Button>
                </div>

                {/* Error state */}
                {error && (
                    <Card variant="bordered" padding="md" className="mb-6 border-danger-200 bg-danger-50 dark:border-danger-800 dark:bg-danger-950/30">
                        <CardContent className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-danger-900 dark:text-danger-100">Failed to load projects</p>
                                <p className="text-sm text-danger-700 dark:text-danger-200 mt-1">
                                    Please try refreshing the page or contact support if the problem persists.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stats cards */}
                {projects.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <StatCard
                            icon={<PieChart className="h-5 w-5" />}
                            title="Active Projects"
                            value={stats.active}
                            variant="success"
                            size="compact"
                        />
                        <StatCard
                            icon={<Briefcase className="h-5 w-5" />}
                            title="Pipeline (Planned)"
                            value={stats.planned}
                            variant="blue"
                            size="compact"
                        />
                        <StatCard
                            icon={<DollarSign className="h-5 w-5" />}
                            title="Total Budget"
                            value={formatCompactCurrency(stats.totalBudget)}
                            variant="primary"
                            size="compact"
                        />
                    </div>
                )}

                {/* Table */}
                <Card variant="bordered" padding="none" className="overflow-hidden">
                    {paginatedProjects.length === 0 ? (
                        <CardContent>
                            <EmptyState
                                icon={<Briefcase className="h-8 w-8" />}
                                title="No projects yet"
                                description="Start by creating your first project to begin tracking resources and billing."
                                actionLabel="Create Project"
                                onAction={() => router.push('/psa/projects/new')}
                            />
                        </CardContent>
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-main)' }} className="bg-[var(--bg-surface)]">
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">Project</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">Type</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">Budget</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">Start Date</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">End Date</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[var(--text-primary)]">Status</th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-[var(--text-primary)]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedProjects.map((project) => (
                                            <tr
                                                key={project.id}
                                                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                                className="hover:bg-[var(--bg-surface)] transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-[var(--text-primary)]">{project.projectName}</p>
                                                        <p className="text-xs text-[var(--text-muted)] mt-1">{project.projectCode}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                                    {project.billingType.replace(/_/g, ' ')}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                                    {formatCurrency(project.budget)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                                    {project.startDate || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                                    {project.endDate || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={statusVariant(project.status)} size="md">
                                                        {project.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="relative inline-block">
                                                        <button
                                                            onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                                                            className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                        {openMenuId === project.id && (
                                                            <div
                                                                className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg border border-[var(--border-main)] bg-[var(--bg-card)] z-10"
                                                                style={{ top: '100%' }}
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        router.push(`/psa/projects/${project.id}`);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors first:rounded-t-lg"
                                                                >
                                                                    <Briefcase className="h-4 w-4" />
                                                                    View Dashboard
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        router.push(`/psa/projects/${project.id}/timesheets`);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                                                                >
                                                                    <Clock className="h-4 w-4" />
                                                                    View Timesheets
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        router.push(`/psa/projects/${project.id}/invoices`);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors last:rounded-b-lg"
                                                                >
                                                                    <DollarSign className="h-4 w-4" />
                                                                    View Invoices
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <div className="md:hidden space-y-3 p-4">
                                {paginatedProjects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="card-aura p-4 border border-[var(--border-main)] hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-[var(--text-primary)]">{project.projectName}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">{project.projectCode}</p>
                                            </div>
                                            <div className="relative ml-2">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                                                    className="p-1.5 hover:bg-[var(--bg-surface)] rounded transition-colors text-[var(--text-secondary)]"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                                {openMenuId === project.id && (
                                                    <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg border border-[var(--border-main)] bg-[var(--bg-card)] z-10">
                                                        <button
                                                            onClick={() => {
                                                                router.push(`/psa/projects/${project.id}`);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors first:rounded-t-lg"
                                                        >
                                                            <Briefcase className="h-3.5 w-3.5" />
                                                            Dashboard
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                router.push(`/psa/projects/${project.id}/timesheets`);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
                                                        >
                                                            <Clock className="h-3.5 w-3.5" />
                                                            Timesheets
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                router.push(`/psa/projects/${project.id}/invoices`);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors last:rounded-b-lg"
                                                        >
                                                            <DollarSign className="h-3.5 w-3.5" />
                                                            Invoices
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-muted)]">Type:</span>
                                                <span className="text-[var(--text-primary)] font-medium">{project.billingType.replace(/_/g, ' ')}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-muted)]">Budget:</span>
                                                <span className="text-[var(--text-primary)] font-medium">{formatCurrency(project.budget)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[var(--text-muted)]">Period:</span>
                                                <span className="text-[var(--text-primary)] font-medium text-xs">
                                                    {project.startDate || '-'} to {project.endDate || '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                                            <Badge variant={statusVariant(project.status)} size="md">
                                                {project.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4"
                                    style={{ borderTop: '1px solid var(--border-main)' }}
                                >
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Showing {currentPage * ITEMS_PER_PAGE + 1} to {Math.min((currentPage + 1) * ITEMS_PER_PAGE, projects.length)} of {projects.length} results
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(0)}
                                            disabled={currentPage === 0}
                                            className="px-3 py-1.5 text-sm rounded hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            First
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                            disabled={currentPage === 0}
                                            className="px-3 py-1.5 text-sm rounded hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Prev
                                        </button>
                                        <span className="px-3 py-1.5 text-sm text-[var(--text-secondary)]">
                                            {currentPage + 1} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                            disabled={currentPage >= totalPages - 1}
                                            className="px-3 py-1.5 text-sm rounded hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(totalPages - 1)}
                                            disabled={currentPage >= totalPages - 1}
                                            className="px-3 py-1.5 text-sm rounded hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Last
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}
