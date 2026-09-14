import fs from 'fs/promises';
import path from 'path';
import type { ProjectInfo } from '@verya/server';

export interface DetectedProject {
  name: string;
  originalRoot: string;
  framework: 'react';
  language: 'typescript' | 'javascript';
  packageManager: 'npm' | 'yarn' | 'pnpm';
  hasTailwind: boolean;
  hasCSS: boolean;
  entryFile: string;
  stats: {
    tsxFiles: number;
    cssFiles: number;
    assetFiles: number;
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function countFiles(dir: string): Promise<{ tsxFiles: number; cssFiles: number; assetFiles: number }> {
  let tsxFiles = 0;
  let cssFiles = 0;
  let assetFiles = 0;

  const assetExts = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico']);
  const codeExts = new Set(['.tsx', '.jsx']);
  const cssExts = new Set(['.css', '.scss', '.sass', '.less']);

  async function walk(currentDir: string, depth = 0) {
    if (depth > 5) return;
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === '.verya') continue;
        const full = path.join(currentDir, e.name);
        if (e.isDirectory()) {
          await walk(full, depth + 1);
        } else {
          const ext = path.extname(e.name).toLowerCase();
          if (codeExts.has(ext)) tsxFiles++;
          else if (cssExts.has(ext)) cssFiles++;
          else if (assetExts.has(ext)) assetFiles++;
        }
      }
    } catch {
      // ignore
    }
  }

  await walk(dir);
  return { tsxFiles, cssFiles, assetFiles };
}

export async function detectProject(projectPath = '.'): Promise<DetectedProject> {
  const resolved = path.resolve(projectPath);

  // Determine root directory
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    throw new Error(`Project directory or file not found: ${resolved}`);
  }

  const originalRoot = stat.isDirectory() ? resolved : path.dirname(resolved);

  // Read package.json
  const pkgPath = path.join(originalRoot, 'package.json');
  let pkgJson: Record<string, unknown> = {};
  try {
    const raw = await fs.readFile(pkgPath, 'utf-8');
    pkgJson = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // No package.json
  }

  const name = typeof pkgJson.name === 'string' ? pkgJson.name : path.basename(originalRoot);

  // Detect framework
  const allDeps: Record<string, string> = {
    ...((pkgJson.dependencies as Record<string, string>) ?? {}),
    ...((pkgJson.devDependencies as Record<string, string>) ?? {}),
  };

  const hasReact = 'react' in allDeps || 'react-dom' in allDeps;
  if (!hasReact && !await fileExists(path.join(originalRoot, 'src', 'App.tsx'))) {
    throw new Error('No React project detected. Verya requires a React project (React in package.json or src/App.tsx).');
  }

  // Detect language
  const hasTsConfig = await fileExists(path.join(originalRoot, 'tsconfig.json'));
  const language: 'typescript' | 'javascript' = hasTsConfig ? 'typescript' : 'javascript';

  // Detect package manager
  let packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';
  if (await fileExists(path.join(originalRoot, 'pnpm-lock.yaml'))) {
    packageManager = 'pnpm';
  } else if (await fileExists(path.join(originalRoot, 'yarn.lock'))) {
    packageManager = 'yarn';
  }

  // Detect tailwind
  const hasTailwindConfig =
    (await fileExists(path.join(originalRoot, 'tailwind.config.js'))) ||
    (await fileExists(path.join(originalRoot, 'tailwind.config.ts'))) ||
    (await fileExists(path.join(originalRoot, 'tailwind.config.cjs')));
  const hasTailwindDep = 'tailwindcss' in allDeps;
  const hasTailwind = hasTailwindConfig || hasTailwindDep;

  // Detect CSS
  const hasCSS =
    hasTailwind ||
    (await fileExists(path.join(originalRoot, 'src', 'index.css'))) ||
    (await fileExists(path.join(originalRoot, 'src', 'App.css'))) ||
    (await fileExists(path.join(originalRoot, 'src', 'styles.css')));

  // Find entry file
  const candidateEntries = [
    path.join(originalRoot, 'src', 'App.tsx'),
    path.join(originalRoot, 'src', 'App.jsx'),
    path.join(originalRoot, 'src', 'main.tsx'),
    path.join(originalRoot, 'src', 'main.jsx'),
    path.join(originalRoot, 'App.tsx'),
    path.join(originalRoot, 'App.jsx'),
    path.join(originalRoot, 'src', 'index.tsx'),
    path.join(originalRoot, 'src', 'index.jsx'),
  ];

  let entryFile = candidateEntries[0]!;
  for (const candidate of candidateEntries) {
    if (await fileExists(candidate)) {
      entryFile = candidate;
      break;
    }
  }

  const stats = await countFiles(originalRoot);

  return {
    name,
    originalRoot,
    framework: 'react',
    language,
    packageManager,
    hasTailwind,
    hasCSS,
    entryFile,
    stats,
  };
}
