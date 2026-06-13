import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { auth } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const user = auth.currentUser;

  const handleAction = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );

  const ListItem = ({ icon, title, subtitle, route, danger = false, highlight = false }: any) => (
    <TouchableOpacity 
      style={[
        styles.listItem, 
        { 
          backgroundColor: highlight ? "rgba(79, 70, 229, 0.1)" : colors.card, 
          borderColor: highlight ? "rgba(79, 70, 229, 0.3)" : colors.border 
        }
      ]} 
      onPress={() => handleAction(route)}
    >
      <View style={[
        styles.iconWrap, 
        { backgroundColor: danger ? "rgba(239,68,68,0.1)" : highlight ? "rgba(79, 70, 229, 0.2)" : colors.background }
      ]}>
        <Feather name={icon} size={20} color={danger ? "#EF4444" : highlight ? "#4F46E5" : colors.primary} />
      </View>
      <View style={styles.listTextWrap}>
        <Text style={[
          styles.listTitle, 
          { color: danger ? "#EF4444" : highlight ? "#4F46E5" : colors.foreground }
        ]}>{title}</Text>
        {subtitle && <Text style={[styles.listSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ecosystem</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{user?.email?.[0]?.toUpperCase() || "E"}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>
              {user?.displayName || "Explorer"}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
              {user?.email || "Terminal unlinked"}
            </Text>
            <View style={styles.tierBadge}>
              <Feather name="cpu" size={12} color="#4F46E5" />
              <Text style={styles.tierText}>NATIVE TIER</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="ACCOUNT & IDENTITY" />
        <ListItem icon="user" title="Account Details" subtitle="Manage your identity endpoints" route="/account" />
        <ListItem icon="map-pin" title="Profile Coordinates" subtitle="Location and tracking vectors" route="/profile" />
        
        <SectionHeader title="BILLING & UPGRADES" />
        <ListItem icon="credit-card" title="Payments Made" subtitle="View transaction ledger" route="/payments" />
        <ListItem icon="zap" title="Upgrade Native Tier" subtitle="Unlock ultimate device capabilities" route="/upgrade" highlight={true} />

        <SectionHeader title="SYSTEM DIAGNOSTICS" />
        <ListItem icon="settings" title="Engine Settings" subtitle="Configure matrix preferences" route="/settings" />
        <ListItem icon="activity" title="Core API Telemetry" subtitle="View real-time engine pings" route="/telemetry" />
        <ListItem icon="radio" title="System Transmissions" subtitle="App notification logs" route="/transmissions" />

        <View style={styles.footerInfo}>
          <Feather name="shield" size={24} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 8 }} />
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Version 1.0.0 (Build 42)</Text>
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Powered by Matrix Engine</Text>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_800ExtraBold",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 8,
    gap: 4,
  },
  tierText: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    color: "#4F46E5",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  listTextWrap: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  listSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  footerInfo: {
    alignItems: "center",
    marginVertical: 32,
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
