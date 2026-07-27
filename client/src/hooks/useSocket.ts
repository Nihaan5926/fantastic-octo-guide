import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import type { Notification } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function useSocket() {
  const mounted = useRef(false);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (mounted.current) return;
    if (!user) return; // Wait until user profile is loaded

    mounted.current = true;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (socket?.connected) return;
    if (socket) { socket.disconnect(); socket = null; }

    const wsUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin;
    socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 5000,
      reconnectionDelayMax: 30000,
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
      if (err.message === 'Invalid token') {
        // Token expired — try refreshing
        const newToken = localStorage.getItem('accessToken');
        if (newToken && newToken !== token) {
          socket?.disconnect();
          socket = null;
          mounted.current = false;
        }
      }
      console.warn('[WS] Connection error:', err.message);
    });

    return () => {
      // Don't disconnect on unmount
    };
  }, [user, fetchUnreadCount]);
}
