import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { SessionManager } from './manager.js';

let tmpRoot: string;
let projectRoot: string;
let manager: SessionManager;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'verya-session-'));
  projectRoot = path.join(tmpRoot, 'project');
  await fs.mkdir(path.join(projectRoot, 'src'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'src', 'App.tsx'), 'export default 1\n', 'utf-8');
  await fs.writeFile(path.join(projectRoot, '.env'), 'SECRET=abc\n', 'utf-8');

  manager = new SessionManager(path.join(tmpRoot, 'verya-home'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('SessionManager', () => {
  it('does not copy secret env files into the session workspace', async () => {
    const session = await manager.createSession(projectRoot);
    await expect(
      fs.access(path.join(session.sessionRoot, '.env')),
    ).rejects.toThrow();
  });

  it('round-trips a modification through diff and accept', async () => {
    const session = await manager.createSession(projectRoot);

    await fs.writeFile(
      path.join(session.sessionRoot, 'src', 'App.tsx'),
      'export default 2\n',
      'utf-8',
    );
    await manager.recordFileModification(session.id, 'src/App.tsx');

    const diff = await manager.getDiff(session.id);
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0]!.isDeleted).toBe(false);
    expect(diff.files[0]!.hasConflict).toBe(false);
    expect(diff.files[0]!.diff).toContain('+export default 2');
    expect(diff.files[0]!.diff).toContain('-export default 1');

    const result = await manager.acceptChanges(session.id);
    expect(result.accepted).toEqual(['src/App.tsx']);

    const written = await fs.readFile(path.join(projectRoot, 'src', 'App.tsx'), 'utf-8');
    expect(written).toBe('export default 2\n');

    // The accepted file is no longer pending.
    const after = await manager.getDiff(session.id);
    expect(after.files).toHaveLength(0);
  });

  it('skips conflicted files unless forced', async () => {
    const session = await manager.createSession(projectRoot);

    await fs.writeFile(
      path.join(session.sessionRoot, 'src', 'App.tsx'),
      'export default 2\n',
      'utf-8',
    );
    // Simulate an external edit after the session started.
    await new Promise((r) => setTimeout(r, 10));
    await fs.writeFile(path.join(projectRoot, 'src', 'App.tsx'), 'external edit\n', 'utf-8');

    const diff = await manager.getDiff(session.id);
    expect(diff.hasAnyConflict).toBe(true);

    const skipped = await manager.acceptChanges(session.id);
    expect(skipped.accepted).toEqual([]);
    expect(skipped.skipped).toEqual(['src/App.tsx']);

    const forced = await manager.acceptChanges(session.id, undefined, { force: true });
    expect(forced.accepted).toEqual(['src/App.tsx']);
  });

  it('applies deletions and removes them from the snapshot', async () => {
    const session = await manager.createSession(projectRoot);
    await fs.rm(path.join(session.sessionRoot, 'src', 'App.tsx'));

    const diff = await manager.getDiff(session.id);
    const entry = diff.files.find((f) => f.path === 'src/App.tsx');
    expect(entry?.isDeleted).toBe(true);

    await manager.acceptChanges(session.id);
    await expect(fs.access(path.join(projectRoot, 'src', 'App.tsx'))).rejects.toThrow();
  });

  it('rejects invalid session ids instead of touching arbitrary paths', async () => {
    await expect(manager.deleteSession('../../etc')).rejects.toThrow(/Invalid session id/);

    // getMetadata swallows the error and returns null, but must never read or
    // write outside the sessions directory.
    await expect(manager.getMetadata('../evil')).resolves.toBeNull();
    await expect(manager.saveMetadata({ id: '../evil' } as never)).rejects.toThrow(
      /Invalid session id/,
    );
  });

  it('creates a defensive backup before overwriting', async () => {
    const session = await manager.createSession(projectRoot);
    await fs.writeFile(
      path.join(session.sessionRoot, 'src', 'App.tsx'),
      'export default 2\n',
      'utf-8',
    );

    const result = await manager.acceptChanges(session.id);
    const backup = await fs.readFile(
      path.join(result.backupPath, 'src', 'App.tsx'),
      'utf-8',
    );
    expect(backup).toBe('export default 1\n');
  });
});
