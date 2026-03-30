'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
      ArrowLeft,
    Save,
    ClipboardList,
    Info,
    CheckCircle2
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Permissions } from '@/lib/hooks/usePermissions';
import { onboardingService } from '@/lib/services/onboarding.service';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('NewTemplatePage');

const templateFormSchema = z.object({
    name: z.string().min(1, 'Template name is required').max(255, 'Template name must not exceed 255 characters'),
    description: z.string().optional().default(''),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

export default function NewTemplatePage() {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TemplateFormData>({
        resolver: zodResolver(templateFormSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const onSubmit = async (data: TemplateFormData) => {
        try {
            const template = await onboardingService.createTemplate({ name: data.name, description: data.description });
            router.push(`/onboarding/templates/${template.id}`);
        } catch (error) {
            log.error('Failed to create template:', error);
        }
    };

    return (
        <AppLayout
            activeMenuItem="recruitment"
            breadcrumbs={[
                { label: 'Onboarding', href: '/onboarding' },
                { label: 'Templates', href: '/onboarding/templates' },
                { label: 'New Template', href: '/onboarding/templates/new' }
            ]}
        >
            <div className="max-w-3xl mx-auto py-10 space-y-10">
                {/* Header */}
                <div className="flex items-center gap-6">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-12 w-12 p-0 border-[var(--border-main)] bg-[var(--bg-elevated)] group"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5 text-[var(--text-muted)] group-hover:text-accent-700 transition-colors" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] skeuo-emboss">
                            New <span className="text-accent-700">Template</span>
                        </h1>
                        <p className="text-[var(--text-muted)] font-bold">Define the core metadata for your onboarding blueprint.</p>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-0 shadow-2xl bg-[var(--bg-card)] overflow-hidden">
                        <CardContent className="p-10">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                                        <ClipboardList className="h-3.5 w-3.5" />
                                        Template Name
                                    </label>
                                    <Input
                                        placeholder="e.g., Engineering Onboarding - Standard"
                                        className="input-aura rounded-lg bg-[var(--bg-input)] border-0 py-8 px-6 text-xl font-black focus:ring-2 focus:ring-accent-500"
                                        {...register('name')}
                                    />
                                    {errors.name && <p className="text-danger-500 text-sm">{errors.name.message}</p>}
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                                        <Info className="h-3.5 w-3.5" />
                                        Description
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Briefly describe what this template is for and which departments should use it."
                                        className="w-full rounded-lg bg-[var(--bg-input)] border-0 p-6 font-bold text-[var(--text-secondary)] dark:text-[var(--text-secondary)]200 focus:ring-2 focus:ring-accent-500 outline-none"
                                        {...register('description')}
                                    />
                                    {errors.description && <p className="text-danger-500 text-sm">{errors.description.message}</p>}
                                </div>

                                <div className="pt-6 border-t border-[var(--border-main)]/50 dark:border-[var(--border-main)]/50 flex justify-end">
                                    <PermissionGate permission={Permissions.ONBOARDING_MANAGE}>
                                        <Button
                                            type="submit"
                                            isLoading={isSubmitting}
                                            disabled={isSubmitting}
                                            className="btn-primary font-black tracking-widest uppercase text-xs bg-gradient-to-r from-accent-700 to-accent-600 border-0 shadow-xl shadow-accent-500/20 rounded-lg py-6 px-10"
                                            leftIcon={<Save className="h-4 w-4" />}
                                        >
                                            Create & Configure Tasks
                                        </Button>
                                    </PermissionGate>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Info Card */}
                <Card className="border-0 bg-accent-500/5 dark:bg-accent-500/10 border-l-4 border-accent-500 rounded-lg">
                    <CardContent className="p-6 flex gap-4">
                        <CheckCircle2 className="h-6 w-6 text-accent-500 shrink-0 mt-1" />
                        <div>
                            <p className="font-black text-accent-900 dark:text-accent-100 uppercase tracking-widest text-xs mb-1">Standardization Tip</p>
                            <p className="text-sm font-bold text-accent-700 dark:text-accent-300">
                                Creating specialized templates for different roles (e.g., &quot;Software Engineer&quot; vs &quot;Account Executive&quot;) ensures that every new hire gets the exact resources they need from day one.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
