import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useSettingsStore } from './store/settingsStore';

// Apply persisted theme on startup
const settings = useSettingsStore.getState();
settings.applyTheme();
document.documentElement.setAttribute('data-density', settings.density);
document.documentElement.setAttribute('data-animations', String(settings.showAnimations));
document.documentElement.setAttribute('data-compact-cards', String(settings.compactCards));

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const theme = useSettingsStore.getState().theme;
  if (theme === 'system') {
    useSettingsStore.getState().applyTheme();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
