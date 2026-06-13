import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, GradientButton, ProgressBar } from "@/components/ui";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

export default function QuizSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { quizzes, updateQuiz } = useApp();
  const quiz = useMemo(() => quizzes.find((q) => q.id === id), [quizzes, id]);

  const startedAtRef = useRef(Date.now());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    quiz?.answers ?? [],
  );
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (quiz && answers.length === 0) {
      setAnswers(quiz.questions.map(() => null));
    }
  }, [quiz, answers.length]);

  if (!quiz) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.mutedForeground }}>Quiz not found.</Text>
      </View>
    );
  }

  const total = quiz.questions.length;
  const current = quiz.questions[index]!;

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
    if (Platform.OS !== "web")
      Haptics.selectionAsync();
  };

  const reveal = () => {
    if (selected === null) return;
    const next = [...answers];
    next[index] = selected;
    setAnswers(next);
    setRevealed(true);
    if (Platform.OS !== "web") {
      if (selected === current.correctIndex) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const goNext = () => {
    if (index + 1 >= total) {
      const score = answers.reduce<number>(
        (s, a, i) =>
          a !== null && a === quiz.questions[i]!.correctIndex ? s + 1 : s,
        0,
      );
      const dur = (Date.now() - startedAtRef.current) / 1000;
      updateQuiz(quiz.id, {
        answers,
        score,
        durationSec: dur,
        completed: true,
      });
      setFinished(true);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
  };

  const exit = () => {
    router.back();
  };

  if (finished) {
    const score = answers.reduce<number>(
      (s, a, i) =>
        a !== null && a === quiz.questions[i]!.correctIndex ? s + 1 : s,
      0,
    );
    const acc = Math.round((score / total) * 100);
    const accColor =
      acc >= 70 ? colors.success : acc >= 50 ? colors.warning : colors.destructive;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top + 12,
        }}
      >
        <View style={[styles.topBar, { justifyContent: "flex-end" }]}>
          <Pressable
            onPress={exit}
            hitSlop={10}
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="x" size={18} color={colors.foreground} />
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <View style={{ alignItems: "center", paddingBottom: 24 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 999,
                backgroundColor: accColor + "18",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Feather
                name={acc >= 70 ? "award" : acc >= 50 ? "trending-up" : "target"}
                size={36}
                color={accColor}
              />
            </View>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_800ExtraBold",
                fontSize: 56,
                letterSpacing: -2,
              }}
            >
              {score}
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 24,
                }}
              >
                /{total}
              </Text>
            </Text>
            <Text
              style={{
                color: accColor,
                fontFamily: "Inter_700Bold",
                fontSize: 16,
                marginTop: 4,
              }}
            >
              {acc}% accuracy
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                marginTop: 4,
              }}
            >
              {quiz.topic}
            </Text>
          </View>

          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 18,
              marginBottom: 12,
              letterSpacing: -0.3,
            }}
          >
            Review
          </Text>
          <View style={{ gap: 10, paddingBottom: 32 }}>
            {quiz.questions.map((q, i) => {
              const ans = answers[i];
              const correct = ans === q.correctIndex;
              return (
                <View
                  key={q.id}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 18,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        backgroundColor:
                          (correct ? colors.success : colors.destructive) + "18",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather
                        name={correct ? "check" : "x"}
                        size={12}
                        color={correct ? colors.success : colors.destructive}
                      />
                    </View>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 11,
                      }}
                    >
                      Q{i + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                      lineHeight: 20,
                      marginBottom: 8,
                    }}
                  >
                    {q.prompt}
                  </Text>
                  <Text
                    style={{
                      color: colors.success,
                      fontFamily: "Inter_500Medium",
                      fontSize: 13,
                    }}
                  >
                    Answer: {q.options[q.correctIndex]}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={{ paddingBottom: insets.bottom + 16 }}>
            <GradientButton label="Done" icon="check" onPress={exit} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + 12,
      }}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={exit}
          hitSlop={10}
          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_500Medium",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {index + 1} of {total}
          </Text>
          <View style={{ marginTop: 6, paddingHorizontal: 24 }}>
            <ProgressBar value={index + 1} max={total} />
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 24,
          paddingTop: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.primary,
            fontFamily: "Inter_700Bold",
            fontSize: 12,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {quiz.topic}
        </Text>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 22,
            lineHeight: 30,
            letterSpacing: -0.4,
            marginBottom: 28,
          }}
        >
          {current.prompt}
        </Text>

        <View style={{ gap: 10 }}>
          {current.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === current.correctIndex;
            const showCorrect = revealed && isCorrect;
            const showWrong = revealed && isSelected && !isCorrect;
            const borderColor = showCorrect
              ? colors.success
              : showWrong
                ? colors.destructive
                : isSelected
                  ? colors.primary
                  : colors.border;
            const bg = showCorrect
              ? colors.success + "12"
              : showWrong
                ? colors.destructive + "12"
                : isSelected
                  ? colors.primary + "10"
                  : colors.card;
            return (
              <Pressable
                key={i}
                onPress={() => handleSelect(i)}
                disabled={revealed}
                style={({ pressed }) => [
                  styles.option,
                  {
                    borderColor,
                    backgroundColor: bg,
                    transform: pressed && !revealed ? [{ scale: 0.99 }] : [],
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionMarker,
                    {
                      borderColor,
                      backgroundColor: isSelected || showCorrect
                        ? showCorrect
                          ? colors.success
                          : showWrong
                            ? colors.destructive
                            : colors.primary
                        : "transparent",
                    },
                  ]}
                >
                  {showCorrect ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : showWrong ? (
                    <Feather name="x" size={12} color="#fff" />
                  ) : isSelected ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#fff",
                      }}
                    />
                  ) : (
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 11,
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: colors.foreground,
                    fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_500Medium",
                    fontSize: 15,
                    lineHeight: 22,
                  }}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {revealed && (
          <View
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 16,
              backgroundColor: colors.primary + "08",
              borderWidth: 1,
              borderColor: colors.primary + "30",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Feather name="info" size={14} color={colors.primary} />
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_700Bold",
                  fontSize: 12,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                Explanation
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
              {current.explanation}
            </Text>
          </View>
        )}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          paddingTop: 8,
        }}
      >
        {revealed ? (
          <GradientButton
            label={index + 1 >= total ? "See results" : "Next question"}
            icon="arrow-right"
            onPress={goNext}
          />
        ) : (
          <Button
            label="Submit answer"
            onPress={reveal}
            disabled={selected === null}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionMarker: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
