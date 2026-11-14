import { Router } from 'express';
import { sessionManager } from '../session/manager.js';
import { isValidSessionId } from '../lib/safePath.js';
import type { ProjectInfo } from '../types.js';

export function createSessionsRouter(
  projectInfo: ProjectInfo,
  broadcast: (msg: object) => void,
): Router {
  const router = Router();

  router.param('id', (_req, res, next, id: string) => {
    if (!isValidSessionId(id)) {
      res.status(400).json({ error: 'Invalid session id' });
      return;
    }
    next();
  });

  router.get('/', async (req, res) => {
    try {
      const filterRoot = req.query.all === 'true' ? undefined : projectInfo.originalRoot;
      const sessions = await sessionManager.listSessions(filterRoot);
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to list sessions', detail: String(err) });
    }
  });

  router.get('/current', async (_req, res) => {
    try {
      const meta = await sessionManager.getMetadata(projectInfo.sessionId);
      if (!meta) {
        return res.status(404).json({ error: 'Current session not found' });
      }
      res.json(meta);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get current session', detail: String(err) });
    }
  });

  router.post('/save', async (req, res) => {
    try {
      const { name } = req.body || {};
      const meta = await sessionManager.getMetadata(projectInfo.sessionId);
      if (!meta) {
        return res.status(404).json({ error: 'Current session not found' });
      }
      if (typeof name === 'string' && name.trim()) {
        meta.name = name.trim().slice(0, 120);
      }
      meta.saved = true;
      await sessionManager.saveMetadata(meta);

      broadcast({ type: 'SESSION_SAVED', session: meta });
      res.json({ success: true, session: meta });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save session', detail: String(err) });
    }
  });

  router.get('/:id/diff', async (req, res) => {
    try {
      const diffResponse = await sessionManager.getDiff(req.params.id);
      res.json(diffResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.status(500).json({ error: 'Failed to compute diff', detail: message });
    }
  });

  router.post('/:id/accept', async (req, res) => {
    try {
      const { files, force } = req.body || {};
      if (files !== undefined && !Array.isArray(files)) {
        return res.status(400).json({ error: 'files must be an array of relative paths' });
      }
      const result = await sessionManager.acceptChanges(req.params.id, files, {
        force: force === true,
      });

      broadcast({
        type: 'CHANGES_ACCEPTED',
        accepted: result.accepted,
        skipped: result.skipped,
        backupPath: result.backupPath,
      });

      res.json({
        success: true,
        accepted: result.accepted,
        skipped: result.skipped,
        backupPath: result.backupPath,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not found')) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.status(500).json({ error: 'Failed to accept changes', detail: message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      if (req.params.id === projectInfo.sessionId) {
        return res.status(400).json({ error: 'Cannot delete the currently active session' });
      }
      const ok = await sessionManager.deleteSession(req.params.id);
      if (!ok) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete session', detail: String(err) });
    }
  });

  return router;
}
