import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FlashcardCarousel from "@/components/FlashcardCarousel";
import { Card, Pill, ProgressBar, SectionHeader } from "@/components/ui";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";


const QUICK_ACTIONS = [
  {
    id: "current-affairs",
    title: "Current Affairs",
    subtitle: "AI mapped daily news",
    icon: "globe" as const,
    color: "#4F39F6",
    route: "/current-affairs" as const,
  },
  {
    id: "evaluate",
    title: "AI Mains Evaluation",
    subtitle: "Capture handwritten essays & get graded",
    icon: "edit-3" as const,
    color: "#D946EF",
    route: "/evaluate-mains" as const,
  },
  {
    id: "mains-bank",
    title: "Mains Answer Bank",
    subtitle: "Study historically accurate descriptive model answers",
    icon: "book-open" as const,
    color: "#06B6D4",
    route: "/mains-bank" as const,
  },
  {
    id: "quiz",
    title: "AI Prelims Engine",
    subtitle: "Generate dynamic MCQs",
    icon: "zap" as const,
    color: "#F59E0B",
    route: "/(tabs)/quiz" as const,
  },
  {
    id: "pdf-quiz",
    title: "PDF Quiz Extractor",
    subtitle: "Extract MCQs directly from test series PDFs",
    icon: "upload-cloud" as const,
    color: "#4F39F6",
    route: "/pdf-quiz" as const,
  },
  {
    id: "xray",
    title: "X-Ray Reader",
    subtitle: "Scan & analyze textbook pages",
    icon: "aperture" as const,
    color: "#EC4899",
    route: "/xray" as const,
  },
  {
    id: "mentor",
    title: "AI Mentor",
    subtitle: "Real-time UPSC Strategy & Doubt Clearing",
    icon: "cpu" as const,
    color: "#8B5CF6",
    route: "/ai-mentor" as const,
  },
  {
    id: "progress",
    title: "Progress Tracker",
    subtitle: "Cumulative Exam Telemetry",
    icon: "bar-chart-2" as const,
    color: "#10B981",
    route: "/progress" as const,
  },
  {
    id: "calendar",
    title: "Study Calendar",
    subtitle: "Map objectives & plan missions",
    icon: "calendar" as const,
    color: "#3B82F6",
    route: "/calendar" as const,
  },
  {
    id: "mindmaps",
    title: "Mindmap Engine",
    subtitle: "Cognitive Topography",
    icon: "share-2" as const,
    color: "#F59E0B",
    route: "/mindmaps" as const,
  },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { userName, targetExam, streakDays, documents, evaluations, quizzes, weeklyStudyData } =
    useApp();

  const stats = useMemo(() => {
    const completedQuizzes = quizzes.filter((q) => q.completed);
    const accuracySum = completedQuizzes.reduce(
      (s, q) => s + (q.questions.length ? q.score / q.questions.length : 0),
      0,
    );
    const accuracy = completedQuizzes.length
      ? Math.round((accuracySum / completedQuizzes.length) * 100)
      : 0;
    const avgEval = evaluations.length
      ? Math.round(
          (evaluations.reduce(
            (s, e) => s + (e.totalScore / e.maxScore) * 100,
            0,
          ) /
            evaluations.length) *
            10,
        ) / 10
      : 0;
      
    // Create an interesting "Neural Sync" score based on accuracy, eval, and streak
    const baseSync = 45;
    const dynamicSync = Math.min(100, Math.round(baseSync + (accuracy * 0.3) + (avgEval * 0.3) + streakDays));
    
    // Extract focus year or objective
    const yearMatch = targetExam.match(/\d{4}/);
    const focusArea = yearMatch ? yearMatch[0] : "Prelims";
    
    // Total AI missions completed
    const totalMissions = evaluations.length + completedQuizzes.length;

    return {
      neuralSync: `${dynamicSync}%`,
      missions: totalMissions.toString(),
      focusArea,
      accuracy,
      avgEval,
    };
  }, [evaluations, quizzes, streakDays, targetExam]);

  const recentActivity = useMemo(() => {
    type Item = {
      id: string;
      title: string;
      subtitle: string;
      icon: React.ComponentProps<typeof Feather>["name"];
      color: string;
      time: number;
    };
    const items: Item[] = [];
    evaluations.slice(0, 5).forEach((e) => {
      items.push({
        id: "eval-" + e.id,
        title: `${e.paper} · ${e.totalScore}/${e.maxScore}`,
        subtitle: e.question.slice(0, 70),
        icon: "edit-3",
        color: "#06B6D4",
        time: e.createdAt,
      });
    });
    quizzes.slice(0, 5).forEach((q) => {
      if (!q.completed) return;
      items.push({
        id: "quiz-" + q.id,
        title: `${q.topic} · ${q.score}/${q.questions.length}`,
        subtitle: `Prelims drill · ${Math.round(q.durationSec)}s`,
        icon: "zap",
        color: "#F59E0B",
        time: q.createdAt,
      });
    });
    return items.sort((a, b) => b.time - a.time).slice(0, 4);
  }, [evaluations, quizzes]);

  const weeklyData = useMemo(() => {
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    const result = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
      
      const found = weeklyStudyData?.find(w => w.dateStr === dateStr);
      result.push({
        label: days[d.getDay()],
        value: found ? found.studyMinutes : 0,
        isToday: i === 0
      });
    }
    return result;
  }, [weeklyStudyData]);


  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + (isWeb ? 67 : 8),
          paddingBottom: insets.bottom + (isWeb ? 110 : 100),
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                letterSpacing: 0.2,
              }}
            >
              {greeting()}, {userName}
            </Text>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_800ExtraBold",
                fontSize: 28,
                letterSpacing: -0.8,
                marginTop: 2,
              }}
            >
              {targetExam}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: colors.secondary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
              }}
            >
              <Feather name="zap" size={14} color="#F59E0B" />
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 13,
                }}
              >
                {streakDays}d
              </Text>
            </View>

            <Pressable onPress={() => router.push("/profile")}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Hero card */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View>
              <Pill
                label="PrepAssist V2"
                icon="cpu"
                color="#fff"
                background="rgba(255,255,255,0.18)"
              />
              <Text style={styles.heroTitle}>The ultimate AI engine for UPSC.</Text>
              <Text style={styles.heroSubtitle}>
                Synthesize syllabuses, automate Mains evaluation, and generate
                precision notes — built for rankers.
              </Text>
            </View>
            <View style={styles.heroStats}>
              <HeroStat label="Neural Sync" value={stats.neuralSync} />
              <View style={styles.heroDivider} />
              <HeroStat
                label="Missions"
                value={stats.missions}
              />
              <View style={styles.heroDivider} />
              <HeroStat
                label="Focus Area"
                value={stats.focusArea}
              />
            </View>
          </LinearGradient>
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader title="Capabilities" />
          <View style={{ gap: 10 }}>
            {QUICK_ACTIONS.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => router.push(a.route)}
                style={({ pressed }) => [
                  styles.actionRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    transform: pressed ? [{ scale: 0.99 }] : [],
                  },
                ]}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: a.color + "1A" },
                  ]}
                >
                  <Feather name={a.icon} size={20} color={a.color} />
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
                    {a.title}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 13,
                      marginTop: 2,
                    }}
                  >
                    {a.subtitle}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Flashcard carousel */}
        <FlashcardCarousel />

        {/* Weekly chart */}
        <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
          <SectionHeader title="This week" />
          <Card>
            <View style={styles.chartHeader}>
              <View>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  Study Time
                </Text>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_800ExtraBold",
                    fontSize: 30,
                    letterSpacing: -0.8,
                    marginTop: 2,
                  }}
                >
                  {(() => {
                    const totalMins = weeklyData.reduce((s, d) => s + d.value, 0);
                    const hrs = Math.floor(totalMins / 60);
                    const mins = totalMins % 60;
                    return (
                      <>
                        {hrs > 0 ? `${hrs}h ` : ""}
                        {mins}
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontFamily: "Inter_500Medium",
                            fontSize: 14,
                          }}
                        >
                          {hrs > 0 ? "m" : " min"}
                        </Text>
                      </>
                    );
                  })()}
                </Text>
              </View>
              <Pill label="+12%" icon="trending-up" color="#10B981" background="#10B98115" />
            </View>
            <View style={styles.chart}>
              {weeklyData.map((d, i) => {
                const max = Math.max(...weeklyData.map((w) => w.value));
                const h = Math.max(8, max === 0 ? 8 : (d.value / max) * 92);
                const isToday = d.isToday;
                return (
                  <View key={i} style={styles.chartBarCol}>
                    <View
                      style={{
                        height: h,
                        width: "70%",
                        borderRadius: 8,
                        backgroundColor: isToday
                          ? colors.primary
                          : colors.secondary,
                      }}
                    />
                    <Text
                      style={{
                        color: isToday
                          ? colors.primary
                          : colors.mutedForeground,
                        fontFamily: isToday
                          ? "Inter_700Bold"
                          : "Inter_500Medium",
                        fontSize: 11,
                        marginTop: 8,
                      }}
                    >
                      {d.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </View>

        {/* Syllabus progress */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader title="Syllabus coverage" />
          <Card>
            <SyllabusRow label="Polity" value={72} color="#4F39F6" />
            <SyllabusRow label="History" value={58} color="#06B6D4" />
            <SyllabusRow label="Geography" value={41} color="#F59E0B" />
            <SyllabusRow label="Economy" value={36} color="#EC4899" />
            <SyllabusRow
              label="Environment"
              value={29}
              color="#10B981"
              isLast
            />
          </Card>
        </View>

        {/* Recent activity */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <SectionHeader title="Recent activity" />
          {recentActivity.length === 0 ? (
            <Card>
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 24,
                  gap: 8,
                }}
              >
                <Feather
                  name="activity"
                  size={22}
                  color={colors.mutedForeground}
                />
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  Your evaluations and quiz attempts will appear here.
                </Text>
              </View>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {recentActivity.map((a) => (
                <Card key={a.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: a.color + "1A", width: 38, height: 38 },
                      ]}
                    >
                      <Feather name={a.icon} size={16} color={a.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_700Bold",
                          fontSize: 14,
                        }}
                      >
                        {a.title}
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          marginTop: 1,
                        }}
                        numberOfLines={1}
                      >
                        {a.subtitle}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 11,
                      }}
                    >
                      {timeAgo(a.time)}
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function SyllabusRow({
  label,
  value,
  color,
  isLast,
}: {
  label: string;
  value: number;
  color: string;
  isLast?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: isLast ? 0 : 14 }}>
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
          {label}
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 12,
          }}
        >
          {value}%
        </Text>
      </View>
      <ProgressBar value={value} color={color} />
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    gap: 18,
  },
  heroTitle: {
    color: "#fff",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 22,
    letterSpacing: -0.5,
    marginTop: 12,
    lineHeight: 28,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },
  heroDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "stretch",
    marginHorizontal: 6,
  },
  heroStatValue: {
    color: "#fff",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
  },
  chartBarCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
});
