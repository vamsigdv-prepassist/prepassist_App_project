import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function PaymentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLedger = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const incoming: any[] = [];
        
        // 1. Fetch Mobile App native transactions
        const mobileQ = query(collection(db, "payments"), where("userId", "==", user.uid));
        const mobilePromise = getDocs(mobileQ).then(snap => {
           snap.forEach(doc => {
              const data = doc.data();
              incoming.push({
                 id: doc.id,
                 ...data,
                 // Ensure Date object exists for local sorting
                 _normalizedDate: data.date?.toDate ? data.date.toDate() : new Date(data.date || 0)
              });
           });
        });

        // 2. Fetch Web App transactions
        const webQ = query(collection(db, "users", user.uid, "transactions"));
        const webPromise = getDocs(webQ).then(snap => {
           snap.forEach(doc => {
              const data = doc.data();
              incoming.push({
                 id: doc.id,
                 amount: data.costINR || 0, // Maps Web App costINR back to Mobile 'amount' UI logic
                 credits: data.amount || 0, // Maps Web App 'amount' to Mobile 'credits' UI logic
                 planName: data.planName || 'Unknown',
                 status: data.status === 'Success' ? 'SUCCESS' : (data.status || 'PENDING'),
                 _normalizedDate: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0)
              });
           });
        });

        await Promise.all([mobilePromise, webPromise]);
        
        // Sort locally by date descending
        incoming.sort((a, b) => b._normalizedDate.getTime() - a._normalizedDate.getTime());
        
        setPayments(incoming);
      } catch (e) {
        console.error("Ledger fetch failed", e);
      }
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLedger();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <Text style={[styles.title, { color: colors.foreground }]}>Payments Made</Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.heroWrap}>
           <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>
             Every AI Credit pack you purchase is recorded here, mapping explicitly against your exact subscription plan history chronologically.
           </Text>
        </View>

        <View style={[styles.listHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
             <Feather name="credit-card" size={18} color="#6366F1" />
             <Text style={[styles.listHeaderTitle, { color: colors.foreground }]}>Absolute Transaction History</Text>
           </View>
           <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
             <Text style={[styles.countText, { color: colors.foreground }]}>{payments.length} Records</Text>
           </View>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : payments.length === 0 ? (
          <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
             <Feather name="clock" size={48} color={colors.border} style={{ marginBottom: 16 }} />
             <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Transactions Mapped</Text>
             <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Purchase AI Credits securely via the Upgrade screen to log your initial receipt.</Text>
             <TouchableOpacity 
               style={[styles.emptyBtn, { backgroundColor: "rgba(99, 102, 241, 0.1)" }]}
               onPress={() => router.push("/upgrade")}
             >
               <Text style={styles.emptyBtnText}>View Subscription Plans</Text>
             </TouchableOpacity>
          </View>
        ) : (
          payments.map((p, idx) => {
            const dateObj = p.date ? (p.date.toDate ? p.date.toDate() : new Date(p.date)) : null;
            const isSuccess = p.status === "SUCCESS";
            
            let displayCredits = "X";
            if (p.credits !== undefined) {
              displayCredits = p.credits;
            } else {
              if (p.planName?.includes("Pro")) displayCredits = "200";
              else if (p.planName?.includes("Ultimate")) displayCredits = "400";
              else if (p.planName?.includes("Vault")) displayCredits = "0";
              else if (p.amount) displayCredits = p.amount.toString();
            }

            return (
              <View key={p.id || idx} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                 <View style={styles.cardHeader}>
                   <View style={styles.dateWrap}>
                     <Feather name="clock" size={14} color={colors.mutedForeground} />
                     <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                       {dateObj ? dateObj.toLocaleString() : "Processing Engine..."}
                     </Text>
                   </View>
                   <View style={[styles.statusBadge, { backgroundColor: isSuccess ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.1)" }]}>
                     <Feather name={isSuccess ? "check-circle" : "x-circle"} size={12} color={isSuccess ? "#10B981" : "#F43F5E"} />
                     <Text style={[styles.statusText, { color: isSuccess ? "#10B981" : "#F43F5E" }]}>
                       {isSuccess ? "Cleared" : "Failed / Blocked"}
                     </Text>
                   </View>
                 </View>
                 
                 <View style={styles.cardBody}>
                   <View style={{ flex: 1 }}>
                     <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                       <Feather name="arrow-down-circle" size={14} color="#38BDF8" />
                       <Text style={[styles.planName, { color: colors.foreground }]}>{p.planName || "Tier Upgrade"}</Text>
                     </View>
                     <Text style={[styles.amountText, { color: colors.foreground }]}>
                       ₹{p.amount ? p.amount.toFixed(2) : "0.00"}
                     </Text>
                   </View>
                   
                   <View style={styles.creditsBadge}>
                     <Text style={styles.creditsText}>+{displayCredits} AI</Text>
                   </View>
                 </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(150,150,150,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontFamily: "Inter_800ExtraBold" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 16, paddingBottom: 60 },
  heroWrap: { marginBottom: 8, paddingHorizontal: 4 },
  heroDesc: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 },
  
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  listHeaderTitle: { fontSize: 14, fontFamily: "Inter_800ExtraBold" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  countText: { fontSize: 10, fontFamily: "Inter_800ExtraBold", textTransform: "uppercase", letterSpacing: 1 },

  emptyWrap: { alignItems: "center", justifyContent: "center", padding: 40, borderRadius: 20, borderWidth: 1, borderStyle: "dashed" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#6366F1", fontSize: 14, fontFamily: "Inter_700Bold" },

  card: { padding: 16, borderRadius: 20, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(150,150,150,0.1)" },
  dateWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontFamily: "Inter_800ExtraBold", textTransform: "uppercase", letterSpacing: 1 },

  cardBody: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  planName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  amountText: { fontSize: 24, fontFamily: "Inter_800ExtraBold" },
  
  creditsBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  creditsText: { color: "#F59E0B", fontSize: 12, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 }
});
