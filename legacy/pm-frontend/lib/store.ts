import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

interface DecodedToken {
  sub: string;
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  exp: number;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setToken: (token: string) => {
        try {
          const decoded = jwtDecode<DecodedToken>(token);
          const user: User = {
            id: decoded.userId,
            email: decoded.sub,
            name: decoded.sub.split('@')[0],
            tenantId: decoded.tenantId,
            roles: decoded.roles || [],
            permissions: decoded.permissions || [],
          };
          set({ token, user, isAuthenticated: true });
        } catch (error) {
          console.error('Failed to decode token', error);
          set({ token: null, user: null, isAuthenticated: false });
        }
      },
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        localStorage.removeItem('token');
      },
    }),
    {
      name: 'pm-auth-storage',
    }
  )
);

// UI Store for sidebar, theme, etc.
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

// Project Store for current project context
interface ProjectState {
  currentProjectId: string | null;
  currentProjectCode: string | null;
  setCurrentProject: (id: string | null, code: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProjectId: null,
  currentProjectCode: null,
  setCurrentProject: (id, code) => set({ currentProjectId: id, currentProjectCode: code }),
}));
