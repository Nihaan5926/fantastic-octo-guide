import type { Module } from '../../core/types';
import router from './router';

const manifest = {
  name: 'biometrics',
  version: '1.0.0',
  category: 'INT Disciplines',
  permissions: ['biometrics:read', 'biometrics:create', 'biometrics:update', 'biometrics:delete'],
  apiPrefix: '/api/biometrics',
  navItems: [
    { label: 'Biometrics', path: '/biometrics', icon: 'Fingerprint', category: 'INT Disciplines', order: 24 },
  ],
  dashboardWidgets: [
    { id: 'biometric-records', title: 'Biometric Records', icon: 'Fingerprint', defaultWidth: 4, defaultHeight: 2 },
  ],
  globalSearchEnabled: true,
} as const;

const mod: Module = { manifest, router, migrations: [] };
export default mod;
