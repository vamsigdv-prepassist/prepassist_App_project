import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, GradientButton, Pill } from "@/components/ui";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { extractQuizFromPdf } from "@/lib/ai";

const COUNTS = [10, 20, 30];

const UPSC_TIPS = [
  "Strategy: Link static concepts with dynamic current affairs for GS success.",
  "Did you know? UPSC Prelims tests application, not just memory recall.",
  "Exam Hack: Eliminate two options first — it works 80% of the time.",
  "Consistency: 6 hours of focused study beats 12 hours of passive reading.",
  "Tip: Revise 3× — without revision, retention drops below 20% within a week.",
  "Every wrong answer in practice is one less mistake in the actual exam.",
  "Analytical Insight: Study WHY wrong options are wrong, not just the correct one.",
  "UPSC rewards precision — a single word in the question can flip the answer.",
];

export default function PdfQuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addQuiz } = useApp();
  const isWeb = Platform.OS === "web";

  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number>(0);
  const [count, setCount] = useState(15);
  const [processing, setProcessing] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const tipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (processing) {
      setTipIndex(0);
      tipTimerRef.current = setInterval(() => {
        setTipIndex((i) => (i + 1) % UPSC_TIPS.length);
      }, 3500);
    } else {
      if (tipTimerRef.current) {
        clearInterval(tipTimerRef.current);
        tipTimerRef.current = null;
      }
    }
    return () => {
      if (tipTimerRef.current) clearInterval(tipTimerRef.current);
    };
  }, [processing]);

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0]!;
      if (!FileSystem.readAsStringAsync) {
        Alert.alert("Not supported", "PDF picking is not supported on web.");
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setPdfName(asset.name);
      setPdfBase64(base64);
      setPdfSize(asset.size ?? 0);
    } catch {
      Alert.alert("Error", "Could not read the PDF. Please try another file.");
    }
  };

  const handleExtract = async () => {
    if (!pdfBase64) return;
    setProcessing(true);
    try {
      const questions = await extractQuizFromPdf(pdfBase64, count);
      if (!questions.length) {
        Alert.alert(
          "No questions found",
          "The AI couldn't extract MCQs from this PDF. Make sure it contains text-based content (not a scanned image).",
        );
        return;
      }
      const quiz = addQuiz({
        topic: pdfName?.replace(/\.pdf$/i, "") ?? "PDF Quiz",
        source: "pdf",
        questions,
        answers: questions.map(() => null),
        score: 0,
        durationSec: 0,
        completed: false,
      });
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.replace({
        pathname: "/quiz-session",
        params: { id: quiz.id },
      } as never);
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.length < 300 ? err.message : "";
      Alert.alert(
        "Extraction failed",
        msg || "Something went wrong. Check your connection and try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + (isWeb ? 67 : 16),
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => !processing && router.back()}
          hitSlop={10}
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            backgroundColor: colors.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_800ExtraBold",
              fontSize: 20,
              letterSpacing: -0.5,
            }}
          >
            PDF Quiz Extractor
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              marginTop: 1,
            }}
          >
            Upload a test series paper to start a quiz instantly
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {processing ? (
          /* ── Processing state ── */
          <View style={{ alignItems: "center", paddingTop: 48, paddingBottom: 32 }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 999,
                backgroundColor: colors.primary + "15",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <ActivityIndicator color={colors.primary} size="large" />
            </View>

            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_800ExtraBold",
                fontSize: 22,
                letterSpacing: -0.5,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Analysing your PDF…
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 32,
                lineHeight: 21,
                maxWidth: 300,
              }}
            >
              Extracting MCQs and building your quiz session. This usually
              takes 15–30 seconds.
            </Text>

            {/* Rotating UPSC tip */}
            <Card>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: colors.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  <Feather name="zap" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: "Inter_700Bold",
                      fontSize: 10,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    UPSC Insight
                  </Text>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                      lineHeight: 21,
                    }}
                  >
                    {UPSC_TIPS[tipIndex]}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        ) : (
          /* ── Upload state ── */
          <>
            {/* How it works */}
            <Card style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: colors.primary + "15",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="cpu" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 14,
                      marginBottom: 5,
                    }}
                  >
                    How it works
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      lineHeight: 19,
                    }}
                  >
                    Upload any test series PDF or question bank. The AI reads
                    the document, extracts existing MCQs (or generates UPSC-grade
                    ones from the content), and launches a full quiz session with
                    explanations for every answer.
                  </Text>
                </View>
              </View>
            </Card>

            {/* PDF picker */}
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 0.6,
                marginBottom: 8,
              }}
            >
              PDF DOCUMENT
            </Text>
            <Pressable
              onPress={pickPdf}
              style={({ pressed }) => ({
                transform: pressed ? [{ scale: 0.99 }] : [],
                marginBottom: 20,
              })}
            >
              <View
                style={{
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: pdfBase64 ? colors.primary + "60" : colors.border,
                  borderRadius: 20,
                  padding: 28,
                  alignItems: "center",
                  backgroundColor: pdfBase64 ? colors.primary + "06" : colors.card,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    backgroundColor: pdfBase64
                      ? colors.primary + "15"
                      : colors.secondary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name={pdfBase64 ? "file-text" : "upload-cloud"}
                    size={26}
                    color={pdfBase64 ? colors.primary : colors.mutedForeground}
                  />
                </View>

                {pdfBase64 ? (
                  <>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                        textAlign: "center",
                        maxWidth: 260,
                      }}
                      numberOfLines={2}
                    >
                      {pdfName}
                    </Text>
                    <Pill
                      label={`${(pdfSize / 1024).toFixed(0)} KB · Tap to change`}
                      color={colors.primary}
                      background={colors.primary + "12"}
                    />
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 16,
                        textAlign: "center",
                      }}
                    >
                      Tap to upload PDF
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                        textAlign: "center",
                        lineHeight: 18,
                        maxWidth: 260,
                      }}
                    >
                      Test series papers, question banks, previous year papers
                    </Text>
                  </>
                )}
              </View>
            </Pressable>

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
              MAX QUESTIONS TO EXTRACT
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {COUNTS.map((c) => {
                const active = count === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCount(c)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + "10" : colors.card,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.primary : colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 20,
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
                      questions
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Tips box */}
            <View
              style={{
                backgroundColor: colors.secondary,
                borderRadius: 16,
                padding: 16,
                gap: 10,
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 11,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Tips for best results
              </Text>
              {[
                "Use text-based PDFs — scanned images or photos of papers are not supported.",
                "Question banks and previous year papers work best.",
                "Bilingual PDFs: the AI automatically extracts the English version only.",
              ].map((tip, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: colors.primary + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontFamily: "Inter_700Bold",
                        fontSize: 10,
                      }}
                    >
                      {i + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                      fontSize: 13,
                      flex: 1,
                      lineHeight: 19,
                    }}
                  >
                    {tip}
                  </Text>
                </View>
              ))}
            </View>

            <GradientButton
              label={pdfBase64 ? "Extract & Start Quiz" : "Select a PDF first"}
              icon="zap"
              onPress={handleExtract}
              disabled={!pdfBase64}
              size="lg"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
