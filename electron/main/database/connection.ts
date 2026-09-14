import Database from 'better-sqlite3';
import { app } from 'electron';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

let database: Database.Database | undefined;

export function getDatabase(): Database.Database {
  if (!database) {
    const databaseDirectory = path.join(app.getPath('userData'), 'database');
    mkdirSync(databaseDirectory, { recursive: true });
    database = new Database(path.join(databaseDirectory, 'fahmy-steel.sqlite'));
    database.pragma('foreign_keys = ON');
    database.pragma('journal_mode = WAL');
  }

  return database;
}

export function closeDatabase(): void {
  database?.close();
  database = undefined;
}
