'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserPlus,
    Calendar,
    Clock,
    Search,
    Filter,
    ChevronRight,
    Zap,
    TrendingUp,
    ShieldCheck,
    Layout,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useOnboardingProcesses } from '@/lib/hooks/queries/useOnboarding';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import type { BadgeVariant } from '@/components/ui/types';
import { Skeleton } from '@/components/ui/Skeleton';

export default function OnboardingPage() {
    const router = useRouter();
    useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const { data, isLoading, isError, error, refetch } = useOnboardingProcesses(0, 100);

    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'COMPLETED': return 'success';
            case 'IN_PROGRESS': return 'primary';
            case 'NOT_STARTED': return 'default';
            case 'CANCELLED': return 'destructive';
            default: return 'default';
        }
    };

    const processes = data?.content || [];

    const filteredProcesses = (processes || []).filter(proc => {
        const matchesSearch = (proc.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            proc.employeeId.includes(searchQuery));
        const matchesStatus = statusFilter === 'ALL' || proc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = [
        { label: 'Active', value: processes.filter(p => p.status === 'IN_PROGRESS').length, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Upcoming', value: processes.filter(p => p.status === 'NOT_STARTED').length, icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { label: 'Completed', value: processes.filter(p => p.status === 'COMPLETED').length, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Avg. Days', value: '12', icon: Clock, color: 'text-primary-500', bg: 'bg-primary-500/10' }
    ];

    return (
        <AppLayout
            activeMenuItem="recruitment"
            breadcrumbs={[{ label: 'Onboarding', href: '/onboarding' }]}
        >
            <div className="max-w-7xl mx-auto space-y-10 py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)] skeuo-emboss">
                            Talent <span className="text-primary-600">Onboarding</span>
                        </h1>
                        <p className="text-[var(--text-muted)] font-bold max-w-md skeuo-deboss">
                            Orchestrate the first 90 days of your new joiners with precision and care.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <PermissionGate permission={Permissions.ONBOARDING_MANAGE}>
                            <Button
                                variant="outline"
                                className="btn-secondary font-black tracking-widest uppercase text-xs rounded-2xl"
                                leftIcon={<Layout className="h-3.5 w-3.5" />}
                                onClick={() => router.push('/onboarding/templates')}
                            >
                                Manage Templates
                            </Button>
                        </PermissionGate>
                        <PermissionGate permission={Permissions.ONBOARDING_CREATE}>
                            <Button
                                variant="primary"
                                className="btn-primary font-black tracking-widest uppercase text-xs border-0 shadow-xl shadow-primary-500/20 rounded-2xl py-6 px-8"
                                leftIcon={<UserPlus className="h-4 w-4" />}
                                onClick={() => router.push('/onboarding/new')}
                            >
                                Initiate New Hire
                            </Button>
                        </PermissionGate>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card className="skeuo-card border-0 shadow-2xl">
                                <CardContent className="p-6 relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                                            <stat.icon className="h-6 w-6" />
                                        </div>
                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 skeuo-deboss">{stat.label}</p>
                                    <p className="text-3xl font-black text-[var(--text-primary)] skeuo-emboss">{stat.value}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Error State */}
                {isError && (
                    <Card className="border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950/20">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-danger-500 flex-shrink-0" />
                                <p className="text-sm text-danger-600 dark:text-danger-400">
                                    {error instanceof Error ? error.message : 'Failed to load onboarding data'}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Filters and List */}
                <div className="space-y-6">
                    <Card className="card-aura border-0 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-[var(--border-main)] flex flex-col md:flex-row gap-6 justify-between items-center">
                            <div className="relative w-full md:w-1/3">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                                <Input
                                    placeholder="Search joiners by name or ID..."
                                    className="input-aura pl-12 rounded-2xl font-bold"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="flex items-center gap-2 bg-[var(--bg-input)] px-4 py-2 rounded-2xl border border-white/20">
                                    <Filter className="h-4 w-4 text-[var(--text-muted)]" />
                                    <select
                                        aria-label="Filter by status"
                                        className="bg-transparent border-none text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] focus:ring-0 focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] cursor-pointer outline-none rounded-md"
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
                        </div>

                        <div className="divide-y divide-[var(--border-main)]/50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-8 flex items-center gap-6">
                                        <Skeleton className="h-16 w-16 rounded-3xl" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-6 w-1/4" />
                                            <Skeleton className="h-4 w-1/6" />
                                        </div>
                                    </div>
                                ))
                            ) : filteredProcesses.length === 0 ? (
                                <div className="p-20 text-center">
                                    <div className="h-20 w-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search className="h-10 w-10 text-[var(--text-muted)]" />
                                    </div>
                                    <h3 className="text-xl font-black text-[var(--text-primary)]">No joiners found</h3>
                                    <p className="text-[var(--text-muted)] font-bold mt-2">Adjust your filters or initiate a new onboarding.</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {filteredProcesses.map((process, idx) => (
                                        <motion.div
                                            key={process.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="p-6 hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer group"
                                            onClick={() => router.push(`/onboarding/${process.id}`)}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary-500/20 to-indigo-600/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-black text-2xl shadow-inner border border-white/20">
                                                        {process.employeeName?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-[var(--text-primary)] group-hover:text-primary-600 transition-colors">
                                                            {process.employeeName || `Employee ${process.employeeId.substring(0, 8)}`}
                                                        </h3>
                                                        <div className="flex items-center gap-4 mt-1 text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
                                                            <span className="flex items-center gap-1.5">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                Starts {new Date(process.startDate).toLocaleDateString()}
                                                            </span>
                                                            {process.assignedBuddyName && (
                                                                <span className="flex items-center gap-1.5 text-indigo-500">
                                                                    <Users className="h-3.5 w-3.5" />
                                                                    Buddy: {process.assignedBuddyName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between sm:justify-end gap-10">
                                                    <div className="text-right hidden sm:block">
                                                        <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Momentum</span>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-32 h-2.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden shadow-inner">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${process.completionPercentage}%` }}
                                                                    className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full"
                                                                />
                                                            </div>
                                                            <span className="text-sm font-black text-primary-600">{process.completionPercentage}%</span>
                                                        </div>
                                                    </div>

                                                    <Badge
                                                        variant={getStatusVariant(process.status)}
                                                        className="rounded-xl px-4 py-1.5 font-black tracking-widest uppercase text-xs"
                                                    >
                                                        {process.status.replace('_', ' ')}
                                                    </Badge>

                                                    <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-[var(--bg-input)] shadow-sm border border-[var(--border-main)] opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                                        <ChevronRight className="h-5 w-5 text-primary-600" />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
