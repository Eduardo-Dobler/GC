import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build as bundle } from 'esbuild';
import { build as buildWeb } from 'vite';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const webRoot = resolve(projectRoot, 'apps/web');
const releaseRoot = resolve(projectRoot, 'release');

async function createRelease() {
  await buildWeb({ root: webRoot, configFile: resolve(webRoot, 'vite.config.ts') });
  // O banco ativo fica em release/data; reconstruir não deve restaurar a demo.
  await rm(resolve(releaseRoot, 'public'), { recursive: true, force: true });
  await mkdir(resolve(releaseRoot, 'data'), { recursive: true });

  await Promise.all([
    cp(resolve(webRoot, 'dist'), resolve(releaseRoot, 'public'), { recursive: true }),
    cp(resolve(projectRoot, 'data/seed.json'), resolve(releaseRoot, 'data/seed.json')),
    bundle({
      entryPoints: [resolve(projectRoot, 'apps/api/src/server.ts')],
      outfile: resolve(releaseRoot, 'server.cjs'),
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      sourcemap: false,
      legalComments: 'none',
      logLevel: 'info',
    }),
  ]);

  console.log('Release offline criada em release/.');
}

createRelease().catch((error) => {
  console.error('Não foi possível criar a release.', error);
  process.exitCode = 1;
});
