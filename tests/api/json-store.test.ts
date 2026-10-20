import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JsonStore } from '../../apps/api/src/db/json-store';
import { databaseFixture } from '../fixtures/database-fixture';

async function temporaryPaths() {
  const directory = await mkdtemp(join(tmpdir(), 'gc-store-'));
  const seedPath = join(directory, 'seed.json');
  const dataPath = join(directory, 'gc-demo.json');
  await writeFile(seedPath, JSON.stringify(databaseFixture()), 'utf8');
  return { seedPath, dataPath };
}

describe('JsonStore', () => {
  it('evita perder uma mutação quando o repositório é carregado novamente', async () => {
    const paths = await temporaryPaths();
    const first = await JsonStore.create(paths);
    await first.mutate((database) => {
      database.community.description = 'Descrição alterada';
    });

    const second = await JsonStore.create(paths);
    expect(second.snapshot().community.description).toBe('Descrição alterada');
  });

  it('restaura uma cópia exata e independente do seed', async () => {
    const paths = await temporaryPaths();
    const store = await JsonStore.create(paths);
    const original = store.snapshot();
    await store.mutate((database) => {
      database.messages.splice(0);
      database.community.name = 'Alterada';
    });

    expect(await store.reset()).toEqual(original);
    expect(store.snapshot()).toEqual(original);
  });

  it('preserva o arquivo defeituoso quando o JSON ativo é inválido', async () => {
    const paths = await temporaryPaths();
    await writeFile(paths.dataPath, '{invalido', 'utf8');

    await expect(JsonStore.create(paths)).rejects.toThrow('O arquivo de dados está inválido');
    expect(await readFile(paths.dataPath, 'utf8')).toBe('{invalido');
  });
});
