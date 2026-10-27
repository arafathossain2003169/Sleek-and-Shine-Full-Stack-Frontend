import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  isCartOpen: boolean;
  /** mobile slide-over version of the sidebar */
  isSidebarDrawerOpen: boolean;
  /** desktop rail (icons only) vs. expanded sidebar; remembered between visits */
  isSidebarCollapsed: boolean;
  /** admin panel sidebar (icon rail <-> full), remembered between visits */
  isAdminSidebarCollapsed: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  openSidebarDrawer: () => void;
  closeSidebarDrawer: () => void;
  toggleSidebar: () => void;
  expandSidebar: () => void;
  toggleAdminSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      isCartOpen: false,
      isSidebarDrawerOpen: false,
      isSidebarCollapsed: false,
      isAdminSidebarCollapsed: false,
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      toggleCart: () => set((s) => ({ isCartOpen: !s.isCartOpen })),
      openSidebarDrawer: () => set({ isSidebarDrawerOpen: true }),
      closeSidebarDrawer: () => set({ isSidebarDrawerOpen: false }),
      toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
      expandSidebar: () => set({ isSidebarCollapsed: false }),
      toggleAdminSidebar: () => set((s) => ({ isAdminSidebarCollapsed: !s.isAdminSidebarCollapsed })),
    }),
    {
      name: 'sleeknshine-ui',
      version: 1,
      partialize: (s) => ({ isSidebarCollapsed: s.isSidebarCollapsed, isAdminSidebarCollapsed: s.isAdminSidebarCollapsed }),
      // Rehydrated after mount (see AppSidebar) so server and first client render match.
      skipHydration: true,
    }
  )
);
