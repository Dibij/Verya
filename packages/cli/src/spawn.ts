import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import detectPort from 'detect-port';
import chalk from 'chalk';
import { startServer, sessionManager } from '@verya/server';
import type { ProjectInfo } from '@verya/server';
import type { DetectedProject } from './detect.js';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findAvailablePort(startPort: number): Promise<number> {
  return await detectPort(startPort);
}

async function getViteBin(root: string): Promise<string> {
  const localVite = path.join(root, 'node_modules', '.bin', 'vite');
  if (await fileExists(localVite)) {
    return localVite;
  }
  return 'npx';
}

/**
 * Ensures the session directory has all npm dependencies installed.
 * The session symlinks node_modules from the original project if available;
 * if the original project has no node_modules (e.g. fresh clone, bare component),
 * we run npm install in the session directory so Vite can resolve react, etc.
 */
async function ensureDependencies(
  sessionRoot: string,
  originalRoot: string,
  packageManager: string,
  verbose = false,
): Promise<void> {
  const reactInSession = path.join(sessionRoot, 'node_modules', 'react');
  if (await fileExists(reactInSession)) {
    return; // already good
  }

  // Check if the original project has node_modules
  const origNodeModules = path.join(originalRoot, 'node_modules', 'react');
  if (await fileExists(origNodeModules)) {
    // Symlink was supposed to be created by SessionManager; nothing more to do
    return;
  }

  // Original project has no node_modules — install in the session directory
  console.log(chalk.yellow('⚠ Dependencies not found. Installing in session workspace...'));
  const pm = packageManager === 'pnpm' ? 'pnpm' : packageManager === 'yarn' ? 'yarn' : 'npm';
  const installCmd = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn install' : 'pnpm install';

  try {
    execSync(installCmd, {
      cwd: sessionRoot,
      stdio: verbose ? 'inherit' : 'pipe',
      timeout: 120_000,
    });
    console.log(chalk.green('✓ Dependencies installed'));
  } catch (err) {
    console.warn(chalk.yellow(`  Could not install deps: ${err instanceof Error ? err.message : err}`));
    console.warn(chalk.gray('  Preview may fail to load if react/react-dom are missing.'));
  }
}

/**
 * Ensures the session directory has a Vite-compatible index.html.
 * Projects that only have e.g. src/App.tsx without an index.html or main.tsx
 * won't be served by Vite. We generate a minimal bootstrap for them.
 */
async function ensureIndexHtml(
  sessionRoot: string,
  relEntry: string,       // e.g. "src/App.tsx"
  language: 'typescript' | 'javascript',
): Promise<void> {
  const indexHtmlPath = path.join(sessionRoot, 'index.html');
  if (await fileExists(indexHtmlPath)) {
    return; // project already has one
  }

  // Check whether a main entry already exists (main.tsx / main.jsx / src/main.tsx …)
  const mainCandidates = [
    'src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx',
    'main.tsx', 'main.jsx', 'index.tsx', 'index.jsx',
  ];
  for (const candidate of mainCandidates) {
    if (await fileExists(path.join(sessionRoot, candidate))) {
      // A main entry exists — just scaffold index.html pointing to it
      const mainSrc = `/${candidate}`;
      const html = buildIndexHtml(mainSrc);
      await fs.writeFile(indexHtmlPath, html, 'utf-8');
      return;
    }
  }

  // No main entry exists — generate a bootstrap entry that renders the detected component
  const ext = language === 'typescript' ? 'tsx' : 'jsx';
  const bootstrapRelPath = `verya-entry.${ext}`;
  const bootstrapAbsPath = path.join(sessionRoot, bootstrapRelPath);

  // Normalise the import path: relEntry is relative to originalRoot, which is same layout in session
  const importPath = relEntry.startsWith('.') ? relEntry : `./${relEntry}`;

  const bootstrapContent = [
    `import React from 'react';`,
    `import { createRoot } from 'react-dom/client';`,
    `import App from '${importPath}';`,
    ``,
    `const container = document.getElementById('root');`,
    `if (container) {`,
    `  createRoot(container).render(<App />);`,
    `}`,
  ].join('\n');

  await fs.writeFile(bootstrapAbsPath, bootstrapContent, 'utf-8');

  const html = buildIndexHtml(`/${bootstrapRelPath}`);
  await fs.writeFile(indexHtmlPath, html, 'utf-8');
}

