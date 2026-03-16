'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
import { OnboardingProcessRequest, OnboardingChecklistTemplate } from '@/lib/types/onboarding';

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

    const [formData, setFormData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        expectedCompletionDate: '',
        notes: ''
    });
    const [error, setError] = useState<string | null>(null);

    const handleNext = () => {
        if (currentStep === 1 && !selectedEmployee) {
            setError('Please select an employee');
            return;
        }
        if (currentStep === 2 && (!formData.startDate || !selectedTemplate)) {
            setError('Please provide start date and select a template');
            return;
        }
        setError(null);
        setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentStep === 1) {
            router.back();
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!selectedEmployee || !formData.startDate || !selectedTemplate) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setError(null);

            const payload: OnboardingProcessRequest = {
                employeeId: selectedEmployee.id,
                processType: 'ONBOARDING',
                startDate: formData.startDate,
                expectedCompletionDate: formData.expectedCompletionDate || undefined,
                assignedBuddyId: selectedBuddy?.id,
                notes: formData.notes,
                templateId: selectedTemplate.id
            };

            const result = await createProcessMutation.mutateAsync(payload);
            router.push(`/onboarding/${result.id}`);
        } catch (err: unknown) {
            console.error('Failed to create onboarding process:', err);
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to initiate onboarding');
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
                        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                            Initiate <span className="text-primary-600">Onboarding</span>
                        </h1>
                        <p className="text-[var(--text-muted)] font-medium">Step {currentStep} of 3: {steps[currentStep - 1].name}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {steps.map((step, idx) => (
                            <div key={step.id} className="flex items-center">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${currentStep >= step.id
                                        ? 'bg-primary-600 border-primary-600 text-white shadow-lg'
                                        : 'bg-white border-[var(--border-main)] text-[var(--text-muted)] dark:bg-[var(--bg-secondary)]900'
                                    }`}>
                                    <step.icon className="h-5 w-5" />
                                </div>
                                {idx < steps.length - 1 && (
                                    <div className={`w-12 h-1 mx-2 rounded-full ${currentStep > step.id ? 'bg-primary-600' : 'bg-[var(--bg-secondary)]'
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
                                        <User className="h-6 w-6 text-primary-500" />
                                        <span>Candidate Selection</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="bg-primary-500/5 p-6 rounded-3xl border border-primary-500/10">
                                        <label className="block text-sm font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-4">
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
                                        <div className="flex items-center gap-6 p-6 rounded-3xl bg-[var(--bg-elevated)] border border-primary-500/10 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-black text-3xl shadow-xl">
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
                                        <ClipboardList className="h-6 w-6 text-indigo-500" />
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
                                                        ? 'bg-primary-500/10 border-primary-500 shadow-lg'
                                                        : 'bg-[var(--bg-card)] border-transparent hover:border-[var(--border-main)]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-4 rounded-2xl ${selectedTemplate?.id === temp.id ? 'bg-primary-500 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                                                        }`}>
                                                        <Layout className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-lg text-[var(--text-primary)] capitalize">{temp.name}</h4>
                                                        <p className="text-sm font-bold text-[var(--text-muted)]">{temp.estimatedDays} Days Estimated</p>
                                                    </div>
                                                </div>
                                                {selectedTemplate?.id === temp.id && (
                                                    <CheckCircle className="h-6 w-6 text-primary-500" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-2xl bg-[var(--bg-card)]">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-4">
                                        <Calendar className="h-6 w-6 text-emerald-500" />
                                        <span>Timeline</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] block mb-2">Kickoff Date</label>
                                        <Input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="rounded-2xl border-0 bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]900 font-bold"
                                        />
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
                                <div className="p-8 rounded-3xl bg-primary-500/10 border border-primary-500/20 text-center space-y-2">
                                    <User className="h-10 w-10 mx-auto text-primary-600 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest text-primary-600">Employee</p>
                                    <p className="text-xl font-black text-[var(--text-primary)]">{selectedEmployee?.name}</p>
                                </div>
                                <div className="p-8 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-center space-y-2">
                                    <Layout className="h-10 w-10 mx-auto text-indigo-600 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest text-indigo-600">Checklist</p>
                                    <p className="text-xl font-black text-[var(--text-primary)]">{selectedTemplate?.name}</p>
                                </div>
                                <div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                                    <Calendar className="h-10 w-10 mx-auto text-emerald-600 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Starts</p>
                                    <p className="text-xl font-black text-[var(--text-primary)]">{formData.startDate}</p>
                                </div>
                            </div>

                            <Card className="border-0 shadow-2xl bg-[var(--bg-card)]">
                                <CardHeader>
                                    <CardTitle>Final Notes</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <textarea
                                        className="w-full px-6 py-4 rounded-3xl bg-[var(--bg-surface)] border-0 focus:ring-2 focus:ring-primary-500 outline-none text-[var(--text-primary)] font-medium"
                                        rows={4}
                                        placeholder="Specific instructions for the onboarding buddy or HR team..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
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
                        {error && <span className="text-sm font-bold text-red-500 animate-pulse">{error}</span>}
                        {currentStep < 3 ? (
                            <Button
                                variant="primary"
                                onClick={handleNext}
                                size="lg"
                                className="px-10 rounded-2xl font-black tracking-widest uppercase text-xs shadow-xl shadow-primary-500/20"
                                rightIcon={<ChevronRight className="h-4 w-4" />}
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                isLoading={createProcessMutation.isPending}
                                size="lg"
                                className="px-10 rounded-2xl font-black tracking-widest uppercase text-xs bg-gradient-to-r from-primary-600 to-indigo-600 border-0 shadow-xl shadow-primary-500/20"
                                leftIcon={<Zap className="h-4 w-4" />}
                            >
                                Launch Process
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
