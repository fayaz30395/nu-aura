import type {FeedbackType} from '@/lib/types/grow/performance';

export const FEEDBACK_TYPE_OPTIONS: {value: FeedbackType; label: string}[] = [
  {value: 'PRAISE', label: 'Praise'},
  {value: 'CONSTRUCTIVE', label: 'Constructive'},
  {value: 'GENERAL', label: 'General'},
  {value: 'REQUEST', label: 'Request'},
];

export const FEEDBACK_TYPE_COLOR: Record<FeedbackType, string> = {
  PRAISE: 'green',
  CONSTRUCTIVE: 'yellow',
  GENERAL: 'blue',
  REQUEST: 'grape',
};
