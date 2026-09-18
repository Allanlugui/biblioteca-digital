import type { ZodError } from "zod";
import type { ApiError } from "@/types";

export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  NOT_FOUND: "NOT_FOUND",
  INVALID_URL: "INVALID_URL",
  DESTINATION_BLOCKED: "DESTINATION_BLOCKED",
  RESOLUTION_FAILED: "RESOLUTION_FAILED",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  INVALID_MEDIA_TYPE: "INVALID_MEDIA_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  TIMEOUT: "TIMEOUT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export type ResponseHeaders = Record<string, string>;

export function ok<T>(data: T, headers: ResponseHeaders = {}, status = 200): Response {
  const body = { data, error: null };
  return Response.json(body, { status, headers });
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
  headers: ResponseHeaders = {},
): Response {
  const body: ApiError = {
    data: null,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return Response.json(body, { status, headers });
}

export function formatZodErrors(error: ZodError): unknown {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  };
}