import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { useApp, type MainsEvaluation } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { evaluateMains } from "@/lib/ai";

const PAPERS: MainsEvaluation["paper"][] = [
  "GS-1",
  "GS-2",
  "GS-3",
  "GS-4",
  "Essay",
];

export default function MainsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { evaluations, addEvaluation } = useApp();

  const [composerOpen, setComposerOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"photo" | "text">("photo");
  const [question, setQuestion] = useState("");
  const [paper, setPaper] = useState<MainsEvaluation["paper"]>("GS-2");
  const [wordCount, setWordCount] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [answerText, setAnswerText] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  const reset = () => {
    setQuestion("");
    setPaper("GS-2");
    setWordCount("");
    setImageUri(null);
    setImageBase64(null);
    setImageMime("image/jpeg");
    setAnswerText("");
    setInputMode("photo");
  };

  const captureFromCamera = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Use Expo Go on your phone",
        "The camera is available on iOS/Android. On web, please use 'Pick image' instead.",
      );
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera permission required");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: false,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImageUri(a.uri);
      setImageBase64(a.base64 ?? null);
      setImageMime(a.mimeType ?? "image/jpeg");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.6,
      mediaTypes: "images",
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setImageUri(a.uri);
      setImageBase64(a.base64 ?? null);
      setImageMime(a.mimeType ?? "image/jpeg");
    }
  };

  const submit = async () => {
    if (!question.trim()) {
      Alert.alert("Question required", "Type the question prompt.");
      return;
    }
    if (inputMode === "photo" && !imageBase64) {
      Alert.alert(
        "Photo required",
        "Capture or upload a photo of your handwritten answer so the AI can grade it.",
      );
      return;
    }
    if (inputMode === "text" && !answerText.trim()) {
      Alert.alert("Answer required", "Type your answer in the text area.");
      return;
    }
    const wc = Number(wordCount) || (paper === "Essay" ? 950 : 240);
    setEvaluating(true);
    try {
      const result = await evaluateMains(
        inputMode === "photo"
          ? { question: question.trim(), paper, imageBase64: imageBase64!, mimeType: imageMime }
          : { question: question.trim(), paper, answerText: answerText.trim() },
      );
      const e = addEvaluation({
        question: question.trim(),
        imageUri,
        paper,
        wordCount: wc,
        scores: result.scores,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        feedback: result.feedback,
        modelAnswerHint: result.modelAnswerHint,
      });
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      setComposerOpen(false);
      router.push(`/mains-result/${e.id}` as never);
    } catch (err) {
      Alert.alert(
        "Evaluation failed",
        "The AI service didn't respond. Please check your connection and try again.",
      );
    } finally {
      setEvaluating(false);
    }
  };

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
          title="Mains AI"
          subtitle="Capture handwritten essays. Get examiner-grade feedback."
        />

        {/* Capture CTA */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            style={[
              styles.captureCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Pill
                label="Computer Vision"
                icon="eye"
                color={colors.accent}
                background={colors.accent + "15"}
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 18,
                  letterSpacing: -0.4,
                  marginTop: 4,
                }}
              >
                Photograph your answer
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                We grade structure, content, relevance, presentation, and value
                addition against UPSC examiner rubrics.
              </Text>
              <View style={{ marginTop: 12 }}>
                <GradientButton
                  label="New evaluation"
                  icon="camera"
                  onPress={() => setComposerOpen(true)}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        {evaluations.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatCard
                label="Evaluations"
                value={String(evaluations.length)}
                icon="file-text"
                color={colors.primary}
              />
              <StatCard
                label="Avg score"
                value={`${Math.round(
                  (evaluations.reduce(
                    (s, e) => s + (e.totalScore / e.maxScore) * 100,
                    0,
                  ) /
                    evaluations.length) *
                    10,
                ) / 10}%`}
                icon="award"
                color={colors.accent}
              />
              <StatCard
                label="Best paper"
                value={getBestPaper(evaluations)}
                icon="star"
                color="#F59E0B"
              />
            </View>
          </View>
        )}

        {/* History */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader title="History" />
          {evaluations.length === 0 ? (
            <Card>
              <EmptyState
                icon="edit-3"
                title="No evaluations yet"
                subtitle="Capture or upload your first handwritten answer to receive structured AI feedback."
              />
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {evaluations.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => router.push(`/mains-result/${e.id}` as never)}
                  style={({ pressed }) => ({
                    transform: pressed ? [{ scale: 0.99 }] : [],
                  })}
                >
                  <Card>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {e.imageUri ? (
                        <Image
                          source={{ uri: e.imageUri }}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 12,
                            backgroundColor: colors.muted,
                          }}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 12,
                            backgroundColor: colors.secondary,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Feather
                            name="file-text"
                            size={22}
                            color={colors.primary}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1, justifyContent: "space-between" }}>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            alignItems: "center",
                          }}
                        >
                          <Pill
                            label={e.paper}
                            color={colors.primary}
                            background={colors.primary + "12"}
                          />
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontFamily: "Inter_500Medium",
                              fontSize: 11,
                            }}
                          >
                            {e.wordCount} words
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 13.5,
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {e.question}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontFamily: "Inter_800ExtraBold",
                            fontSize: 22,
                            letterSpacing: -0.5,
                          }}
                        >
                          {e.totalScore}
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontFamily: "Inter_500Medium",
                            fontSize: 11,
                          }}
                        >
                          / {e.maxScore}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Composer modal */}
      <Modal
        visible={composerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !evaluating && setComposerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.composerCard,
              {
                backgroundColor: colors.background,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.handle} />
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_800ExtraBold",
                  fontSize: 22,
                  letterSpacing: -0.5,
                  marginBottom: 4,
                }}
              >
                New evaluation
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  marginBottom: 18,
                }}
              >
                The AI grades against the actual UPSC rubric.
              </Text>

              {/* Mode toggle */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: colors.secondary,
                  borderRadius: 14,
                  padding: 3,
                  marginBottom: 18,
                  gap: 3,
                }}
              >
                {(["photo", "text"] as const).map((mode) => {
                  const active = inputMode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => !evaluating && setInputMode(mode)}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 11,
                        backgroundColor: active ? colors.card : "transparent",
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6,
                        shadowColor: active ? "#0F172B" : "transparent",
                        shadowOpacity: 0.06,
                        shadowOffset: { width: 0, height: 2 },
                        shadowRadius: 4,
                        elevation: active ? 1 : 0,
                      }}
                    >
                      <Feather
                        name={mode === "photo" ? "camera" : "edit-3"}
                        size={14}
                        color={active ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={{
                          color: active ? colors.foreground : colors.mutedForeground,
                          fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                          fontSize: 13,
                        }}
                      >
                        {mode === "photo" ? "Photo" : "Type answer"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Answer input — photo or text */}
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {inputMode === "photo" ? "ANSWER SCRIPT" : "YOUR ANSWER"}
              </Text>

              {inputMode === "photo" ? (
                imageUri ? (
                  <View style={{ marginBottom: 14 }}>
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: "100%",
                        height: 200,
                        borderRadius: 16,
                        backgroundColor: colors.muted,
                      }}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => setImageUri(null)}
                      style={[
                        styles.removeBtn,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <Feather name="x" size={16} color={colors.foreground} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                    <Pressable
                      onPress={captureFromCamera}
                      style={({ pressed }) => [
                        styles.captureOption,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Feather name="camera" size={22} color={colors.primary} />
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 13,
                          marginTop: 6,
                        }}
                      >
                        Camera
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={pickFromLibrary}
                      style={({ pressed }) => [
                        styles.captureOption,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.card,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Feather name="image" size={22} color={colors.accent} />
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 13,
                          marginTop: 6,
                        }}
                      >
                        Gallery
                      </Text>
                    </Pressable>
                  </View>
                )
              ) : (
                <TextInput
                  value={answerText}
                  onChangeText={setAnswerText}
                  editable={!evaluating}
                  placeholder={`Write your ${paper === "Essay" ? "essay" : "answer"} here… (aim for ${paper === "Essay" ? "1000" : "250"} words)`}
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.input,
                    {
                      borderColor: answerText.trim()
                        ? colors.primary + "80"
                        : colors.border,
                      backgroundColor: colors.card,
                      color: colors.foreground,
                      minHeight: 160,
                    },
                  ]}
                />
              )}

              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                QUESTION
              </Text>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Paste or type the question prompt…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    color: colors.foreground,
                    minHeight: 80,
                    textAlignVertical: "top",
                  },
                ]}
              />

              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                PAPER
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 14,
                }}
              >
                {PAPERS.map((p) => {
                  const active = paper === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPaper(p)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: active
                          ? colors.primary
                          : colors.secondary,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? "#fff" : colors.secondaryForeground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 13,
                        }}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                WORD COUNT (OPTIONAL)
              </Text>
              <TextInput
                value={wordCount}
                onChangeText={setWordCount}
                placeholder={paper === "Essay" ? "1000" : "250"}
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    color: colors.foreground,
                  },
                ]}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => !evaluating && setComposerOpen(false)}
                  disabled={evaluating}
                  style={{ flex: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <GradientButton
                    label={evaluating ? "Grading…" : "Evaluate"}
                    icon="cpu"
                    onPress={submit}
                    loading={evaluating}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  color: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        gap: 6,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: color + "15",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text
        style={{
          color: colors.foreground,
          fontFamily: "Inter_800ExtraBold",
          fontSize: 18,
          letterSpacing: -0.4,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function getBestPaper(evals: MainsEvaluation[]) {
  const tally = new Map<string, { sum: number; n: number }>();
  for (const e of evals) {
    const cur = tally.get(e.paper) ?? { sum: 0, n: 0 };
    cur.sum += (e.totalScore / e.maxScore) * 100;
    cur.n += 1;
    tally.set(e.paper, cur);
  }
  let best = "—";
  let bestVal = 0;
  tally.forEach((v, k) => {
    const avg = v.sum / v.n;
    if (avg > bestVal) {
      bestVal = avg;
      best = k;
    }
  });
  return best;
}

const styles = StyleSheet.create({
  captureCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,43,0.45)",
    justifyContent: "flex-end",
  },
  composerCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: 8,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 12,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    marginBottom: 16,
  },
  captureOption: {
    flex: 1,
    height: 96,
    borderWidth: 1,
    borderRadius: 16,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
