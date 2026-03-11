'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Layout,
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
import { onboardingService } from '@/lib/services/onboarding.service';

export default function NewTemplatePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const template = await onboardingService.createTemplate({ name, description });
            router.push(`/onboarding/templates/${template.id}`);
        } catch (error) {
            console.error('Failed to create template:', error);
        } finally {
            setLoading(false);
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
                        className="rounded-2xl h-12 w-12 p-0 border-white/20 bg-white/20 backdrop-blur-xl group"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5 text-surface-500 group-hover:text-primary-600 transition-colors" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
                            New <span className="text-primary-600">Template</span>
                        </h1>
                        <p className="text-surface-500 font-bold">Define the core metadata for your onboarding blueprint.</p>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-0 shadow-2xl bg-white/40 dark:bg-white/5 backdrop-blur-xl border-t border-white/20 overflow-hidden">
                        <CardContent className="p-10">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 flex items-center gap-2">
                                        <ClipboardList className="h-3.5 w-3.5" />
                                        Template Name
                                    </label>
                                    <Input
                                        required
                                        placeholder="e.g., Engineering Onboarding - Standard"
                                        className="rounded-2xl bg-white/50 dark:bg-black/20 border-0 py-8 px-6 text-xl font-black focus:ring-2 focus:ring-primary-500"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 flex items-center gap-2">
                                        <Info className="h-3.5 w-3.5" />
                                        Description
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Briefly describe what this template is for and which departments should use it."
                                        className="w-full rounded-2xl bg-white/50 dark:bg-black/20 border-0 p-6 font-bold text-surface-700 dark:text-surface-200 focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                <div className="pt-6 border-t border-surface-200/50 dark:border-surface-700/50 flex justify-end">
                                    <Button
                                        type="submit"
                                        isLoading={loading}
                                        disabled={!name}
                                        className="font-black tracking-widest uppercase text-xs bg-gradient-to-r from-primary-600 to-indigo-600 border-0 shadow-xl shadow-primary-500/20 rounded-2xl py-6 px-10"
                                        leftIcon={<Save className="h-4 w-4" />}
                                    >
                                        Create & Configure Tasks
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Info Card */}
                <Card className="border-0 bg-primary-500/5 dark:bg-primary-500/10 border-l-4 border-primary-500 rounded-2xl">
                    <CardContent className="p-6 flex gap-4">
                        <CheckCircle2 className="h-6 w-6 text-primary-500 shrink-0 mt-1" />
                        <div>
                            <p className="font-black text-primary-900 dark:text-primary-100 uppercase tracking-widest text-[10px] mb-1">Standardization Tip</p>
                            <p className="text-sm font-bold text-primary-700 dark:text-primary-300">
                                Creating specialized templates for different roles (e.g., &quot;Software Engineer&quot; vs &quot;Account Executive&quot;) ensures that every new hire gets the exact resources they need from day one.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
