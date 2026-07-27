import { io, Socket } from 'socket.io-client';

const wsUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : window.location.origin;

export const socket: Socket = io(wsUrl, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('accessToken'),
  },
});

socket.on('connect', () => {
  console.log('[WS] Connected');
});

socket.on('disconnect', () => {
  console.log('[WS] Disconnected');
});
