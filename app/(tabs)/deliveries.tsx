import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

export default function DeliveriesScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["pending-del"], queryFn: () => api.get("/orders", { params: { status: "DRAFT", limit: 50 } }).then(r => r.data) });
  const mut = useMutation({
    mutationFn: (id: string) => api.patch(`/orders/${id}/convert-to-invoice`, { adjustments: [] }),
    onSuccess: () => { Alert.alert("Success", "Delivered & invoiced"); qc.invalidateQueries({ queryKey: ["pending-del"] }); },
    onError: (e: any) => Alert.alert("Error", e?.response?.data?.error ?? "Failed"),
  });
  const orders = data?.data ?? [];

  return (
    <View style={s.c}><FlatList data={orders} keyExtractor={(i: any) => i.id} renderItem={({ item }: { item: any }) => (
      <View style={s.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={s.name}>{item.party?.name}</Text><Text style={s.amt}>₹{Number(item.totalNet).toLocaleString()}</Text></View>
        <Text style={s.meta}>{item.type.replace("_"," ")} | {item._count?.items} items</Text>
        <TouchableOpacity style={s.btn} onPress={() => Alert.alert("Confirm", `Deliver to ${item.party?.name}?`, [{ text: "Cancel", style: "cancel" }, { text: "Deliver", onPress: () => mut.mutate(item.id) }])} disabled={mut.isPending}>
          <Text style={s.btnT}>{mut.isPending ? "Processing..." : "Mark Delivered"}</Text></TouchableOpacity>
      </View>
    )} ListEmptyComponent={<View style={s.emptyC}><Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text><Text style={s.empty}>{isLoading ? "Loading..." : "All deliveries complete!"}</Text></View>} /></View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#f8f9fa" }, card: { backgroundColor: "#fff", marginHorizontal: 12, marginTop: 8, borderRadius: 10, padding: 14, elevation: 2 },
  name: { fontSize: 16, fontWeight: "700", color: "#1a1a2e", flex: 1 }, amt: { fontSize: 17, fontWeight: "700", color: "#1a1a2e" },
  meta: { fontSize: 13, color: "#888", marginTop: 4 }, btn: { backgroundColor: "#22c55e", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 10 },
  btnT: { color: "#fff", fontSize: 15, fontWeight: "700" }, emptyC: { alignItems: "center", marginTop: 60 }, empty: { color: "#999", fontSize: 16 },
});
