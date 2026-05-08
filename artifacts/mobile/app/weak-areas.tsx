import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, GradientButton, SectionHeader } from "@/components/ui";
import { useApp, type QuizAttempt } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { generateQuiz } from "@/lib/ai";

type SubtopicStat = {
  label: string;
  correct: number;
  total: number;
  accuracy: number;
  attempts: number;
  isSubtopic: boolean;
};

function computeStats(quizzes: QuizAttempt[]): SubtopicStat[] {
  const completed = quizzes.filter((q) => q.completed);

  const bySubtopic = new Map<
    string,
    { correct: number; total: number; attempts: Set<string> }
  >();
  const byTopic = new Map<
    string,
    { correct: number; total: number; attempts: Set<string> }
  >();

  for (const quiz of completed) {
    const topicKey = quiz.topic;
    const topicEntry = byTopic.get(topicKey) ?? {
      correct: 0,
      total: 0,
      attempts: new Set<string>(),
    };
    topicEntry.attempts.add(quiz.id);
    topicEntry.total += quiz.questions.length;
    topicEntry.correct += quiz.score;
    byTopic.set(topicKey, topicEntry);

    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i]!;
      const sub = q.subtopic?.trim();
      if (!sub) continue;
      const key = sub;
      const entry = bySubtopic.get(key) ?? {
        correct: 0,
        total: 0,
        attempts: new Set<string>(),
      };
      entry.attempts.add(quiz.id);
      entry.total += 1;
      entry.correct += quiz.answers[i] === q.correctIndex ? 1 : 0;
      bySubtopic.set(key, entry);
    }
  }

  const subtopicStats: SubtopicStat[] = Array.from(bySubtopic.entries())
    .filter(([, v]) => v.total >= 3)
    .map(([label, v]) => ({
      label,
      correct: v.correct,
      total: v.total,
      accuracy: Math.round((v.correct / v.total) * 100),
      attempts: v.attempts.size,
      isSubtopic: true,
    }));

  const topicStats: SubtopicStat[] = Array.from(byTopic.entries()).map(
    ([label, v]) => ({
      label,
      correct: v.correct,
      total: v.total,
      accuracy: Math.round((v.correct / v.total) * 100),
      attempts: v.attempts.size,
      isSubtopic: false,
    }),
  );

  const combined = subtopicStats.length >= 3 ? subtopicStats : topicStats;
  return combined.sort((a, b) => a.accuracy - b.accuracy);
}

function AccBar({
  accuracy,
  color,
}: {
  accuracy: number;
  color: string;
}) {
  return (
    <View
      style={{
        height: 6,
        borderRadius: 999,
        backgroundColor: color + "22",
        overflow: "hidden",
        marginTop: 8,
      }}
    >
      <View
        style={{
          width: `${accuracy}%`,
          height: "100%",
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function StatRow({ stat, onDrill }: { stat: SubtopicStat; onDrill: () => void }) {
  const colors = useColors();
  const color =
    stat.accuracy < 50
      ? colors.destructive
      : stat.accuracy < 65
        ? colors.warning
        : stat.accuracy < 80
          ? "#F59E0B"
          : colors.success;

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: color + "18",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color,
              fontFamily: "Inter_800ExtraBold",
              fontSize: 15,
              letterSpacing: -0.5,
            }}
          >
            {stat.accuracy}%
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 14,
              letterSpacing: -0.1,
            }}
            numberOfLines={2}
          >
            {stat.label}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_500Medium",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {stat.correct}/{stat.total} correct · {stat.attempts}{" "}
            {stat.attempts === 1 ? "attempt" : "attempts"}
          </Text>
          <AccBar accuracy={stat.accuracy} color={color} />
        </View>
        <Pressable
          onPress={onDrill}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: colors.primary + "12",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Feather name="refresh-cw" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </Card>
  );
}

