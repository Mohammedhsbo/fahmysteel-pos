import type Database from 'better-sqlite3';

export function withTransaction<T>(database: Database.Database, operation: () => T): T {
  return database.transaction(operation)();
}