function buildIndexHtml(scriptSrc: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verya Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptSrc}"></script>
  </body>
</html>
`;
}

function waitForViteReady(
  cwd: string,
  viteBin: string,
  vitePort: number,
  verbose = false,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const isNpx = viteBin === 'npx';
    const args = isNpx
      ? ['vite', '--port', String(vitePort), '--strictPort']
      : ['--port', String(vitePort), '--strictPort'];

    const child = spawn(viteBin, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let resolved = false;

    const onData = (data: Buffer) => {
      const output = data.toString();
      if (verbose) {
        process.stdout.write(chalk.gray('[vite] ') + output);
      }

      if (
        !resolved &&
        (output.includes('Local:') ||
          output.includes('ready in') ||
          output.includes('localhost:') ||
          output.includes('Network:'))
      ) {
        resolved = true;
        setTimeout(() => resolve(), 500);
      }
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Preview server process exited with code ${code}`));
      }
    });

    child.unref();
  });
}

export async function spawnVeryaServer(
  detected: DetectedProject,
  requestedVeryaPort: number,
  openBrowser: boolean,
  resumeSessionId?: string,
  verbose = false,
): Promise<void> {
  // Phase 2 & 3: Isolated Session
  console.log(chalk.gray('Creating editing session...'));
  let session;
  if (resumeSessionId) {
    session = await sessionManager.getMetadata(resumeSessionId);
    if (!session) {
      throw new Error(`Session with ID "${resumeSessionId}" was not found.`);
    }
    console.log(chalk.green(`✓ Resumed session: ${chalk.white(session.name)}`));
  } else {
    session = await sessionManager.createSession(detected.originalRoot);
    console.log(chalk.green(`✓ Session created (isolated workspace)`));
    if (verbose) {
      console.log(chalk.gray(`  Location: ${session.sessionRoot}`));
    }
  }

  // Compute entry file relative to session root (needed for bootstrap generation)
  const relEntry = path.relative(detected.originalRoot, detected.entryFile);
  const sessionEntryFile = path.join(session.sessionRoot, relEntry);

  // ── Ensure dependencies are installed ──────────────────────────────────────
  await ensureDependencies(session.sessionRoot, detected.originalRoot, detected.packageManager, verbose);

  // ── Ensure index.html exists (generate bootstrap if needed) ───────────────
  await ensureIndexHtml(session.sessionRoot, relEntry, detected.language);

  // Find available ports
  const vitePort = await findAvailablePort(5173);
  const previewPort = await findAvailablePort(3112);
  const veryaPort = await findAvailablePort(requestedVeryaPort);

  // Use session directory as Vite root
  const viteBin = await getViteBin(session.sessionRoot);

  console.log(chalk.gray('\nStarting preview...'));
  await waitForViteReady(session.sessionRoot, viteBin, vitePort, verbose);
  console.log(chalk.green(`✓ Preview ready`));

  const previewUrl = `http://localhost:${previewPort}`;

  const projectInfo: ProjectInfo = {
    name: detected.name,
    root: session.sessionRoot,
    originalRoot: detected.originalRoot,
    sessionId: session.id,
    framework: detected.framework,
    language: detected.language,
    packageManager: detected.packageManager,
    hasTailwind: detected.hasTailwind,
    hasCSS: detected.hasCSS,
    entryFile: sessionEntryFile,
    previewUrl,
  };

  console.log(chalk.gray('\nOpening Verya...'));
  console.log(chalk.bold.hex('#6366f1')(`Ready → http://localhost:${veryaPort}\n`));
  console.log(chalk.gray('Press Ctrl+C to stop Verya.\n'));

  await startServer(projectInfo, vitePort, veryaPort, previewPort);

  if (openBrowser) {
    try {
      const { default: open } = await import('open');
      await open(`http://localhost:${veryaPort}`);
    } catch {
      // ignore
    }
  }
}
