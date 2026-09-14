import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const root = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const viteCli = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const electronCli = path.join(root, 'node_modules', 'electron', 'cli.js');

function stop(child) {
  if (!child || child.killed) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function fail(message) {
  console.error(`[dev] ${message}`);
  process.exitCode = 1;
}

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => {
      server.close();
      findFreePort(startPort + 1).then(resolve, reject);
    });
    server.listen(startPort, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : startPort));
    });
  });
}

if (!existsSync(viteCli) || !existsSync(electronCli)) {
  fail('Dependencies are missing. Run npm install first.');
} else {
  const build = spawnSync(npmCommand, ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (build.status !== 0) {
    fail('Initial build failed; development server was not started.');
  } else {
    const port = await findFreePort(5173);
    const devServerUrl = `http://127.0.0.1:${port}`;
    const vite = spawn(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env },
    });

    let electron;
    let shuttingDown = false;

    async function waitForVite() {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
          const response = await fetch(devServerUrl);
          if (response.ok) return true;
        } catch {
          // Vite is still starting.
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return false;
    }

    const ready = await waitForVite();
    if (!ready) {
      stop(vite);
      fail(`Vite did not become ready on ${devServerUrl}.`);
    } else {
      electron = spawn(process.execPath, [electronCli, '.'], {
        cwd: root,
        stdio: 'inherit',
        env: { ...process.env, VITE_DEV_SERVER_URL: devServerUrl },
      });

      const shutdown = (code = 0) => {
        if (shuttingDown) return;
        shuttingDown = true;
        stop(electron);
        stop(vite);
        process.exit(code);
      };

      electron.on('exit', (code) => shutdown(code ?? 0));
      process.on('SIGINT', () => shutdown(0));
      process.on('SIGTERM', () => shutdown(0));
    }
  }
}
