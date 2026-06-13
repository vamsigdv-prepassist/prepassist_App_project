import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

export default function VaultMenuScreen() {
  const colors = useColors();
  const router = useRouter();

  const handleAction = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );

  const ListItem = ({ icon, title, subtitle, route }: any) => (
    <TouchableOpacity 
      style={[
        styles.listItem, 
        { 
          backgroundColor: colors.card, 
          borderColor: colors.border 
        }
      ]} 
      onPress={() => handleAction(route)}
    >
      <View style={[
        styles.iconWrap, 
        { backgroundColor: colors.background }
      ]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.listTextWrap}>
        <Text style={[
          styles.listTitle, 
          { color: colors.foreground }
        ]}>{title}</Text>
        {subtitle && <Text style={[styles.listSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Advance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <SectionHeader title="ADVANCED SUBSYSTEMS" />
        <ListItem icon="pen-tool" title="Mains Answer Bank" subtitle="Descriptive question repository" route="/mains-bank" />
        <ListItem icon="edit-3" title="Mains Evaluation" subtitle="AI graded answer analysis" route="/evaluate-mains" />
        <ListItem icon="globe" title="Current Affairs" subtitle="Daily news extraction" route="/current-affairs" />
        <ListItem icon="list" title="Question Bank" subtitle="Comprehensive MCQ arrays" route="/(tabs)/quiz" />
        <ListItem icon="bookmark" title="Saved Articles" subtitle="Your bookmarked reads" route="/articles" />
        <ListItem icon="folder" title="Raw Notes" subtitle="Document repository" route="/raw-notes" />
        <ListItem icon="cloud-lightning" title="RAG Notes AI" subtitle="Semantic search over notes" route="/rag-notes" />
        <ListItem icon="share-2" title="AI Mindmaps" subtitle="Visual knowledge graphs" route="/mindmaps" />
        <ListItem icon="book-open" title="Notes Tracker" subtitle="Reading progress analytics" route="/notes" />
        <ListItem icon="database" title="Cloud Data Vault" subtitle="Secure encrypted storage" route="/cloud-vault" />

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
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 1.5,
    marginBottom: 16,
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
    borderRadius: 14,
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
});
