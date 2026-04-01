'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    User,
    Calendar,
    CheckCircle,
    ChevronRight,
    ClipboardList,
    Layout,
    Zap,
    ShieldCheck,
    UserPlus
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmployeeSearchAutocomplete } from '@/components/ui/EmployeeSearchAutocomplete';
import { useOnboardingTemplates, useCreateOnboardingProcess } from '@/lib/hooks/queries/useOnboarding';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { OnboardingProcessRequest, OnboardingChecklistTemplate } from '@/lib/types/hire/onboarding';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('NewOnboardingPage');

// Zod validation schema for onboarding form
const onboardingFormSchema = z.object({
    startDate: z.string().min(1, 'Start date is required').date('Invalid date format'),
    expectedCompletionDate: z.string().optional().refine(
        (val) => !val || !isNaN(Date.parse(val)),
        'Invalid date format'
    ),
    notes: z.string().optional().default(''),
});

type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

export default function NewOnboardingPage() {
    const router = useRouter();
    const { data: templates = [] } = useOnboardingTemplates();
    const createProcessMutation = useCreateOnboardingProcess();

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
    const [selectedBuddy, setSelectedBuddy] = useState<{ id: string; name: string } | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<OnboardingChecklistTemplate | null>(
        templates.length > 0 ? (templates.find(t => t.isDefault) || templates[0]) : null
    );

    const {
        register,
        handleSubmit: handleFormSubmit,
        formState: { errors },
        watch,
        reset: _resetForm,
    } = useForm<OnboardingFormData>({
        resolver: zodResolver(onboardingFormSchema),
        defaultValues: {
            startDate: new Date().toISOString().split('T')[0],
            expectedCompletionDate: '',
            notes: '',
        },
    });

    const formData = watch();
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleNext = () => {
        if (currentStep === 1 && !selectedEmployee) {
            setSubmitError('Please select an employee');
            return;
        }
        if (currentStep === 2 && (!formData.startDate || !selectedTemplate)) {
            setSubmitError('Please provide start date and select a template');
            return;
        }
        setSubmitError(null);
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentStep === 1) {
            router.back();
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async (data: OnboardingFormData) => {
        if (!selectedEmployee || !selectedTemplate) {
            setSubmitError('Please fill in all required fields');
            return;
        }

        try {
            setSubmitError(null);

            const payload: OnboardingProcessRequest = {
                employeeId: selectedEmployee.id,
                processType: 'ONBOARDING',
                startDate: data.startDate,
                expectedCompletionDate: data.expectedCompletionDate || undefined,
                assignedBuddyId: selectedBuddy?.id,
                notes: data.notes || '',
                templateId: selectedTemplate.id
            };

            const result = await createProcessMutation.mutateAsync(payload);
            router.push(`/onboarding/${result.id}`);
        } catch (err: unknown) {
            log.error('Failed to create onboarding process:', err);
            setSubmitError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to initiate onboarding');
        }
    };

    const steps = [
        { id: 1, name: 'Identity', icon: UserPlus },
        { id: 2, name: 'Plan', icon: Layout },
        { id: 3, name: 'Confirm', icon: ShieldCheck }
    ];

    return (
        <AppLayout
            activeMenuItem="recruitment"
            breadcrumbs={[
                { label: 'Onboarding', href: '/onboarding' },
                { label: 'New Onboarding', href: '/onboarding/new' }
            ]}
        >
            <div className="max-w-4xl mx-auto space-y-12 py-8">
                {/* Header & Progress */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] skeuo-emboss">
                            Initiate <span className="text-accent-700">Onboarding</span>
                        </h1>
                        <p className="text-[var(--text-muted)] font-medium">Step {currentStep} of 3: {steps[currentStep - 1].name}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {steps.map((step, idx) => (
                            <div key={step.id} className="flex items-center">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${currentStep >= step.id
                                        ? 'bg-accent-700 border-accent-700 text-white shadow-[var(--shadow-dropdown)]'
                                        : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)]'
                                    }`}>
                                    <step.icon className="h-5 w-5" />
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`w-12 h-1 mx-2 rounded-full ${currentStep > step.id ? 'bg-accent-700' : 'bg-[var(--bg-secondary)]'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <Card className="border-0 shadow-2xl bg-[var(--bg-card)]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-4">
                                        <User className="h-6 w-6 text-accent-500" />
                                        <span>Candidate Selection</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="bg-accent-500/5 p-6 rounded-3xl border border-accent-500/10">
                                        <label className="block text-sm font-bold uppercase tracking-widest text-accent-700 dark:text-accent-400 mb-4">
                                            Find Employee
                                        </label>
                                        <EmployeeSearchAutocomplete
                                            placeholder="Type name or ID..."
                                            onChange={(emp) => setSelectedEmployee(emp)}
                                            value={selectedEmployee}
                                        />
                                        <p className="text-xs text-[var(--text-muted)] mt-4 font-medium italic">
                                            Search joiners who have already been added to the system database.
                                        </p>
                                    </div>

                                    {selectedEmployee && (
                                        <div className="flex items-center gap-6 p-6 rounded-3xl bg-[var(--bg-elevated)] border border-accent-500/10 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-accent-500 to-accent-600 text-white flex items-center justify-center font-black text-3xl shadow-[var(--shadow-dropdown)]">
                                                {selectedEmployee.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black text-[var(--text-primary)]">{selectedEmployee.name}</h3>
                                                <p className="text-[var(--text-muted)] font-bold">Selected Joiner</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            <Card className="lg:col-span-2 border-0 shadow-2xl bg-[var(--bg-card)]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-4">
                                        <ClipboardList className="h-6 w-6 text-accent-500" />
                                        <span>Checklist Template</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 gap-4">
                                        {templates.map((temp) => (
                                            <div
                                                key={temp.id}
                                                onClick={() => setSelectedTemplate(temp)}
                                                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group ${selectedTemplate?.id === temp.id
                                                        ? 'bg-accent-500/10 border-accent-500 shadow-[var(--shadow-dropdown)]'
                                                        : 'bg-[var(--bg-card)] border-transparent hover:border-[var(--border-main)]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-4 rounded-lg ${selectedTemplate?.id === temp.id ? 'bg-accent-500 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                                                        }`}>
                                                        <Layout className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-lg text-[var(--text-primary)] capitalize">{temp.name}</h4>
                                                        <p className="text-sm font-bold text-[var(--text-muted)]">{temp.estimatedDays} Days Estimated</p>
                                                    </div>
                                                </div>
                                                {selectedTemplate?.id === temp.id && (
                                                    <CheckCircle className="h-6 w-6 text-accent-500" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-2xl bg-[var(--bg-card)]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-4">
                                        <Calendar className="h-6 w-6 text-success-500" />
                                        <span>Timeline</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Kickoff Date</label>
                                        <Input
                                            type="date"
                                            {...register('startDate')}
                                            className="rounded-lg border-0 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)] font-bold"
                                        />
                                        {errors.startDate && (
                                            <p className="text-xs text-danger-500 mt-1 font-medium">{errors.startDate.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Buddy (Optional)</label>
                                        <EmployeeSearchAutocomplete
                                            placeholder="Find a mentor..."
                                            onChange={(emp) => setSelectedBuddy(emp)}
                                            value={selectedBuddy}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-8 rounded-3xl bg-accent-500/10 border border-accent-500/20 text-center space-y-2">
                                    <User className="h-10 w-10 mx-auto text-accent-700 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest text-accent-700">Employee</p>
                                    <p className="text-xl font-black text-[var(--text-primary)]">{selectedEmployee?.name}</p>
                                </div>
                                <div className="p-8 rounded-3xl bg-accent-500/10 border border-accent-500/20 text-center space-y-2">
                                    <Layout className="h-10 w-10 mx-auto text-accent-600 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest text-accent-600">Checklist</p>
                                    <p className="text-xl font-black text-[var(--text-primary)]">{selectedTemplate?.name}</p>
                                </div>
                                <div className="p-8 rounded-3xl bg-success-500/10 border border-success-500/20 text-center space-y-2">
                                    <Calendar className="h-10 w-10 mx-auto text-success-600 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest text-success-600">Starts</p>
                                    <p className="text-xl font-black text-[var(--text-primary)]">{formData.startDate}</p>
                                </div>
                            </div>

                            <Card className="border-0 shadow-2xl bg-[var(--bg-card)]">
                                <CardHeader>
                                    <CardTitle>Final Notes</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <textarea
                                        className="w-full px-6 py-4 rounded-3xl bg-[var(--bg-surface)] border-0 focus:ring-2 focus:ring-accent-500 outline-none text-[var(--text-primary)] font-medium"
                                        rows={4}
                                        placeholder="Specific instructions for the onboarding buddy or HR team..."
                                        {...register('notes')}
                                    />
                                    {errors.notes && (
                                        <p className="text-xs text-danger-500 mt-1 font-medium">{errors.notes.message}</p>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-8 border-t border-[var(--border-main)]">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        size="lg"
                        className="font-black tracking-widest uppercase text-xs"
                    >
                        {currentStep === 1 ? 'Cancel' : 'Back'}
                    </Button>

                    <div className="flex items-center gap-4">
                        {submitError && <span className="text-sm font-bold text-danger-500 animate-pulse">{submitError}</span>}
                        <PermissionGate permission={Permissions.ONBOARDING_CREATE} fallback={<div />}>
                            {currentStep < 3 ? (
                                <Button
                                    variant="primary"
                                    onClick={handleNext}
                                    size="lg"
                                    className="px-10 rounded-lg font-black tracking-widest uppercase text-xs shadow-[var(--shadow-dropdown)] shadow-accent-500/20"
                                    rightIcon={<ChevronRight className="h-4 w-4" />}
                                >
                                    Continue
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    onClick={handleFormSubmit(handleSubmit)}
                                    isLoading={createProcessMutation.isPending}
                                    size="lg"
                                    className="btn-primary px-10 rounded-lg font-black tracking-widest uppercase text-xs bg-gradient-to-r from-accent-700 to-accent-600 border-0 shadow-[var(--shadow-dropdown)] shadow-accent-500/20"
                                    leftIcon={<Zap className="h-4 w-4" />}
                                >
                                    Launch Process
                                </Button>
                            )}
                        </PermissionGate>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