export default function WeakAreasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { quizzes, addQuiz } = useApp();
  const [drilling, setDrilling] = useState<string | null>(null);

  const completed = quizzes.filter((q) => q.completed);
  const stats = useMemo(() => computeStats(quizzes), [quizzes]);

  const totalQ = completed.reduce((s, q) => s + q.questions.length, 0);
  const totalCorrect = completed.reduce((s, q) => s + q.score, 0);
  const overallAcc = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

  const weak = stats.filter((s) => s.accuracy < 60);
  const developing = stats.filter((s) => s.accuracy >= 60 && s.accuracy < 80);
  const strong = stats.filter((s) => s.accuracy >= 80);

  const drillTopic = async (label: string) => {
    setDrilling(label);
    try {
      const questions = await generateQuiz(label, 10);
      if (!questions.length) {
        Alert.alert(
          "No questions",
          "Couldn't generate a drill for this topic. Try again.",
        );
        return;
      }
      const quiz = addQuiz({
        topic: label,
        source: "topic",
        questions,
        answers: questions.map(() => null),
        score: 0,
        durationSec: 0,
        completed: false,
      });
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: "/quiz-session",
        params: { id: quiz.id },
      } as never);
    } catch {
      Alert.alert("Failed", "Quiz generation failed. Please try again.");
    } finally {
      setDrilling(null);
    }
  };

  if (!completed.length) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            backgroundColor: colors.primary + "12",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Feather name="bar-chart-2" size={28} color={colors.primary} />
        </View>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 20,
            letterSpacing: -0.4,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          No data yet
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 21,
          }}
        >
          Complete a few quizzes first. Your weak areas will appear here once we
          have enough data to spot patterns.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 32,
        paddingTop: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary strip */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5 }}>
            ATTEMPTS
          </Text>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_800ExtraBold", fontSize: 26, letterSpacing: -1, marginTop: 4 }}>
            {completed.length}
          </Text>
        </View>
        <View style={[styles.summaryCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5 }}>
            QUESTIONS
          </Text>
          <Text style={{ color: colors.foreground, fontFamily: "Inter_800ExtraBold", fontSize: 26, letterSpacing: -1, marginTop: 4 }}>
            {totalQ}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCell,
            {
              backgroundColor:
                overallAcc >= 70
                  ? colors.success + "14"
                  : overallAcc >= 50
                    ? colors.warning + "14"
                    : colors.destructive + "14",
              borderColor:
                overallAcc >= 70
                  ? colors.success + "30"
                  : overallAcc >= 50
                    ? colors.warning + "30"
                    : colors.destructive + "30",
            },
          ]}
        >
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5 }}>
            ACCURACY
          </Text>
          <Text
            style={{
              color:
                overallAcc >= 70
                  ? colors.success
                  : overallAcc >= 50
                    ? colors.warning
                    : colors.destructive,
              fontFamily: "Inter_800ExtraBold",
              fontSize: 26,
              letterSpacing: -1,
              marginTop: 4,
            }}
          >
            {overallAcc}%
          </Text>
        </View>
      </View>

      {/* Weak — Needs work */}
      {weak.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <SectionHeader
            title="Needs work"
            subtitle={`${weak.length} ${weak.length === 1 ? "topic" : "topics"} below 60%`}
          />
          <View
            style={{
              backgroundColor: colors.destructive + "0A",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.destructive + "20",
              padding: 12,
              marginBottom: 4,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Feather name="alert-circle" size={13} color={colors.destructive} />
              <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                Prioritise these in your next revision session
              </Text>
            </View>
            {weak.map((s) => (
              <StatRow
                key={s.label}
                stat={s}
                onDrill={() => drillTopic(s.label)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Developing */}
      {developing.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <SectionHeader
            title="Developing"
            subtitle={`${developing.length} ${developing.length === 1 ? "topic" : "topics"} at 60–79%`}
          />
          {developing.map((s) => (
            <StatRow
              key={s.label}
              stat={s}
              onDrill={() => drillTopic(s.label)}
            />
          ))}
        </View>
      )}

      {/* Strong */}
      {strong.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <SectionHeader
            title="Strong areas"
            subtitle={`${strong.length} ${strong.length === 1 ? "topic" : "topics"} at 80%+`}
          />
          {strong.map((s) => (
            <StatRow
              key={s.label}
              stat={s}
              onDrill={() => drillTopic(s.label)}
            />
          ))}
        </View>
      )}

      {/* Drill tip */}
      {!!drilling && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 24,
            left: 20,
            right: 20,
            backgroundColor: colors.primary,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Feather name="zap" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1 }}>
            Generating drill for "{drilling}"…
          </Text>
        </View>
      )}

      {/* Bottom CTA — only if there are weak topics */}
      {weak.length > 0 && !drilling && (
        <View style={{ marginTop: 28 }}>
          <GradientButton
            label={`Drill weakest topic`}
            icon="zap"
            onPress={() => weak[0] && drillTopic(weak[0].label)}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCell: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
});
