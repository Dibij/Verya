import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { FileNode } from '../types.js';
import { PathEscapeError, resolveWithin, isWithin } from '../lib/safePath.js';

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
  'dist-release',
  '.release-stage',
]);

const MAX_DEPTH = 6;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const EDITABLE_EXTENSIONS = new Set([
  '.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs',
  '.css', '.scss', '.sass', '.less',
  '.json', '.html', '.md', '.txt', '.svg',
]);

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
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

    const absPath = path.join(dirPath, entry.name);
    const relPath = path.relative(root, absPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const children = await buildFileTree(absPath, root, depth + 1);
      nodes.push({ name: entry.name, path: relPath, type: 'directory', children });
    } else if (entry.isFile()) {
      nodes.push({ name: entry.name, path: relPath, type: 'file' });
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export function createFilesRouter(projectInfo: { root: string }): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const tree = await buildFileTree(projectInfo.root, projectInfo.root);
      res.json(tree);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read file tree', detail: String(err) });
    }
  });

  router.get('/file', async (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: 'Missing path query param' });
    }

    let resolved: string;
    try {
      resolved = resolveWithin(projectInfo.root, filePath);
    } catch (err) {
      if (err instanceof PathEscapeError) {
        return res.status(403).json({ error: 'Access denied: path outside project root' });
      }
      throw err;
    }

    try {
      const stat = await fs.stat(resolved);
      if (!stat.isFile()) {
        return res.status(400).json({ error: 'Path is not a file' });
      }
      if (stat.size > MAX_FILE_BYTES) {
        return res.status(413).json({ error: 'File is too large to open in the editor' });
      }
      const content = await fs.readFile(resolved, 'utf-8');
      return res.json({ content });
    } catch (err) {
      return res.status(404).json({ error: 'File not found', detail: String(err) });
    }
  });

  router.put('/file', async (req, res) => {
    const body = req.body as { path?: string; content?: string } | undefined;
    if (!body || typeof body.path !== 'string' || typeof body.content !== 'string') {
      return res.status(400).json({ error: 'Required fields: path, content' });
    }

    let resolved: string;
    try {
      resolved = resolveWithin(projectInfo.root, body.path);
    } catch {
      return res.status(403).json({ error: 'Access denied: path outside project root' });
    }

    const ext = path.extname(resolved).toLowerCase();
    if (!EDITABLE_EXTENSIONS.has(ext)) {
      return res.status(415).json({ error: `Refusing to write file type: ${ext || 'unknown'}` });
    }

    if (Buffer.byteLength(body.content, 'utf-8') > MAX_FILE_BYTES) {
      return res.status(413).json({ error: 'File is too large to save' });
    }

    try {
      // Only overwrite files that already exist inside the workspace.
      if (!isWithin(projectInfo.root, resolved)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      await fs.writeFile(resolved, body.content, 'utf-8');
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to write file', detail: String(err) });
    }
  });

  return router;
}
