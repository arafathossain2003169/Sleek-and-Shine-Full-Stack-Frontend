import { ApiError } from './client';

/**
 * Turns any thrown value into a message that is useful to the person reading it:
 * validation failures list the offending fields instead of just "Validation failed".
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof ApiError) {
    const details = (err.errors ?? [])
      .filter((e) => e && typeof e.message === 'string')
      .slice(0, 3)
      .map((e) => (e.path ? `${e.path}: ${e.message}` : e.message));
    if (details.length > 0) return `${err.message} — ${details.join('; ')}`;
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}
