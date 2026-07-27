import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../store/notificationStore';
import type { Notification } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function useSocket() {
  const mounted = useRef(false);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (socket?.connected) return;

    socket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected');
    });

    socket.on('notification:new', (notification: Notification) => {
      fetchUnreadCount();
      toast(notification.title, {
        icon: '🔔',
        duration: 5000,
        style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #334155' },
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });

    return () => {
      // Don't disconnect on unmount — let the socket persist
    };
  }, [fetchUnreadCount]);
}
