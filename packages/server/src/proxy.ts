import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import type { RequestHandler } from 'express';

export function createViteProxy(vitePort: number): RequestHandler {
  return createProxyMiddleware({
    target: `http://localhost:${vitePort}`,
    changeOrigin: true,
    ws: true,
    selfHandleResponse: true,
    on: {
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, _req, _res) => {
        const contentType = proxyRes.headers['content-type'] || '';
        if (contentType.includes('text/html')) {
          let html = responseBuffer.toString('utf8');
          const scriptTag = '<script src="/verya/bridge.js"></script>';
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
  });
}
