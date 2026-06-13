import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function TransmissionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransmissions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "notifications"));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(data);
      } catch (e) {
        console.error("Transmissions sync failed", e);
      }
      setLoading(false);
    };
    fetchTransmissions();
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>System Transmissions</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyWrap}>
             <Feather name="radio" size={48} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 16 }} />
             <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active transmissions broadcasted.</Text>
          </View>
        ) : (
          notifications.map((notif, idx) => (
            <View key={notif.id || idx} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <Feather name="bell" size={20} color={colors.primary} style={{ marginBottom: 12 }} />
               <Text style={[styles.cardTitle, { color: colors.foreground }]}>{notif.title || "Global Broadcast"}</Text>
               <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{notif.message || "Incoming transmission payload..."}</Text>
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
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardDesc: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 }
});
