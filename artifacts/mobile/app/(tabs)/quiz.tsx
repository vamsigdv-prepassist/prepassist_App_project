import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useApp, type QuizAttempt, type VaultDocument } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { generateQuiz, pickRandomTopic } from "@/lib/ai";

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

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

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
  const { quizzes, addQuiz, documents, evaluations } = useApp();

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);

  // Quiz-from-vault state
  const [quizDoc, setQuizDoc] = useState<VaultDocument | null>(null);
  const [quizDocCount, setQuizDocCount] = useState(10);
  const [quizDocGenerating, setQuizDocGenerating] = useState(false);

  const handleGenerateFromDoc = async () => {
    if (!quizDoc?.chunks?.length) return;
    setQuizDocGenerating(true);
    try {
      const questions = await generateQuiz(quizDoc.title, quizDocCount, {
        documentTitle: quizDoc.title,
        documentChunks: quizDoc.chunks,
      });
      if (!questions.length) {
        Alert.alert("No questions", "Couldn't generate questions from this document.");
        return;
      }
      const q = addQuiz({
        topic: quizDoc.title,
        source: "pdf",
        questions,
        answers: questions.map(() => null),
        score: 0,
        durationSec: 0,
        completed: false,
      });
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setQuizDoc(null);
      router.push({ pathname: "/quiz-session", params: { id: q.id } } as never);
    } catch {
      Alert.alert("Failed", "Quiz generation failed. Check your connection and try again.");
    } finally {
      setQuizDocGenerating(false);
    }
  };

  const start = async (topicArg?: string) => {
    let t = (topicArg ?? topic).trim();
    if (!t) {
      t = pickRandomTopic();
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

  const calendarData = useMemo(() => {
    const counts: Record<string, number> = {};
    evaluations.forEach((e) => {
      const day = new Date(e.createdAt).toISOString().slice(0, 10);
      counts[day] = (counts[day] ?? 0) + 1;
    });
    quizzes.filter((q) => q.completed).forEach((q) => {
      const day = new Date(q.createdAt).toISOString().slice(0, 10);
      counts[day] = (counts[day] ?? 0) + 1;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = (today.getDay() + 6) % 7;
    const gridStart = new Date(today);
    gridStart.setDate(today.getDate() - 27 - dayOfWeek);
    const totalCells = 28 + dayOfWeek;

    const cells: { key: string; count: number; isToday: boolean; isFuture: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const todayKey = today.toISOString().slice(0, 10);
      cells.push({ key, count: counts[key] ?? 0, isToday: key === todayKey, isFuture: d > today });
    }

    const rows: (typeof cells[0] | null)[][] = [];
    for (let r = 0; r < Math.ceil(cells.length / 7); r++) {
      rows.push(cells.slice(r * 7, r * 7 + 7));
    }

    const todayKey = today.toISOString().slice(0, 10);
    let streak = 0;
    const startOffset = counts[todayKey] ? 0 : 1;
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (counts[k]) { streak++; } else { break; }
    }

    return { rows, streak, totalActive: Object.keys(counts).length };
  }, [evaluations, quizzes]);

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
          title="AI Prelims Engine"
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

        {/* PDF upload card */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader
            title="Test series PDF"
            subtitle="Extract MCQs directly from any uploaded paper"
          />
          <Pressable
            onPress={() => router.push("/pdf-quiz" as never)}
            style={({ pressed }) => ({
              transform: pressed ? [{ scale: 0.99 }] : [],
            })}
          >
            <View
              style={{
                borderRadius: 20,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.primary + "30",
                backgroundColor: colors.card,
              }}
            >
              {/* Gradient accent strip */}
              <View
                style={{
                  height: 4,
                  backgroundColor: colors.primary,
                  opacity: 0.7,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: colors.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="upload-cloud" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 15,
                      letterSpacing: -0.2,
                    }}
                  >
                    Upload PDF
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    Previous years · Question banks · Test series
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: colors.primary,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Feather name="zap" size={13} color="#fff" />
                  <Text
                    style={{
                      color: "#fff",
                      fontFamily: "Inter_700Bold",
                      fontSize: 12,
                    }}
                  >
                    Extract
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
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

        {/* From your vault */}
        {documents.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SectionHeader
              title="From your vault"
              subtitle="Generate MCQs grounded in your indexed PDFs"
            />
            <View style={{ gap: 10 }}>
              {documents.slice(0, 4).map((doc) => (
                <Pressable
                  key={doc.id}
                  onPress={() => {
                    if (!doc.chunks?.length) {
                      Alert.alert("Not indexed", "This document has no extracted text for quiz generation.");
                      return;
                    }
                    setQuizDoc(doc);
                    setQuizDocCount(10);
                  }}
                  style={({ pressed }) => ({
                    transform: pressed ? [{ scale: 0.99 }] : [],
                  })}
                >
                  <Card>
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          backgroundColor: (doc.color ?? colors.primary) + "18",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather name="file-text" size={18} color={doc.color ?? colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontFamily: "Inter_700Bold",
                            fontSize: 14,
                            letterSpacing: -0.1,
                          }}
                          numberOfLines={1}
                        >
                          {doc.title}
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontFamily: "Inter_500Medium",
                            fontSize: 12,
                            marginTop: 2,
                          }}
                        >
                          {doc.subject} · {doc.chunkCount ?? doc.chunks?.length ?? 0} passages
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: doc.chunks?.length ? colors.primary + "12" : colors.secondary,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Feather name="zap" size={13} color={doc.chunks?.length ? colors.primary : colors.mutedForeground} />
                        <Text
                          style={{
                            color: doc.chunks?.length ? colors.primary : colors.mutedForeground,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 12,
                          }}
                        >
                          Quiz
                        </Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Weak Areas teaser */}
        {completed.length >= 1 && (
          <WeakAreaTeaser quizzes={completed} onPress={() => router.push("/weak-areas" as never)} />
        )}

        {/* Study streak calendar */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 16,
                  letterSpacing: -0.3,
                }}
              >
                Study streak
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  marginTop: 1,
                }}
              >
                {calendarData.totalActive > 0
                  ? `${calendarData.totalActive} active ${calendarData.totalActive === 1 ? "day" : "days"} in this period`
                  : "Complete a quiz or evaluation to start"}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor:
                  calendarData.streak > 0
                    ? colors.primary + "15"
                    : colors.secondary,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor:
                  calendarData.streak > 0
                    ? colors.primary + "30"
                    : "transparent",
              }}
            >
              <Feather
                name="zap"
                size={13}
                color={calendarData.streak > 0 ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={{
                  color: calendarData.streak > 0 ? colors.primary : colors.mutedForeground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 13,
                }}
              >
                {calendarData.streak > 0 ? `${calendarData.streak}d streak` : "No streak yet"}
              </Text>
            </View>
          </View>

          <Card>
            {/* Day-of-week header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
                paddingHorizontal: 2,
              }}
            >
              {DAY_LABELS.map((d, i) => (
                <Text
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 10,
                    letterSpacing: 0.3,
                  }}
                >
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={{ gap: 5 }}>
              {calendarData.rows.map((row, ri) => (
                <View
                  key={ri}
                  style={{ flexDirection: "row", justifyContent: "space-between", gap: 5 }}
                >
                  {row.map((cell, ci) =>
                    cell === null ? (
                      <View key={ci} style={{ flex: 1 }} />
                    ) : (
                      <View
                        key={cell.key}
                        style={{
                          flex: 1,
                          aspectRatio: 1,
                          borderRadius: 7,
                          backgroundColor: cell.isFuture
                            ? "transparent"
                            : cell.count === 0
                              ? colors.secondary
                              : cell.count === 1
                                ? colors.primary + "45"
                                : cell.count === 2
                                  ? colors.primary + "80"
                                  : colors.primary,
                          borderWidth: cell.isToday ? 2 : 0,
                          borderColor: cell.isToday ? colors.primary : "transparent",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {cell.isToday && (
                          <View
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: cell.count > 0 ? "#fff" : colors.primary,
                            }}
                          />
                        )}
                      </View>
                    ),
                  )}
                </View>
              ))}
            </View>

            {/* Legend */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 5,
                marginTop: 12,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 10 }}>
                Less
              </Text>
              {[colors.secondary, colors.primary + "45", colors.primary + "80", colors.primary].map(
                (bg, i) => (
                  <View key={i} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: bg }} />
                ),
              )}
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 10 }}>
                More
              </Text>
            </View>
          </Card>
        </View>

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

      {/* Quiz-from-vault modal */}
      <Modal
        visible={!!quizDoc}
        transparent
        animationType="fade"
        onRequestClose={() => !quizDocGenerating && setQuizDoc(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(15,23,43,0.45)",
            justifyContent: "center",
            paddingHorizontal: 20,
          }}
          onPress={() => !quizDocGenerating && setQuizDoc(null)}
        >
          <Pressable
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              padding: 22,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: (quizDoc?.color ?? colors.primary) + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="zap" size={20} color={quizDoc?.color ?? colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_800ExtraBold",
                    fontSize: 17,
                    letterSpacing: -0.4,
                  }}
                  numberOfLines={2}
                >
                  {quizDoc?.title}
                </Text>
                <Text
                  style={{
                    color: quizDoc?.color ?? colors.primary,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Quiz from this document
                </Text>
              </View>
            </View>

            {/* Passage coverage note */}
            {quizDoc?.chunkCount ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: colors.primary + "0E",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginBottom: 18,
                  borderWidth: 1,
                  borderColor: colors.primary + "25",
                }}
              >
                <Feather name="layers" size={13} color={colors.primary} />
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    flex: 1,
                  }}
                >
                  Covers {Math.min(10, quizDoc.chunkCount)} of {quizDoc.chunkCount} passages, sampled across the whole document.
                </Text>
              </View>
            ) : null}

            {/* Count picker */}
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 0.6,
                marginBottom: 8,
              }}
            >
              NUMBER OF QUESTIONS
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {COUNTS.map((c) => {
                const active = quizDocCount === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => !quizDocGenerating && setQuizDocCount(c)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + "10" : colors.background,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.primary : colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 18,
                      }}
                    >
                      {c}
                    </Text>
                    <Text
                      style={{
                        color: active ? colors.primary : colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      Qs
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => !quizDocGenerating && setQuizDoc(null)}
                style={{ flex: 1 }}
              />
              <View style={{ flex: 1 }}>
                {quizDocGenerating ? (
                  <View
                    style={{
                      height: 50,
                      borderRadius: 999,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: "Inter_700Bold",
                        fontSize: 14,
                      }}
                    >
                      Generating…
                    </Text>
                  </View>
                ) : (
                  <GradientButton
                    label="Generate quiz"
                    icon="zap"
                    onPress={handleGenerateFromDoc}
                  />
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
