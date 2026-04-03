import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../constants/config";

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

const TOKEN_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}
export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config;
    if (error.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => { orig.headers.Authorization = `Bearer ${token}`; return api(orig); });
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        const rt = await getRefreshToken();
        if (!rt) throw new Error("No refresh token");
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { headers: { Cookie: `refresh_token=${rt}` } });
        const newToken = data.data.accessToken as string;
        await setToken(newToken);
        refreshQueue.forEach((q) => q.resolve(newToken));
        refreshQueue = [];
        orig.headers.Authorization = `Bearer ${newToken}`;
        return api(orig);
      } catch {
        refreshQueue.forEach((q) => q.reject(error));
        refreshQueue = [];
        await clearTokens();
        return Promise.reject(error);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  },
);

export default api;
