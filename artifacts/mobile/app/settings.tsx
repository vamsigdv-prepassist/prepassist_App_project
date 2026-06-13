import React, { useState } from "react";
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  
  const [haptics, setHaptics] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);

  const SettingToggle = ({ icon, title, desc, value, onValueChange }: any) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View style={[styles.iconWrap, { backgroundColor: colors.background }]}>
          <Feather name={icon} size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{desc}</Text>
        </View>
        <Switch 
          value={value} 
          onValueChange={onValueChange} 
          trackColor={{ false: colors.border, true: "#4F46E5" }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Engine Settings</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SYSTEM PREFERENCES</Text>
        
        <SettingToggle 
          icon="smartphone" 
          title="Haptic Feedback" 
          desc="Tactile engine response"
          value={haptics} 
          onValueChange={setHaptics} 
        />
        
        <SettingToggle 
          icon="bell" 
          title="Push Transmissions" 
          desc="Global broadcast alerts"
          value={pushNotifs} 
          onValueChange={setPushNotifs} 
        />

        <SettingToggle 
          icon="wifi" 
          title="Data Saver Matrix" 
          desc="Limit background sync"
          value={dataSaver} 
          onValueChange={setDataSaver} 
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(150,150,150,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontFamily: "Inter_800ExtraBold" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 12 },
  sectionTitle: { fontSize: 10, fontFamily: "Inter_800ExtraBold", letterSpacing: 1, marginLeft: 8, marginBottom: 8, marginTop: 8 },
  card: { padding: 16, borderRadius: 20, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  cardDesc: { fontSize: 12, fontFamily: "Inter_500Medium" }
});
