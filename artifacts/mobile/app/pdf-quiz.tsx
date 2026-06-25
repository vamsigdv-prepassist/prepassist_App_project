import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
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
import { useAuth } from "@/contexts/AuthContext";
import { auth, db, storage } from "@/lib/firebase";
import { doc, updateDoc, increment, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";

const MAX_OPTIONS = [50, 100, 150] as const;

const UPSC_TIPS = [
  "Strategy: Link static concepts with dynamic current affairs for GS success.",
  "Did you know? UPSC Prelims tests application, not just memory recall.",
  "Exam Hack: Eliminate two options first — it works 80% of the time.",
  "Consistency: 6 hours of focused study beats 12 hours of passive reading.",
  "Tip: Revise 3× — without revision, retention drops below 20% within a week.",
  "Every wrong answer in practice is one less mistake in the actual exam.",
  "Analytical Insight: Study WHY wrong options are wrong, not just the correct one.",
  "UPSC rewards precision — a single word in the question can flip the answer.",
  "PDF is being chunked and processed in parallel — every page is being scanned.",
  "Questions near the end of the PDF are being extracted too, not just the first page.",
];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const b64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function PdfQuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addQuiz } = useApp();
  const { profile } = useAuth();
  const isWeb = Platform.OS === "web";

  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number>(0);
  const [maxQuestions, setMaxQuestions] = useState<(typeof MAX_OPTIONS)[number]>(100);
  const [processing, setProcessing] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const tipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (processing) {
      setTipIndex(0);
      tipTimerRef.current = setInterval(() => {
        setTipIndex((i) => (i + 1) % UPSC_TIPS.length);
      }, 3_500);
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

      setPdfUri(asset.uri);
      setPdfName(asset.name);
      setPdfBase64(null); // we drop base64 processing here natively
      setPdfSize(asset.size ?? 0);
    } catch {
      Alert.alert("Error", "Could not read the PDF. Please try another file.");
    }
  };

  const handleExtract = async () => {
    if (!pdfUri) return;

    if (!profile || profile.credits < 5) {
      Alert.alert(
        "Insufficient AI Credits",
        "This operation requires 5 AI Credits. Please upgrade to Pro to continue.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/pricing" as never) }
        ]
      );
      return;
    }

    setProcessing(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error("Must be logged in.");

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const storageRef = ref(storage, `extract-quiz/${userId}/English/${jobId}.pdf`);

      // 1. Convert URI to blob natively
      const res = await fetch(pdfUri);
      const blob = await res.blob();

      // 2. Upload directly to Storage (bypassing Vercel limits natively)
      const uploadTask = uploadBytesResumable(storageRef, blob);
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          null, 
          (error) => reject(error), 
          () => resolve(true)
        );
      });

      // 3. Listen to Firestore quiz_jobs collection
      const rawQuestions = await new Promise<any[]>((resolve, reject) => {
        const unsubscribe = onSnapshot(doc(db, 'quiz_jobs', jobId), (docSnap) => {
          if (docSnap.exists()) {
            const jobData = docSnap.data();
            if (jobData.status === 'COMPLETE') {
              unsubscribe();
              resolve(jobData.results || []);
            } else if (jobData.status === 'FAILED') {
              unsubscribe();
              reject(new Error(jobData.error || "Quiz Extraction failed in Cloud Logic."));
            }
          }
        });
      });

      const questions = rawQuestions.map((q) => {
        const mappedOptions = Array.isArray(q.options) 
           ? q.options.map((o: any) => o.text || String(o)) 
           : [];
           
        let correctIndex = 0;
        if (q.correctOptionId) {
            const idx = Array.isArray(q.options) ? q.options.findIndex((o: any) => o.id === q.correctOptionId) : -1;
            if (idx !== -1) {
                correctIndex = idx;
            } else if (typeof q.correctOptionId === 'string' && q.correctOptionId.length === 1) {
                correctIndex = q.correctOptionId.charCodeAt(0) - 97; // 'a' is 0
            }
        }
        
        return {
           id: Math.random().toString(36).substring(7),
           prompt: q.questionText || q.prompt || "Question",
           options: mappedOptions,
           correctIndex: Math.max(0, correctIndex),
           explanation: q.explanation || "No explanation provided.",
           subtopic: q.subtopic || "Generated"
        };
      });

      if (!questions.length) {
        Alert.alert(
          "No questions found",
          "The AI couldn't find any MCQs in this PDF. Make sure it contains text-based questions (not a scanned image).",
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

      if (auth.currentUser) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          credits: increment(-5)
        });
      }

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
          <Feather name="x" size={18} color={colors.foreground} />
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
            Scans every page — extracts all MCQs in parallel
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
              Scanning all pages…
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 12,
                lineHeight: 21,
                maxWidth: 300,
              }}
            >
              The PDF is being chunked and each section processed in parallel.
              Every question — from page 1 to the last page — will be captured.
            </Text>

            {/* Live status pills */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 28,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {["Extracting text", "Chunking pages", "Running AI in parallel", "Deduplicating"].map(
                (step) => (
                  <View
                    key={step}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      backgroundColor: colors.primary + "12",
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <ActivityIndicator color={colors.primary} size="small" style={{ transform: [{ scale: 0.6 }] }} />
                    <Text
                      style={{
                        color: colors.primary,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 11,
                      }}
                    >
                      {step}
                    </Text>
                  </View>
                ),
              )}
            </View>

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

            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginTop: 20,
                textAlign: "center",
              }}
            >
              This may take 30–60 seconds for large question papers.{"\n"}Please
              keep the app open.
            </Text>
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
                    Full-paper extraction
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      lineHeight: 19,
                    }}
                  >
                    The PDF is chunked page-by-page and each chunk is processed
                    in parallel — so all 100 questions (or however many the paper
                    has) are captured, not just those on the first few pages.
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
                  borderColor: pdfName ? colors.primary + "60" : colors.border,
                  borderRadius: 20,
                  padding: 28,
                  alignItems: "center",
                  backgroundColor: pdfName ? colors.primary + "06" : colors.card,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 18,
                    backgroundColor: pdfName
                      ? colors.primary + "15"
                      : colors.secondary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather
                    name={pdfName ? "file-text" : "upload-cloud"}
                    size={26}
                    color={pdfName ? colors.primary : colors.mutedForeground}
                  />
                </View>

                {pdfName ? (
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
                      Test series papers · Question banks · Previous year papers
                    </Text>
                  </>
                )}
              </View>
            </Pressable>

            {/* Max questions cap */}
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 0.6,
                marginBottom: 4,
              }}
            >
              MAX QUESTIONS CAP
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              All questions found in the PDF will be extracted — cap only limits
              the final count.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {MAX_OPTIONS.map((cap) => {
                const active = maxQuestions === cap;
                return (
                  <Pressable
                    key={cap}
                    onPress={() => setMaxQuestions(cap)}
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
                      {cap === 150 ? "All" : cap}
                    </Text>
                    <Text
                      style={{
                        color: active ? colors.primary : colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      {cap === 150 ? "up to 150" : "questions"}
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
                "Use text-based PDFs — scanned images or camera photos of papers won't work.",
                "Both digital question banks and copy-pasted test series papers work well.",
                "Bilingual PDFs: the AI automatically isolates and extracts the English version.",
                "Answer keys at the end of the PDF are detected and used automatically.",
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
              label={pdfName ? "Extract All Questions" : "Select a PDF first"}
              icon="zap"
              onPress={handleExtract}
              disabled={!pdfName}
              size="lg"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
