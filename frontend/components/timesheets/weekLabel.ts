import {formatDateShort} from '@/lib/utils/format/date';

export const weekLabel = (start: string, end: string): string =>
  `${formatDateShort(start)} - ${formatDateShort(end)}`;
