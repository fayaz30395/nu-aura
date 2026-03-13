'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  HardDrive,
  Users,
  Clock,
  Upload,
  FolderPlus,
  Share2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileText,
  Code,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useGoogleLogin } from '@react-oauth/google';
import { getGoogleToken, saveGoogleToken, clearGoogleToken } from '@/lib/utils/googleToken';

type DriveTab = 'team-docs' | 'shared' | 'recent';

function FluenceDriveContent() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DriveTab>('team-docs');
  const [error, setError] = useState<string | null>(null);

  // Save token using unified storage
  const saveToken = (token: string, expiresIn: number = 3600) => {
    saveGoogleToken(token, expiresIn);
    setAccessToken(token);
  };

  // Clear stored token
  const clearToken = () => {
    clearGoogleToken();
    setAccessToken(null);
  };

  // Get stored token
  const getStoredToken = (): string | null => {
    return getGoogleToken();
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      saveToken(tokenResponse.access_token, tokenResponse.expires_in);
      setError(null);
    },
    onError: (errorResponse) => {
      console.error('Google login error:', errorResponse);
      setError('Failed to connect to Google Drive. Please try again.');
    },
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata',
  });

  // Check for stored token on mount
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    const storedToken = getStoredToken();
    if (storedToken) {
      setAccessToken(storedToken);
    }
    setIsLoading(false);
  }, [hasHydrated, isAuthenticated, router]);

  const handleConnectClick = () => {
    googleLogin();
  };

  const handleDisconnect = () => {
    clearToken();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-100 dark:bg-surface-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-surface-500 font-medium">Loading NU-Fluence Drive...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      activeMenuItem="fluence-drive"
      breadcrumbs={[{ label: 'Drive', href: '/fluence/drive' }]}
    >
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <HardDrive className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                NU-Fluence Drive
              </h1>
              <p className="text-surface-500 dark:text-surface-400">
                Share and embed documents across your knowledge base
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        {!accessToken ? (
          // Connection CTA
          <Card className="border-2 border-dashed border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900/50">
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <HardDrive className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">
                    Connect Your Google Drive
                  </h3>
                  <p className="text-surface-500 dark:text-surface-400 max-w-md mx-auto">
                    Access your team's documents, share files, and embed them directly into wiki
                    pages and blogs.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleConnectClick}
                  leftIcon={<HardDrive className="h-5 w-5" />}
                >
                  Connect Google Drive
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center py-6"
                disabled
              >
                <Upload className="h-6 w-6 mb-2 opacity-50" />
                <span className="text-sm">Upload Document</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center py-6"
                disabled
              >
                <FolderPlus className="h-6 w-6 mb-2 opacity-50" />
                <span className="text-sm">Create Folder</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex flex-col items-center justify-center py-6"
                disabled
              >
                <Share2 className="h-6 w-6 mb-2 opacity-50" />
                <span className="text-sm">Share File</span>
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700">
              {[
                { id: 'team-docs' as const, label: 'Team Documents', icon: FileText },
                { id: 'shared' as const, label: 'Shared with Me', icon: Users },
                { id: 'recent' as const, label: 'Recent Files', icon: Clock },
              ].map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors',
                      activeTab === tab.id
                        ? 'text-violet-600 dark:text-violet-400 border-violet-600 dark:border-violet-400'
                        : 'text-surface-600 dark:text-surface-400 border-transparent hover:text-surface-900 dark:hover:text-surface-50'
                    )}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content - Empty States */}
            <div className="grid gap-4">
              {activeTab === 'team-docs' && (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-surface-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-surface-900 dark:text-surface-50">
                          No team documents yet
                        </h4>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          Start by uploading your first document
                        </p>
                      </div>
                      <Button variant="outline" disabled size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'shared' && (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                        <Users className="h-6 w-6 text-surface-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-surface-900 dark:text-surface-50">
                          No shared documents
                        </h4>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          Files shared with you will appear here
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'recent' && (
                <Card className="border-2 border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-surface-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-surface-900 dark:text-surface-50">
                          No recent files
                        </h4>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          Your recently accessed files will appear here
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* How to Embed Section */}
            <Card className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  How to Embed Files in Wiki Pages
                </h3>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-surface-900 dark:text-surface-50">
                        Upload your document
                      </p>
                      <p className="text-sm text-surface-600 dark:text-surface-400">
                        Use the "Upload Document" button to add files to your team drive
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-surface-900 dark:text-surface-50">
                        Copy the file link
                      </p>
                      <p className="text-sm text-surface-600 dark:text-surface-400">
                        Right-click on the file and select "Share File" to get a shareable link
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-surface-900 dark:text-surface-50">
                        Embed in wiki/blog
                      </p>
                      <p className="text-sm text-surface-600 dark:text-surface-400">
                        Paste the link in your wiki page or blog post using the embed syntax
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Embed Examples */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Embed Examples
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      For Google Docs:
                    </p>
                    <pre className="bg-surface-100 dark:bg-surface-900 p-3 rounded-lg text-xs overflow-x-auto">
                      {`[embed]https://docs.google.com/document/d/FILE_ID/preview[/embed]`}
                    </pre>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      For PDFs:
                    </p>
                    <pre className="bg-surface-100 dark:bg-surface-900 p-3 rounded-lg text-xs overflow-x-auto">
                      {`[embed]https://drive.google.com/file/d/FILE_ID/preview[/embed]`}
                    </pre>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                      For Spreadsheets:
                    </p>
                    <pre className="bg-surface-100 dark:bg-surface-900 p-3 rounded-lg text-xs overflow-x-auto">
                      {`[embed]https://docs.google.com/spreadsheets/d/FILE_ID/preview[/embed]`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disconnect Button */}
            <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-700">
              <Button variant="outline" onClick={handleDisconnect} size="sm">
                Disconnect Google Drive
              </Button>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function FluenceDrivePage() {
  return <FluenceDriveContent />;
}

// Utility function (can be moved to driveHelpers.ts if needed elsewhere)
function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
