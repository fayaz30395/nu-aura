'use client';

import React from 'react';
import { Mail, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface OAuthPanelProps {
  isConnected: boolean;
  unreadCount: number;
  error: string | null;
  onConnect: () => void;
  onCompose: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export function OAuthPanel({
  isConnected,
  unreadCount,
  error,
  onConnect,
  onCompose,
  onRefresh,
  onDisconnect,
}: OAuthPanelProps) {
  return (
    <>
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-danger-500 to-warning-500 flex items-center justify-center">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Nu-Mail</h1>
            <p className="text-sm text-[var(--text-muted)]">Your organization&apos;s Gmail inbox</p>
          </div>
        </div>
        {!isConnected ? (
          <Button
            variant="primary"
            onClick={onConnect}
            leftIcon={<Mail className="h-4 w-4" />}
          >
            Connect Gmail
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-danger-100 dark:bg-danger-950 text-danger-600 dark:text-danger-400 rounded-full text-sm font-medium">
                {unreadCount} unread
              </span>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={onCompose}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Compose
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              className="text-[var(--text-muted)] hover:text-danger-600"
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-4 text-danger-600 dark:text-danger-400">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={onConnect} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connect Card (shown when not connected) */}
      {!isConnected && (
        <Card className="border-2 border-dashed border-[var(--border-main)] dark:border-[var(--border-main)]">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-danger-50 dark:bg-danger-950/30 flex items-center justify-center mx-auto mb-6">
                <Mail className="h-10 w-10 text-danger-600 dark:text-danger-400" />
              </div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                Connect to Gmail
              </h2>
              <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
                Access your organization&apos;s Gmail directly within NuLogic.
                Read, send, and manage your emails all in one place.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={onConnect}
                leftIcon={<Mail className="h-5 w-5" />}
              >
                Connect Gmail
              </Button>
              <p className="text-xs text-[var(--text-muted)] mt-4">
                You&apos;ll be asked to grant access to read and send emails.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
