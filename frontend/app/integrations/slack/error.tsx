'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SlackIntegrationError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="integrations/slack"/>;
}
