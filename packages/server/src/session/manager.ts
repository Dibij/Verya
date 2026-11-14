import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { SessionMetadata, SessionDiffResponse, SessionFileDiff } from '../types.js';
import { isValidSessionId, resolveWithin } from '../lib/safePath.js';

const IGNORED_COPY_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  '.verya',
  '.turbo',
  'coverage',
  'dist-release',
  '.release-stage',
]);

// Secrets are never copied into a session workspace.
const SECRET_FILE_RE = /^\.env(\..*)?$/;
const SAFE_ENV_FILE_RE = /^\.env\.(example|sample|template|defaults)$/i;

function sha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export class SessionManager {
  private baseDir: string;
  private sessionsDir: string;
  private backupsDir: string;

  constructor(baseDir: string = path.join(os.homedir(), '.verya')) {
    this.baseDir = baseDir;
    this.sessionsDir = path.join(this.baseDir, 'sessions');
    this.backupsDir = path.join(this.baseDir, 'backups');
    this.ensureDirs();
  }

  private ensureDirs() {
    if (!fsSync.existsSync(this.sessionsDir)) {
      fsSync.mkdirSync(this.sessionsDir, { recursive: true });
    }
    if (!fsSync.existsSync(this.backupsDir)) {
      fsSync.mkdirSync(this.backupsDir, { recursive: true });
    }
  }

  private getSessionPath(sessionId: string): string {
    if (!isValidSessionId(sessionId)) {
      throw new Error(`Invalid session id: ${sessionId}`);
    }
    return resolveWithin(this.sessionsDir, sessionId);
  }

  private getMetadataPath(sessionId: string): string {
    return path.join(this.getSessionPath(sessionId), 'metadata.json');
  }

  async getMetadata(sessionId: string): Promise<SessionMetadata | null> {
    try {
      const data = await fs.readFile(this.getMetadataPath(sessionId), 'utf-8');
      return JSON.parse(data) as SessionMetadata;
    } catch {
      return null;
    }
  }

  async saveMetadata(metadata: SessionMetadata): Promise<void> {
    const metaPath = this.getMetadataPath(metadata.id);
    metadata.updatedAt = new Date().toISOString();
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  async listSessions(forOriginalRoot?: string): Promise<SessionMetadata[]> {
    this.ensureDirs();
    const entries = await fs.readdir(this.sessionsDir, { withFileTypes: true });
    const sessions: SessionMetadata[] = [];
    const targetRoot = forOriginalRoot ? path.resolve(forOriginalRoot) : undefined;

    for (const entry of entries) {
      if (!entry.isDirectory() || !isValidSessionId(entry.name)) continue;
      const meta = await this.getMetadata(entry.name);
      if (!meta) continue;
      if (!targetRoot || path.resolve(meta.originalRoot) === targetRoot) {
        sessions.push(meta);
      }
    }

    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sessions;
  }

  async createSession(originalRoot: string, name?: string): Promise<SessionMetadata> {
    this.ensureDirs();
    const sessionId = crypto.randomUUID();
    const sessionDir = this.getSessionPath(sessionId);
    const sessionProjectDir = path.join(sessionDir, 'project');

    await fs.mkdir(sessionProjectDir, { recursive: true });

    const snapshots: SessionMetadata['originalSnapshots'] = {};
    await this.copyDirRecursive(originalRoot, sessionProjectDir, originalRoot, snapshots);

    const origNodeModules = path.join(originalRoot, 'node_modules');
    const sessionNodeModules = path.join(sessionProjectDir, 'node_modules');
    if (fsSync.existsSync(origNodeModules) && !fsSync.existsSync(sessionNodeModules)) {
      try {
        const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
        await fs.symlink(origNodeModules, sessionNodeModules, symlinkType);
      } catch (err) {
        console.warn(`[session] Could not link node_modules: ${err}`);
      }
    }

    const projectName = path.basename(originalRoot);
    const sessionName =
      name ||
      `${projectName} Edit (${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })})`;

    const metadata: SessionMetadata = {
      id: sessionId,
      name: sessionName,
      originalRoot: path.resolve(originalRoot),
      sessionRoot: sessionProjectDir,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      saved: false,
      modifiedFiles: [],
      originalSnapshots: snapshots,
    };

    await this.saveMetadata(metadata);
    return metadata;
  }

  private shouldSkipEntry(name: string): boolean {
    if (IGNORED_COPY_DIRS.has(name)) return true;
    if (SECRET_FILE_RE.test(name) && !SAFE_ENV_FILE_RE.test(name)) return true;
    return false;
  }

  private async copyDirRecursive(
    srcDir: string,
    destDir: string,
    rootSrc: string,
    snapshots: SessionMetadata['originalSnapshots'],
  ): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      if (this.shouldSkipEntry(entry.name)) continue;

      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirRecursive(srcPath, destPath, rootSrc, snapshots);
      } else if (entry.isFile()) {
        const content = await fs.readFile(srcPath);
        await fs.writeFile(destPath, content);
        const stat = await fs.stat(srcPath);
        const rel = path.relative(rootSrc, srcPath).replace(/\\/g, '/');
        snapshots[rel] = { mtime: stat.mtimeMs, size: stat.size, hash: sha256(content) };
      }
    }
  }

  async recordFileModification(sessionId: string, filePath: string): Promise<void> {
    const meta = await this.getMetadata(sessionId);
    if (!meta) return;

    const absolute = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(meta.sessionRoot, filePath);

    const rel = path.relative(meta.sessionRoot, absolute).replace(/\\/g, '/');
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return;

    if (!meta.modifiedFiles.includes(rel)) {
      meta.modifiedFiles.push(rel);
    }
    meta.saved = false;
    await this.saveMetadata(meta);
  }

  private async fileHash(filePath: string): Promise<string | null> {
    try {
      return sha256(await fs.readFile(filePath));
    } catch {
      return null;
    }
  }

  async getDiff(sessionId: string): Promise<SessionDiffResponse> {
    const meta = await this.getMetadata(sessionId);
    if (!meta) throw new Error(`Session ${sessionId} not found`);

    const candidateFiles = await this.collectChangedFiles(meta);
    const fileDiffs: SessionFileDiff[] = [];
    let hasAnyConflict = false;

    for (const relPath of candidateFiles) {
      let origFile: string;
      let sessFile: string;
      try {
        origFile = resolveWithin(meta.originalRoot, relPath);
        sessFile = resolveWithin(meta.sessionRoot, relPath);
      } catch {
        continue;
      }

      let origContent = '';
      let sessContent = '';
      let isNew = false;
      let isDeleted = false;

      try {
        origContent = await fs.readFile(origFile, 'utf-8');
      } catch {
        isNew = true;
      }

      try {
        sessContent = await fs.readFile(sessFile, 'utf-8');
      } catch {
        isDeleted = true;
      }

      let hasConflict = false;
      let conflictReason: string | undefined;

      if (!isNew && !isDeleted) {
        try {
          const snap = meta.originalSnapshots[relPath];
          if (snap) {
            // Compare content hashes when available (exact), falling back to
            // size + mtime for snapshots created by older versions.
            const currentHash = await this.fileHash(origFile);
            const changed = snap.hash
              ? currentHash !== null && currentHash !== snap.hash
              : (await fs.stat(origFile)).size !== snap.size;
            if (changed) {
              hasConflict = true;
              conflictReason = 'File on disk was modified externally after session started.';
              hasAnyConflict = true;
            }
          }
        } catch {
          // ignore
        }
      }

      if (origContent !== sessContent) {
        fileDiffs.push({
          path: relPath,
          originalContent: origContent,
          sessionContent: sessContent,
          diff: this.generateSimpleUnifiedDiff(relPath, origContent, sessContent),
          hasConflict,
          conflictReason,
          isNew,
          isDeleted,
        });
      }
    }

    return {
      sessionId,
      files: fileDiffs,
      hasAnyConflict,
      summary: {
        totalModified: fileDiffs.length,
        conflicts: fileDiffs.filter((f) => f.hasConflict).length,
      },
    };
  }

  /**
   * Discover changed files by hashing the session copy and comparing it with the
   * snapshot captured when the session was created. This avoids walking (and
   * reading) the whole original project on every diff request.
   */
  private async collectChangedFiles(meta: SessionMetadata): Promise<Set<string>> {
    const out = new Set<string>(meta.modifiedFiles);
    const snapshots = meta.originalSnapshots;

    const walk = async (relativeDir: string): Promise<void> => {
      const currentDir = path.join(meta.sessionRoot, relativeDir);
      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (this.shouldSkipEntry(entry.name)) continue;
        if (entry.name === 'node_modules') continue;

        const rel = path.join(relativeDir, entry.name).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          await walk(rel);
          continue;
        }

        if (!entry.isFile()) continue;

        const snap = snapshots[rel];
        const hash = await this.fileHash(path.join(meta.sessionRoot, rel));

        if (!snap) {
          // A new file created inside the session.
          if (hash) out.add(rel);
        } else if (hash !== snap.hash) {
          out.add(rel);
        }
      }
    };

    await walk('');

    // Files that existed at snapshot time but were deleted in the session.
    for (const rel of Object.keys(snapshots)) {
      const exists = await fs
        .access(path.join(meta.sessionRoot, rel))
        .then(() => true)
        .catch(() => false);
      if (!exists) out.add(rel);
    }

    return out;
  }

  generateSimpleUnifiedDiff(fileName: string, oldStr: string, newStr: string): string {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    const operations = computeLineDiff(oldLines, newLines);
    const header = [`--- a/${fileName}`, `+++ b/${fileName}`];

    const context = 3;
    const hunks: string[] = [];
    let index = 0;

    while (index < operations.length) {
      // Find the next change.
      if (operations[index]!.type === 'equal') {
        index++;
        continue;
      }

      const start = Math.max(0, index - context);
      let end = index;
      while (end < operations.length) {
        if (operations[end]!.type !== 'equal') {
          end++;
          continue;
        }
        // Look ahead: keep the equal run only if another change follows closely.
        let lookahead = end;
        while (lookahead < operations.length && operations[lookahead]!.type === 'equal') {
          lookahead++;
        }
        if (lookahead < operations.length && lookahead - end <= context * 2) {
          end = lookahead;
          continue;
        }
        break;
      }
      end = Math.min(operations.length, end + context);

      const slice = operations.slice(start, end);
      hunks.push(this.formatHunk(slice, oldLines, newLines));
      index = end;
    }

    return [...header, ...hunks].join('\n');
  }

  private formatHunk(
    slice: LineOp[],
    oldLines: string[],
    newLines: string[],
  ): string {
    let oldStart = 0;
    let newStart = 0;
    let oldCount = 0;
    let newCount = 0;

    const body: string[] = [];
    for (const op of slice) {
      if (op.type === 'equal') {
        if (oldCount === 0 && newCount === 0 && body.length === 0) {
          oldStart = op.oldIndex + 1;
          newStart = op.newIndex + 1;
        }
        body.push(` ${oldLines[op.oldIndex] ?? ''}`);
        oldCount++;
        newCount++;
      } else if (op.type === 'delete') {
        if (body.length === 0) {
          oldStart = op.oldIndex + 1;
          newStart = op.newIndex + 1;
        }
        body.push(`-${oldLines[op.oldIndex] ?? ''}`);
        oldCount++;
      } else {
        if (body.length === 0) {
          oldStart = op.oldIndex + 1;
          newStart = op.newIndex + 1;
        }
        body.push(`+${newLines[op.newIndex] ?? ''}`);
        newCount++;
      }
    }

    if (oldCount === 0) oldStart = Math.max(1, oldStart);
    if (newCount === 0) newStart = Math.max(1, newStart);

    return [
      `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
      ...body,
    ].join('\n');
  }

  async acceptChanges(
    sessionId: string,
    filesToAccept?: string[],
    options: { force?: boolean } = {},
  ): Promise<{ accepted: string[]; skipped: string[]; backupPath: string }> {
    const meta = await this.getMetadata(sessionId);
    if (!meta) throw new Error(`Session ${sessionId} not found`);

    const diffResult = await this.getDiff(sessionId);
    const targetFiles =
      filesToAccept && filesToAccept.length > 0
        ? diffResult.files.filter((f) => filesToAccept.includes(f.path))
        : diffResult.files;

    if (targetFiles.length === 0) {
      return { accepted: [], skipped: [], backupPath: '' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupsDir, `${sessionId}-${timestamp}`);
    await fs.mkdir(backupDir, { recursive: true });

    const accepted: string[] = [];
    const skipped: string[] = [];
    const applied: Array<{ target: string; backup: string | null; existed: boolean }> = [];

    try {
      for (const f of targetFiles) {
        if (f.hasConflict && !options.force) {
          skipped.push(f.path);
          continue;
        }

        const origPath = resolveWithin(meta.originalRoot, f.path);
        const sessPath = resolveWithin(meta.sessionRoot, f.path);
        const backupPath = path.join(backupDir, f.path);

        const existed = fsSync.existsSync(origPath);
        let backup: string | null = null;

        if (existed) {
          await fs.mkdir(path.dirname(backupPath), { recursive: true });
          await fs.copyFile(origPath, backupPath);
          backup = backupPath;
        }

        applied.push({ target: origPath, backup, existed });

        if (f.isDeleted) {
          if (existed) await fs.unlink(origPath);
        } else {
          await fs.mkdir(path.dirname(origPath), { recursive: true });
          const tempPath = `${origPath}.verya-${crypto.randomUUID()}.tmp`;
          await fs.copyFile(sessPath, tempPath);
          await fs.rename(tempPath, origPath);
        }

        accepted.push(f.path);
      }
    } catch (err) {
      // Roll back everything applied so far, newest first.
      for (const step of [...applied].reverse()) {
        try {
          if (step.backup) {
            await fs.copyFile(step.backup, step.target);
          } else if (!step.existed) {
            await fs.rm(step.target, { force: true });
          }
        } catch {
          // Best effort; the backup directory still holds the original.
        }
      }
      throw err;
    }

    // Refresh the snapshot for every applied file so the accepted content is no
    // longer reported as a pending modification on the next diff.
    for (const relPath of accepted) {
      const origPath = resolveWithin(meta.originalRoot, relPath);
      try {
        const content = await fs.readFile(origPath);
        const stat = await fs.stat(origPath);
        meta.originalSnapshots[relPath] = {
          mtime: stat.mtimeMs,
          size: stat.size,
          hash: sha256(content),
        };
      } catch {
        // File was deleted as part of the accept; drop it from the snapshot.
        delete meta.originalSnapshots[relPath];
      }
    }

    meta.modifiedFiles = meta.modifiedFiles.filter((p) => !accepted.includes(p));
    meta.saved = meta.modifiedFiles.length === 0;
    await this.saveMetadata(meta);

    return { accepted, skipped, backupPath: backupDir };
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const sessionDir = this.getSessionPath(sessionId);
    try {
      await fs.rm(sessionDir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }
}

interface LineOp {
  type: 'equal' | 'insert' | 'delete';
  oldIndex: number;
  newIndex: number;
}

/**
 * LCS-based line diff. O(n*m) memory is avoided by trimming the common prefix
 * and suffix first, which keeps typical component files cheap.
 */
export function computeLineDiff(oldLines: string[], newLines: string[]): LineOp[] {
  let prefix = 0;
  while (
    prefix < oldLines.length &&
    prefix < newLines.length &&
    oldLines[prefix] === newLines[prefix]
  ) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix++;
  }

  const oldMid = oldLines.slice(prefix, oldLines.length - suffix);
  const newMid = newLines.slice(prefix, newLines.length - suffix);

  const ops: LineOp[] = [];
  for (let i = 0; i < prefix; i++) {
    ops.push({ type: 'equal', oldIndex: i, newIndex: i });
  }
  ops.push(...lcsDiff(oldMid, newMid, prefix, prefix));
  for (let i = 0; i < suffix; i++) {
    ops.push({
      type: 'equal',
      oldIndex: oldLines.length - suffix + i,
      newIndex: newLines.length - suffix + i,
    });
  }

  return ops;
}

function lcsDiff(
  a: string[],
  b: string[],
  aOffset: number,
  bOffset: number,
): LineOp[] {
  if (a.length === 0) {
    return b.map((_, j) => ({
      type: 'insert' as const,
      oldIndex: aOffset,
      newIndex: bOffset + j,
    }));
  }
  if (b.length === 0) {
    return a.map((_, i) => ({
      type: 'delete' as const,
      oldIndex: aOffset + i,
      newIndex: bOffset,
    }));
  }

  // Guard against pathological matrix sizes.
  if (a.length * b.length > 4_000_000) {
    return [
      ...a.map((_, i) => ({
        type: 'delete' as const,
        oldIndex: aOffset + i,
        newIndex: bOffset,
      })),
      ...b.map((_, j) => ({
        type: 'insert' as const,
        oldIndex: aOffset + a.length,
        newIndex: bOffset + j,
      })),
    ];
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint32Array(rows * cols);

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * cols + j] =
        a[i] === b[j]
          ? table[(i + 1) * cols + (j + 1)]! + 1
          : Math.max(table[(i + 1) * cols + j]!, table[i * cols + (j + 1)]!);
    }
  }

  const ops: LineOp[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ type: 'equal', oldIndex: aOffset + i, newIndex: bOffset + j });
      i++;
      j++;
    } else if (table[(i + 1) * cols + j]! >= table[i * cols + (j + 1)]!) {
      ops.push({ type: 'delete', oldIndex: aOffset + i, newIndex: bOffset + j });
      i++;
    } else {
      ops.push({ type: 'insert', oldIndex: aOffset + i, newIndex: bOffset + j });
      j++;
    }
  }
  while (i < a.length) {
    ops.push({ type: 'delete', oldIndex: aOffset + i, newIndex: bOffset + j });
    i++;
  }
  while (j < b.length) {
    ops.push({ type: 'insert', oldIndex: aOffset + i, newIndex: bOffset + j });
    j++;
  }

  return ops;
}

export const sessionManager = new SessionManager();
