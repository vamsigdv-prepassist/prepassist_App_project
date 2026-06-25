import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter, useLocalSearchParams } from "expo-router";
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
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type MainsEvaluation } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { evaluateMains } from "@/lib/ai";
import { Stack } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";

const WORD_LIMITS = [200, 250, 300, 1000];

export default function EvaluateMainsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { evaluations, addEvaluation } = useApp();
  const { prefillQuestion, prefillPaper } = useLocalSearchParams<{
    prefillQuestion?: string;
    prefillPaper?: string;
  }>();
  const { profile } = useAuth();

  const [inputType, setInputType] = useState<"upload" | "text">("upload");
  const [question, setQuestion] = useState(prefillQuestion || "");
  const [wordLimit, setWordLimit] = useState<number>(250);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeCurrentAffairs, setIncludeCurrentAffairs] = useState(true);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [answerText, setAnswerText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);

  const captureFromCamera = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Use Expo Go on your phone",
        "The camera is available on iOS/Android. On web, please use 'Pick image' instead."
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

  const evaluateAnswer = async () => {
    if (!question.trim()) {
      Alert.alert("Question Required", "Please enter the topic or question.");
      return;
    }
    if (inputType === "upload" && !imageBase64) {
      Alert.alert("Image Required", "Capture or upload your handwritten answer.");
      return;
    }
    if (inputType === "text" && !answerText.trim()) {
      Alert.alert("Answer Required", "Type your answer in the text box.");
      return;
    }

    if (!profile || profile.credits < 3) {
      Alert.alert(
        "Insufficient AI Credits",
        "Mains Answer Evaluation requires 3 AI Credits. Please upgrade to Pro to continue.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/pricing" as never) }
        ]
      );
      return;
    }

    setIsEvaluating(true);
    try {
      const paperVal = wordLimit >= 1000 ? "Essay" : "GS-2";
      const result = await evaluateMains(
        inputType === "upload"
          ? {
              question: question.trim(),
              paper: paperVal,
              imageBase64: imageBase64!,
              mimeType: imageMime,
            }
          : {
              question: question.trim(),
              paper: paperVal,
              answerText: answerText.trim(),
            }
      );

      const e = addEvaluation({
        question: question.trim(),
        imageUri,
        paper: paperVal,
        wordCount: wordLimit,
        scores: result.scores,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        feedback: result.feedback,
        modelAnswerHint: result.modelAnswerHint,
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          credits: increment(-3)
        });
      }

      router.push(`/mains-result/${e.id}` as never);
      
      // Reset
      setImageUri(null);
      setImageBase64(null);
      setAnswerText("");
      setQuestion("");
    } catch (err) {
      Alert.alert("Evaluation failed", "Could not reach the AI evaluator.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return colors.primary;
    if (pct >= 60) return colors.accent;
    if (pct >= 40) return "#8B5A2B";
    return "#EF4444";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Header */}
        <View style={styles.header}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>AI Mains Evaluation</Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
            Submit your UPSC answer below. Our advanced pipeline analyzes handwritten texts alongside your personal knowledge vaults.
          </Text>
        </View>

        {/* Submission Panel */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.panelHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Feather name="cloud-lightning" size={24} color={colors.accent} />
              <Text style={[styles.panelTitle, { color: colors.foreground }]}>Submission Panel</Text>
            </View>

            {/* Input Engine Toggle */}
            <View style={[styles.toggleWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setInputType("upload")}
                style={[
                  styles.toggleBtn,
                  inputType === "upload" && {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Feather
                  name="image"
                  size={14}
                  color={inputType === "upload" ? colors.foreground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: inputType === "upload" ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  Hand-Written
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setInputType("text")}
                style={[
                  styles.toggleBtn,
                  inputType === "text" && {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Feather
                  name="pen-tool"
                  size={14}
                  color={inputType === "text" ? colors.foreground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: inputType === "text" ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  Typed Answer
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Content */}
          <View style={{ gap: 24, marginTop: 24 }}>
            {/* Question Input */}
            <View>
              <Text style={[styles.label, { color: colors.accent }]}>Topic / Question Focus</Text>
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Paste the exact UPSC Mains question..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlignVertical="top"
                style={[
                  styles.inputArea,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />
            </View>

            {/* Word Limits */}
            <View style={[styles.configBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.accent }]}>Strict Word Limit</Text>
              <View style={styles.limitRow}>
                {WORD_LIMITS.map((limit) => {
                  const active = wordLimit === limit;
                  return (
                    <TouchableOpacity
                      key={limit}
                      onPress={() => setWordLimit(limit)}
                      style={[
                        styles.limitBtn,
                        {
                          backgroundColor: active ? colors.accent : colors.secondary,
                          borderColor: active ? "transparent" : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.limitBtnText,
                          { color: active ? "#fff" : colors.mutedForeground },
                        ]}
                      >
                        {limit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* RAG Context */}
            <View style={[styles.configBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.accent }]}>Evaluation Context (RAG)</Text>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIncludeNotes(!includeNotes)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: includeNotes ? colors.accent : colors.secondary,
                      borderColor: includeNotes ? colors.accent : colors.border,
                    },
                  ]}
                >
                  {includeNotes && <Feather name="check" size={14} color="#fff" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.foreground }]}>
                  Include my Notes for this topic
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIncludeCurrentAffairs(!includeCurrentAffairs)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: includeCurrentAffairs ? colors.accent : colors.secondary,
                      borderColor: includeCurrentAffairs ? colors.accent : colors.border,
                    },
                  ]}
                >
                  {includeCurrentAffairs && <Feather name="check" size={14} color="#fff" />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.foreground }]}>
                  Include Current Affairs context
                </Text>
              </TouchableOpacity>
            </View>

            {/* The Actual Input */}
            {inputType === "upload" ? (
              imageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
                  <TouchableOpacity
                    style={[styles.replaceBtn, { backgroundColor: colors.background }]}
                    onPress={() => setImageUri(null)}
                  >
                    <Feather name="x" size={20} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Feather name="file-text" size={48} color={colors.muted} style={{ marginBottom: 16 }} />
                  <Text style={[styles.uploadBoxTitle, { color: colors.accent }]}>Capture Handwriting</Text>
                  
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                    <TouchableOpacity
                      onPress={captureFromCamera}
                      style={[styles.captureBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Feather name="camera" size={20} color={colors.primary} />
                      <Text style={[styles.captureBtnText, { color: colors.foreground }]}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={pickFromLibrary}
                      style={[styles.captureBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Feather name="image" size={20} color={colors.accent} />
                      <Text style={[styles.captureBtnText, { color: colors.foreground }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            ) : (
              <View style={[styles.textBoxWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  value={answerText}
                  onChangeText={setAnswerText}
                  style={[styles.textBox, { color: colors.foreground }]}
                  placeholder="Type your complete essay answer here..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  textAlignVertical="top"
                />
                <View style={[styles.wordCountRow, { backgroundColor: colors.secondary, borderTopColor: colors.border }]}>
                  <Text style={[styles.wordCountText, { color: colors.mutedForeground }]}>
                    {answerText.length === 0 ? 0 : answerText.trim().split(/\s+/).length} / {wordLimit} words
                  </Text>
                </View>
              </View>
            )}

            {/* Run Evaluation Button */}
            <TouchableOpacity
              onPress={evaluateAnswer}
              disabled={isEvaluating}
              style={[
                styles.evalBtn,
                { backgroundColor: colors.foreground },
                isEvaluating && { opacity: 0.7 },
              ]}
            >
              {isEvaluating ? (
                <>
                  <ActivityIndicator color={colors.background} size="small" />
                  <Text style={[styles.evalBtnText, { color: colors.background }]}>Deep Scanning Vault...</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.evalBtnText, { color: colors.background }]}>Run UPSC Evaluation</Text>
                  <Feather name="check-circle" size={20} color={colors.background} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* History Section */}
        {evaluations.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Feather name="clock" size={24} color={colors.accent} />
              <Text style={[styles.historyTitle, { color: colors.foreground }]}>Evaluation History</Text>
            </View>

            <View style={[styles.historyTable, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {evaluations.map((hist, index) => {
                const sColor = getScoreColor(hist.totalScore, hist.maxScore);
                return (
                  <View
                    key={hist.id}
                    style={[
                      styles.historyRow,
                      { borderBottomColor: index === evaluations.length - 1 ? "transparent" : colors.border },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[styles.historyRowTitle, { color: colors.foreground }]} numberOfLines={2}>
                        {hist.question}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Pill label={`Target: ${hist.wordCount}`} color="#8B5A2B" background="#F3EFE9" />
                        <View style={[styles.inputTypePill, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                          <Feather name={hist.imageUri ? "image" : "pen-tool"} size={12} color={colors.accent} />
                          <Text style={[styles.inputTypePillText, { color: colors.mutedForeground }]}>
                            {hist.imageUri ? "Handwritten" : "Typed"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
                      <View style={[styles.scoreBox, { backgroundColor: sColor + "15" }]}>
                        <Text style={[styles.scoreText, { color: sColor }]}>
                          {hist.totalScore} <Text style={{ fontSize: 10, opacity: 0.6 }}>/ {hist.maxScore}</Text>
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.reassessBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => router.push(`/mains-result/${hist.id}` as never)}
                    >
                      <Text style={[styles.reassessText, { color: colors.accent }]}>View Result</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    marginBottom: 24,
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
  },
  panel: {
    marginHorizontal: 24,
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    marginBottom: 32,
  },
  panelHeader: {
    flexDirection: "column",
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    paddingBottom: 24,
  },
  panelTitle: {
    fontFamily: "Inter_900Black",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  toggleWrap: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleBtn: {
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
  toggleBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  label: {
    fontFamily: "Inter_900Black",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  inputArea: {
    height: 140,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  configBox: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  limitRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  limitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  limitBtnText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  uploadBox: {
    height: 280,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  uploadBoxTitle: {
    fontFamily: "Inter_900Black",
    fontSize: 18,
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  captureBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  imagePreviewWrap: {
    height: 280,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  replaceBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  textBoxWrap: {
    height: 280,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  textBox: {
    flex: 1,
    padding: 24,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    lineHeight: 24,
  },
  wordCountRow: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: "flex-end",
  },
  wordCountText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
  },
  evalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  evalBtnText: {
    fontFamily: "Inter_900Black",
    fontSize: 18,
  },
  historySection: {
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 32,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  historyTitle: {
    fontFamily: "Inter_900Black",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  historyTable: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  historyRow: {
    flexDirection: "column",
    gap: 16,
    padding: 20,
    borderBottomWidth: 1,
  },
  historyRowTitle: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 16,
    lineHeight: 22,
  },
  inputTypePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  inputTypePillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
  },
  scoreBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  scoreText: {
    fontFamily: "Inter_900Black",
    fontSize: 16,
  },
  reassessBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  reassessText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
