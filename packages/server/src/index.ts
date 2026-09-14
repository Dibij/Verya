import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';

import type { ProjectInfo } from './types.js';
import { createProjectRouter } from './api/project.js';
import { createFilesRouter } from './api/files.js';
import { createTransformRouter } from './api/transform.js';
import { createComponentTreeRouter } from './api/componentTree.js';
import { createSessionsRouter } from './api/sessions.js';
import { createWebSocketServer } from './ws/index.js';

export * from './types.js';
export { sessionManager } from './session/manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer(
  projectInfo: ProjectInfo,
  vitePort: number,
  serverPort: number,
  previewPort: number,
): Promise<{ server: http.Server; previewServer: http.Server }> {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Preview Proxy Server (runs on previewPort, proxies Vite & injects bridge)
  // ───────────────────────────────────────────────────────────────────────────
  const previewApp = express();
  previewApp.use(
    createProxyMiddleware({
      target: `http://localhost:${vitePort}`,
      changeOrigin: true,
      ws: true,
      selfHandleResponse: true,
      on: {
        proxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
          const contentType = proxyRes.headers['content-type'] || '';
          if (contentType.includes('text/html')) {
            let html = responseBuffer.toString('utf8');
            const scriptTag = `<script src="http://localhost:${serverPort}/verya/bridge.js"></script>`;
            if (html.includes('</body>')) {
              html = html.replace('</body>', `${scriptTag}</body>`);
            } else {
              html += scriptTag;
            }
            return html;
          }
          return responseBuffer;
        }),
      },
    }),
  );

  const previewServer = http.createServer(previewApp);
  await new Promise<void>((resolve, reject) => {
    previewServer.listen(previewPort, () => resolve());
    previewServer.on('error', reject);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Verya Server (runs on serverPort, provides API, WS, bridge.js & UI)
  // ───────────────────────────────────────────────────────────────────────────
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));

  const server = http.createServer(app);
  const { broadcast } = createWebSocketServer(server);

  // Serve bridge.js
  app.get('/verya/bridge.js', (_req, res) => {
    const candidatePaths = [
      path.resolve(__dirname, 'bridge.js'),
      path.resolve(__dirname, '../src/bridge.js'),
      path.resolve(__dirname, '../dist/bridge.js'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/javascript');
        return res.sendFile(p);
      }
    }
    return res.status(404).send('// bridge.js not found');
  });

  // Mount API routers
  app.use('/api/project', createProjectRouter(projectInfo));
  app.use('/api/files', createFilesRouter(projectInfo));
  app.use('/api/transform', createTransformRouter(broadcast, projectInfo));
  app.use('/api/component-tree', createComponentTreeRouter(projectInfo));
  app.use('/api/sessions', createSessionsRouter(projectInfo, broadcast));

  // Serve Verya Editor UI
  // Check packages/ui/dist
  const uiDistCandidates = [
    process.env.UI_DIST,
    path.resolve(__dirname, '../../../packages/ui/dist'),
    path.resolve(__dirname, '../../ui/dist'),
    path.resolve(process.cwd(), 'packages/ui/dist'),
  ].filter(Boolean) as string[];

  let uiDistFound: string | null = null;
  for (const candidate of uiDistCandidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      uiDistFound = candidate;
      break;
    }
  }

  if (uiDistFound) {
    app.use(express.static(uiDistFound));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(uiDistFound!, 'index.html'));
    });
  } else if (process.env.UI_DEV_PORT) {
    // In dev mode, proxy to UI dev server
    app.use(
      createProxyMiddleware({
        target: `http://localhost:${process.env.UI_DEV_PORT}`,
        changeOrigin: true,
        ws: true,
      }),
    );
  } else {
    // If not built yet, return informative message
    app.get('/', (_req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Verya</title><style>body{background:#0B0D12;color:#E8EAF0;font-family:sans-serif;padding:40px;text-align:center;}</style></head>
        <body>
          <h1>Verya — Visual editing for real code</h1>
          <p>The UI is building or being served. Backend is running on port ${serverPort}.</p>
          <p>Preview proxy is running at <a style="color:#6366f1" href="http://localhost:${previewPort}" target="_blank">http://localhost:${previewPort}</a>.</p>
        </body>
        </html>
      `);
    });
  }

  // Watch session project directory for external edits
  const watcher = chokidar.watch(projectInfo.root, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/.verya/**',
      '**/.next/**',
    ],
    ignoreInitial: true,
    depth: 8,
  });

  watcher.on('change', async (filePath) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      broadcast({
        type: 'FILE_CHANGED',
        path: filePath,
        content,
      });
    } catch {
      // ignore
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(serverPort, () => resolve());
    server.on('error', reject);
  });

  return { server, previewServer };
}
