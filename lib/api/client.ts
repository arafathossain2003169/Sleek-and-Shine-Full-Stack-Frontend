import { ApiResponse } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export class ApiError extends Error {
  status: number;
  errors: { path?: string; message: string }[];

  constructor(message: string, status: number, errors: { path?: string; message: string }[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions extends RequestInit {
  skipRefreshRetry?: boolean;
  /** abort the request after this many ms (default 20s) */
  timeoutMs?: number;
}

/** Endpoints where a 401 means "wrong credentials / no session", never "try refreshing". */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Core request function used by every lib/api/* module.
 * - Sends credentials so HttpOnly cookies (refresh/access token) flow.
 * - On a 401, attempts one silent refresh + retry before giving up.
 * - Unwraps the { success, message, data, meta } envelope automatically.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const { skipRefreshRetry, timeoutMs = 20_000, headers, body, signal, ...rest } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      body,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
    });
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    throw new ApiError(
      aborted ? 'The request took too long. Please try again.' : 'Cannot reach the server. Check your connection and try again.',
      0
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 && !skipRefreshRetry && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefreshRetry: true });
    }
  }

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(
      response.status >= 500 ? 'The server had a problem. Please try again shortly.' : 'Unexpected server response',
      response.status
    );
  }

  if (!json.success) {
    throw new ApiError(json.message, response.status, json.errors);
  }

  return { data: json.data, meta: json.meta ?? {} };
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

export { API_URL };
