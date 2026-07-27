import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { JwtPayload } from '../middleware/auth';
import { db } from '../db/knex';
import { v4 as uuid } from 'uuid';

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
      return next();
    }
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      console.warn('[WS] Invalid token from client');
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user as JwtPayload | undefined;
    if (user) {
      console.log(`[WS] Connected: ${user.email}`);
      socket.join(`user:${user.userId}`);
    } else {
      console.log('[WS] Connected: anonymous');
    }

    // ─── Messaging Events ───
    socket.on('channel:join', (data: { channelId: string }) => {
      if (!user) return;
      const room = `channel:${data.channelId}`;
      socket.join(room);
      socket.emit('channel:joined', { channelId: data.channelId });
    });

    socket.on('message:send', async (data: { channelId: string; body: string; subject?: string }) => {
      if (!user) return;
      try {
        const [msg] = await db('secure_messages').insert({
          id: uuid(),
          channel_id: data.channelId,
          sender_id: user.userId,
          body: data.body,
          subject: data.subject || data.body?.slice(0, 50) || '',
        }).returning('*');

        const enriched = {
          ...msg,
          sender_first: user.email,
        };

        const room = `channel:${data.channelId}`;
        io.to(room).emit('message:new', enriched);
      } catch (err: any) {
        console.error('[WS] Message send failed:', err.message);
        socket.emit('message:error', { error: err.message });
      }
    });

    socket.on('typing:start', (data: { channelId: string }) => {
      if (!user) return;
      socket.to(`channel:${data.channelId}`).emit('typing:start', {
        channelId: data.channelId,
        userId: user.userId,
        email: user.email,
      });
    });

    socket.on('typing:stop', (data: { channelId: string }) => {
      if (!user) return;
      socket.to(`channel:${data.channelId}`).emit('typing:stop', {
        channelId: data.channelId,
        userId: user.userId,
      });
    });

    // Cleanup
    socket.on('disconnect', () => {
      if (user) {
        console.log(`[WS] Disconnected: ${user.email}`);
      } else {
        console.log('[WS] Disconnected: anonymous');
      }
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('WebSocket server not initialized');
  return io;
}
