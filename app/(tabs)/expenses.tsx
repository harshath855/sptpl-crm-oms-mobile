import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

export default function ExpensesScreen() {
  const [type, setType] = useState("FUEL");
  const [amount, setAmount] = useState("");
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-expenses"], queryFn: () => api.get("/expenses", { params: { limit: 20 } }).then(r => r.data) });
  const mut = useMutation({
    mutationFn: (d: { type: string; amount: number }) => api.post("/expenses", d),
    onSuccess: () => { Alert.alert("Success", "Expense logged"); setAmount(""); qc.invalidateQueries({ queryKey: ["my-expenses"] }); },
    onError: () => Alert.alert("Error", "Failed"),
  });
  const expenses = data?.data ?? [];

  return (
    <View style={s.c}>
      <View style={s.form}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {["FUEL","TEA","TOLL","OTHER"].map(t => <TouchableOpacity key={t} style={[s.tBtn, type===t && s.tBtnA]} onPress={() => setType(t)}><Text style={[s.tT, type===t && {color:"#fff"}]}>{t}</Text></TouchableOpacity>)}
        </View>
        <TextInput style={s.input} placeholder="Amount (₹)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <TouchableOpacity style={s.submit} onPress={() => amount && mut.mutate({ type, amount: Number(amount) })} disabled={mut.isPending}><Text style={s.submitT}>{mut.isPending ? "Logging..." : "Log Expense"}</Text></TouchableOpacity>
      </View>
      <Text style={s.histTitle}>Recent Expenses</Text>
      <FlatList data={expenses} keyExtractor={(i: any) => i.id} renderItem={({ item }: { item: any }) => (
        <View style={s.card}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={s.eType}>{item.type}</Text><Text style={s.eAmt}>₹{Number(item.amount).toLocaleString()}</Text></View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}><Text style={s.date}>{new Date(item.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</Text>
            <View style={[s.sBadge, { backgroundColor: item.status==="APPROVED" ? "#dcfce7" : item.status==="REJECTED" ? "#fee2e2" : "#fef9c3" }]}><Text style={{ fontSize: 11, fontWeight: "600", color: item.status==="APPROVED" ? "#166534" : item.status==="REJECTED" ? "#991b1b" : "#854d0e" }}>{item.status}</Text></View></View></View>
      )} ListEmptyComponent={<Text style={s.empty}>No expenses</Text>} />
    </View>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, backgroundColor: "#f8f9fa" }, form: { backgroundColor: "#fff", margin: 12, borderRadius: 12, padding: 16, elevation: 2 },
  tBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", alignItems: "center" }, tBtnA: { backgroundColor: "#1a1a2e", borderColor: "#1a1a2e" }, tT: { fontSize: 13, fontWeight: "600", color: "#666" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  submit: { backgroundColor: "#1a1a2e", padding: 14, borderRadius: 8, alignItems: "center" }, submitT: { color: "#fff", fontSize: 16, fontWeight: "600" },
  histTitle: { fontSize: 16, fontWeight: "700", marginHorizontal: 12, marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 6, borderRadius: 8, padding: 12 },
  eType: { fontSize: 14, fontWeight: "600" }, eAmt: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" }, date: { fontSize: 12, color: "#888" },
  sBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }, empty: { textAlign: "center", color: "#999", marginTop: 20 },
});
