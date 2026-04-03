import { create } from "zustand";
import api, { setToken, setRefreshToken, clearTokens } from "./api";

interface User { id: string; name: string; phone: string; role: string; }

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: async (phone: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/login", { phone, password });
      const { accessToken, user } = data.data;
      await setToken(accessToken);
      if (data.data.refreshToken) await setRefreshToken(data.data.refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch { set({ isLoading: false }); throw new Error("Invalid credentials"); }
  },
  logout: async () => {
    try { await api.post("/auth/logout"); } catch {}
    await clearTokens();
    set({ user: null, isAuthenticated: false });
  },
}));
