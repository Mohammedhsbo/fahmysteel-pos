# Fahmy Steel POS

Offline desktop application foundation using Electron, React, Vite, TypeScript, and SQLite.

- Electron Main owns SQLite, IPC, and native desktop services.
- Preload exposes the secure IPC bridge.
- React and Vite run in the Renderer.
- Database migrations are kept under `database/migrations/`.
- The runtime database is stored under Electron's local `userData` directory.
- Renderer access is limited to the typed preload API; SQLite stays in Main.
- Main-process helpers provide password hashing, session state, RBAC checks, and SQLite transactions.

Run `npm run dev` to build the Electron process, start the Vite renderer, and launch the desktop app with hot renderer updates. Use `npm run build` for a production bundle.

Feature modules and financial workflows are intentionally not implemented yet.
