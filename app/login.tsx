import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../lib/auth-store";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  async function handleLogin() {
    try { await login(phone, password); router.replace("/(tabs)/parties"); }
    catch { Alert.alert("Login Failed", "Invalid phone number or password"); }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.card}>
        <Text style={s.title}>Sunshine OMS</Text>
        <Text style={s.subtitle}>Field Sales App</Text>
        <Text style={s.label}>Phone Number</Text>
        <TextInput style={s.input} placeholder="Enter phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Text style={s.label}>Password</Text>
        <TextInput style={s.input} placeholder="Enter password" secureTextEntry value={password} onChangeText={setPassword} />
        <TouchableOpacity style={s.button} onPress={handleLogin} disabled={isLoading}>
          <Text style={s.buttonText}>{isLoading ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f9fa", padding: 20 },
  card: { width: "100%", maxWidth: 400, backgroundColor: "#fff", borderRadius: 16, padding: 24, elevation: 5 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center", color: "#1a1a2e" },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: "#fafafa" },
  button: { backgroundColor: "#1a1a2e", borderRadius: 8, padding: 14, marginTop: 20, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
