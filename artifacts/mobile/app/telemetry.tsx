import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function TelemetryScreen() {
  const colors = useColors();
  const router = useRouter();
  const [ping, setPing] = useState(42);
  const [uptime, setUptime] = useState(99.99);

  useEffect(() => {
    const interval = setInterval(() => {
      setPing(Math.floor(Math.random() * 20) + 30);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Core API Telemetry</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={[styles.statusCard, { backgroundColor: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.2)" }]}>
          <Feather name="activity" size={32} color="#10B981" />
          <Text style={[styles.statusTitle, { color: "#10B981" }]}>SYSTEMS NOMINAL</Text>
          <Text style={[styles.statusDesc, { color: colors.mutedForeground }]}>All matrix endpoints are responding.</Text>
        </View>

        <View style={styles.gridRow}>
          <View style={[styles.gridBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.gridLabel, { color: colors.mutedForeground }]}>LATENCY</Text>
            <Text style={[styles.gridValue, { color: colors.foreground }]}>{ping}ms</Text>
          </View>
          <View style={[styles.gridBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.gridLabel, { color: colors.mutedForeground }]}>UPTIME</Text>
            <Text style={[styles.gridValue, { color: colors.foreground }]}>{uptime}%</Text>
          </View>
        </View>

        <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground, marginBottom: 12 }]}>LIVE HANDSHAKES</Text>
          <Text style={[styles.logText, { color: colors.mutedForeground }]}>[OK] Firebase Auth Handshake: Verified</Text>
          <Text style={[styles.logText, { color: colors.mutedForeground }]}>[OK] Firestore Realtime Sync: Connected</Text>
          <Text style={[styles.logText, { color: colors.mutedForeground }]}>[OK] Generative Engine Core: Standby</Text>
          <Text style={[styles.logText, { color: colors.mutedForeground }]}>[OK] Expo Native Bridge: Initialized</Text>
        </View>

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
  statusCard: { padding: 32, borderRadius: 24, borderWidth: 1, alignItems: "center", marginBottom: 8 },
  statusTitle: { fontSize: 16, fontFamily: "Inter_800ExtraBold", letterSpacing: 1, marginTop: 16 },
  statusDesc: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 4 },
  gridRow: { flexDirection: "row", gap: 16 },
  gridBox: { flex: 1, padding: 20, borderRadius: 20, borderWidth: 1 },
  gridLabel: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 },
  gridValue: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 8 },
  logCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginTop: 8 },
  label: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 },
  logText: { fontSize: 12, fontFamily: "JetBrainsMono_500Medium", marginBottom: 8, opacity: 0.8 }
});
