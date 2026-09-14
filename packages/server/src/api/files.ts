import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { FileNode } from '../types.js';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.verya',
  '.next',
  'build',
  'out',
  '.cache',
  'coverage',
  '.turbo',
]);

const MAX_DEPTH = 6;

async function buildFileTree(
  dirPath: string,
  root: string,
  depth: number = 0,
): Promise<FileNode[]> {
  if (depth > MAX_DEPTH) return [];

  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.env') continue;

    const absPath = path.join(dirPath, entry.name);
    const relPath = path.relative(root, absPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const children = await buildFileTree(absPath, root, depth + 1);
      nodes.push({
        name: entry.name,
        path: relPath,
        type: 'directory',
        children,
      });
    } else {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: 'file',
      });
    }
  }

  // Sort: directories first, then files, both alphabetically
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export function createFilesRouter(projectInfo: { root: string }): Router {
  const router = Router();

  // GET /api/files — full file tree
  router.get('/', async (_req, res) => {
    try {
      const tree = await buildFileTree(projectInfo.root, projectInfo.root);
      res.json(tree);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read file tree', detail: String(err) });
    }
  });

  // GET /api/file?path=<absolute>
  router.get('/file', async (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing path query param' });
    }

    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(projectInfo.root)) {
      return res.status(403).json({ error: 'Access denied: path outside project root' });
    }

    try {
      const content = await fs.readFile(resolved, 'utf-8');
      return res.json({ content });
    } catch (err) {
      return res.status(404).json({ error: 'File not found', detail: String(err) });
    }
  });

  return router;
}
