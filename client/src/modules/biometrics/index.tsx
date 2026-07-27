import { lazy } from 'react';

const BiometricsList = lazy(() => import('./pages/BiometricsList'));

export default {
  name: 'biometrics',
  routes: [
    { path: '/biometrics', element: <BiometricsList /> },
  ],
  navItems: [
    { label: 'Biometrics', path: '/biometrics', icon: 'Fingerprint', category: 'INT DISCIPLINES', order: 44 },
  ],
  permissions: ['biometrics:read', 'biometrics:create'],
};
