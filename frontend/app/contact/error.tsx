'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function ContactError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="contact"/>;
}
