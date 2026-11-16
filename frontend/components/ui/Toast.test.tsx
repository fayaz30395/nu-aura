import {beforeEach, describe, expect, it, vi} from 'vitest';
import {notifications} from '@mantine/notifications';
import {showToast} from './Toast';

vi.mock('@mantine/notifications', () => ({notifications: {show: vi.fn()}}));

const shown = () => vi.mocked(notifications.show).mock.calls[0][0];

describe('showToast', () => {
  beforeEach(() => vi.mocked(notifications.show).mockClear());

  it.each([
    ['success', 5000],
    ['info', 5000],
    ['error', 7000],
  ] as const)('auto-dismisses %s after %ims', (type, ms) => {
    showToast({type, message: 'm'});
    expect(shown().autoClose).toBe(ms);
  });

  it('keeps the toast open when duration is 0', () => {
    showToast({type: 'success', message: 'm', duration: 0});
    expect(shown().autoClose).toBe(false);
  });

  it('announces errors assertively and others politely, with icon and close button', () => {
    showToast({type: 'error', message: 'm'});
    expect(shown()).toMatchObject({role: 'alert', withCloseButton: true});
    expect(shown().icon).toBeTruthy();
    vi.mocked(notifications.show).mockClear();
    showToast({type: 'success', message: 'm'});
    expect(shown().role).toBe('status');
  });
});
