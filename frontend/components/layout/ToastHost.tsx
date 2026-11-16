'use client';

import {Notifications} from '@mantine/notifications';
import {useMediaQuery} from '@mantine/hooks';

const DESKTOP_QUERY = '(min-width: 768px)';
const TOAST_AUTO_CLOSE_MS = 5000;
const TOAST_LIMIT = 4;
// Mobile bottom nav is 56px + safe area; keep toasts clear of it.
const MOBILE_BOTTOM_OFFSET = 'calc(76px + env(safe-area-inset-bottom, 0px))';

/**
 * The single toast host. Bottom-right on desktop; bottom-centre above the bottom nav on
 * mobile. Never top-right, so toasts cannot cover the page heading or the top-bar avatar.
 */
export function ToastHost() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY, true, {getInitialValueInEffect: true});
  return (
    <Notifications
      position={isDesktop ? 'bottom-right' : 'bottom-center'}
      autoClose={TOAST_AUTO_CLOSE_MS}
      limit={TOAST_LIMIT}
      containerWidth={380}
      zIndex={400}
      styles={{root: isDesktop ? {} : {bottom: MOBILE_BOTTOM_OFFSET}}}
      data-testid="toast-host"
    />
  );
}
