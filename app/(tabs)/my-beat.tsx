import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Linking, TextInput, Modal, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";

interface Stop {
  id: string;
  sequenceOrder: number;
  estimatedDurationMinutes: number;
  customer: {
    id: string;
    businessName: string;
    contactPerson: string;
    phone: string;
    lat: number;
    lng: number;
    preferredVisitWindow: string | null;
    parkingInstructions: string | null;
    landmark: string | null;
    running_balance: number;
    lastOrderDate: string | null;
    lastOrderValue: number | null;
  };
}

type StopStatus = "VISITED" | "SKIPPED" | "IN_PROGRESS" | "PENDING";

export default function MyBeatScreen() {
  const [visitStatuses, setVisitStatuses] = useState<Record<string, StopStatus>>({});
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipStopId, setSkipStopId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState("SHOP_CLOSED");
  const [showDetails, setShowDetails] = useState<Stop | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-beat-today"],
    queryFn: () => api.get("/mobile/my-beat/today").then((r) => r.data),
    retry: false,
  });

  const checkInMutation = useMutation({
    mutationFn: async (stopId: string) => {
      // Get current position (simplified — in real app use expo-location)
      const stop = stops.find((s: Stop) => s.id === stopId);
      if (!stop) throw new Error("Stop not found");
      // For now, pass the customer's own lat/lng (in production, use GPS)
      return api.post(`/mobile/visit/${stopId}/check-in`, { lat: stop.customer.lat, lng: stop.customer.lng });
    },
    onSuccess: (_data, stopId) => {
      setVisitStatuses((prev) => ({ ...prev, [stopId]: "IN_PROGRESS" }));
      setActiveStopId(stopId);
      Alert.alert("Checked In", "You are now at the shop. Complete your tasks.");
    },
    onError: (err: any) => {
      try {
        const parsed = JSON.parse(err?.response?.data?.error ?? "{}");
        if (parsed.error === "TOO_FAR") {
          Alert.alert("Too Far", parsed.message);
        } else {
          Alert.alert("Error", err?.response?.data?.error ?? "Check-in failed");
        }
      } catch {
        Alert.alert("Error", err?.response?.data?.error ?? "Check-in failed");
      }
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (stopId: string) => api.post(`/mobile/visit/${stopId}/check-out`),
    onSuccess: (res, stopId) => {
      setVisitStatuses((prev) => ({ ...prev, [stopId]: "VISITED" }));
      setActiveStopId(null);
      Alert.alert("Visit Complete", `Duration: ${res.data.data.durationMinutes} minutes`);
      queryClient.invalidateQueries({ queryKey: ["my-beat-today"] });
    },
    onError: (err: any) => Alert.alert("Error", err?.response?.data?.error ?? "Check-out failed"),
  });

  const skipMutation = useMutation({
    mutationFn: (stopId: string) => api.post(`/mobile/visit/${stopId}/skip`, {
      reason: skipReason,
      proofImageUrl: "https://placeholder.com/skip-proof.jpg", // TODO: integrate camera
    }),
    onSuccess: (_data, stopId) => {
      setVisitStatuses((prev) => ({ ...prev, [stopId]: "SKIPPED" }));
      setShowSkipModal(false);
      setSkipStopId(null);
      Alert.alert("Visit Skipped", "Moving to next stop.");
    },
    onError: (err: any) => Alert.alert("Error", err?.response?.data?.error ?? "Skip failed"),
  });

  const beat = data?.data;
  const route = beat?.route;
  const stops: Stop[] = route?.stops ?? [];

  const visited = Object.values(visitStatuses).filter((s) => s === "VISITED").length;
  const skipped = Object.values(visitStatuses).filter((s) => s === "SKIPPED").length;
  const pending = stops.length - visited - skipped;

  // ── No Beat State ──
  if (!isLoading && (error || !route)) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.emptyIcon}>📍</Text>
        <Text style={s.emptyTitle}>No Beat Today</Text>
        <Text style={s.emptyText}>You don't have a beat assigned for today. Contact your manager.</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return <View style={s.emptyContainer}><ActivityIndicator size="large" color="#2563eb" /><Text style={s.emptyText}>Loading today's beat...</Text></View>;
  }

  function getStopStatus(stopId: string): StopStatus {
    return visitStatuses[stopId] ?? "PENDING";
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{route.visitDay} — {route.name}</Text>
        <Text style={s.headerSub}>Salesman: {route.salesman?.name}</Text>
      </View>

      {/* Progress Bar */}
      <View style={s.progressBar}>
        <View style={[s.progressItem, { backgroundColor: "#dcfce7" }]}><Text style={[s.progressNum, { color: "#166534" }]}>{visited}</Text><Text style={s.progressLabel}>Visited</Text></View>
        <View style={[s.progressItem, { backgroundColor: "#fef9c3" }]}><Text style={[s.progressNum, { color: "#854d0e" }]}>{skipped}</Text><Text style={s.progressLabel}>Skipped</Text></View>
        <View style={[s.progressItem, { backgroundColor: "#dbeafe" }]}><Text style={[s.progressNum, { color: "#1e40af" }]}>{pending}</Text><Text style={s.progressLabel}>Pending</Text></View>
      </View>

      {/* Stop List */}
      <FlatList
        data={stops}
        keyExtractor={(item: Stop) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }: { item: Stop }) => {
          const status = getStopStatus(item.id);
          const isActive = activeStopId === item.id;

          return (
            <TouchableOpacity
              style={[s.stopCard, isActive && s.stopCardActive]}
              onPress={() => setShowDetails(item)}
              activeOpacity={0.7}
            >
              <View style={s.stopRow}>
                {/* Sequence Badge */}
                <View style={[s.seqBadge,
                  status === "VISITED" ? s.seqVisited :
                  status === "SKIPPED" ? s.seqSkipped :
                  status === "IN_PROGRESS" ? s.seqActive : s.seqPending
                ]}>
                  <Text style={s.seqText}>{item.sequenceOrder}</Text>
                </View>

                {/* Customer Info */}
                <View style={s.stopInfo}>
                  <Text style={s.shopName}>{item.customer.businessName}</Text>
                  <Text style={s.shopContact}>{item.customer.contactPerson ?? ""} · {item.customer.phone}</Text>
                  {item.customer.running_balance > 0 && (
                    <Text style={s.balanceRed}>₹{item.customer.running_balance.toLocaleString("en-IN")} outstanding</Text>
                  )}
                  {item.customer.preferredVisitWindow && (
                    <Text style={s.visitWindow}>🕐 {item.customer.preferredVisitWindow}</Text>
                  )}
                </View>

                {/* Status Badge */}
                <View style={[s.statusBadge,
                  status === "VISITED" ? s.badgeGreen :
                  status === "SKIPPED" ? s.badgeGray :
                  status === "IN_PROGRESS" ? s.badgeBlue : s.badgePending
                ]}>
                  <Text style={s.statusText}>{status}</Text>
                </View>
              </View>

              {/* Actions for pending/active stops */}
              {(status === "PENDING" || status === "IN_PROGRESS") && (
                <View style={s.actionRow}>
                  {status === "PENDING" && (
                    <>
                      <TouchableOpacity style={s.checkInBtn} onPress={() => checkInMutation.mutate(item.id)} disabled={checkInMutation.isPending}>
                        <Text style={s.checkInText}>{checkInMutation.isPending ? "..." : "📍 Check In"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.skipBtn} onPress={() => { setSkipStopId(item.id); setShowSkipModal(true); }}>
                        <Text style={s.skipText}>Skip</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {status === "IN_PROGRESS" && (
                    <>
                      <TouchableOpacity style={s.navigateBtn} onPress={() => Linking.openURL(`https://maps.google.com/maps?daddr=${item.customer.lat},${item.customer.lng}`)}>
                        <Text style={s.navigateText}>🗺️ Navigate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.skipBtn} onPress={() => { setSkipStopId(item.id); setShowSkipModal(true); }}>
                        <Text style={s.skipText}>Skip</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={s.emptyText}>No stops in this beat</Text>}
      />

      {/* Skip Modal */}
      <Modal visible={showSkipModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Skip Visit</Text>
            <Text style={s.modalLabel}>Reason</Text>
            <View style={s.reasonRow}>
              {["SHOP_CLOSED", "OWNER_UNAVAILABLE", "SUFFICIENT_STOCK"].map((r) => (
                <TouchableOpacity key={r} style={[s.reasonBtn, skipReason === r && s.reasonBtnActive]} onPress={() => setSkipReason(r)}>
                  <Text style={[s.reasonText, skipReason === r && s.reasonTextActive]}>
                    {r === "SHOP_CLOSED" ? "🚪 Shop Closed" : r === "OWNER_UNAVAILABLE" ? "👤 Owner Away" : "📦 Has Stock"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.modalNote}>📸 Proof photo required (camera integration coming soon)</Text>
            <TouchableOpacity style={s.confirmSkipBtn} onPress={() => skipStopId && skipMutation.mutate(skipStopId)} disabled={skipMutation.isPending}>
              <Text style={s.confirmSkipText}>{skipMutation.isPending ? "Skipping..." : "Confirm Skip"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSkipModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal visible={!!showDetails} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.detailsModal}>
            {showDetails && (
              <>
                <Text style={s.detailsName}>{showDetails.customer.businessName}</Text>
                <Text style={s.detailsContact}>{showDetails.customer.contactPerson} · {showDetails.customer.phone}</Text>
                {showDetails.customer.landmark && <View style={s.detailCard}><Text style={s.detailLabel}>📍 Landmark</Text><Text style={s.detailValue}>{showDetails.customer.landmark}</Text></View>}
                {showDetails.customer.parkingInstructions && <View style={s.detailCard}><Text style={s.detailLabel}>🅿️ Parking</Text><Text style={s.detailValue}>{showDetails.customer.parkingInstructions}</Text></View>}
                {showDetails.customer.preferredVisitWindow && <View style={s.detailCard}><Text style={s.detailLabel}>🕐 Best Time</Text><Text style={s.detailValue}>{showDetails.customer.preferredVisitWindow}</Text></View>}
                <View style={s.detailCard}>
                  <Text style={s.detailLabel}>💰 Outstanding</Text>
                  <Text style={[s.detailValue, { color: showDetails.customer.running_balance > 0 ? "#dc2626" : "#16a34a" }]}>
                    {showDetails.customer.running_balance > 0 ? `₹${showDetails.customer.running_balance.toLocaleString("en-IN")}` : "Cleared ✓"}
                  </Text>
                </View>
                {showDetails.customer.lastOrderDate && (
                  <View style={s.detailCard}><Text style={s.detailLabel}>📦 Last Order</Text><Text style={s.detailValue}>₹{showDetails.customer.lastOrderValue?.toLocaleString("en-IN")} on {new Date(showDetails.customer.lastOrderDate).toLocaleDateString("en-IN")}</Text></View>
                )}
                <TouchableOpacity style={s.navigateBtnLarge} onPress={() => { Linking.openURL(`https://maps.google.com/maps?daddr=${showDetails.customer.lat},${showDetails.customer.lng}`); setShowDetails(null); }}>
                  <Text style={s.navigateTextLarge}>🗺️ Navigate to Shop</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDetails(null)}><Text style={s.cancelText}>Close</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#1e3a5f", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  progressBar: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  progressItem: { flex: 1, borderRadius: 8, padding: 10, alignItems: "center" },
  progressNum: { fontSize: 20, fontWeight: "800" },
  progressLabel: { fontSize: 10, color: "#64748b", marginTop: 2, fontWeight: "600" },
  stopCard: { backgroundColor: "#fff", marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#e2e8f0", elevation: 1 },
  stopCardActive: { borderLeftColor: "#2563eb", backgroundColor: "#f0f7ff" },
  stopRow: { flexDirection: "row", alignItems: "flex-start" },
  seqBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 10 },
  seqVisited: { backgroundColor: "#dcfce7" }, seqSkipped: { backgroundColor: "#f1f5f9" }, seqActive: { backgroundColor: "#dbeafe" }, seqPending: { backgroundColor: "#e0e7ff" },
  seqText: { fontSize: 13, fontWeight: "800", color: "#334155" },
  stopInfo: { flex: 1 },
  shopName: { fontSize: 14, fontWeight: "700", color: "#1e293b" },
  shopContact: { fontSize: 12, color: "#64748b", marginTop: 2 },
  balanceRed: { fontSize: 11, color: "#dc2626", fontWeight: "600", marginTop: 3 },
  visitWindow: { fontSize: 11, color: "#9333ea", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeGreen: { backgroundColor: "#dcfce7" }, badgeGray: { backgroundColor: "#f1f5f9" }, badgeBlue: { backgroundColor: "#dbeafe" }, badgePending: { backgroundColor: "#e0e7ff" },
  statusText: { fontSize: 9, fontWeight: "700", color: "#475569", textTransform: "uppercase" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  checkInBtn: { flex: 1, backgroundColor: "#2563eb", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  checkInText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkOutBtn: { flex: 1, backgroundColor: "#16a34a", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  checkOutText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  navigateBtn: { flex: 1, backgroundColor: "#e0e7ff", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  navigateText: { color: "#3b82f6", fontSize: 13, fontWeight: "600" },
  skipBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#fecaca", alignItems: "center" },
  skipText: { color: "#ef4444", fontSize: 12, fontWeight: "600" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  emptyText: { fontSize: 14, color: "#94a3b8", textAlign: "center", marginTop: 8 },
  retryBtn: { marginTop: 16, backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 8 },
  modalNote: { fontSize: 12, color: "#94a3b8", marginTop: 12, marginBottom: 16 },
  reasonRow: { gap: 8 },
  reasonBtn: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 6 },
  reasonBtnActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  reasonText: { fontSize: 13, color: "#475569" },
  reasonTextActive: { color: "#2563eb", fontWeight: "600" },
  confirmSkipBtn: { backgroundColor: "#ef4444", paddingVertical: 14, borderRadius: 8, alignItems: "center" },
  confirmSkipText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelText: { textAlign: "center", color: "#94a3b8", marginTop: 12, fontSize: 14 },
  detailsModal: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "80%" },
  detailsName: { fontSize: 20, fontWeight: "800", color: "#1e293b" },
  detailsContact: { fontSize: 14, color: "#64748b", marginTop: 4, marginBottom: 16 },
  detailCard: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 8 },
  detailLabel: { fontSize: 11, fontWeight: "600", color: "#94a3b8", marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: "500", color: "#1e293b" },
  navigateBtnLarge: { backgroundColor: "#2563eb", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 12 },
  navigateTextLarge: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
