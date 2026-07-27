import { io, Socket } from 'socket.io-client';

const URL = '/';

export const socket: Socket = io(URL, {
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
