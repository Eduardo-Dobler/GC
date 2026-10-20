import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

export interface RunningRelease {
  url: string;
  runtimeRoot: string;
  process: ChildProcessWithoutNullStreams;
  stop: () => Promise<void>;
}

interface StartReleaseOptions {
  runtimeRoot?: string;
  cleanupOnStop?: boolean;
}

export async function startReleaseOnRandomPort(options: StartReleaseOptions = {}): Promise<RunningRelease> {
  const createdSandbox = !options.runtimeRoot;
  const runtimeRoot = options.runtimeRoot ?? await mkdtemp(join(tmpdir(), 'gc-release-'));
  if (createdSandbox) await cp(resolve(projectRoot, 'release'), runtimeRoot, { recursive: true });
  const cleanupOnStop = options.cleanupOnStop ?? createdSandbox;
  const child = spawn(process.execPath, ['server.cjs'], {
    cwd: runtimeRoot,
    env: { ...process.env, PORT: '0' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let url: string;
  try {
    url = await new Promise<string>((resolveUrl, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`A release não iniciou a tempo.\n${output}`)), 10_000);
    const inspect = (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/GC disponível em (http:\/\/[^\s]+)/);
      if (match) { clearTimeout(timeout); resolveUrl(match[1]); }
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
    child.once('exit', (code) => {
      if (!output.match(/GC disponível em/)) { clearTimeout(timeout); reject(new Error(`A release encerrou com código ${code}.\n${output}`)); }
    });
    });
  } catch (error) {
    if (child.exitCode === null) child.kill('SIGTERM');
    if (createdSandbox) await rm(runtimeRoot, { recursive: true, force: true });
    throw error;
  }

  let stopped = false;
  return {
    url,
    runtimeRoot,
    process: child,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      if (child.exitCode === null) {
        await new Promise<void>((resolveStop) => {
          child.once('exit', () => resolveStop());
          child.kill('SIGTERM');
        });
      }
      if (cleanupOnStop) await rm(runtimeRoot, { recursive: true, force: true });
    },
  };
}
