import { spawn } from 'child_process';
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

function waitForViteReady(
  cwd: string,
  viteBin: string,
  vitePort: number,
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
      process.stdout.write(chalk.gray('[vite] ') + output);

      if (
        !resolved &&
        (output.includes('Local:') ||
          output.includes('ready in') ||
          output.includes('localhost:') ||
          output.includes('Network:'))
      ) {
        resolved = true;
        setTimeout(() => resolve(), 600);
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
        reject(new Error(`Vite dev server exited with code ${code}`));
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
): Promise<void> {
  // Phase 2: Create or resume isolated session
  console.log(chalk.gray('Creating isolated session...'));
  let session;
  if (resumeSessionId) {
    session = await sessionManager.getMetadata(resumeSessionId);
    if (!session) {
      throw new Error(`Session with ID ${resumeSessionId} not found.`);
    }
    console.log(chalk.cyan(`Resumed session: ${session.name} (${session.id})`));
  } else {
    session = await sessionManager.createSession(detected.originalRoot);
    console.log(chalk.cyan(`Session created: ${session.name}`));
    console.log(chalk.gray(`Session path:    ${session.sessionRoot}`));
    console.log(chalk.gray(`Original project is protected and untouched.`));
  }

  // Find available ports
  const vitePort = await findAvailablePort(5173);
  const previewPort = await findAvailablePort(3112);
  const veryaPort = await findAvailablePort(requestedVeryaPort);

  // Use session directory as Vite root
  const viteBin = await getViteBin(detected.originalRoot);

  console.log(chalk.yellow(`Starting Vite in isolated session on port ${vitePort}...`));
  await waitForViteReady(session.sessionRoot, viteBin, vitePort);

  // Compute entry file relative to session root
  const relEntry = path.relative(detected.originalRoot, detected.entryFile);
  const sessionEntryFile = path.join(session.sessionRoot, relEntry);

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

  console.log(chalk.green(`✔ Vite preview ready on ${previewUrl}`));
  console.log(chalk.bold.hex('#6366f1')(`\nVerya Editor → http://localhost:${veryaPort}\n`));

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
