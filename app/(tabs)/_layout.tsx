import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#1a1a2e", tabBarInactiveTintColor: "#999", tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 4 }, headerStyle: { backgroundColor: "#1a1a2e" }, headerTintColor: "#fff" }}>
      <Tabs.Screen name="parties" options={{ title: "Parties", headerTitle: "My Parties", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="items" options={{ title: "Items", headerTitle: "Catalog", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="cube" size={size} color={color} /> }} />
      <Tabs.Screen name="transactions" options={{ title: "Orders", headerTitle: "Today's Orders", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="receipt" size={size} color={color} /> }} />
      <Tabs.Screen name="expenses" options={{ title: "Expenses", headerTitle: "Log Expense", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="wallet" size={size} color={color} /> }} />
      <Tabs.Screen name="deliveries" options={{ title: "Deliver", headerTitle: "Pending Deliveries", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="car" size={size} color={color} /> }} />
    </Tabs>
  );
}
