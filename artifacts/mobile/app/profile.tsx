import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        setProfile({
          name: user.displayName || "Explorer",
          email: user.email,
          credits: docSnap.exists() ? docSnap.data().credits : 0,
          tier: docSnap.exists() ? docSnap.data().tier : "free",
        });
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile Coordinates</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <Text style={[styles.label, { color: colors.mutedForeground }]}>DISPLAY IDENTIFICATION</Text>
           <Text style={[styles.value, { color: colors.foreground }]}>{profile?.name}</Text>
        </View>

        <View style={[styles.creditCard, { backgroundColor: "rgba(99, 102, 241, 0.05)", borderColor: "rgba(99, 102, 241, 0.2)" }]}>
           <View style={styles.iconWrap}>
             <Feather name="zap" size={24} color="#818CF8" />
           </View>
           <Text style={[styles.label, { color: "#818CF8", marginTop: 16 }]}>AVAILABLE INTELLIGENCE CACHE</Text>
           <Text style={[styles.creditsValue, { color: colors.foreground }]}>{profile?.credits}</Text>
           
           <View style={styles.divider} />
           
           <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
             <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Current Plan</Text>
             <View style={styles.tierBadge}>
               <Text style={styles.tierText}>{String(profile?.tier).toUpperCase()} TIER</Text>
             </View>
           </View>
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
  content: { flex: 1, padding: 20, gap: 16 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1 },
  label: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 },
  value: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 8 },
  creditCard: { padding: 32, borderRadius: 32, borderWidth: 1, alignItems: "center" },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(99, 102, 241, 0.1)", borderWidth: 1, borderColor: "rgba(99, 102, 241, 0.3)", alignItems: "center", justifyContent: "center" },
  creditsValue: { fontSize: 64, fontFamily: "Inter_800ExtraBold", marginTop: 8, letterSpacing: -2 },
  divider: { height: 1, backgroundColor: "rgba(150,150,150,0.2)", width: "100%", marginVertical: 20 },
  tierBadge: { backgroundColor: "rgba(251, 191, 36, 0.1)", borderWidth: 1, borderColor: "rgba(251, 191, 36, 0.3)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tierText: { color: "#FBBF24", fontSize: 11, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 }
});
