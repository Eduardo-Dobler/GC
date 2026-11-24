import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@gc/shared': `${root}packages/shared/src/index.ts`,
    },
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'web',
          include: ['tests/web/**/*.test.tsx'],
          environment: 'jsdom',
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
          exclude: ['tests/web/**/*.test.tsx'],
          environment: 'node',
        },
      },
    ],
    pool: 'forks',
    setupFiles: ['tests/web/setup.ts'],
  },
});
