import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { auth } from "@/lib/firebase";
import { useRouter } from "expo-router";

export default function VersionScreen() {
  const colors = useColors();
  const user = auth.currentUser;
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>System Version</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        
        <View style={styles.logoWrap}>
          <Feather name="shield" size={64} color={colors.primary} />
        </View>

        <Text style={[styles.brandTitle, { color: colors.foreground }]}>PrepAssist OS</Text>
        <Text style={[styles.versionText, { color: colors.primary }]}>Version 1.0.0 (Build 42)</Text>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <Feather name="cpu" size={20} color={colors.foreground} style={{ marginBottom: 12 }} />
           <Text style={[styles.desc, { color: colors.foreground }]}>
             The Matrix Engine is currently operating at optimal efficiency.
           </Text>
           <Text style={[styles.subDesc, { color: colors.mutedForeground, marginTop: 8 }]}>
             Developed exclusively for {user?.displayName || "Explorer"}.
           </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(150,150,150,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "Inter_800ExtraBold" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  logoWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(99, 102, 241, 0.1)", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  brandTitle: { fontSize: 28, fontFamily: "Inter_800ExtraBold", marginBottom: 4 },
  versionText: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 32, letterSpacing: 1 },
  infoCard: { padding: 24, borderRadius: 24, borderWidth: 1, alignItems: "center", width: "100%" },
  desc: { textAlign: "center", fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  subDesc: { textAlign: "center", fontSize: 13, fontFamily: "Inter_500Medium" }
});
