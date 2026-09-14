import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export function createWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[ws] Client error:', err);
      clients.delete(ws);
    });
  });

  function broadcast(message: object) {
    const data = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch {
          clients.delete(client);
        }
      }
    }
  }

  return { wss, broadcast };
}
