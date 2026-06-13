import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";


import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { Card, Button, Pill, GradientButton } from "@/components/ui";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const AVAILABLE_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#6366F1",
  "#A855F7", "#14B8A6", "#F43F5E", "#06B6D4"
];

const formatDateStr = (year: number, month: number, day: number) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { calendarTasks, addCalendarTask, removeCalendarTask, customSubjects } = useApp();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState(formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubject, setTaskSubject] = useState("Polity");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) return dayNumber;
    return null;
  });

  const selectedTasks = useMemo(() => {
    return calendarTasks.filter(t => t.dateStr === selectedDateStr);
  }, [calendarTasks, selectedDateStr]);

  const saveTask = () => {
    if (!taskTitle.trim()) return;

    // Assign a deterministic color based on subject length
    const color = AVAILABLE_COLORS[taskSubject.length % AVAILABLE_COLORS.length];

    addCalendarTask({
      title: taskTitle.trim(),
      subject: taskSubject,
      dateStr: selectedDateStr,
      color,
    });

    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTaskTitle("");
    setIsModalOpen(false);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Pill label="Master Study Planner" icon="calendar" color={colors.primary} background={colors.primary + "1A"} />
          <Text style={[s.title, { color: colors.foreground }]}>
            Study <Text style={{ color: colors.primary }}>Calendar.</Text>
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Map objectives directly to your calendar to stay on track.
          </Text>
        </View>

        {/* Calendar UI */}
        <View style={[s.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Controls */}
          <View style={[s.calHeader, { borderBottomColor: colors.border, backgroundColor: colors.muted }]}>
            <View>
              <Text style={[s.monthText, { color: colors.foreground }]}>{MONTH_NAMES[month]}</Text>
              <Text style={[s.yearText, { color: colors.primary }]}>{year}</Text>
            </View>
            <View style={s.calControls}>
              <TouchableOpacity onPress={handlePrevMonth} style={s.iconBtn}>
                <Feather name="chevron-left" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={goToToday} style={[s.todayBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.todayBtnText, { color: colors.foreground }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNextMonth} style={s.iconBtn}>
                <Feather name="chevron-right" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Grid */}
          <View style={s.grid}>
            {/* Weekdays */}
            <View style={s.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={[s.weekdayText, { color: colors.mutedForeground }]}>{w}</Text>
              ))}
            </View>

            {/* Days */}
            <View style={s.daysGrid}>
              {days.map((d, i) => {
                if (!d) return <View key={`empty-${i}`} style={s.dayCell} />;

                const dStr = formatDateStr(year, month, d);
                const isSelected = dStr === selectedDateStr;
                const isTodayStr = dStr === formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

                const tasksForDay = calendarTasks.filter(t => t.dateStr === dStr);

                return (
                  <TouchableOpacity
                    key={dStr}
                    style={[
                      s.dayCell,
                      isSelected && { backgroundColor: colors.primary + "15", borderRadius: 12 },
                    ]}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                      setSelectedDateStr(dStr);
                    }}
                  >
                    <View style={[
                      s.dayNumBox,
                      isTodayStr && { backgroundColor: colors.primary },
                      isSelected && !isTodayStr && { borderColor: colors.primary, borderWidth: 1 }
                    ]}>
                      <Text style={[
                        s.dayText,
                        { color: isTodayStr ? "#fff" : (isSelected ? colors.primary : colors.foreground) }
                      ]}>
                        {d}
                      </Text>
                    </View>

                    {/* Dots */}
                    <View style={s.dotsRow}>
                      {tasksForDay.slice(0, 3).map((t, idx) => (
                        <View key={idx} style={[s.dot, { backgroundColor: t.color }]} />
                      ))}
                      {tasksForDay.length > 3 && (
                        <Text style={{ fontSize: 8, color: colors.mutedForeground, marginLeft: 1 }}>+</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Selected Day Details */}
        <View style={s.agendaSection}>
          <View style={s.agendaHeader}>
            <View>
              <Text style={[s.agendaTitle, { color: colors.foreground }]}>
                {selectedDateStr === formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()) ? "Today's Agenda" : "Selected Agenda"}
              </Text>
              <Text style={[s.agendaSub, { color: colors.mutedForeground }]}>{selectedDateStr}</Text>
            </View>
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync();
                setIsModalOpen(true);
              }}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={s.addBtnText}>Task</Text>
            </TouchableOpacity>
          </View>

          {selectedTasks.length === 0 ? (
            <View style={[s.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No tasks scheduled for this day.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {selectedTasks.map(t => (
                <View key={t.id} style={[s.taskCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[s.taskColorBar, { backgroundColor: t.color }]} />
                  <View style={s.taskContent}>
                    <Text style={[s.taskSubject, { color: t.color }]}>{t.subject}</Text>
                    <Text style={[s.taskTitle, { color: colors.foreground }]}>{t.title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeCalendarTask(t.id)} style={s.delBtn}>
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={[s.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[s.modalContent, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>New Mission</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={[s.inputLabel, { color: colors.foreground }]}>Mission Title</Text>
              <TextInput
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="e.g. Revise Fundamental Rights"
                placeholderTextColor={colors.mutedForeground}
                style={[s.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              />

              <Text style={[s.inputLabel, { color: colors.foreground, marginTop: 16 }]}>Subject</Text>
              <View style={s.subjectRow}>
                {["Polity", "Economy", "History", "Geography", ...customSubjects].slice(0, 8).map(sub => (
                  <TouchableOpacity
                    key={sub}
                    onPress={() => setTaskSubject(sub)}
                    style={[
                      s.subBadge,
                      {
                        backgroundColor: taskSubject === sub ? colors.primary : colors.card,
                        borderColor: taskSubject === sub ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <Text style={[s.subBadgeText, { color: taskSubject === sub ? "#fff" : colors.mutedForeground }]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <GradientButton
                label="Map to Calendar"
                icon="target"
                onPress={saveTask}
                style={{ marginTop: 32 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    padding: 20,
    paddingBottom: 10,
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

  calendarCard: {
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  monthText: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
  },
  yearText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  calControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 8,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  todayBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },

  grid: {
    padding: 10,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.8,
    alignItems: "center",
    paddingTop: 4,
  },
  dayNumBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    marginTop: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  agendaSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  agendaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  agendaTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  agendaSub: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  taskColorBar: {
    width: 6,
    height: "100%",
  },
  taskContent: {
    flex: 1,
    padding: 16,
  },
  taskSubject: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  delBtn: {
    padding: 16,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    minHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  subjectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  subBadgeText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
