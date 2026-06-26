import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

const { width } = Dimensions.get("window");

export default function PaymentSuccessScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const plan = params.plan || "Pack";
  const amount = params.amount || "0";
  const credits = params.credits || "0";

  const getBenefits = (planName: string) => {
    if (planName === "UPSC Pro") {
      return [
        "200 AI Credits natively injected",
        "Premium RAG DB Interface unlocked",
        "Vision AI Mains Evaluator online",
        "Priority Pipeline Extraction",
      ];
    }
    if (planName === "Ultimate") {
      return [
        "400 AI Credits natively injected",
        "2 GB Cloud Vault natively assigned",
        "Dedicated Mentorship Dashboard",
        "Early Access LLM Testing",
      ];
    }
    if (planName === "Cloud Vault") {
      return [
        "1 GB Maximum Configurable Size",
        "Permanent File Lifetime",
        "Zero Data Archiving",
        "Memory-Weight Analytics",
      ];
    }
    return null;
  };

  const benefits = getBenefits(plan as string);

  const [currentBalance, setCurrentBalance] = useState<number | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Fetch updated balance in real-time
    const user = auth.currentUser;
    let unsubscribe: (() => void) | null = null;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setCurrentBalance(docSnap.data().credits || 0);
        }
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
            <Feather name="check-circle" size={48} color="#10B981" />
          </Animated.View>
          <View style={[styles.badgeWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="shield" size={16} color="#6366F1" />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Payment Verified</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your transaction was completed successfully and the ledger has been updated.
        </Text>

        {/* Receipt Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.mutedForeground }]}>PLAN MAPPED</Text>
            <Text style={[styles.receiptValue, { color: colors.foreground }]}>{plan}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.mutedForeground }]}>AMOUNT PAID</Text>
            <Text style={[styles.receiptValue, { color: colors.foreground }]}>₹{amount}</Text>
          </View>
          <View style={[styles.receiptDivider, { borderBottomColor: colors.border }]} />
          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.mutedForeground }]}>CREDITS RECEIVED</Text>
            <Text style={[styles.receiptHighlight, { color: "#10B981" }]}>+{credits} AI</Text>
          </View>
        </View>

        {/* Unlocked Benefits */}
        {benefits && (
          <View style={[styles.benefitsCard, { backgroundColor: "rgba(16, 185, 129, 0.05)", borderColor: "rgba(16, 185, 129, 0.2)" }]}>
            <Text style={[styles.benefitsTitle, { color: colors.foreground }]}>Capabilities Unlocked:</Text>
            {benefits.map((benefit, idx) => (
              <View key={idx} style={styles.benefitRow}>
                <Feather name="check" size={14} color="#10B981" />
                <Text style={[styles.benefitText, { color: colors.foreground }]}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Current Balance */}
        <View style={styles.balanceContainer}>
          {currentBalance === null ? (
            <View style={styles.balanceBox}>
              <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Syncing Ledger...</Text>
            </View>
          ) : (
            <View style={[styles.balanceBox, { backgroundColor: "rgba(99, 102, 241, 0.1)", borderColor: "rgba(99, 102, 241, 0.2)" }]}>
              <Feather name="database" size={16} color="#6366F1" />
              <Text style={[styles.balanceLabel, { color: "#6366F1" }]}>REAL-TIME BALANCE:</Text>
              <Text style={[styles.balanceValue, { color: "#6366F1" }]}>{currentBalance}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: "#6366F1" }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.primaryBtnText}>Return to Dashboard</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryBtn}
          onPress={() => router.replace("/payments")}
        >
          <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>VIEW PAYMENT HISTORY</Text>
        </TouchableOpacity>

      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    position: "relative",
    marginBottom: 24,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 4,
    borderColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeWrap: {
    position: "absolute",
    bottom: -4,
    right: -4,
    borderWidth: 1,
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 32,
    lineHeight: 22,
  },
  receiptCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 32,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  receiptLabel: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1,
  },
  receiptValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  receiptDivider: {
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  receiptHighlight: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  benefitsCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    opacity: 0.7,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  balanceContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  balanceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1,
  },
});
