import { Router } from 'express';
import path from 'path';
import type { TransformRequest, ProjectInfo } from '../types.js';
import { applyTransform } from '../ast/transformer.js';
import { sessionManager } from '../session/manager.js';

export function createTransformRouter(
  broadcast: (msg: object) => void,
  projectInfo: ProjectInfo,
): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const body = req.body as TransformRequest;

    if (!body || !body.file || !body.selector || !Array.isArray(body.changes)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body. Required fields: file, selector, changes[]',
      });
    }

    // Security: ensure file is within active session root
    const resolved = path.resolve(body.file);
    if (!resolved.startsWith(projectInfo.root)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: file path is outside project root',
      });
    }

    try {
      const newContent = await applyTransform(body, projectInfo);

      // Record modified file in session
      if (projectInfo.sessionId) {
        await sessionManager.recordFileModification(projectInfo.sessionId, resolved);
      }

      // Broadcast file change to WebSocket clients
      broadcast({
        type: 'FILE_CHANGED',
        path: resolved,
        content: newContent,
      });

      return res.json({ success: true, newContent });
    } catch (err) {
      console.error('[transform] Error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
