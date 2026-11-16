'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function SettingsPrivacyError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="settings/privacy"/>;
}
