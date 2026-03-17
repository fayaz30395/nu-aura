'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    User,
    HardDrive,
    UploadCloud,
    Loader2,
    CheckCircle2,
    Circle,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Zap,
    MessageSquare,
    ClipboardList
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useOnboardingProcess, useOnboardingProcessTasks, useUpdateOnboardingTaskStatus } from '@/lib/hooks/queries/useOnboarding';
import { useGoogleLogin } from '@react-oauth/google';
import { useToast } from '@/components/notifications/ToastProvider';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('OnboardingPage');

export default function OnboardingDetailPage() {
  const toast = useToast();
    const router = useRouter();
    const params = useParams();
    useAuth();
    const processId = params.id as string;

    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    // Google Drive State
    const [driveToken, setDriveToken] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // React Query hooks
    const { data: process, isLoading } = useOnboardingProcess(processId);
    const { data: tasks = [] } = useOnboardingProcessTasks(processId);
    const { mutate: updateTaskStatus, isPending: isUpdating } = useUpdateOnboardingTaskStatus();

    useEffect(() => {
        const token = sessionStorage.getItem('nu_drive_token');
        if (token) setDriveToken(token);

        // Auto-expand first category
        if (tasks && tasks.length > 0) {
            const categories = Array.from(new Set(tasks.map(t => t.category)));
            if (categories.length > 0 && expandedCategories.length === 0) {
                setExpandedCategories([categories[0]]);
            }
        }
        // expandedCategories.length is intentionally omitted: it is only used as
        // a guard to prevent re-expanding once categories are already open. Including
        // it would cause this effect to re-run every time a category is toggled.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks]);

    const handleTaskStatusUpdate = (taskId: string, newStatus: string) => {
        updateTaskStatus({ taskId, status: newStatus });
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // Google Drive
    const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            const token = tokenResponse.access_token;
            sessionStorage.setItem('nu_drive_token', token);
            setDriveToken(token);
        },
        scope: 'https://www.googleapis.com/auth/drive.file',
    });

    const uploadFileToDrive = async (file: File) => {
        if (!driveToken) return;
        try {
            setUploading(true);
            const metadata = {
                name: `Onboarding - ${process?.employeeName || 'Doc'} - ${file.name}`,
                mimeType: file.type,
            };
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { Authorization: `Bearer ${driveToken}` },
                body: form,
            });

            if (!response.ok) throw new Error('Upload failed');
            toast.success('File uploaded to Google Drive successfully!');
        } catch (error) {
            log.error('Upload error:', error);
            toast.error('Failed to upload file to Google Drive');
        } finally {
            setUploading(false);
        }
    };

    if (isLoading) {
        return (
            <AppLayout activeMenuItem="recruitment">
                <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
                    <div className="h-16 w-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
                    <p className="text-[var(--text-muted)] font-bold animate-pulse">Initializing Dashboard...</p>
                </div>
            </AppLayout>
        );
    }

    if (!process) return null;

    const tasksByCategory = tasks.reduce((acc, task) => {
        if (!acc[task.category]) acc[task.category] = [];
        acc[task.category].push(task);
        return acc;
    }, {} as Record<string, typeof tasks>);

    return (
        <AppLayout
            activeMenuItem="recruitment"
            breadcrumbs={[
                { label: 'Onboarding', href: '/onboarding' },
                { label: process.employeeName || 'Process', href: `/onboarding/${processId}` }
            ]}
        >
            <div className="max-w-7xl mx-auto space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            leftIcon={<ArrowLeft className="h-4 w-4" />}
                            className="hover:bg-primary-500/10 text-primary-600 font-bold"
                        >
                            Back to List
                        </Button>
                        <div className="flex items-center gap-6">
                            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-black text-4xl shadow-2xl shadow-primary-500/30 ring-4 ring-white dark:ring-surface-900">
                                {process.employeeName?.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight text-[var(--text-primary)]">
                                    {process.employeeName}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 mt-2 font-bold text-[var(--text-muted)]">
                                    <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1 rounded-full text-xs">
                                        <User className="h-3.5 w-3.5" />
                                        ID: {process.employeeId}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-[var(--bg-secondary)] px-3 py-1 rounded-full text-xs">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Started {new Date(process.startDate).toLocaleDateString()}
                                    </span>
                                    <Badge variant={process.status === 'COMPLETED' ? 'success' : 'warning'} className="rounded-full px-3">
                                        {process.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right sr-only md:not-sr-only">
                            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Overall Progress</p>
                            <div className="flex items-center gap-4">
                                <div className="w-48 h-3 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] rounded-full overflow-hidden shadow-inner">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${process.completionPercentage}%` }}
                                        className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                    />
                                </div>
                                <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{process.completionPercentage}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Checklist Main Area */}
                    <div className="lg:col-span-3 space-y-8">
                        {Object.entries(tasksByCategory).map(([category, catTasks], idx) => (
                            <motion.div
                                key={category}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card className="border-0 shadow-xl bg-[var(--bg-card)] overflow-hidden">
                                    <div
                                        onClick={() => toggleCategory(category)}
                                        className="p-6 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-[var(--text-primary)] capitalize">{category}</h3>
                                                <p className="text-sm font-bold text-[var(--text-muted)]">
                                                    {catTasks.filter(t => t.status === 'COMPLETED').length} of {catTasks.length} tasks completed
                                                </p>
                                            </div>
                                        </div>
                                        {expandedCategories.includes(category) ? <ChevronUp /> : <ChevronDown />}
                                    </div>

                                    <AnimatePresence>
                                        {expandedCategories.includes(category) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-[var(--border-main)]/50"
                                            >
                                                <div className="p-2 space-y-1">
                                                    {catTasks.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className={`flex items-center justify-between p-4 rounded-2xl group transition-all ${task.status === 'COMPLETED' ? 'bg-emerald-500/5' : 'hover:bg-[var(--bg-secondary)]/5'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <button
                                                                    onClick={() => handleTaskStatusUpdate(task.id, task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}
                                                                    className={`flex-shrink-0 transition-all ${task.status === 'COMPLETED' ? 'text-emerald-500' : 'text-[var(--text-muted)] group-hover:text-primary-400'
                                                                        }`}
                                                                >
                                                                    {task.status === 'COMPLETED' ? (
                                                                        <CheckCircle2 className="h-6 w-6" />
                                                                    ) : (
                                                                        <Circle className="h-6 w-6" />
                                                                    )}
                                                                </button>
                                                                <div>
                                                                    <p className={`font-bold transition-all ${task.status === 'COMPLETED' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'
                                                                        }`}>
                                                                        {task.taskName}
                                                                        {task.isMandatory && <span className="ml-2 text-xs text-red-500 bg-red-500/10 px-1.5 rounded uppercase font-black">Required</span>}
                                                                    </p>
                                                                    {task.description && (
                                                                        <p className="text-sm text-[var(--text-muted)] font-medium">{task.description}</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <select
                                                                    value={task.status}
                                                                    onChange={(e) => handleTaskStatusUpdate(task.id, e.target.value)}
                                                                    className="bg-transparent border-0 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] outline-none cursor-pointer hover:text-primary-500"
                                                                >
                                                                    <option value="PENDING">Pending</option>
                                                                    <option value="IN_PROGRESS">In Progress</option>
                                                                    <option value="COMPLETED">Completed</option>
                                                                    <option value="SKIPPED">Skipped</option>
                                                                    <option value="BLOCKED">Blocked</option>
                                                                </select>
                                                                {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-8">
                        <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-1">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Zap className="h-5 w-5" />
                                    <span>Stakeholders</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-2">
                                <div className="bg-white/10 rounded-2xl p-4">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Onboarding Buddy</p>
                                    <p className="font-bold text-lg mt-1">{process.assignedBuddyName || 'Not Assigned'}</p>
                                    <Button variant="ghost" size="sm" className="w-full mt-3 bg-white/10 hover:bg-white/20 border-0 text-white text-xs">
                                        Send Message
                                    </Button>
                                </div>
                                <div className="bg-white/10 rounded-2xl p-4">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Primary Goal</p>
                                    <p className="font-bold text-sm mt-1">Successfully integrate into the Engineering team by end of Month 1.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-xl bg-[var(--bg-card)]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <HardDrive className="h-5 w-5 text-[var(--text-muted)]" />
                                    <span>Cloud Assets</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!driveToken ? (
                                    <Button
                                        variant="primary"
                                        className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 border-0 shadow-lg shadow-blue-500/20 font-black uppercase text-xs tracking-widest py-6"
                                        onClick={() => googleLogin()}
                                    >
                                        Connect Google Drive
                                    </Button>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                            <span className="text-xs font-bold text-emerald-600">Drive Connected</span>
                                        </div>
                                        <label className="block">
                                            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFileToDrive(e.target.files[0])} disabled={uploading} />
                                            <div className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-dashed border-[var(--border-main)] hover:border-primary-500 cursor-pointer transition-all">
                                                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5 text-[var(--text-muted)]" />}
                                                <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Upload Doc</span>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-xl bg-[var(--bg-card)]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardList className="h-5 w-5 text-[var(--text-muted)]" />
                                    <span>Process History</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="px-6 pb-6 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-0.5 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] relative">
                                            <div className="absolute top-2 -left-1 w-2.5 h-2.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                        </div>
                                        <div className="pb-4">
                                            <p className="text-xs font-black text-[var(--text-primary)]">Process Initiated</p>
                                            <p className="text-xs text-[var(--text-muted)] font-bold">{new Date(process.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {process.notes && (
                                        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]900/50">
                                            <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" /> Note
                                            </p>
                                            <p className="text-xs font-medium italic">&quot;{process.notes}&quot;</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
