import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SessionStore } from './auth/session-store';
import { createApp } from './app';
import { databasePaths, runtimeConfig } from './config';
import { JsonStore } from './db/json-store';

async function start() {
  const bundledRoot = typeof __dirname === 'string' ? __dirname : null;
  const runtimeRoot = process.env.GC_PROJECT_ROOT
    ? resolve(process.env.GC_PROJECT_ROOT)
    : bundledRoot && existsSync(resolve(bundledRoot, 'data/seed.json'))
      ? bundledRoot
      : runtimeConfig.projectRoot;
  const staticCandidate = resolve(runtimeRoot, 'public');
  const staticDir = existsSync(resolve(staticCandidate, 'index.html')) ? staticCandidate : undefined;
  const port = process.env.PORT === undefined ? (staticDir ? 3000 : runtimeConfig.port) : Number(process.env.PORT);
  const store = await JsonStore.create(databasePaths(runtimeRoot));
  const sessions = new SessionStore();
  const app = createApp({ store, sessions, staticDir });
  const server = app.listen(port, '127.0.0.1', () => {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : port;
    const url = `http://localhost:${activePort}`;
    console.log(`GC disponível em ${url}`);
    if (process.argv.includes('--open')) openBrowser(url);
  });

  const close = () => server.close(() => process.exit(0));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

function openBrowser(url: string) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const browser = spawn(command, args, { detached: true, stdio: 'ignore' });
  browser.on('error', () => console.log(`Abra ${url} no navegador.`));
  browser.unref();
}

start().catch((error) => {
  console.error('Não foi possível iniciar o GC.', error);
  process.exitCode = 1;
});
