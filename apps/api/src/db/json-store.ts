import { AsyncLocalStorage } from 'node:async_hooks';
import { projectCommunity, applyCommunity } from '../services/community-space';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { demoDatabaseSchema, type DemoDatabase } from '@gc/shared';

export interface JsonStorePaths {
  seedPath: string;
  dataPath: string;
}

async function readDatabase(path: string): Promise<DemoDatabase> {
  try {
    const raw = await readFile(path, 'utf8');
    const database = demoDatabaseSchema.parse(JSON.parse(raw));
    if (database.accessPolicyVersion !== 1) {
      for (const roles of [database.roles, ...(database.communitySpaces ?? []).map(space => space.roles)]) {
        for (const role of roles) if (role.system && role.id !== 'role-member' && !role.permissions.includes('CREATE_CHANNELS')) role.permissions.push('CREATE_CHANNELS');
      }
      database.accessPolicyVersion = 1;
    }
    return database;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('ENOENT')) throw error;
    throw new Error(`O arquivo de dados está inválido: ${path}`, { cause: error });
  }
}

export class JsonStore {
  private readonly context = new AsyncLocalStorage<string>();

  withCommunity<T>(id: string, operation: () => T): T { return this.context.run(id, operation); }

  private queue: Promise<void> = Promise.resolve();

  private constructor(
    private readonly paths: JsonStorePaths,
    private state: DemoDatabase,
  ) {}

  static async create(paths: JsonStorePaths): Promise<JsonStore> {
    const seed = await readDatabase(paths.seedPath);
    let state: DemoDatabase;

    try {
      state = await readDatabase(paths.dataPath);
    } catch (error) {
      const cause = error as NodeJS.ErrnoException;
      if (cause.code !== 'ENOENT') throw error;
      await mkdir(dirname(paths.dataPath), { recursive: true });
      await writeFile(paths.dataPath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
      state = structuredClone(seed);
    }

    return new JsonStore(paths, state);
  }

  snapshot(): DemoDatabase {
    const database = structuredClone(this.state);
    const id = this.context.getStore();
    return id ? projectCommunity(database, id) : database;
  }

  async mutate(mutator: (database: DemoDatabase) => void | Promise<void>): Promise<DemoDatabase> {
    let result: DemoDatabase | undefined;
    const communityId = this.context.getStore();
    const operation = this.queue.then(async () => {
      const next = structuredClone(this.state);
      const local = communityId ? projectCommunity(next, communityId) : next;
      await mutator(local);
      if (local !== next) applyCommunity(next, local);
      const validated = demoDatabaseSchema.parse(next);
      await this.persist(validated);
      this.state = validated;
      result = communityId ? projectCommunity(structuredClone(validated), communityId) : structuredClone(validated);
    });
    this.queue = operation.catch(() => undefined);
    await operation;
    return result!;
  }

  async reset(): Promise<DemoDatabase> {
    let result: DemoDatabase | undefined;
    const operation = this.queue.then(async () => {
      const seed = await readDatabase(this.paths.seedPath);
      await this.persist(seed);
      this.state = structuredClone(seed);
      result = structuredClone(seed);
    });
    this.queue = operation.catch(() => undefined);
    await operation;
    return result!;
  }

  private async persist(database: DemoDatabase): Promise<void> {
    await mkdir(dirname(this.paths.dataPath), { recursive: true });
    const temporaryPath = `${this.paths.dataPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, this.paths.dataPath);
  }
}
