import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { useCartStore } from "../../lib/cart-store";

export default function ItemsScreen() {
  const [search, setSearch] = useState("");
  const cart = useCartStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["skus", search], queryFn: () => api.get("/master/skus", { params: { search, limit: 50 } }).then(r => r.data) });
  const { data: pd } = useQuery({ queryKey: ["parties-order"], queryFn: () => api.get("/master/parties", { params: { limit: 100 } }).then(r => r.data) });
  const createMut = useMutation({
    mutationFn: (d: { partyId: string; items: Array<{ skuId: string; qty: number }> }) => api.post("/orders/pre-sale", d),
    onSuccess: () => { Alert.alert("Success", "Order created"); cart.clear(); qc.invalidateQueries({ queryKey: ["orders"] }); },
    onError: (e: any) => Alert.alert("Error", e?.response?.data?.error ?? "Failed"),
  });

  const skus = data?.data ?? [];
  const parties = pd?.data ?? [];
  const sorted = [...skus].sort((a: any, b: any) => (a.isFocusSku && !b.isFocusSku ? -1 : !a.isFocusSku && b.isFocusSku ? 1 : 0));
  const total = cart.getTotal();
  const count = cart.items.reduce((s: number, i: { qty: number }) => s + i.qty, 0);

  return (
    <View style={s.container}>
      <TextInput style={s.search} placeholder="Search items..." value={search} onChangeText={setSearch} />
      {parties.length > 0 && <View style={s.partyRow}><Text style={s.partyL}>Party: </Text>
        <TouchableOpacity onPress={() => { const idx = parties.findIndex((p: any) => p.id === cart.partyId); const next = parties[(idx+1)%parties.length] as any; cart.setParty(next.id, next.name); }}>
          <Text style={s.partyV}>{cart.partyName ?? "Tap to select"} ▼</Text></TouchableOpacity></View>}
      <FlatList data={sorted} keyExtractor={(i: any) => i.id} renderItem={({ item }: { item: any }) => {
        const inCart = cart.items.find((i: { skuId: string }) => i.skuId === item.id);
        return (<View style={s.card}><View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}><Text style={s.name}>{item.isFocusSku ? "⭐ " : ""}{item.name}</Text><Text style={s.meta}>{item.category} | {item.brand}</Text><Text style={s.price}>PTR: ₹{Number(item.ptr)} | MRP: ₹{Number(item.mrp)}</Text></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {inCart ? (<><TouchableOpacity style={s.qBtn} onPress={() => cart.updateQty(item.id, inCart.qty-1)}><Text style={s.qBtnT}>−</Text></TouchableOpacity><Text style={s.qTxt}>{inCart.qty}</Text><TouchableOpacity style={s.qBtn} onPress={() => cart.updateQty(item.id, inCart.qty+1)}><Text style={s.qBtnT}>+</Text></TouchableOpacity></>) :
            (<TouchableOpacity style={s.addBtn} onPress={() => cart.addItem({ skuId: item.id, skuName: item.name, qty: 1, rate: Number(item.ptr) })}><Text style={s.addBtnT}>ADD</Text></TouchableOpacity>)}
          </View></View></View>);
      }} ListEmptyComponent={<Text style={s.empty}>{isLoading ? "Loading..." : "No items"}</Text>} />
      {count > 0 && <View style={s.cartBar}><Text style={s.cartT}>{count} items | ₹{total.toLocaleString()}</Text>
        <TouchableOpacity style={s.orderBtn} onPress={() => { if (!cart.partyId && parties.length) { cart.setParty(parties[0].id, parties[0].name); } if (!cart.partyId) { Alert.alert("Error","Select party"); return; } createMut.mutate({ partyId: cart.partyId!, items: cart.items.map((i: { skuId: string; qty: number }) => ({ skuId: i.skuId, qty: i.qty })) }); }} disabled={createMut.isPending}>
          <Text style={s.orderBtnT}>{createMut.isPending ? "Creating..." : "Place Order"}</Text></TouchableOpacity></View>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" }, search: { margin: 12, padding: 12, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  partyRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginBottom: 8 }, partyL: { fontSize: 14, color: "#666" }, partyV: { fontSize: 14, fontWeight: "600", color: "#1a1a2e" },
  card: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 6, borderRadius: 10, padding: 12, elevation: 2 },
  name: { fontSize: 15, fontWeight: "700", color: "#1a1a2e" }, meta: { fontSize: 12, color: "#888", marginTop: 2 }, price: { fontSize: 13, color: "#333", marginTop: 4, fontWeight: "500" },
  qBtn: { width: 32, height: 32, backgroundColor: "#e3e3e3", borderRadius: 6, justifyContent: "center", alignItems: "center" }, qBtnT: { fontSize: 18, fontWeight: "700" },
  qTxt: { fontSize: 16, fontWeight: "700", minWidth: 24, textAlign: "center" },
  addBtn: { backgroundColor: "#1a1a2e", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }, addBtnT: { color: "#fff", fontSize: 13, fontWeight: "700" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  cartBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 14, borderTopWidth: 1, borderTopColor: "#eee" },
  cartT: { fontSize: 15, fontWeight: "600" }, orderBtn: { backgroundColor: "#22c55e", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }, orderBtnT: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
