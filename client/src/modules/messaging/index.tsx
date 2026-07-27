import { lazy } from 'react';

const MessagesList = lazy(() => import('./pages/MessagesList'));
const MessagesDetail = lazy(() => import('./pages/MessagesDetail'));

export default {
  name: 'messaging',
  routes: [
    { path: '/messages', element: <MessagesList /> },
    { path: '/messages/:id', element: <MessagesDetail /> },
  ],
  navItems: [
    { label: 'Messages', path: '/messages', icon: 'MessageSquare', category: 'DISSEMINATION', order: 51 },
  ],
  permissions: ['messaging:read', 'messaging:create'],
};
