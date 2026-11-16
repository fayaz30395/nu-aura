import type {MeetingAgendaItemRequest} from '@/lib/types/hrms/meeting';

export const MAX_AGENDA_TEMPLATE_ITEMS = 30;
export const MAX_AGENDA_ITEM_LENGTH = 300;

/** One bullet per line; trims, drops blanks and strips leading "-", "*" or "•" markers. */
export function parseAgendaBullets(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

/** Returns an error message, or null when the name and bullets are valid. */
export function validateAgendaTemplate(name: string, items: string[]): string | null {
  if (!name.trim()) return 'Template name is required';
  if (items.length === 0) return 'Add at least one agenda item';
  if (items.length > MAX_AGENDA_TEMPLATE_ITEMS) return `At most ${MAX_AGENDA_TEMPLATE_ITEMS} agenda items`;
  if (items.some((i) => i.length > MAX_AGENDA_ITEM_LENGTH)) {
    return `Each agenda item must be ${MAX_AGENDA_ITEM_LENGTH} characters or fewer`;
  }
  return null;
}

/** Turns template bullets into agenda requests for the schedule call (order is 1-based). */
export function toAgendaRequests(items: string[]): MeetingAgendaItemRequest[] {
  return items.map((title, index) => ({title, itemOrder: index + 1}));
}
