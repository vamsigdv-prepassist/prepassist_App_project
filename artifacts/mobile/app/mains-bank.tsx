import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { useColors } from "@/hooks/useColors";
import { Pill } from "@/components/ui";

export interface MainsQuestion {
  id: string;
  topic: string;
  questionText: string;
  modelAnswer: string;
  language: "English" | "Hindi";
  createdAt: any;
}

export default function MainsBankScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [questions, setQuestions] = useState<MainsQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  const [openAnswerId, setOpenAnswerId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setOpenAnswerId(null);
    
    (async () => {
      try {
        const q = query(
          collection(db, "mains_questions"),
          where("language", "==", language)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MainsQuestion[];
        
        // Sort natively by timestamp descending
        data.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });

        if (mounted) {
          setQuestions(data);
        }
      } catch (err) {
        console.error("Failed to fetch mains questions:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [language]);

  const toggleAnswer = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpenAnswerId(openAnswerId === id ? null : id);
  };

  const handleEvaluate = (questionText: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/evaluate-mains",
      params: { prefillQuestion: questionText },
    });
  };

  const renderCard = ({ item }: { item: MainsQuestion }) => {
    const isOpen = openAnswerId === item.id;
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isOpen ? colors.primary : colors.border,
            borderLeftWidth: 4,
            borderLeftColor: isOpen ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Pill
            label={`ID: ${item.id.slice(0, 6)}`}
            color={colors.mutedForeground}
            background={colors.muted}
          />
          <Pill
            label={item.topic}
            icon="target"
            color={colors.accent}
            background={colors.accent + "15"}
          />
        </View>

        <Text
          style={[
            styles.questionText,
            { color: colors.foreground },
          ]}
        >
          Q. {item.questionText}
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: isOpen
                  ? colors.primary + "15"
                  : colors.background,
                borderColor: isOpen
                  ? colors.primary + "30"
                  : colors.border,
              },
            ]}
            onPress={() => toggleAnswer(item.id)}
          >
            <Text
              style={[
                styles.actionBtnText,
                { color: isOpen ? colors.primary : colors.mutedForeground },
              ]}
            >
              {isOpen ? "Hide Model Framework" : "Reveal Model Answer"}
            </Text>
            <Feather
              name={isOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={isOpen ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtnPrimary,
              { backgroundColor: colors.foreground },
            ]}
            onPress={() => handleEvaluate(item.questionText)}
          >
            <Text
              style={[
                styles.actionBtnPrimaryText,
                { color: colors.background },
              ]}
            >
              Evaluate This Answer
            </Text>
            <Feather name="arrow-right" size={16} color={colors.background} />
          </TouchableOpacity>
        </View>

        {isOpen && (
          <View
            style={[
              styles.answerBox,
              {
                backgroundColor: colors.primary + "10",
                borderTopColor: colors.primary + "20",
              },
            ]}
          >
            <Text style={[styles.answerText, { color: colors.primary }]}>
              {item.modelAnswer}
            </Text>
            <View
              style={[
                styles.warningBar,
                {
                  backgroundColor: colors.primary + "20",
                  borderTopColor: colors.primary + "30",
                },
              ]}
            >
              <Feather name="check-circle" size={14} color={colors.primary} />
              <Text
                style={[
                  styles.warningText,
                  { color: colors.primary },
                ]}
              >
                Strictly curated Centralized Model Tracker. Do not perfectly copy dynamically.
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <FlatList
        data={questions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.heroPill, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30" }]}>
              <Feather name="book-open" size={12} color={colors.accent} />
              <Text style={[styles.heroPillText, { color: colors.accent }]}>Global Execution Arrays</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Mains Answer Bank</Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
              Study historically accurate descriptive model answers or execute your own structural evaluations instantly against the core AI engine.
            </Text>

            <View style={[styles.langToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(["English", "Hindi"] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[
                    styles.langBtn,
                    language === lang && {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Feather
                    name="globe"
                    size={14}
                    color={language === lang ? colors.foreground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.langBtnText,
                      { color: language === lang ? colors.foreground : colors.mutedForeground },
                    ]}
                  >
                    {lang} Nodes
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Extracting Mains Node Vectors...
              </Text>
            </View>
          ) : (
            <View style={[styles.centerBox, styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={32} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No nodes found in {language}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                The Global DB arrays are empty for this specific Language segment. Please notify Central Administrators.
              </Text>
            </View>
          )
        }
        renderItem={renderCard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  backButtonContainer: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  heroPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroPillText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontFamily: "Inter_900Black",
    fontSize: 34,
    letterSpacing: -1,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  langToggle: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  langBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  langBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  centerBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  loadingText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 16,
  },
  emptyBox: {
    marginHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    gap: 8,
    padding: 20,
    paddingBottom: 12,
    flexWrap: "wrap",
  },
  questionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 26,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: "column",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
  },
  actionBtnText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  actionBtnPrimaryText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  answerBox: {
    borderTopWidth: 1,
  },
  answerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 24,
    padding: 24,
  },
  warningBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
  },
  warningText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
});
