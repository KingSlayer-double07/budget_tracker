// Stand-in for expo-sqlite in tests, backed by Node's built-in SQLite so the
// app's real SQL runs against a real (in-memory) database.
import { DatabaseSync } from "node:sqlite"

type Params = unknown[] | undefined

const toArgs = (params: Params) => (params ?? []) as any[]
// node:sqlite returns null-prototype rows; copy them into plain objects
const plain = <T>(row: unknown): T => (row ? { ...(row as object) } : row) as T

export const createTestDatabase = () => {
  const db = new DatabaseSync(":memory:")
  return {
    execAsync: async (sql: string) => {
      db.exec(sql)
    },
    runAsync: async (sql: string, params?: Params) => {
      const result = db.prepare(sql).run(...toArgs(params))
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      }
    },
    getFirstAsync: async <T>(sql: string, params?: Params) =>
      plain<T | null>(db.prepare(sql).get(...toArgs(params)) ?? null),
    getAllAsync: async <T>(sql: string, params?: Params) =>
      db
        .prepare(sql)
        .all(...toArgs(params))
        .map((row: unknown) => plain<T>(row)),
  }
}
