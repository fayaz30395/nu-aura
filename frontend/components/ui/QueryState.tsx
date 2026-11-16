'use client';

import React from 'react';
import {Button} from '@mantine/core';
import {Callout} from './Callout';
import {EmptyState} from './EmptyState';

/**
 * Structural subset of a React Query `UseQueryResult` — any `useQuery` result satisfies it.
 */
export interface QueryStateResult<TData> {
  data: TData | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching?: boolean;
  refetch: () => unknown;
}

/** Props for {@link QueryErrorCard}. */
export interface QueryErrorCardProps {
  title?: string;
  /** User-safe message. Never pass raw server errors here. */
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

const DEFAULT_ERROR_TITLE = "Couldn't load this data";
const DEFAULT_ERROR_MESSAGE = 'Please try again. If the problem continues, contact your administrator.';

/** Inline error card with an optional Retry action. Errors are never rendered as empty states. */
export function QueryErrorCard({
  title = DEFAULT_ERROR_TITLE,
  message = DEFAULT_ERROR_MESSAGE,
  onRetry,
  retrying = false,
  className,
}: QueryErrorCardProps) {
  return (
    <Callout
      tone="danger"
      title={title}
      className={className}
      action={
        onRetry ? (
          <Button size="sm" variant="default" onClick={onRetry} loading={retrying}>
            Retry
          </Button>
        ) : undefined
      }
    >
      {message}
    </Callout>
  );
}

/** Props for {@link QueryState}. */
export interface QueryStateProps<TData> {
  query: QueryStateResult<TData>;
  /** Rendered while the first load is pending (no cached data). */
  skeleton: React.ReactNode;
  /** Returns true when successful data should render as the empty state. */
  isEmpty?: (data: TData) => boolean;
  /** Props for the empty state shown when `isEmpty(data)` is true. */
  empty?: React.ComponentProps<typeof EmptyState>;
  errorTitle?: string;
  /** User-safe error message; the underlying error is never displayed. */
  errorMessage?: string;
  children: (data: TData) => React.ReactNode;
}

/**
 * Renders the pending / error / empty / success branches of a React Query result.
 * Background refetches keep the current content on screen (no skeleton flash).
 */
export function QueryState<TData>({
  query,
  skeleton,
  isEmpty,
  empty,
  errorTitle,
  errorMessage,
  children,
}: QueryStateProps<TData>) {
  const {data, isError, isFetching = false, refetch} = query;
  const dataIsEmpty = data !== undefined && isEmpty !== undefined && isEmpty(data);

  if (isError && (data === undefined || dataIsEmpty)) {
    return (
      <QueryErrorCard
        title={errorTitle}
        message={errorMessage}
        onRetry={() => {
          void refetch();
        }}
        retrying={isFetching}
      />
    );
  }

  if (data === undefined) {
    return <>{skeleton}</>;
  }

  if (dataIsEmpty) {
    return <EmptyState title="Nothing here yet" {...empty} />;
  }

  return <>{children(data)}</>;
}
