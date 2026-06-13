import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function UpgradeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState(40);

  const handleUpgrade = (tier: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    alert(`Initiating In-App Purchase for ${tier}`);
  };

  const topUpPricing: any = {
    40: { price: 99 },
    100: { price: 199 },
    260: { price: 499 }
  };

  const FeatureItem = ({ text, active = true }: any) => (
    <View style={styles.featureRow}>
      <Feather name="check" size={16} color={active ? "#10B981" : colors.mutedForeground} style={{ opacity: active ? 1 : 0.5 }} />
      <Text style={[styles.featureText, { color: active ? colors.foreground : colors.mutedForeground }]}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Upgrade Tier</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroWrap}>
           <Text style={[styles.heroTitle, { color: colors.foreground }]}>Supercharge your Output.</Text>
           <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>
             Access hyper-optimized analysis, unlimited semantic querying, and granular Mains evaluation arrays.
           </Text>
        </View>

        {/* Pro Tier */}
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: "#6366F1", shadowColor: "#6366F1", shadowOpacity: 0.2, shadowRadius: 20 }]}>
           <View style={styles.popularBadge}>
             <Text style={styles.popularText}>MOST POPULAR</Text>
           </View>
           <Text style={[styles.planName, { color: colors.foreground }]}>UPSC Pro</Text>
           <Text style={[styles.planDesc, { color: "#6366F1" }]}>Aggressive extraction logic unlocking the full potential of Semantic AI.</Text>
           <Text style={[styles.planPrice, { color: colors.foreground }]}>₹399<Text style={{ fontSize: 14, color: colors.mutedForeground }}> /mo</Text></Text>
           
           <View style={styles.featuresList}>
             <FeatureItem text="200 AI Credits natively" />
             <FeatureItem text="Premium RAG DB Interface" />
             <FeatureItem text="Vision AI Mains Evaluator Access" />
             <FeatureItem text="Priority Pipeline Extraction" />
           </View>

           <TouchableOpacity style={[styles.btn, { backgroundColor: "#6366F1" }]} onPress={() => handleUpgrade("UPSC Pro")}>
             <Text style={styles.btnText}>Upgrade to Pro</Text>
           </TouchableOpacity>
        </View>

        {/* Ultimate Tier */}
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 24 }]}>
           <Text style={[styles.planName, { color: colors.foreground }]}>Ultimate</Text>
           <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>Maximum compute limits strictly tailored for extreme intensive preparation.</Text>
           <Text style={[styles.planPrice, { color: colors.foreground }]}>₹699<Text style={{ fontSize: 14, color: colors.mutedForeground }}> /mo</Text></Text>
           
           <View style={styles.featuresList}>
             <FeatureItem text="400 AI Credits natively" />
             <FeatureItem text="2 GB Cloud Storage Vault natively" />
             <FeatureItem text="Dedicated Mentorship Dashboard" />
             <FeatureItem text="Early Access LLM Testing" />
           </View>

           <TouchableOpacity style={[styles.btn, { backgroundColor: colors.foreground }]} onPress={() => handleUpgrade("Ultimate")}>
             <Text style={[styles.btnText, { color: colors.background }]}>Select Ultimate</Text>
           </TouchableOpacity>
        </View>

        {/* Instant Top Ups */}
        <View style={[styles.topupSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.topupTitle, { color: colors.foreground }]}>Instant Credit Top-ups</Text>
          <Text style={[styles.topupDesc, { color: colors.mutedForeground }]}>Buy instant non-expiring AI Credit bundles for one-off extraction workloads.</Text>
          
          <View style={styles.topupTabs}>
            {[40, 100, 260].map(amt => (
              <TouchableOpacity 
                key={amt} 
                onPress={() => setSelectedPack(amt)}
                style={[styles.topupTab, { 
                  backgroundColor: selectedPack === amt ? "#6366F1" : colors.background,
                  borderColor: selectedPack === amt ? "#6366F1" : colors.border 
                }]}
              >
                <Text style={[styles.topupTabText, { color: selectedPack === amt ? "#fff" : colors.mutedForeground }]}>{amt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.topupFooter}>
            <View>
              <Text style={styles.topupLabel}>TOTAL COST</Text>
              <Text style={[styles.topupPrice, { color: colors.foreground }]}>₹{topUpPricing[selectedPack].price}</Text>
            </View>
            <TouchableOpacity style={styles.topupBtn} onPress={() => handleUpgrade(`Top Up ${selectedPack}`)}>
              <Text style={styles.topupBtnText}>Purchase Pack</Text>
            </TouchableOpacity>
          </View>
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
  content: { padding: 20, paddingBottom: 60 },
  heroWrap: { alignItems: "center", paddingVertical: 24 },
  heroTitle: { fontSize: 32, fontFamily: "Inter_800ExtraBold", marginBottom: 12, textAlign: "center", letterSpacing: -1 },
  heroDesc: { fontSize: 15, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
  
  planCard: { padding: 24, borderRadius: 24, borderWidth: 1, marginTop: 16, position: "relative" },
  popularBadge: { position: "absolute", top: -12, left: "50%", transform: [{ translateX: -40 }], backgroundColor: "#6366F1", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  popularText: { color: "#fff", fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 },
  planName: { fontSize: 24, fontFamily: "Inter_800ExtraBold", marginBottom: 8, marginTop: 8 },
  planDesc: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 24, lineHeight: 20 },
  planPrice: { fontSize: 40, fontFamily: "Inter_800ExtraBold", letterSpacing: -1, marginBottom: 24 },
  featuresList: { gap: 16, marginBottom: 32 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  btn: { width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  topupSection: { marginTop: 32, padding: 24, borderRadius: 24, borderWidth: 1 },
  topupTitle: { fontSize: 20, fontFamily: "Inter_800ExtraBold", marginBottom: 8 },
  topupDesc: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 24, lineHeight: 20 },
  topupTabs: { flexDirection: "row", gap: 8, marginBottom: 24 },
  topupTab: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  topupTabText: { fontSize: 18, fontFamily: "Inter_800ExtraBold" },
  topupFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topupLabel: { fontSize: 10, fontFamily: "Inter_800ExtraBold", color: "#94a3b8", letterSpacing: 1, marginBottom: 4 },
  topupPrice: { fontSize: 28, fontFamily: "Inter_800ExtraBold" },
  topupBtn: { backgroundColor: "#10B981", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  topupBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" }
});
