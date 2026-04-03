import { View, Text, FlatList, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

export default function TransactionsScreen() {
  const { data, isLoading } = useQuery({ queryKey: ["my-orders"], queryFn: () => api.get("/orders", { params: { limit: 50 } }).then(r => r.data) });
  const orders = data?.data ?? [];
  const sc = (s: string) => s === "DELIVERED" ? "#22c55e" : s === "CANCELLED" ? "#ef4444" : s === "DRAFT" ? "#f59e0b" : "#6b7280";

  return (
    <View style={s.c}><FlatList data={orders} keyExtractor={(i: any) => i.id} renderItem={({ item }: { item: any }) => (
      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={s.name}>{item.party?.name}</Text><View style={[s.badge, { backgroundColor: sc(item.status) }]}><Text style={s.badgeT}>{item.status}</Text></View></View>
        <Text style={s.meta}>{item.type.replace("_"," ")} | {item._count?.items} items</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}><Text style={s.amt}>₹{Number(item.totalNet).toLocaleString()}</Text><Text style={s.date}>{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</Text></View>
        {item.invoice && <Text style={s.inv}>Invoice: {item.invoice.invoiceNo}</Text>}
      </View>
    )} ListEmptyComponent={<Text style={s.empty}>{isLoading ? "Loading..." : "No orders"}</Text>} /></View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#f8f9fa" }, card: { backgroundColor: "#fff", marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, elevation: 2 },
  name: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" }, badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }, badgeT: { color: "#fff", fontSize: 11, fontWeight: "600" },
  meta: { fontSize: 13, color: "#888", marginTop: 4 }, amt: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" }, date: { fontSize: 13, color: "#888" }, inv: { fontSize: 12, color: "#2563eb", marginTop: 4 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
