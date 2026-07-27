import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';
type Density = 'comfortable' | 'compact';
type DefaultPage = '/dashboard' | '/reports' | '/cases' | '/threats' | '/missions';

interface AppSettings {
  theme: Theme;
  density: Density;
  sidebarCollapsed: boolean;
  sidebarCategories: Record<string, boolean>;
  defaultPage: DefaultPage;
  notificationSound: boolean;
  autoSaveForms: boolean;
  showAnimations: boolean;
  itemsPerPage: number;
  compactCards: boolean;

  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebarCategory: (cat: string) => void;
  setDefaultPage: (p: DefaultPage) => void;
  setNotificationSound: (v: boolean) => void;
  setAutoSaveForms: (v: boolean) => void;
  setShowAnimations: (v: boolean) => void;
  setItemsPerPage: (n: number) => void;
  setCompactCards: (v: boolean) => void;
  resetToDefaults: () => void;
  applyTheme: () => void;
}

const DEFAULTS = {
  theme: 'dark' as Theme,
  density: 'comfortable' as Density,
  sidebarCollapsed: false,
  sidebarCategories: {} as Record<string, boolean>,
  defaultPage: '/dashboard' as DefaultPage,
  notificationSound: false,
  autoSaveForms: false,
  showAnimations: true,
  itemsPerPage: 20,
  compactCards: false,
};

export const useSettingsStore = create<AppSettings>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
      },

      setDensity: (density) => set({ density }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      toggleSidebarCategory: (cat) => {
        const cats = { ...get().sidebarCategories };
        if (cats[cat]) delete cats[cat];
        else cats[cat] = true;
        set({ sidebarCategories: cats });
      },

      setDefaultPage: (defaultPage) => set({ defaultPage }),
      setNotificationSound: (v) => set({ notificationSound: v }),
      setAutoSaveForms: (v) => set({ autoSaveForms: v }),
      setShowAnimations: (v) => set({ showAnimations: v }),
      setItemsPerPage: (n) => set({ itemsPerPage: n }),
      setCompactCards: (v) => set({ compactCards: v }),

      resetToDefaults: () => set(DEFAULTS),

      applyTheme: () => {
        const theme = get().theme;
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) root.classList.add('dark');
          else root.classList.remove('dark');
        }
      },
    }),
    {
      name: 'icmp-settings',
      partialize: (state) => ({
        theme: state.theme,
        density: state.density,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarCategories: state.sidebarCategories,
        defaultPage: state.defaultPage,
        notificationSound: state.notificationSound,
        autoSaveForms: state.autoSaveForms,
        showAnimations: state.showAnimations,
        itemsPerPage: state.itemsPerPage,
        compactCards: state.compactCards,
      }),
    }
  )
);
