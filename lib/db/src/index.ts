import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import * as schema from "./schema";

function findWorkspaceRoot(start: string): string {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(start);
    current = parent;
  }
}

const defaultPath = join(findWorkspaceRoot(process.cwd()), "data", "exam-seating.sqlite");
const configuredPath = process.env.SQLITE_DB_PATH ?? defaultPath;
const databasePath = configuredPath === ":memory:"
  ? configuredPath
  : isAbsolute(configuredPath)
    ? configuredPath
    : resolve(process.cwd(), configuredPath);

if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), { recursive: true });
}

const sqlite = new Database(databasePath);
export const db = drizzle(sqlite, { schema });

export * from "./schema";
