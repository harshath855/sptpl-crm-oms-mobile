import { Redirect } from "expo-router";
import { useAuthStore } from "../lib/auth-store";
export default function Index() {
  const { isAuthenticated } = useAuthStore();
  return <Redirect href={isAuthenticated ? "/(tabs)/parties" : "/login"} />;
}
