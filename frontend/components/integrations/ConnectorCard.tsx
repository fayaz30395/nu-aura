'use client';

import React from 'react';
import {AlertCircle, CheckCircle2, Settings} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {ConnectorInfo, ConnectorStatus} from '@/lib/types/core/connector';

interface ConnectorCardProps {
  connector: ConnectorInfo;
  status?: ConnectorStatus;
  onConfigure: (connectorId: string) => void;
  isLoading?: boolean;
}

export function ConnectorCard({connector, status, onConfigure, isLoading}: ConnectorCardProps) {
  const statusColors = {
    ACTIVE: {
      bg: 'bg-[var(--ok-bg)]',
      text: 'text-[var(--ok-fg)]',
      icon: 'text-[var(--ok-fg)]',
    },
    INACTIVE: {
      bg: 'bg-[var(--surface)]',
      text: 'text-[var(--text-2)]',
      icon: 'text-[var(--text-3)]',
    },
    ERROR: {
      bg: 'bg-[var(--err-bg)]',
      text: 'text-[var(--err-fg)]',
      icon: 'text-[var(--err-fg)]',
    },
  };

  const colors = status ? statusColors[status] : statusColors.INACTIVE;
  const isActive = status === 'ACTIVE';

  return (
    <Card variant="default" hover isClickable padding="md" className="card-interactive h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{connector.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{connector.description}</CardDescription>
          </div>
          <div
            className={`flex-shrink-0 h-10 w-10 rounded-lg ${colors.bg} flex items-center justify-center`}
          >
            {isActive ? (
              <CheckCircle2 className={`h-5 w-5 ${colors.icon}`}/>
            ) : status === 'ERROR' ? (
              <AlertCircle className={`h-5 w-5 ${colors.icon}`}/>
            ) : (
              <Settings className={`h-5 w-5 ${colors.icon}`}/>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Type Badge */}
        <div className="flex flex-wrap gap-2">
          <span
            className="badge-status inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-aura-2)] text-[var(--text-2)]">
            {connector.type}
          </span>
        </div>

        {/* Status */}
        {status && (
          <div className={`badge-status px-4 py-1.5 rounded-lg ${colors.bg} ${colors.text} text-sm font-medium`}>
            {status === 'ACTIVE' ? 'Connected' : status === 'ERROR' ? 'Error' : 'Not Configured'}
          </div>
        )}

        {/* Capabilities */}
        {connector.capabilities.supportedEvents.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-soft)]">
            <p className="text-xs font-semibold text-[var(--text-2)] mb-2 uppercase tracking-[0.1em]">
              Supports
            </p>
            <div className="flex flex-wrap gap-1">
              {connector.capabilities.supportedEvents.slice(0, 3).map((event) => (
                <span
                  key={event}
                  className="inline-flex text-xs px-2 py-1 rounded-[var(--r-xs)] bg-[var(--surface-aura-2)] text-[var(--text-2)]"
                >
                  {event}
                </span>
              ))}
              {connector.capabilities.supportedEvents.length > 3 && (
                <span
                  className="inline-flex text-xs px-2 py-1 rounded-[var(--r-xs)] bg-[var(--surface-aura-2)] text-[var(--text-2)]">
                  +{connector.capabilities.supportedEvents.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          variant="soft"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            onConfigure(connector.connectorId);
          }}
          disabled={isLoading}
          className="mt-auto"
        >
          Configure
        </Button>
      </CardContent>
    </Card>
  );
}
