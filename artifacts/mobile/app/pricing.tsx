import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Card, SectionHeader, Pill } from "@/components/ui";

const LEDGER_ITEMS = [
  { id: "pdf", title: "PDF to Quiz Parsing", cost: "5 AI Credits", desc: "Per Standard Document Extracted", icon: "file-text" },
  { id: "mains", title: "Mains Answer Evaluation", cost: "3 AI Credits", desc: "Per Handwritten or Typed Answer Scanned", icon: "pen-tool" },
  { id: "prelims", title: "AI Prelims Generation", cost: "2 AI Credits", desc: "Per 10 Native Questions Forged", icon: "target" },
  { id: "rag", title: "Notes Tracker AI Merging", cost: "0.5 AI Credits", desc: "Per Explicit RAG API Sequence Executed", icon: "zap" },
];

export default function PricingScreen() {
  const { user } = useAuth();
  const colors = useColors();
  const router = useRouter();

  const handleSubscribe = (tier: string) => {
    Alert.alert("Subscribe", `Proceed to subscribe to ${tier}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Proceed", onPress: () => Alert.alert("Success", "Subscription Flow Initiated") }
    ]);
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <View style={s.header}>
        <View style={{ flex: 1 }} />
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Upgrade</Text>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
            <Feather name="x" size={24} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={[s.heroTitle, { color: colors.foreground }]}>
            Supercharge your <Text style={{ color: colors.primary }}>UPSC Output.</Text>
          </Text>
          <Text style={[s.heroSub, { color: colors.mutedForeground }]}>
            Access hyper-optimized analysis, unlimited semantic querying, and granular Mains evaluation arrays directly.
          </Text>
        </View>

        {/* Pro Tier */}
        <View style={s.pricingSection}>
          <Card style={[s.proCard, { borderColor: colors.primary }]}>
            <View style={s.popularBadge}>
              <Text style={s.popularText}>Most Popular</Text>
            </View>
            <View style={s.tierHeader}>
              <Feather name="star" size={24} color={colors.primary} />
              <Text style={[s.tierTitle, { color: colors.foreground }]}>UPSC Pro</Text>
            </View>
            <Text style={[s.tierSub, { color: colors.primary }]}>Aggressive extraction logic unlocking the full potential of Semantic AI.</Text>
            
            <View style={s.priceBox}>
              <Text style={[s.priceAmount, { color: colors.foreground }]}>₹399</Text>
              <Text style={[s.pricePeriod, { color: colors.mutedForeground }]}>/mo</Text>
            </View>

            <View style={s.features}>
              <View style={s.featureRow}>
                <Feather name="check" size={18} color={colors.primary} />
                <Text style={[s.featureText, { color: colors.foreground }]}>200 AI Credits natively</Text>
              </View>
              <View style={s.featureRow}>
                <Feather name="check" size={18} color={colors.primary} />
                <Text style={[s.featureText, { color: colors.foreground }]}>Premium RAG DB Interface</Text>
              </View>
              <View style={s.featureRow}>
                <Feather name="check" size={18} color={colors.primary} />
                <Text style={[s.featureText, { color: colors.foreground }]}>Vision AI Mains Evaluator Access</Text>
              </View>
              <View style={s.featureRow}>
                <Feather name="check" size={18} color={colors.primary} />
                <Text style={[s.featureText, { color: colors.foreground }]}>Priority Pipeline Extraction</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.buyBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleSubscribe("UPSC Pro")}
            >
              <Text style={s.buyBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Ledger */}
        <View style={s.ledgerSection}>
          <SectionHeader title="Compute Cost Ledger" subtitle="Exact AI Credit requirements mapped for every computational feature." />
          
          <View style={[s.ledgerTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {LEDGER_ITEMS.map((item, idx) => (
              <View 
                key={item.id} 
                style={[
                  s.ledgerRow, 
                  idx < LEDGER_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                ]}
              >
                <View style={s.ledgerIconBox}>
                  <Feather name={item.icon as any} size={20} color={colors.foreground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.ledgerTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[s.ledgerDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <View style={[s.costBadge, { borderColor: colors.primary, backgroundColor: colors.primary + "1A" }]}>
                  <Text style={[s.costText, { color: colors.primary }]}>{item.cost}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  closeBtn: {
    padding: 4,
  },
  
  hero: {
    padding: 30,
    paddingTop: 20,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroSub: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 24,
  },

  pricingSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  proCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 24,
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    alignSelf: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  tierTitle: {
    fontSize: 24,
    fontFamily: "Inter_800ExtraBold",
  },
  tierSub: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
    lineHeight: 20,
  },
  priceBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginVertical: 24,
  },
  priceAmount: {
    fontSize: 48,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  features: {
    gap: 16,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  buyBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  buyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },

  ledgerSection: {
    paddingHorizontal: 20,
    marginTop: 40,
  },
  ledgerTable: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  ledgerIconBox: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
  },
  ledgerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  ledgerDesc: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  costBadge: {
    borderWidth: 1,
    borderStyle: "dashed",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  costText: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
  },
});
