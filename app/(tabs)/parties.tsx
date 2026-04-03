import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

export default function PartiesScreen() {
  const [search, setSearch] = useState("");
  const [payPartyId, setPayPartyId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("CASH");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["parties", search], queryFn: () => api.get("/master/parties", { params: { search, limit: 50 } }).then((r) => r.data) });
  const collectMutation = useMutation({
    mutationFn: (d: { partyId: string; amount: number; mode: string }) => api.post("/payments", d),
    onSuccess: () => { Alert.alert("Success", "Payment collected"); setPayPartyId(null); qc.invalidateQueries({ queryKey: ["parties"] }); },
    onError: () => Alert.alert("Error", "Failed"),
  });

  const parties = data?.data ?? [];

  return (
    <View style={s.container}>
      <TextInput style={s.search} placeholder="Search parties..." value={search} onChangeText={setSearch} />
      <FlatList data={parties} keyExtractor={(i: any) => i.id} renderItem={({ item }: { item: any }) => (
        <View style={s.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.name}>{item.name}</Text>
            <View style={[s.badge, { backgroundColor: item.priceTier === "TIER_A" ? "#22c55e" : "#f59e0b" }]}><Text style={s.badgeT}>{item.priceTier}</Text></View>
          </View>
          <Text style={s.meta}>{item.type} | {item.beat?.name} | {item.phone}</Text>
          <TouchableOpacity style={s.btn} onPress={() => { setPayPartyId(item.id); setPayAmount(""); }}><Text style={s.btnT}>Collect Payment</Text></TouchableOpacity>
        </View>
      )} ListEmptyComponent={<Text style={s.empty}>{isLoading ? "Loading..." : "No parties"}</Text>} />
      <Modal visible={!!payPartyId} transparent animationType="slide">
        <View style={s.overlay}><View style={s.modal}>
          <Text style={s.modalTitle}>Collect Payment</Text>
          <TextInput style={s.input} placeholder="Amount" keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {["CASH","UPI","CHEQUE","NEFT"].map(m => <TouchableOpacity key={m} style={[s.modeBtn, payMode===m && s.modeBtnA]} onPress={() => setPayMode(m)}><Text style={[s.modeT, payMode===m && {color:"#fff"}]}>{m}</Text></TouchableOpacity>)}
          </View>
          <TouchableOpacity style={s.submit} onPress={() => payPartyId && payAmount && collectMutation.mutate({ partyId: payPartyId, amount: Number(payAmount), mode: payMode })}><Text style={s.submitT}>Collect</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setPayPartyId(null)}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" }, search: { margin: 12, padding: 12, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  card: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14, elevation: 2 }, name: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }, badgeT: { color: "#fff", fontSize: 11, fontWeight: "600" },
  meta: { fontSize: 13, color: "#666", marginTop: 2 }, btn: { backgroundColor: "#e8f5e9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginTop: 10, alignSelf: "flex-start" },
  btnT: { color: "#2e7d32", fontSize: 13, fontWeight: "600" }, empty: { textAlign: "center", color: "#999", marginTop: 40 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }, modal: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 }, input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", alignItems: "center" }, modeBtnA: { backgroundColor: "#1a1a2e", borderColor: "#1a1a2e" },
  modeT: { fontSize: 13, color: "#666" }, submit: { backgroundColor: "#1a1a2e", padding: 14, borderRadius: 8, alignItems: "center" },
  submitT: { color: "#fff", fontSize: 16, fontWeight: "600" }, cancel: { textAlign: "center", color: "#999", marginTop: 12 },
});
