'use client';

import {RouteErrorFallback, type RouteErrorProps} from '@/components/errors/PageErrorFallback';

export default function OfferPortalError(props: RouteErrorProps) {
  return <RouteErrorFallback {...props} source="offer-portal"/>;
}
