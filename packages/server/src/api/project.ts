import { Router } from 'express';
import type { ProjectInfo } from '../types.js';

export function createProjectRouter(projectInfo: ProjectInfo): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(projectInfo);
  });

  return router;
}
