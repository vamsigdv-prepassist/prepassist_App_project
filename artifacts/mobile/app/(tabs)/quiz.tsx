import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Card,
  EmptyState,
  GradientButton,
  Pill,
  ScreenHeader,
  SectionHeader,
} from "@/components/ui";
import { useApp, type QuizAttempt } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { generateQuiz } from "@/lib/ai";

function WeakAreaTeaser({
  quizzes,
  onPress,
}: {
  quizzes: QuizAttempt[];
  onPress: () => void;
}) {
  const colors = useColors();

  const topicMap = new Map<string, { correct: number; total: number }>();
  for (const q of quizzes) {
    const e = topicMap.get(q.topic) ?? { correct: 0, total: 0 };
    e.correct += q.score;
    e.total += q.questions.length;
    topicMap.set(q.topic, e);
  }

  const sorted = Array.from(topicMap.entries())
    .map(([topic, s]) => ({
      topic,
      accuracy: Math.round((s.correct / s.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  const hasWeak = sorted.some((s) => s.accuracy < 60);

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
      <SectionHeader
        title="Weak areas"
        action="See all →"
        onActionPress={onPress}
      />
      <Pressable onPress={onPress}>
        <Card>
          {!hasWeak ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: colors.success + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="award" size={16} color={colors.success} />
              </View>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                  flex: 1,
                }}
              >
                No weak spots yet — keep drilling!
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {sorted.map((s) => {
                const color =
                  s.accuracy < 50
                    ? colors.destructive
                    : s.accuracy < 65
                      ? colors.warning
                      : colors.success;
                return (
                  <View key={s.topic}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 5,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 13,
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {s.topic}
                      </Text>
                      <Text
                        style={{
                          color,
                          fontFamily: "Inter_700Bold",
                          fontSize: 13,
                          marginLeft: 8,
                        }}
                      >
                        {s.accuracy}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 5,
                        borderRadius: 999,
                        backgroundColor: color + "22",
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${s.accuracy}%`,
                          height: "100%",
                          borderRadius: 999,
                          backgroundColor: color,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </Pressable>
    </View>
  );
}

const PRESET_TOPICS = [
  { name: "Polity", icon: "shield" as const, color: "#4F39F6" },
  { name: "History", icon: "book" as const, color: "#06B6D4" },
  { name: "Geography", icon: "map" as const, color: "#F59E0B" },
  { name: "Economy", icon: "trending-up" as const, color: "#EC4899" },
  { name: "Environment", icon: "wind" as const, color: "#10B981" },
];

const COUNTS = [5, 10, 20];

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { quizzes, addQuiz } = useApp();

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  const start = async (topicArg?: string) => {
    const t = (topicArg ?? topic).trim();
    if (!t) {
      Alert.alert("Topic required", "Pick a preset or type a topic.");
      return;
    }
    setGenerating(true);
    try {
      const questions = await generateQuiz(t, count);
      if (!questions.length) {
        Alert.alert(
          "Couldn't generate questions",
          "Please try a different topic or try again.",
        );
        return;
      }
      const q = addQuiz({
        topic: t,
        source: "topic",
        questions,
        answers: questions.map(() => null),
        score: 0,
        durationSec: 0,
        completed: false,
      });
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTopic("");
      router.push({ pathname: "/quiz-session", params: { id: q.id } } as never);
    } catch (err) {
      Alert.alert(
        "Quiz generation failed",
        "The AI service didn't respond. Please check your connection and try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const completed = quizzes.filter((q) => q.completed);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (isWeb ? 67 : 8),
          paddingBottom: insets.bottom + (isWeb ? 110 : 100),
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Quiz Engine"
          subtitle="Generate prelims-grade MCQs from any topic, instantly."
        />

        {/* Topic input */}
        <View style={{ paddingHorizontal: 20 }}>
          <Card>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 0.6,
                marginBottom: 8,
              }}
            >
              TOPIC OR PROMPT
            </Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g., Fundamental Rights — Article 14 to 18"
              placeholderTextColor={colors.mutedForeground}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
                fontFamily: "Inter_500Medium",
                fontSize: 15,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 14,
              }}
            />

            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 0.6,
                marginBottom: 8,
              }}
            >
              QUESTIONS
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {COUNTS.map((c) => {
                const active = count === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCount(c)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active
                        ? colors.primary + "10"
                        : colors.background,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.primary : colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 16,
                      }}
                    >
                      {c}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <GradientButton
              label={generating ? "Generating questions…" : "Generate quiz"}
              icon="zap"
              onPress={() => start()}
              loading={generating}
              size="lg"
            />
          </Card>
        </View>

        {/* Presets */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader title="Quick drills" />
          <View style={styles.presetGrid}>
            {PRESET_TOPICS.map((p) => (
              <Pressable
                key={p.name}
                onPress={() => start(p.name)}
                disabled={generating}
                style={({ pressed }) => [
                  styles.presetCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    transform: pressed ? [{ scale: 0.98 }] : [],
                    opacity: generating ? 0.5 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.presetIcon,
                    { backgroundColor: p.color + "15" },
                  ]}
                >
                  <Feather name={p.icon} size={18} color={p.color} />
                </View>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_700Bold",
                    fontSize: 14,
                  }}
                >
                  {p.name}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {count} questions
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Weak Areas teaser */}
        {completed.length >= 1 && (
          <WeakAreaTeaser quizzes={completed} onPress={() => router.push("/weak-areas" as never)} />
        )}

        {/* History */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader title="Your attempts" />
          {completed.length === 0 ? (
            <Card>
              <EmptyState
                icon="bar-chart-2"
                title="No attempts yet"
                subtitle="Generate your first quiz to start tracking accuracy and weak areas."
              />
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {completed.map((q) => {
                const acc = Math.round((q.score / q.questions.length) * 100);
                const accColor =
                  acc >= 70
                    ? colors.success
                    : acc >= 50
                      ? colors.warning
                      : colors.destructive;
                return (
                  <Card key={q.id}>
                    <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                      <View
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          backgroundColor: accColor + "15",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: accColor,
                            fontFamily: "Inter_800ExtraBold",
                            fontSize: 16,
                            letterSpacing: -0.5,
                          }}
                        >
                          {acc}%
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontFamily: "Inter_700Bold",
                            fontSize: 14,
                          }}
                          numberOfLines={1}
                        >
                          {q.topic}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            marginTop: 4,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontFamily: "Inter_500Medium",
                              fontSize: 12,
                            }}
                          >
                            {q.score}/{q.questions.length} correct
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontFamily: "Inter_500Medium",
                              fontSize: 12,
                            }}
                          >
                            · {Math.round(q.durationSec)}s
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => start(q.topic)}
                        hitSlop={10}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          backgroundColor: colors.secondary,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather
                          name="refresh-cw"
                          size={14}
                          color={colors.primary}
                        />
                      </Pressable>
                    </View>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetCard: {
    width: "31%",
    minWidth: 100,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  presetIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
