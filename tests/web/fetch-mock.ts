import { vi } from 'vitest';

export function mockFetchSequence(...payloads: Array<{ status?: number; body?: unknown } | unknown>) {
  const fetchMock = vi.fn();
  for (const payload of payloads) {
    const shaped = payload && typeof payload === 'object' && ('status' in payload || 'body' in payload)
      ? payload as { status?: number; body?: unknown }
      : { status: 200, body: payload };
    fetchMock.mockResolvedValueOnce(new Response(
      shaped.body === undefined ? null : JSON.stringify(shaped.body),
      { status: shaped.status ?? 200, headers: { 'Content-Type': 'application/json' } },
    ));
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
