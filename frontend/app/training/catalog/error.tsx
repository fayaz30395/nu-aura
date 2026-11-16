'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function CatalogError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="training/catalog"/>;
}
