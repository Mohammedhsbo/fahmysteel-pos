import { app, BrowserWindow } from 'electron';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabase, getDatabase } from './database/connection.js';
import { runMigrations } from './database/migrations.js';
import { seedFoundation } from './database/seed-foundation.js';
import { registerIpcHandlers } from './ipc/register-handlers.js';

let mainWindow: BrowserWindow | undefined;
const currentDirectory = dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f7f7f5',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(currentDirectory, '../preload/index.cjs'),
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(path.join(currentDirectory, '../../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  const database = getDatabase();
  runMigrations(database);
  seedFoundation(database);
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') app.quit();
});
