import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: number;
    email: string;
    role: string;
    accessKey?: string;
    createdAt?: string;
}

interface AuthState {
    token: string | null;
    user: User | null;
    _hasHydrated: boolean;
    setAuth: (token: string, user: User) => void;
    logout: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            _hasHydrated: false,
            setAuth: (token, user) => set({ token, user }),
            logout: () => set({ token: null, user: null }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'auth-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
