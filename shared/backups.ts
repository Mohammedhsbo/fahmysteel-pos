export type BackupRecord = {
  id: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
};

export interface BackupsApi {
  listBackups: () => Promise<BackupRecord[]>;
  createBackup: () => Promise<BackupRecord>;
  restoreBackup: (backupId: string) => Promise<void>;
}
