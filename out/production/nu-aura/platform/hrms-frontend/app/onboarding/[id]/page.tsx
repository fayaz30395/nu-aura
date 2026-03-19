
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Calendar,
    User,
    CheckCircle,
    Clock,
    FileText,
    HardDrive,
    ExternalLink,
    UploadCloud,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { onboardingService } from '@/lib/services/onboarding.service';
import { OnboardingProcess } from '@/lib/types/onboarding';
import { useGoogleLogin } from '@react-oauth/google';

export default function OnboardingDetailPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const processId = params.id as string;

    const [process, setProcess] = useState<OnboardingProcess | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    // Google Drive State
    const [driveToken, setDriveToken] = useState<string | null>(null);
    const [driveFiles, setDriveFiles] = useState<any[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadProcess();
        const token = localStorage.getItem('nu_drive_token');
        if (token) setDriveToken(token);
    }, []);

    const loadProcess = async () => {
        try {
            setLoading(true);
            const data = await onboardingService.getProcessById(processId);
            setProcess(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load process');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        try {
            setUpdating(true);
            await onboardingService.updateStatus(processId, status as any);
            await loadProcess();
        } catch (err) {
            console.error('Failed to update status', err);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateProgress = async (percentage: number) => {
        try {
            setUpdating(true);
            await onboardingService.updateProgress(processId, percentage);
            await loadProcess();
        } catch (err) {
            console.error('Failed to update progress', err);
        } finally {
            setUpdating(false);
        }
    };

    // Google Drive Integration
    const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            const token = tokenResponse.access_token;
            localStorage.setItem('nu_drive_token', token);
            setDriveToken(token);
        },
        scope: 'https://www.googleapis.com/auth/drive.file', // Scope for uploading
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
                headers: {
                    Authorization: `Bearer ${driveToken}`,
                },
                body: form,
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            console.log('File uploaded:', result);
            alert('File uploaded to Google Drive successfully!');

            // Ideally here we would save the file link to the backend
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file to Google Drive');
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            uploadFileToDrive(e.target.files[0]);
        }
    };

    if (loading) {
        return (
            <AppLayout activeMenuItem="recruitment">
                <div className="flex justify-center items-center h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            </AppLayout>
        );
    }

    if (!process) return null;

    return (
        <AppLayout
            activeMenuItem="recruitment"
            breadcrumbs={[
                { label: 'Onboarding', href: '/onboarding' },
                { label: process.employeeName || 'Details', href: `/onboarding/${processId}` }
            ]}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="h-4 w-4" />}>
                            Back
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                                {process.employeeName || 'Onboarding Process'}
                            </h1>
                            <div className="flex items-center gap-2 mt-1 text-sm text-surface-500">
                                <span className="flex items-center gap-1">
                                    <User className="h-3.5 w-3.5" />
                                    {process.employeeId}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Started: {new Date(process.startDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {process.status !== 'COMPLETED' && (
                            <Button
                                variant="success"
                                onClick={() => handleUpdateStatus('COMPLETED')}
                                isLoading={updating}
                                leftIcon={<CheckCircle className="h-4 w-4" />}
                            >
                                Mark Complete
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Progress Tracker</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm font-medium mb-2">
                                            <span className="text-surface-700 dark:text-surface-300">Overall Completion</span>
                                            <span className="text-primary-600">{process.completionPercentage}%</span>
                                        </div>
                                        <div className="h-3 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500 transition-all duration-500"
                                                style={{ width: `${process.completionPercentage}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[0, 25, 50, 75, 100].map((pct) => (
                                            <button
                                                key={pct}
                                                onClick={() => handleUpdateProgress(pct)}
                                                className={`py-2 px-3 text-sm rounded-lg border transition-colors ${process.completionPercentage >= pct
                                                        ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400'
                                                        : 'border-surface-200 text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800'
                                                    }`}
                                            >
                                                {pct}% Done
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Documents Section (Drive Integration) */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <HardDrive className="h-5 w-5 text-surface-500" />
                                        <CardTitle>Documents</CardTitle>
                                    </div>
                                    {!driveToken ? (
                                        <Button variant="outline" size="sm" onClick={() => googleLogin()}>
                                            Connect Drive
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <label>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={handleFileSelect}
                                                    disabled={uploading}
                                                />
                                                <div className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                                    Upload to Drive
                                                </div>
                                            </label>
                                            <Button variant="ghost" size="sm" onClick={() => router.push('/nu-drive')}>
                                                Open Nu-Drive
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {driveToken ? (
                                    <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-6 text-center border-2 border-dashed border-surface-200 dark:border-surface-700">
                                        <p className="text-surface-500 mb-2">
                                            Uploaded files will be stored in your connected Google Drive.
                                        </p>
                                        <p className="text-xs text-surface-400">
                                            (Note: This is a direct integration. For enterprise storage, use Nu-Drive main page)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-surface-500">Connect to Google Drive to manage onboarding documents.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-surface-500 uppercase">Status</label>
                                    <p className="mt-1 font-medium">{process.status.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-surface-500 uppercase">Start Date</label>
                                    <p className="mt-1 font-medium">{new Date(process.startDate).toLocaleDateString()}</p>
                                </div>
                                {process.expectedCompletionDate && (
                                    <div>
                                        <label className="text-xs font-semibold text-surface-500 uppercase">Expected Completion</label>
                                        <p className="mt-1 font-medium">{new Date(process.expectedCompletionDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-semibold text-surface-500 uppercase">Buddy</label>
                                    <p className="mt-1 font-medium">{process.assignedBuddyName || 'Unassigned'}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap">
                                    {process.notes || 'No notes added.'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
