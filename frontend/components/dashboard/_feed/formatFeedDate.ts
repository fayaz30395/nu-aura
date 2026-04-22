import {formatDistanceToNow, isToday, parseISO} from 'date-fns';

export function formatFeedDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    return formatDistanceToNow(date, {addSuffix: true});
  } catch {
    return dateStr;
  }
}
