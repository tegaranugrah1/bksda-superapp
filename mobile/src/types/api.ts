export interface ApiSuccess<T> {
  data: T;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
  message?: string;
  [key: string]: any;
}

export interface ApiError {
  status?: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
  kind: 'auth' | 'forbidden' | 'not_found' | 'validation' | 'rate_limit' | 'server' | 'network' | 'unknown';
}
