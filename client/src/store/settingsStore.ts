import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';
type Density = 'comfortable' | 'compact';
type DefaultPage = '/dashboard' | '/reports' | '/cases' | '/threats' | '/missions';
type Language = 'en' | 'fr' | 'es' | 'de' | 'ar';
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
type TimeFormat = '12h' | '24h';

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
  language: Language;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;

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
  setLanguage: (l: Language) => void;
  setTimezone: (tz: string) => void;
  setDateFormat: (df: DateFormat) => void;
  setTimeFormat: (tf: TimeFormat) => void;
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
  language: 'en' as Language,
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY' as DateFormat,
  timeFormat: '12h' as TimeFormat,
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
      setLanguage: (language) => set({ language }),
      setTimezone: (timezone) => set({ timezone }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),

      resetToDefaults: () => set(DEFAULTS),

      applyTheme: () => {
        const theme = get().theme;
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
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
        language: state.language,
        timezone: state.timezone,
        dateFormat: state.dateFormat,
        timeFormat: state.timeFormat,
      }),
    }
  )
);
