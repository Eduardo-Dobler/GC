import { resolve } from 'node:path';

const defaultRoot = process.env.INIT_CWD ?? process.cwd();

export const runtimeConfig = {
  port: Number(process.env.PORT ?? 3001),
  projectRoot: resolve(process.env.GC_PROJECT_ROOT ?? defaultRoot),
};

export function databasePaths(root = runtimeConfig.projectRoot) {
  return {
    seedPath: resolve(root, 'data/seed.json'),
    dataPath: resolve(root, 'data/gc-demo.json'),
  };
}
