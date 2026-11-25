import type { ApiFailure } from '@gc/shared';

export const TOKEN_KEY = 'gc_demo_token';
export const COMMUNITY_KEY = 'gc_active_community';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const communityId = localStorage.getItem(COMMUNITY_KEY);
  if (communityId) headers.set('X-Community-Id', communityId);

  const response = await fetch(`/api${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const payload = await response.json() as { data?: T } & ApiFailure;

  if (!response.ok || !('data' in payload)) {
    if (response.status === 401) window.dispatchEvent(new Event('gc-session-expired'));
    throw new ApiClientError(
      payload.error?.message ?? 'Não foi possível concluir a solicitação.',
      response.status,
      payload.error?.code ?? 'REQUEST_FAILED',
      payload.error?.fields,
    );
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  put: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};
