import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const execute = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

it('reconstrói a release preservando os dados salvos e removendo assets antigos', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'gc-build-test-'));
  try {
    for (const path of ['apps', 'packages', 'scripts', 'package.json', 'tsconfig.base.json']) {
      await cp(join(projectRoot, path), join(sandbox, path), {
        recursive: true,
        filter: (source) => !['node_modules', 'dist'].includes(basename(source)),
      });
    }
    await symlink(join(projectRoot, 'node_modules'), join(sandbox, 'node_modules'), 'junction');
    await mkdir(join(sandbox, 'data'), { recursive: true });
    await cp(join(projectRoot, 'data/seed.json'), join(sandbox, 'data/seed.json'));

    const activePath = join(sandbox, 'release/data/gc-demo.json');
    const staleAsset = join(sandbox, 'release/public/assets/old.js');
    const savedDatabase = JSON.parse(await readFile(join(sandbox, 'data/seed.json'), 'utf8'));
    savedDatabase.community.name = 'Comunidade editada durante a apresentação';
    const savedContent = JSON.stringify(savedDatabase);
    await mkdir(join(sandbox, 'release/data'), { recursive: true });
    await mkdir(join(sandbox, 'release/public/assets'), { recursive: true });
    await writeFile(activePath, savedContent);
    await writeFile(staleAsset, 'console.log("asset antigo");');

    await execute(process.execPath, ['--import', 'tsx', 'scripts/build-release.ts'], {
      cwd: sandbox,
      timeout: 45_000,
      maxBuffer: 5 * 1024 * 1024,
    });

    expect(existsSync(activePath)).toBe(true);
    expect(await readFile(activePath, 'utf8')).toBe(savedContent);
    expect(existsSync(staleAsset)).toBe(false);
    expect(existsSync(join(sandbox, 'release/server.cjs'))).toBe(true);
    expect(await readFile(join(sandbox, 'release/public/index.html'), 'utf8')).toContain('<div id="root"></div>');
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}, 60_000);
