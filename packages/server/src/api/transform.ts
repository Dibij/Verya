import { Router } from 'express';
import type { TransformRequest, ProjectInfo } from '../types.js';
import { PathEscapeError, isWithin } from '../lib/safePath.js';
import { applyTransform } from '../ast/transformer.js';
import { sessionManager } from '../session/manager.js';

export function createTransformRouter(
  broadcast: (msg: object) => void,
  projectInfo: ProjectInfo,
): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const body = req.body as TransformRequest;

    if (
      !body ||
      typeof body.file !== 'string' ||
      !body.selector ||
      typeof body.selector.tagName !== 'string' ||
      !Array.isArray(body.changes) ||
      body.changes.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body. Required fields: file, selector.tagName, changes[]',
      });
    }

    if (!isWithin(projectInfo.root, body.file)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: file path is outside project root',
      });
    }

    try {
      const newContent = await applyTransform(body, projectInfo);

      if (projectInfo.sessionId) {
        await sessionManager.recordFileModification(projectInfo.sessionId, body.file);
      }

      broadcast({
        type: 'FILE_CHANGED',
        path: body.file,
        content: newContent,
      });

      return res.json({ success: true, newContent });
    } catch (err) {
      if (err instanceof PathEscapeError) {
        return res.status(403).json({ success: false, error: err.message });
      }
      console.error('[transform] Error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
