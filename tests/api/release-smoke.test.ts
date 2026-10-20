import { describe, expect, it } from 'vitest';
import { startReleaseOnRandomPort } from './release-helper';

describe('release offline', () => {
  it('inicia a release e serve API e SPA sem recursos remotos', async () => {
    const server = await startReleaseOnRandomPort();
    try {
      const health = await fetch(`${server.url}/api/health`).then((response) => response.json()) as { data: { mode: string } };
      expect(health.data.mode).toBe('offline');
      const html = await fetch(server.url).then((response) => response.text());
      expect(html).toContain('<div id="root"></div>');
      expect(html).not.toMatch(/https?:\/\//);
    } finally {
      await server.stop();
    }
  });
});
