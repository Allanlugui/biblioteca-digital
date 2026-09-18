export type ApiResponse<T> = {
  data: T;
  error: null;
};

export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiError = {
  data: null;
  error: ApiErrorPayload;
};