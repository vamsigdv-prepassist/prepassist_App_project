import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { Card, SectionHeader, Pill } from "@/components/ui";

const { width } = Dimensions.get("window");

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { quizzes } = useApp();

  const [activeFilter, setActiveFilter] = useState<string>("All Sources");
  const [showDropdown, setShowDropdown] = useState(false);

  const filters = ["All Sources", "AI Prelims", "Question Bank", "PDF Quiz"];

  const filteredQuizzes = useMemo(() => {
    const completed = quizzes.filter((q) => q.completed);
    if (activeFilter === "All Sources") return completed;
    if (activeFilter === "AI Prelims") return completed.filter((q) => q.source === "topic"); // Approximation
    if (activeFilter === "PDF Quiz") return completed.filter((q) => q.source === "pdf");
    return []; // Question Bank not fully implemented natively yet
  }, [quizzes, activeFilter]);

  const stats = useMemo(() => {
    const totalTests = filteredQuizzes.length;
    let totalQuestions = 0;
    let totalCorrect = 0;

    filteredQuizzes.forEach((q) => {
      totalQuestions += q.questions.length;
      totalCorrect += q.score;
    });

    const totalWrong = totalQuestions - totalCorrect;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return { totalTests, totalQuestions, totalCorrect, totalWrong, accuracy };
  }, [filteredQuizzes]);

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        
        <View style={s.header}>
          <Pill label="Performance Telemetry" icon="activity" color={colors.accent} background={colors.accent + "1A"} />
          <Text style={[s.title, { color: colors.foreground }]}>
            Cumulative <Text style={{ color: colors.accent }}>Progress.</Text>
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Lifetime accuracy modeling aggregated across all historically processed modules.
          </Text>
        </View>

        {/* Master Metrics Grid */}
        <View style={s.metricsGrid}>
          <MetricCard
            title="Exams"
            value={stats.totalTests}
            icon="cpu"
            color={colors.primary}
            colors={colors}
          />
          <MetricCard
            title="Accuracy"
            value={`${stats.accuracy}%`}
            icon="target"
            color={colors.accent}
            colors={colors}
          />
          <MetricCard
            title="Correct"
            value={stats.totalCorrect}
            icon="check-circle"
            color={colors.success}
            colors={colors}
          />
          <MetricCard
            title="Missed"
            value={stats.totalWrong}
            icon="x-circle"
            color={colors.destructive}
            colors={colors}
          />
        </View>

        {/* Source Filters Dropdown */}
        <View style={{ zIndex: 10, marginBottom: 24 }}>
          <TouchableOpacity 
            style={[s.dropdownHeader, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => setShowDropdown(!showDropdown)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="filter" size={16} color={colors.accent} />
              <Text style={[s.dropdownHeaderText, { color: colors.foreground }]}>Source: {activeFilter}</Text>
            </View>
            <Feather name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          
          {showDropdown && (
            <View style={[s.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {filters.map((f, i) => (
                <TouchableOpacity 
                  key={f} 
                  style={[
                    s.dropdownItem, 
                    { borderBottomColor: colors.border },
                    i === filters.length - 1 && { borderBottomWidth: 0 }
                  ]} 
                  onPress={() => { setActiveFilter(f); setShowDropdown(false); }}
                >
                  <Text style={[s.dropdownItemText, { color: activeFilter === f ? colors.accent : colors.foreground }]}>{f}</Text>
                  {activeFilter === f && <Feather name="check" size={18} color={colors.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <SectionHeader title="Chronological History" />
        
        {filteredQuizzes.length === 0 ? (
          <View style={[s.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="target" size={32} color={colors.mutedForeground} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              No historical data found for {activeFilter}.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredQuizzes.map((q) => {
              const accuracy = q.questions.length > 0 ? Math.round((q.score / q.questions.length) * 100) : 0;
              const wrong = q.questions.length - q.score;

              return (
                <Card key={q.id}>
                  <View style={s.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.historyTopic, { color: colors.foreground }]}>{q.topic}</Text>
                      <Text style={[s.historySub, { color: colors.mutedForeground }]}>
                        {q.questions.length} Queries • {Math.round(q.durationSec)}s
                      </Text>
                    </View>
                    
                    <View style={s.historyStatsBox}>
                      <View style={s.statCol}>
                        <Text style={[s.statColLabel, { color: colors.accent }]}>ACC</Text>
                        <Text style={[s.statColValue, { color: colors.accent }]}>{accuracy}%</Text>
                      </View>
                      <View style={s.statCol}>
                        <Text style={[s.statColLabel, { color: colors.success }]}>HIT</Text>
                        <Text style={[s.statColValue, { color: colors.success }]}>{q.score}</Text>
                      </View>
                      <View style={s.statCol}>
                        <Text style={[s.statColLabel, { color: colors.destructive }]}>MISS</Text>
                        <Text style={[s.statColValue, { color: colors.destructive }]}>{wrong}</Text>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function MetricCard({ title, value, icon, color, colors }: any) {
  return (
    <View style={[s.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={[s.metricValue, { color: colors.foreground }]}>{value}</Text>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[s.metricLabel, { color: colors.mutedForeground }]}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    marginBottom: 24,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -1,
    marginTop: 12,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
    lineHeight: 22,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: (width - 52) / 2, // 20 padding each side (40) + 12 gap = 52
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
  },

  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  dropdownHeaderText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dropdownMenu: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 20,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownItemText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  historyTopic: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  historySub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  historyStatsBox: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: 10,
    borderRadius: 12,
  },
  statCol: {
    alignItems: "center",
  },
  statColLabel: {
    fontSize: 9,
    fontFamily: "Inter_800ExtraBold",
    marginBottom: 2,
  },
  statColValue: {
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
  },
});
