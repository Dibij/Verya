import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import type { SessionMetadata, SessionDiffResponse, SessionFileDiff } from '../types.js';

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
]);

export class SessionManager {
  private baseDir: string;
  private sessionsDir: string;
  private backupsDir: string;

  constructor() {
    this.baseDir = path.join(os.homedir(), '.verya');
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
    return path.join(this.sessionsDir, sessionId);
  }

  private getMetadataPath(sessionId: string): string {
    return path.join(this.getSessionPath(sessionId), 'metadata.json');
  }

  async getMetadata(sessionId: string): Promise<SessionMetadata | null> {
    const metaPath = this.getMetadataPath(sessionId);
    try {
      const data = await fs.readFile(metaPath, 'utf-8');
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

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const meta = await this.getMetadata(entry.name);
      if (meta) {
        if (!forOriginalRoot || path.resolve(meta.originalRoot) === path.resolve(forOriginalRoot)) {
          sessions.push(meta);
        }
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

    // Copy project files recursively (skipping node_modules, .git, etc.)
    const snapshots: Record<string, { mtime: number; size: number }> = {};
    await this.copyDirRecursive(originalRoot, sessionProjectDir, originalRoot, snapshots);

    // Link node_modules so dependencies are instantly shared without copying gigabytes
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
    const sessionName = name || `${projectName} Edit (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

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

  private async copyDirRecursive(
    srcDir: string,
    destDir: string,
    rootSrc: string,
    snapshots: Record<string, { mtime: number; size: number }>,
  ): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      if (IGNORED_COPY_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.env.local') continue;

      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirRecursive(srcPath, destPath, rootSrc, snapshots);
      } else {
        await fs.copyFile(srcPath, destPath);
        const stat = await fs.stat(srcPath);
        const rel = path.relative(rootSrc, srcPath).replace(/\\/g, '/');
        snapshots[rel] = { mtime: stat.mtimeMs, size: stat.size };
      }
    }
  }

  async recordFileModification(sessionId: string, absSessionFilePath: string): Promise<void> {
    const meta = await this.getMetadata(sessionId);
    if (!meta) return;

    const rel = path.relative(meta.sessionRoot, absSessionFilePath).replace(/\\/g, '/');
    if (!meta.modifiedFiles.includes(rel)) {
      meta.modifiedFiles.push(rel);
    }
    meta.saved = false;
    await this.saveMetadata(meta);
  }

  async getDiff(sessionId: string): Promise<SessionDiffResponse> {
    const meta = await this.getMetadata(sessionId);
    if (!meta) throw new Error(`Session ${sessionId} not found`);

    const fileDiffs: SessionFileDiff[] = [];
    let hasAnyConflict = false;

    // Discover all files modified or in metadata.modifiedFiles
    const candidateFiles = new Set(meta.modifiedFiles);

    // Also scan session files to see if any others changed
    await this.collectChangedFiles(meta.sessionRoot, meta.originalRoot, '', candidateFiles);

    for (const relPath of candidateFiles) {
      const origFile = path.join(meta.originalRoot, relPath);
      const sessFile = path.join(meta.sessionRoot, relPath);

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

      // Check for conflicts: Has original file changed externally since session started?
      let hasConflict = false;
      let conflictReason: string | undefined;

      if (!isNew && !isDeleted) {
        try {
          const origStat = await fs.stat(origFile);
          const snap = meta.originalSnapshots[relPath];
          if (snap) {
            // Allow 1 second tolerance for file timestamp inaccuracies
            const timeDiff = Math.abs(origStat.mtimeMs - snap.mtime);
            if (timeDiff > 2000 && origStat.size !== snap.size) {
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
        const diff = this.generateSimpleUnifiedDiff(relPath, origContent, sessContent);
        fileDiffs.push({
          path: relPath,
          originalContent: origContent,
          sessionContent: sessContent,
          diff,
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

  private async collectChangedFiles(
    sessionDir: string,
    originalDir: string,
    relativeDir: string,
    outFiles: Set<string>,
  ): Promise<void> {
    const currentSessionDir = path.join(sessionDir, relativeDir);
    let entries;
    try {
      entries = await fs.readdir(currentSessionDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_COPY_DIRS.has(entry.name)) continue;
      const rel = path.join(relativeDir, entry.name).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        await this.collectChangedFiles(sessionDir, originalDir, rel, outFiles);
      } else {
        const sessPath = path.join(sessionDir, rel);
        const origPath = path.join(originalDir, rel);

        try {
          const sessStat = await fs.stat(sessPath);
          const origStat = await fs.stat(origPath);
          if (sessStat.size !== origStat.size || sessStat.mtimeMs !== origStat.mtimeMs) {
            outFiles.add(rel);
          }
        } catch {
          outFiles.add(rel);
        }
      }
    }
  }

  generateSimpleUnifiedDiff(fileName: string, oldStr: string, newStr: string): string {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');
    const lines: string[] = [
      `--- a/${fileName}`,
      `+++ b/${fileName}`,
    ];

    // Simple line diff for UI rendering
    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        lines.push(` ${oldLines[i]}`);
        i++;
        j++;
      } else if (j < newLines.length && (i >= oldLines.length || !oldLines.includes(newLines[j]!))) {
        lines.push(`+${newLines[j]}`);
        j++;
      } else if (i < oldLines.length) {
        lines.push(`-${oldLines[i]}`);
        i++;
      } else {
        break;
      }
    }

    return lines.join('\n');
  }

  async acceptChanges(sessionId: string, filesToAccept?: string[]): Promise<{ accepted: string[]; backupPath: string }> {
    const meta = await this.getMetadata(sessionId);
    if (!meta) throw new Error(`Session ${sessionId} not found`);

    const diffResult = await this.getDiff(sessionId);
    const targetFiles = filesToAccept && filesToAccept.length > 0
      ? diffResult.files.filter((f) => filesToAccept.includes(f.path))
      : diffResult.files;

    if (targetFiles.length === 0) {
      return { accepted: [], backupPath: '' };
    }

    // Create defensive backup before applying
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.backupsDir, `${sessionId}-${timestamp}`);
    await fs.mkdir(backupDir, { recursive: true });

    const accepted: string[] = [];

    for (const f of targetFiles) {
      const origPath = path.join(meta.originalRoot, f.path);
      const sessPath = path.join(meta.sessionRoot, f.path);
      const backupPath = path.join(backupDir, f.path);

      // Backup existing original file if present
      if (fsSync.existsSync(origPath)) {
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.copyFile(origPath, backupPath);
      }

      // Write session file to original project atomically
      await fs.mkdir(path.dirname(origPath), { recursive: true });
      await fs.copyFile(sessPath, origPath);
      accepted.push(f.path);

      // Update snapshot mtime
      try {
        const stat = await fs.stat(origPath);
        meta.originalSnapshots[f.path] = { mtime: stat.mtimeMs, size: stat.size };
      } catch {
        // ignore
      }
    }

    // Clean up accepted files from modified list
    meta.modifiedFiles = meta.modifiedFiles.filter((p) => !accepted.includes(p));
    meta.saved = true;
    await this.saveMetadata(meta);

    return { accepted, backupPath: backupDir };
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

export const sessionManager = new SessionManager();
