import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, Pill, ProgressBar } from "@/components/ui";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const RUBRIC_LABELS: Record<string, string> = {
  structure: "Structure & Flow",
  content: "Content Depth",
  relevance: "Relevance",
  presentation: "Presentation",
  valueAddition: "Value Addition",
};

export default function MainsResultScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { evaluations } = useApp();
  const e = useMemo(() => evaluations.find((x) => x.id === id), [evaluations, id]);

  if (!e) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.mutedForeground }}>Evaluation not found.</Text>
      </View>
    );
  }

  const pct = (e.totalScore / e.maxScore) * 100;
  const grade =
    pct >= 75 ? "A" : pct >= 65 ? "B+" : pct >= 55 ? "B" : pct >= 45 ? "C" : "D";
  const gradeColor =
    pct >= 65 ? colors.success : pct >= 50 ? colors.warning : colors.destructive;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Score hero */}
      <Card>
        <View style={{ alignItems: "center", paddingVertical: 12 }}>
          <Pill
            label={e.paper}
            color={colors.primary}
            background={colors.primary + "12"}
          />
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 16, gap: 4 }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_800ExtraBold",
                fontSize: 64,
                letterSpacing: -2,
                lineHeight: 64,
              }}
            >
              {e.totalScore}
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 18,
                marginBottom: 10,
              }}
            >
              / {e.maxScore}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
            }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: gradeColor + "18",
              }}
            >
              <Text
                style={{
                  color: gradeColor,
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                }}
              >
                Grade {grade}
              </Text>
            </View>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 13,
              }}
            >
              {Math.round(pct)}% · {e.wordCount} words
            </Text>
          </View>
        </View>
      </Card>

      {/* Question */}
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
          QUESTION
        </Text>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            lineHeight: 22,
          }}
        >
          {e.question}
        </Text>
      </Card>

      {/* Image */}
      {e.imageUri && (
        <Card padded={false}>
          <Image
            source={{ uri: e.imageUri }}
            style={{ width: "100%", height: 240, borderRadius: 20 }}
            contentFit="cover"
          />
        </Card>
      )}

      {/* Rubric breakdown */}
      <Card>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 16,
            marginBottom: 14,
            letterSpacing: -0.2,
          }}
        >
          Rubric breakdown
        </Text>
        {Object.entries(e.scores).map(([k, v], idx, arr) => (
          <View
            key={k}
            style={{ marginBottom: idx === arr.length - 1 ? 0 : 14 }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                }}
              >
                {RUBRIC_LABELS[k] ?? k}
              </Text>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 13,
                }}
              >
                {v}
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                  }}
                >
                  /10
                </Text>
              </Text>
            </View>
            <ProgressBar
              value={v}
              max={10}
              color={
                v >= 7.5
                  ? colors.success
                  : v >= 6
                    ? colors.primary
                    : colors.warning
              }
            />
          </View>
        ))}
      </Card>

      {/* Feedback */}
      <Card>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 16,
            marginBottom: 12,
            letterSpacing: -0.2,
          }}
        >
          Examiner feedback
        </Text>
        <View style={{ gap: 12 }}>
          {e.feedback.map((f, i) => (
            <View key={i} style={styles.feedbackRow}>
              <View
                style={[
                  styles.bullet,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Feather name="check" size={12} color={colors.primary} />
              </View>
              <Text
                style={{
                  flex: 1,
                  color: colors.foreground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 13.5,
                  lineHeight: 20,
                }}
              >
                {f}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Model answer hint */}
      <Card style={{ backgroundColor: colors.primary + "08", borderColor: colors.primary + "30" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Feather name="star" size={16} color={colors.primary} />
          <Text
            style={{
              color: colors.primary,
              fontFamily: "Inter_700Bold",
              fontSize: 13,
              letterSpacing: 0.2,
              textTransform: "uppercase",
            }}
          >
            Ranker insight
          </Text>
        </View>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          {e.modelAnswerHint}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  feedbackRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bullet: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
});
