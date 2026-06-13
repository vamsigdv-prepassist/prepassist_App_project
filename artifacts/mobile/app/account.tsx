import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signOut } = useAuth();
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
          id: user.uid,
          credits: docSnap.exists() ? docSnap.data().credits : 0,
          tier: docSnap.exists() ? docSnap.data().tier : "free",
        });
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, marginTop: 16, fontFamily: "Inter_600SemiBold" }}>Decrypting Identity Vector...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Account Security Array</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <Text style={[styles.label, { color: colors.mutedForeground }]}>VERIFIED EMAIL VECTOR</Text>
           <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
             <Feather name="mail" size={16} color="#10B981" />
             <Text style={[styles.value, { color: colors.foreground, marginTop: 0 }]}>{profile?.email}</Text>
           </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
           <Text style={[styles.label, { color: colors.mutedForeground }]}>IDENTITY PROTECTION</Text>
           <Text style={[styles.desc, { color: colors.mutedForeground, marginTop: 4 }]}>
             Your password is encrypted deeply matching Firebase Auth core security hashes.
           </Text>
           <View style={[styles.lockedBtn, { backgroundColor: "rgba(150,150,150,0.1)" }]}>
             <Feather name="lock" size={14} color={colors.mutedForeground} />
             <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>LOCKED</Text>
           </View>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { borderColor: "#EF4444" }]} onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(150,150,150,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "Inter_800ExtraBold" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 16 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1 },
  label: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 1 },
  value: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  desc: { fontSize: 13, fontFamily: "Inter_500Medium" },
  lockedBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 12, gap: 6 },
  lockedText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1, backgroundColor: "rgba(239, 68, 68, 0.05)" },
  logoutText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#EF4444" }
});
