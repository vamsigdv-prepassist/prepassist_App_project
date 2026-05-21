import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SectionHeader } from "@/components/ui";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = DOMAIN ? `https://${DOMAIN}/api` : "/api";

const CARD_W = 272;
const CARD_H = 168;

export interface Flashcard {
  id: string;
  topic: string;
  frontText: string;
  backText: string;
  language: "English" | "Hindi";
  createdAt: string;
}

type Language = "English" | "Hindi";

function FlipCard({ card }: { card: Flashcard }) {
  const colors = useColors();
  const [flipped, setFlipped] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const frontRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  function flip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = flipped ? 0 : 1;
    setFlipped(!flipped);
    Animated.spring(anim, {
      toValue: target,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }

  const topicColors: Record<string, [string, string]> = {
    Polity: ["#4F39F6", "#5B8DEF"],
    History: ["#8B5CF6", "#EC4899"],
    Geography: ["#10B981", "#06B6D4"],
    Economy: ["#F59E0B", "#EF4444"],
    Environment: ["#10B981", "#84CC16"],
    "Art & Culture": ["#EC4899", "#8B5CF6"],
    "Science & Tech": ["#06B6D4", "#4F39F6"],
  };
  const [g1, g2] = topicColors[card.topic] ?? ["#4F39F6", "#06B6D4"];

  return (
    <TouchableOpacity
      onPress={flip}
      activeOpacity={1}
      style={s.cardWrapper}
    >
      {/* Front face */}
      <Animated.View
        style={[
          s.face,
          {
            transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
            backfaceVisibility: "hidden",
            zIndex: flipped ? 0 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={[g1, g2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.faceGradient}
        >
          {/* Topic + hint */}
          <View style={s.faceTop}>
            <View style={s.topicBadge}>
              <Text style={s.topicText}>{card.topic}</Text>
            </View>
            <View style={s.tapHint}>
              <Feather name="refresh-cw" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={s.tapHintText}>Tap to reveal</Text>
            </View>
          </View>

          {/* Question */}
          <Text style={s.frontText} numberOfLines={4}>
            {card.frontText}
          </Text>
        </LinearGradient>
      </Animated.View>

      {/* Back face */}
      <Animated.View
        style={[
          s.face,
          {
            transform: [{ perspective: 1200 }, { rotateY: backRotate }],
            backfaceVisibility: "hidden",
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: flipped ? 1 : 0,
          },
        ]}
      >
        <View style={[s.faceGradient, s.backFace]}>
          {/* Back header */}
          <View style={s.faceTop}>
            <View style={[s.topicBadge, { backgroundColor: g1 + "30", borderColor: g1 + "60", borderWidth: 1 }]}>
              <Text style={[s.topicText, { color: g1 }]}>{card.topic}</Text>
            </View>
            <View style={s.tapHint}>
              <Feather name="refresh-cw" size={11} color="#94A3B8" />
              <Text style={[s.tapHintText, { color: "#94A3B8" }]}>Answer</Text>
            </View>
          </View>

          {/* Answer */}
          <Text style={s.backText} numberOfLines={5}>
            {card.backText}
          </Text>

          {/* Accent line */}
          <View style={[s.backAccent, { backgroundColor: g1 }]} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FlashcardCarousel() {
  const colors = useColors();
  const [language, setLanguage] = useState<Language>("English");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchCards = useCallback(async (lang: Language) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `${API_BASE}/flashcards?language=${lang}&limit=10`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { cards: Flashcard[] };
      setCards(data.cards ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards(language);
  }, [language, fetchCards]);

  if (!loading && !error && cards.length === 0) return null;

  return (
    <View style={{ marginTop: 24 }}>
      {/* Header row with language toggle */}
      <View style={s.sectionRow}>
        <SectionHeader title="Daily Flashcards" />
        <View style={[s.langToggle, { borderColor: colors.border }]}>
          {(["English", "Hindi"] as Language[]).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                s.langBtn,
                language === lang && { backgroundColor: colors.primary },
              ]}
              onPress={() => setLanguage(lang)}
            >
              <Text
                style={[
                  s.langBtnText,
                  {
                    color:
                      language === lang ? "#fff" : colors.mutedForeground,
                  },
                ]}
              >
                {lang === "English" ? "EN" : "हि"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[s.loadingText, { color: colors.mutedForeground }]}>
            Loading cards…
          </Text>
        </View>
      ) : error ? (
        <View style={s.errorRow}>
          <Feather name="wifi-off" size={16} color={colors.mutedForeground} />
          <Text style={[s.errorText, { color: colors.mutedForeground }]}>
            Couldn't load flashcards
          </Text>
          <TouchableOpacity onPress={() => fetchCards(language)}>
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.listContent}
          snapToInterval={CARD_W + 12}
          decelerationRate="fast"
          renderItem={({ item }) => <FlipCard card={item} />}
          ListFooterComponent={<View style={{ width: 8 }} />}
        />
      )}

      <Text style={[s.hint, { color: colors.mutedForeground }]}>
        Tap any card to flip it
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  langToggle: {
    flexDirection: "row",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  langBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  listContent: {
    paddingLeft: 20,
    gap: 12,
  },
  cardWrapper: {
    width: CARD_W,
    height: CARD_H,
  },
  face: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: "hidden",
  },
  faceGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  backFace: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  faceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topicBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  topicText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tapHintText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  frontText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 22,
  },
  backText: {
    color: "#1E293B",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    flex: 1,
    marginTop: 8,
  },
  backAccent: {
    height: 3,
    borderRadius: 2,
    width: 32,
    marginTop: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    height: CARD_H,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    height: 56,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  hint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 4,
  },
});
