import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
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

  useEffect(() => {
    const fetchLedger = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = query(collection(db, "payments"), where("userId", "==", user.uid));
          const snap = await getDocs(q);
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPayments(data);
        } catch (e) {
          console.error("Ledger fetch failed", e);
        }
      }
      setLoading(false);
    };
    fetchLedger();
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Payments Ledger</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : payments.length === 0 ? (
          <View style={styles.emptyWrap}>
             <Feather name="credit-card" size={48} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 16 }} />
             <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions found in your ledger.</Text>
          </View>
        ) : (
          payments.map((p, idx) => (
            <View key={p.id || idx} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                 <Text style={[styles.cardTitle, { color: colors.foreground }]}>{p.planName || "Tier Upgrade"}</Text>
                 <Text style={[styles.amount, { color: "#10B981" }]}>₹{p.amount || 0}</Text>
               </View>
               <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
                 {p.date ? new Date(p.date.toDate ? p.date.toDate() : p.date).toLocaleDateString() : "Processed"} • {p.status || "SUCCESS"}
               </Text>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(150,150,150,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "Inter_800ExtraBold" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 16 },
  emptyWrap: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  amount: { fontSize: 16, fontFamily: "Inter_800ExtraBold", marginBottom: 8 },
  cardDesc: { fontSize: 12, fontFamily: "Inter_500Medium" }
});
