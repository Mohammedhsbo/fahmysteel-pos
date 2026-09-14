import { app } from 'electron';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { closeDatabase, getDatabase } from './database/connection.js';
import type { BackupRecord } from '../../shared/backups.js';

function getBackupDirectory(): string {
  const directory = path.join(app.getPath('userData'), 'backups');
  mkdirSync(directory, { recursive: true });
  return directory;
}

function toBackupRecord(fileName: string): BackupRecord {
  const filePath = path.join(getBackupDirectory(), fileName);
  const stats = statSync(filePath);
  return {
    id: fileName,
    fileName,
    createdAt: stats.birthtime.toISOString(),
    sizeBytes: stats.size,
  };
}

function isBackupFile(fileName: string): boolean {
  return /^fahmy-steel-\d{8}T\d{6}Z\.sqlite$/.test(fileName);
}

export function listBackups(): BackupRecord[] {
  return readdirSync(getBackupDirectory())
    .filter(isBackupFile)
    .map(toBackupRecord)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createBackup(): BackupRecord {
  const database = getDatabase();
  database.pragma('wal_checkpoint(TRUNCATE)');

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const fileName = `fahmy-steel-${timestamp}.sqlite`;
  const backupPath = path.join(getBackupDirectory(), fileName);
  const databasePath = path.join(app.getPath('userData'), 'database', 'fahmy-steel.sqlite');
  copyFileSync(databasePath, backupPath);

  return toBackupRecord(fileName);
}

export function restoreBackup(backupId: string): void {
  if (!isBackupFile(backupId)) throw new Error('Invalid backup identifier.');

  const backupPath = path.join(getBackupDirectory(), backupId);
  const databasePath = path.join(app.getPath('userData'), 'database', 'fahmy-steel.sqlite');
  if (!statExists(backupPath)) throw new Error('Backup file not found.');

  closeDatabase();
  copyFileSync(backupPath, databasePath);
}

function statExists(filePath: string): boolean {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}
