// Common Types

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string>;
}

export interface SelectOption {
  value: string;
  label: string;
}
