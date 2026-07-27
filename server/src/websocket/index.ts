import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { JwtPayload } from '../middleware/auth';

let io: SocketIOServer;

export function createWebSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      // Allow unauthenticated connections — they just won't get user-specific events
      return next();
    }
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      // Token invalid/expired — still allow connection, just without user context
      console.warn('[WS] Invalid token from client');
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user as JwtPayload;
    console.log(`[WS] Connected: ${user.email}`);

    socket.join(`user:${user.userId}`);

    socket.on('disconnect', () => {
      console.log(`[WS] Disconnected: ${user.email}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('WebSocket server not initialized');
  return io;
}
