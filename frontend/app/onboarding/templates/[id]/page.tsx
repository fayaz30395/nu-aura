'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layout,
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Settings,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    ClipboardList,
    AlertCircle,
    GripVertical,
    Zap,
    Clock,
    ShieldCheck,
    Type,
    Layers,
    ListChecks
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
    useOnboardingTemplate,
    useOnboardingTemplateTasks,
    useUpdateOnboardingTemplate,
    useAddOnboardingTemplateTask,
    useUpdateOnboardingTemplateTask,
    useDeleteOnboardingTemplateTask,
} from '@/lib/hooks/queries/useOnboarding';
import { OnboardingChecklistTemplate, OnboardingTemplateTask, OnboardingTaskCategory, OnboardingTaskPriority } from '@/lib/types/onboarding';
import { Skeleton } from '@/components/ui/Skeleton';

export default function TemplateEditorPage() {
    const router = useRouter();
    const params = useParams();
    const templateId = params.id as string;

    const { data: template, isLoading } = useOnboardingTemplate(templateId);
    const { data: tasksData = [] } = useOnboardingTemplateTasks(templateId);
    const updateTemplateMutation = useUpdateOnboardingTemplate();
    const addTaskMutation = useAddOnboardingTemplateTask();
    const updateTaskMutation = useUpdateOnboardingTemplateTask();
    const deleteTaskMutation = useDeleteOnboardingTemplateTask();

    const [localTemplate, setLocalTemplate] = useState<OnboardingChecklistTemplate | null>(null);
    const [tasks, setTasks] = useState<OnboardingTemplateTask[]>([]);

    // Form and Task state
    const [editingTask, setEditingTask] = useState<string | null>(null); // Task ID or 'new'
    const [taskForm, setTaskForm] = useState<Partial<OnboardingTemplateTask>>({
        taskName: '',
        description: '',
        category: 'INTERNAL_SYSTEMS',
        priority: 'MEDIUM',
        isMandatory: true,
        orderSequence: 0
    });

    // Sync data from queries to local state
    if (template && template !== localTemplate) {
        setLocalTemplate(template);
    }

    if (tasksData && JSON.stringify(tasksData) !== JSON.stringify(tasks)) {
        setTasks(tasksData || []);
    }

    const handleSaveTemplate = async () => {
        if (!localTemplate) return;
        try {
            await updateTemplateMutation.mutateAsync({
                templateId,
                data: localTemplate,
            });
            // Toast success is handled in mutation
        } catch (error) {
            console.error('Failed to save template:', error);
        }
    };

    const handleAddTask = () => {
        setTaskForm({
            taskName: '',
            description: '',
            category: 'INTERNAL_SYSTEMS',
            priority: 'MEDIUM',
            isMandatory: true,
            orderSequence: tasks.length + 1
        });
        setEditingTask('new');
    };

    const handleSaveTask = async () => {
        try {
            if (editingTask === 'new') {
                await addTaskMutation.mutateAsync({
                    templateId,
                    data: taskForm,
                });
            } else if (editingTask) {
                await updateTaskMutation.mutateAsync({
                    templateId,
                    taskId: editingTask,
                    data: taskForm,
                });
            }
            setEditingTask(null);
        } catch (error) {
            console.error('Failed to save task:', error);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await deleteTaskMutation.mutateAsync({
                templateId,
                taskId,
            });
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const editTask = (task: OnboardingTemplateTask) => {
        setTaskForm(task);
        setEditingTask(task.id);
    };

    if (isLoading) {
        return (
            <AppLayout activeMenuItem="recruitment">
                <div className="max-w-7xl mx-auto py-10 space-y-6">
                    <Skeleton className="h-10 w-1/4" />
                    <Skeleton className="h-64 h-w-full rounded-3xl" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout
            activeMenuItem="recruitment"
            breadcrumbs={[
                { label: 'Onboarding', href: '/onboarding' },
                { label: 'Templates', href: '/onboarding/templates' },
                { label: localTemplate?.name || 'Editor', href: `/onboarding/templates/${templateId}` }
            ]}
        >
            <div className="max-w-7xl mx-auto py-6 space-y-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-2xl h-12 w-12 p-0 border-white/20 bg-white/20 backdrop-blur-xl group"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-5 w-5 text-surface-500 group-hover:text-primary-600 transition-colors" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white flex items-center gap-3">
                                Blueprint <span className="text-primary-600">Editor</span>
                                <Badge variant="outline" className="rounded-xl px-3 py-1 font-black text-[10px] uppercase tracking-widest border-indigo-500/20 text-indigo-600">
                                    V1.0
                                </Badge>
                            </h1>
                            <p className="text-surface-500 font-bold">Orchestrate tasks and customize the onboarding journey.</p>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        className="font-black tracking-widest uppercase text-[10px] bg-gradient-to-r from-primary-600 to-indigo-600 border-0 shadow-xl shadow-primary-500/20 rounded-2xl py-6 px-10"
                        leftIcon={<Save className="h-4 w-4" />}
                        isLoading={updateTemplateMutation.isPending && !editingTask}
                        onClick={handleSaveTemplate}
                    >
                        Save Blueprint
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Panel: Template Info */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-white/5 backdrop-blur-xl border-t border-white/20 overflow-hidden">
                            <CardHeader className="p-8 pb-0">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-surface-400 flex items-center gap-2">
                                    <Type className="h-4 w-4" />
                                    General Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400">Template Title</label>
                                    <Input
                                        className="rounded-2xl bg-white/50 dark:bg-black/20 border-0 font-black text-lg focus:ring-2 focus:ring-primary-500"
                                        value={localTemplate?.name || ''}
                                        onChange={(e) => setLocalTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400">Mission Description</label>
                                    <textarea
                                        rows={5}
                                        className="w-full rounded-2xl bg-white/50 dark:bg-black/20 border-0 p-4 font-bold text-surface-700 dark:text-surface-200 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={localTemplate?.description || ''}
                                        onChange={(e) => setLocalTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 bg-indigo-600/5 dark:bg-indigo-600/10 border-l-4 border-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/10">
                            <CardContent className="p-8 space-y-4">
                                <div className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
                                    <AlertCircle className="h-4 w-4" />
                                    Orchestration Sync
                                </div>
                                <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                                    Changes made here will affect all <span className="underline decoration-indigo-400 decoration-2">future</span> onboarding processes initiated with this template.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Panel: Task Orchestration */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-0 shadow-2xl bg-white/40 dark:bg-white/5 backdrop-blur-xl border-t border-white/20 overflow-hidden min-h-[600px]">
                            <CardHeader className="p-8 flex flex-row items-center justify-between border-b border-white/20">
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-surface-400 flex items-center gap-2">
                                    <ListChecks className="h-4 w-4" />
                                    Task Sequence ({tasks.length})
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl font-black tracking-widest uppercase text-[10px] border-primary-500/20 text-primary-600 hover:bg-primary-500 hover:text-white transition-all transform hover:scale-105"
                                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                                    onClick={handleAddTask}
                                >
                                    Add Manual Task
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-white/20">
                                    <AnimatePresence>
                                        {tasks.map((task, idx) => (
                                            <motion.div
                                                key={task.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-6 hover:bg-white/40 dark:hover:bg-white/5 group transition-all"
                                            >
                                                <div className="flex items-start justify-between gap-6">
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <div className="p-2 mt-1 bg-surface-100 dark:bg-surface-800 rounded-xl cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all">
                                                            <GripVertical className="h-4 w-4 text-surface-400" />
                                                        </div>
                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <h4 className="font-black text-surface-900 dark:text-white text-lg">{task.taskName}</h4>
                                                                {task.isMandatory && (
                                                                    <Badge variant="danger" className="rounded-lg px-2 py-0.5 font-black text-[8px] tracking-widest uppercase bg-danger-500 text-white">
                                                                        Required
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-surface-500 font-bold line-clamp-1">{task.description}</p>
                                                            <div className="flex items-center gap-4 pt-1">
                                                                <Badge variant="outline" className="rounded-xl px-2 py-0.5 border-white/40 text-surface-500 font-black text-[9px] uppercase tracking-widest">
                                                                    {task.category?.replace('_', ' ')}
                                                                </Badge>
                                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-surface-400 uppercase tracking-widest">
                                                                    <Clock className="h-3 w-3" />
                                                                    Due Day {task.estimatedDaysFromStart || 7}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-primary-500 uppercase tracking-widest">
                                                                    <Zap className="h-3 w-3" />
                                                                    {task.priority || 'MEDIUM'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-10 w-10 p-0 rounded-2xl border-white/20 opacity-0 group-hover:opacity-100 transition-all"
                                                            onClick={() => editTask(task)}
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-10 w-10 p-0 rounded-2xl border-white/20 text-danger-500 hover:bg-danger-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                                            onClick={() => handleDeleteTask(task.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                {tasks.length === 0 && (
                                    <div className="p-32 text-center">
                                        <div className="h-20 w-20 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <ShieldCheck className="h-10 w-10 text-surface-300" />
                                        </div>
                                        <h3 className="text-xl font-black text-surface-900 dark:text-white">Empty Blueprint</h3>
                                        <p className="text-surface-500 font-bold mt-2">Every masterpiece starts with a single task.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Task Edit Modal/Sheet */}
            {editingTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-10">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => setEditingTask(null)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-[40px] shadow-2xl overflow-hidden border-t-8 border-primary-600"
                    >
                        <div className="p-12 space-y-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
                                    {editingTask === 'new' ? 'New Task' : 'Edit Task'}
                                </h2>
                                <Button
                                    variant="outline"
                                    className="h-12 w-12 rounded-full p-0"
                                    onClick={() => setEditingTask(null)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="col-span-full space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400">Task Objective</label>
                                    <Input
                                        className="rounded-2xl bg-surface-100 dark:bg-black/20 border-0 py-6 px-6 font-black text-lg focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., Set up workstation and systems"
                                        value={taskForm.taskName}
                                        onChange={(e) => setTaskForm({ ...taskForm, taskName: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-full space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400">Tactical Description</label>
                                    <textarea
                                        rows={3}
                                        className="w-full rounded-2xl bg-surface-100 dark:bg-black/20 border-0 p-6 font-bold text-surface-700 dark:text-surface-200 focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="Detailed instructions for this specific step..."
                                        value={taskForm.description || ''}
                                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 flex items-center gap-2">
                                        <Layers className="h-3.5 w-3.5" />
                                        Category
                                    </label>
                                    <select
                                        className="w-full rounded-2xl bg-surface-100 dark:bg-black/20 border-0 p-5 font-black uppercase tracking-widest text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={taskForm.category}
                                        onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value as OnboardingTaskCategory })}
                                    >
                                        <option value="INFRASTRUCTURE_ACCESS">Infrastructure & Access</option>
                                        <option value="HR_DOCUMENTATION">HR & Documentation</option>
                                        <option value="COMPANY_CULTURE">Company Culture</option>
                                        <option value="TEAM_INTEGRATION">Team Integration</option>
                                        <option value="ROLE_SPECIFIC_TRAINING">Technical Training</option>
                                        <option value="INTERNAL_SYSTEMS">Internal Systems</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 flex items-center gap-2">
                                        <Zap className="h-3.5 w-3.5" />
                                        Priority
                                    </label>
                                    <select
                                        className="w-full rounded-2xl bg-surface-100 dark:bg-black/20 border-0 p-5 font-black uppercase tracking-widest text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={taskForm.priority}
                                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as OnboardingTaskPriority })}
                                    >
                                        <option value="HIGH">High Priority</option>
                                        <option value="MEDIUM">Medium Priority</option>
                                        <option value="LOW">Low Priority</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5" />
                                        Estimated Days
                                    </label>
                                    <Input
                                        type="number"
                                        className="rounded-2xl bg-surface-100 dark:bg-black/20 border-0 p-6 font-black focus:ring-2 focus:ring-primary-500"
                                        value={taskForm.estimatedDaysFromStart || 0}
                                        onChange={(e) => setTaskForm({ ...taskForm, estimatedDaysFromStart: parseInt(e.target.value) || 0 })}
                                    />
                                </div>

                                <div className="flex items-center gap-4 bg-surface-100 dark:bg-black/20 p-5 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
                                    <input
                                        type="checkbox"
                                        id="mandatory"
                                        className="h-5 w-5 rounded-md border-primary-500 text-primary-600 focus:ring-primary-500"
                                        checked={taskForm.isMandatory}
                                        onChange={(e) => setTaskForm({ ...taskForm, isMandatory: e.target.checked })}
                                    />
                                    <label htmlFor="mandatory" className="text-sm font-black uppercase tracking-widest text-surface-600 dark:text-surface-300">
                                        Mandatory Task
                                    </label>
                                </div>
                            </div>

                            <div className="pt-10 flex gap-4">
                                <Button
                                    className="flex-1 font-black tracking-widest uppercase text-xs bg-gradient-to-r from-primary-600 to-indigo-600 border-0 shadow-xl shadow-primary-500/20 rounded-2xl py-6"
                                    leftIcon={<Save className="h-4 w-4" />}
                                    isLoading={addTaskMutation.isPending || updateTaskMutation.isPending}
                                    onClick={handleSaveTask}
                                >
                                    Confirm Task
                                </Button>
                                <Button
                                    variant="outline"
                                    className="font-black tracking-widest uppercase text-xs border-white/20 rounded-2xl px-8"
                                    onClick={() => setEditingTask(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AppLayout>
    );
}

// Re-using/Adding missing Lucide icons for convenience in this file context
function Edit3(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
    );
}
