import path from 'path';
import { startServer } from './index.js';
import type { ProjectInfo } from './types.js';

/**
 * Dev-only entrypoint used by `npm run dev -w @verya/server`.
 *
 * It serves the app in `VERYA_PROJECT` (defaults to this monorepo's UI package
 * so `npm run dev` works out of the box) without creating a session copy.
 */
async function main() {
  const projectRoot = path.resolve(process.env.VERYA_PROJECT || process.cwd());
  const serverPort = Number(process.env.VERYA_PORT || 3111);
  const previewPort = Number(process.env.VERYA_PREVIEW_PORT || 3112);
  const vitePort = Number(process.env.VERYA_VITE_PORT || 5173);

  const projectInfo: ProjectInfo = {
    name: path.basename(projectRoot),
    root: projectRoot,
    originalRoot: projectRoot,
    sessionId: process.env.VERYA_SESSION_ID || '',
    framework: 'react',
    language: 'typescript',
    packageManager: 'npm',
    hasTailwind: true,
    hasCSS: true,
    entryFile: path.join(projectRoot, 'src', 'App.tsx'),
    previewUrl: `http://localhost:${previewPort}`,
  };

  await startServer(projectInfo, vitePort, serverPort, previewPort);
  console.log(`Verya dev server → http://localhost:${serverPort}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
