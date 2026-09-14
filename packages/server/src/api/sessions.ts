import { Router } from 'express';
import { sessionManager } from '../session/manager.js';
import type { ProjectInfo } from '../types.js';

export function createSessionsRouter(
  projectInfo: ProjectInfo,
  broadcast: (msg: object) => void,
): Router {
  const router = Router();

  // GET /api/sessions — list all sessions for this project
  router.get('/', async (req, res) => {
    try {
      const filterRoot = (req.query.all === 'true') ? undefined : projectInfo.originalRoot;
      const sessions = await sessionManager.listSessions(filterRoot);
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: 'Failed to list sessions', detail: String(err) });
    }
  });

  // GET /api/sessions/current — get current active session metadata
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

  // POST /api/sessions/save — mark current session as saved
  router.post('/save', async (req, res) => {
    try {
      const { name } = req.body || {};
      const meta = await sessionManager.getMetadata(projectInfo.sessionId);
      if (!meta) {
        return res.status(404).json({ error: 'Current session not found' });
      }
      if (name) meta.name = name;
      meta.saved = true;
      await sessionManager.saveMetadata(meta);

      broadcast({
        type: 'SESSION_SAVED',
        session: meta,
      });

      res.json({ success: true, session: meta });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save session', detail: String(err) });
    }
  });

  // GET /api/sessions/:id/diff — get diff between session workspace and original project
  router.get('/:id/diff', async (req, res) => {
    try {
      const sessionId = req.params.id;
      const diffResponse = await sessionManager.getDiff(sessionId);
      res.json(diffResponse);
    } catch (err) {
      res.status(500).json({ error: 'Failed to compute diff', detail: String(err) });
    }
  });

  // POST /api/sessions/:id/accept — apply session changes to original project
  router.post('/:id/accept', async (req, res) => {
    try {
      const sessionId = req.params.id;
      const { files } = req.body || {}; // optional array of relative file paths
      const result = await sessionManager.acceptChanges(sessionId, files);

      broadcast({
        type: 'CHANGES_ACCEPTED',
        accepted: result.accepted,
        backupPath: result.backupPath,
      });

      res.json({
        success: true,
        accepted: result.accepted,
        backupPath: result.backupPath,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to accept changes', detail: String(err) });
    }
  });

  // DELETE /api/sessions/:id — delete a session
  router.delete('/:id', async (req, res) => {
    try {
      const sessionId = req.params.id;
      if (sessionId === projectInfo.sessionId) {
        return res.status(400).json({ error: 'Cannot delete the currently active session' });
      }
      const ok = await sessionManager.deleteSession(sessionId);
      res.json({ success: ok });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete session', detail: String(err) });
    }
  });

  return router;
}
