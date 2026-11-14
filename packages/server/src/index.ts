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

const LOOPBACK_HOST = '127.0.0.1';

function isAllowedOrigin(origin: string | undefined, allowedPorts: number[]): boolean {
  if (!origin) return true; // same-origin / non-browser clients
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1';
    if (!isLoopback) return false;
    return allowedPorts.length === 0 || allowedPorts.includes(Number(url.port));
  } catch {
    return false;
  }
}

export async function startServer(
  projectInfo: ProjectInfo,
  vitePort: number,
  serverPort: number,
  previewPort: number,
): Promise<{ server: http.Server; previewServer: http.Server }> {
  const allowedPorts = [serverPort, previewPort, vitePort];
  if (process.env.UI_DEV_PORT) allowedPorts.push(Number(process.env.UI_DEV_PORT));

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Preview Proxy Server (runs on previewPort, proxies Vite & injects bridge)
  // ───────────────────────────────────────────────────────────────────────────
  const previewApp = express();
  previewApp.use(
    createProxyMiddleware({
      target: `http://${LOOPBACK_HOST}:${vitePort}`,
      changeOrigin: true,
      ws: false,
      selfHandleResponse: true,
      on: {
        proxyRes: responseInterceptor(async (responseBuffer, proxyRes) => {
          const contentType = proxyRes.headers['content-type'] || '';
          if (contentType.includes('text/html')) {
            let html = responseBuffer.toString('utf8');
            const scriptTag = `<script src="http://${LOOPBACK_HOST}:${serverPort}/verya/bridge.js"></script>`;
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

  // HMR websockets are proxied separately so `selfHandleResponse` never applies
  // to the upgrade path (that combination breaks Vite's HMR socket).
  previewServer.on('upgrade', (req, socket, head) => {
    const wsProxy = createProxyMiddleware({
      target: `ws://${LOOPBACK_HOST}:${vitePort}`,
      ws: true,
      changeOrigin: true,
    });
    (wsProxy as any).upgrade(req, socket, head);
  });

  await new Promise<void>((resolve, reject) => {
    previewServer.listen(previewPort, LOOPBACK_HOST, () => resolve());
    previewServer.on('error', reject);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Verya Server (runs on serverPort, provides API, WS, bridge.js & UI)
  // ───────────────────────────────────────────────────────────────────────────
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, isAllowedOrigin(origin, allowedPorts));
      },
    }),
  );

  // Reject requests whose Host header was rebound to an attacker-controlled DNS
  // name (DNS rebinding attacks against local tools).
  app.use((req, res, next) => {
    const hostHeader = req.headers.host;
    if (hostHeader) {
      const hostname = hostHeader.split(':')[0]!.replace(/^\[|\]$/g, '');
      const isLoopback =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '::ffff:127.0.0.1';
      if (!isLoopback) {
        res.status(403).send('Forbidden host');
        return;
      }
    }
    next();
  });

  app.use(bodyParser.json({ limit: '50mb' }));

  const server = http.createServer(app);
  const { broadcast } = createWebSocketServer(server);

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

  app.use('/api/project', createProjectRouter(projectInfo));
  app.use('/api/files', createFilesRouter(projectInfo));
  app.use('/api/transform', createTransformRouter(broadcast, projectInfo));
  app.use('/api/component-tree', createComponentTreeRouter(projectInfo));
  app.use('/api/sessions', createSessionsRouter(projectInfo, broadcast));

  // 404 for unknown API routes instead of falling through to the UI index.html.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Unknown API route' });
  });

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
    app.use(
      createProxyMiddleware({
        target: `http://${LOOPBACK_HOST}:${process.env.UI_DEV_PORT}`,
        changeOrigin: true,
        ws: true,
      }),
    );
  } else {
    app.get('/', (_req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Verya</title><style>body{background:#0B0D12;color:#E8EAF0;font-family:sans-serif;padding:40px;text-align:center;}</style></head>
        <body>
          <h1>Verya — Visual editing for real code</h1>
          <p>The UI has not been built yet. Run <code>npm run build:ui</code> and restart.</p>
          <p>Backend is running on port ${serverPort}.</p>
          <p>Preview proxy is running at <a style="color:#6366f1" href="http://localhost:${previewPort}" target="_blank">http://localhost:${previewPort}</a>.</p>
        </body>
        </html>
      `);
    });
  }

  // Watch session project directory for external edits.
  const watcher = chokidar.watch(projectInfo.root, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/dist-release/**',
      '**/.verya/**',
      '**/.next/**',
      '**/.cache/**',
      '**/.output/**',
    ],
    ignoreInitial: true,
    depth: 8,
  });

  watcher.on('change', async (filePath) => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      broadcast({ type: 'FILE_CHANGED', path: filePath, content });
    } catch {
      // ignore unreadable (binary / removed) files
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(serverPort, LOOPBACK_HOST, () => resolve());
    server.on('error', reject);
  });

  const shutdown = async () => {
    await watcher.close().catch(() => {});
    previewServer.close();
    server.close();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return { server, previewServer };
}
