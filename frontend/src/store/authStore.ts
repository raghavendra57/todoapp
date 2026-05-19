import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name?: string;
  mfaEnabled?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  requiresMfa: boolean;
  isPremium: boolean;
  login: (user: User, requiresMfa: boolean) => void;
  logout: () => void;
  setMfaVerified: () => void;
  setPremium: (status: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      requiresMfa: false,
      isPremium: false,
      login: (user, requiresMfa) => set({ user, isAuthenticated: !requiresMfa, requiresMfa }),
      logout: () => set({ user: null, isAuthenticated: false, requiresMfa: false, isPremium: false }),
      setMfaVerified: () => set({ isAuthenticated: true, requiresMfa: false }),
      setPremium: (status) => set({ isPremium: status }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
