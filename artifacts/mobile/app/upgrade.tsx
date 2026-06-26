import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, setDoc, increment } from "firebase/firestore";

let RazorpayCheckout: any = null;
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    RazorpayCheckout = require('react-native-razorpay').default;
  } catch (e) {
    console.warn("Razorpay native module not found");
  }
}

const { width } = Dimensions.get("window");

export default function UpgradeScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedPack, setSelectedPack] = useState(1);

  const handleUpgrade = async (tier: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const user = auth.currentUser;
    if (!user) {
      alert("Please login to subscribe.");
      return;
    }

    let amountPaise = 0;
    let creditsToAdd = 0;

    if (tier === "UPSC Pro") {
      amountPaise = 39900;
      creditsToAdd = 200;
    } else if (tier === "Ultimate") {
      amountPaise = 69900;
      creditsToAdd = 400;
    } else if (tier === "Cloud Vault") {
      amountPaise = 19900;
      creditsToAdd = 0;
    } else if (tier === "Top Up 1") {
      amountPaise = 100;
      creditsToAdd = 1;
    } else if (tier === "Top Up 40") {
      amountPaise = 9900;
      creditsToAdd = 40;
    } else if (tier === "Top Up 100") {
      amountPaise = 19900;
      creditsToAdd = 100;
    } else if (tier === "Top Up 260") {
      amountPaise = 49900;
      creditsToAdd = 260;
    }

    try {
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic cnpwX2xpdmVfVDUwc0NDY3VJR01vQWI6UHRVa2d6QWtwNVdmZnZpRklPNDdneDNi"
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: "receipt_" + user.uid.slice(0,10) + "_" + Date.now(),
        })
      });
      
      const orderData = await response.json();
      if (!orderData.id) throw new Error("Failed to generate Order ID");

      if (!RazorpayCheckout) {
        alert("Native Build Required to test Razorpay.");
        return;
      }

      const options = {
        description: `${tier} Access`,
        image: 'https://i.imgur.com/3g7nmJC.png',
        currency: 'INR',
        key: 'rzp_live_T50sCCcuIGMoAb',
        amount: amountPaise,
        name: 'PrepAssist',
        order_id: orderData.id,
        prefill: { email: user.email || '', contact: '', name: user.displayName || 'Aspirant' },
        theme: { color: colors.primary }
      };

      RazorpayCheckout.open(options).then(async (data: any) => {
        const userRef = doc(db, "users", user.uid);
        const updatePayload: any = { credits: increment(creditsToAdd) };
        if (tier === "Cloud Vault") {
          updatePayload.hasCloudNotes = true;
        } else if (!tier.includes("Top Up")) {
          updatePayload.tier = tier;
        }
        
        await setDoc(userRef, updatePayload, { merge: true });

        const paymentRef = doc(db, "payments", data.razorpay_payment_id);
        const finalAmount = amountPaise / 100;
        await setDoc(paymentRef, {
          userId: user.uid,
          amount: finalAmount,
          currency: "INR",
          planName: tier,
          status: "SUCCESS",
          orderId: orderData.id,
          paymentId: data.razorpay_payment_id,
          signature: data.razorpay_signature,
          date: new Date(),
          credits: creditsToAdd
        });

        router.replace({
          pathname: "/payment-success",
          params: { plan: tier, amount: finalAmount.toString(), credits: creditsToAdd.toString() }
        });
      }).catch((error: any) => {
        console.log("Payment cancelled", error);
      });

    } catch (e: any) {
      console.error(e);
      alert("Could not initiate payment. Please try again.");
    }
  };

  const topUpPricing: any = {
    1: { price: 1 },
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
      <Stack.Screen options={{ headerShown: false }} />
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

        {/* Cloud Vault Storage Expansion */}
        <View style={[styles.planCard, { backgroundColor: "rgba(14, 165, 233, 0.05)", borderColor: "rgba(14, 165, 233, 0.3)", marginTop: 24 }]}>
           <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
             <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "rgba(14, 165, 233, 0.1)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(14, 165, 233, 0.2)" }}>
               <Text style={{ color: "#0ea5e9", fontSize: 10, fontFamily: "Inter_800ExtraBold", textTransform: "uppercase", letterSpacing: 1 }}>Storage Expansion</Text>
             </View>
           </View>
           <Text style={[styles.planName, { color: colors.foreground }]}>PrepAssist Cloud Vault</Text>
           <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>Unlock the full power of native Document Tracking. Bypass the Free Tier restrictions and securely upload up to 1 GB Memory Size of encrypted PDFs directly into your Firebase Cloud Storage container.</Text>
           <Text style={[styles.planPrice, { color: colors.foreground }]}>₹199<Text style={{ fontSize: 14, color: colors.mutedForeground }}> /mo</Text></Text>
           
           <View style={styles.featuresList}>
             <FeatureItem text="1 GB Maximum Configurable Size" active={true} />
             <FeatureItem text="Permanent File Lifetime" active={true} />
             <FeatureItem text="Zero Data Archiving" active={true} />
             <FeatureItem text="Memory-Weight Analytics" active={true} />
           </View>

           <TouchableOpacity style={[styles.btn, { backgroundColor: "#0ea5e9" }]} onPress={() => handleUpgrade("Cloud Vault")}>
             <Text style={styles.btnText}>Unlock Cloud Vault</Text>
           </TouchableOpacity>
        </View>

        {/* Instant Top Ups */}
        <View style={[styles.topupSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.topupTitle, { color: colors.foreground }]}>Instant Credit Top-ups</Text>
          <Text style={[styles.topupDesc, { color: colors.mutedForeground }]}>Buy instant non-expiring AI Credit bundles for one-off extraction workloads.</Text>
          
          <View style={styles.topupTabs}>
            {[1, 40, 100, 260].map(amt => (
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
