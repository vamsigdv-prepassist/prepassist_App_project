import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CORE_SUBJECTS, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = DOMAIN ? `https://${DOMAIN}/api` : "/api";

interface CurrentAffair {
  id: string;
  title: string;
  source: string;
  content: string;
  tags: string[];
  publish_date: string;
  created_at: string;
}

const SOURCE_META: Record<string, { color: string; bg: string; short: string }> = {
  "The Hindu": { color: "#DC2626", bg: "#FEF2F2", short: "TH" },
  "Times of India": { color: "#2563EB", bg: "#EFF6FF", short: "TOI" },
  "PIB Release": { color: "#7C3AED", bg: "#F5F3FF", short: "PIB" },
  "PrepAssist Editorial": { color: "#059669", bg: "#ECFDF5", short: "PA" },
};

function sourceStyle(source: string) {
  return (
    SOURCE_META[source] ?? { color: "#4F39F6", bg: "#EEF2FF", short: "CA" }
  );
}

function isoToday(): string {
  return new Date().toISOString().split("T")[0]!;
}

function buildDateStrip(count = 60): { iso: string; day: number; month: string; weekday: string }[] {
  const result = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      iso: d.toISOString().split("T")[0]!,
      day: d.getDate(),
      month: d.toLocaleString("en-IN", { month: "short" }),
      weekday: d.toLocaleString("en-IN", { weekday: "short" }),
    });
  }
  return result;
}

function ArticleCard({
  article,
  onSave,
}: {
  article: CurrentAffair;
  onSave: (article: CurrentAffair) => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const meta = sourceStyle(article.source);

  return (
    <View style={[s.articleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={s.articleHeader}>
        <View style={[s.sourceBadge, { backgroundColor: meta.bg }]}>
          <Text style={[s.sourceText, { color: meta.color }]}>{article.source}</Text>
        </View>
        <TouchableOpacity
          style={[s.saveBtn, { borderColor: colors.primary + "40" }]}
          onPress={() => onSave(article)}
        >
          <Feather name="bookmark" size={13} color={colors.primary} />
          <Text style={[s.saveBtnText, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={[s.articleTitle, { color: colors.foreground }]}>
        {article.title}
      </Text>

      {/* Tags */}
      {article.tags?.length > 0 && (
        <View style={s.tagRow}>
          {article.tags.slice(0, 4).map((t, i) => (
            <View key={i} style={[s.tag, { backgroundColor: colors.primary + "12" }]}>
              <Text style={[s.tagText, { color: colors.primary }]}>#{t}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Content */}
      <Text
        style={[s.articleContent, { color: colors.mutedForeground }]}
        numberOfLines={expanded ? undefined : 4}
      >
        {article.content}
      </Text>

      {/* Expand toggle */}
      <TouchableOpacity
        style={s.expandBtn}
        onPress={() => {
          setExpanded((v) => !v);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Text style={[s.expandText, { color: colors.primary }]}>
          {expanded ? "Show less" : "Read more"}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
}

export default function CurrentAffairsScreen() {
  const colors = useColors();
  const { addTrackerNote, customSubjects, optionalSubject } = useApp();

  const dateStrip = useMemo(() => buildDateStrip(60), []);
  const [selectedDate, setSelectedDate] = useState<string>(isoToday());
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [datesLoaded, setDatesLoaded] = useState(false);

  const [articles, setArticles] = useState<CurrentAffair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [sourceFilter, setSourceFilter] = useState<string>("All");

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingArticle, setSavingArticle] = useState<CurrentAffair | null>(null);
  const [saveSubject, setSaveSubject] = useState(CORE_SUBJECTS[0]!);
  const [isSaving, setIsSaving] = useState(false);

  const allSubjects = useMemo(
    () => [
      ...CORE_SUBJECTS,
      ...(optionalSubject ? [optionalSubject] : []),
      ...customSubjects,
    ],
    [optionalSubject, customSubjects],
  );

  const flatRef = useRef<FlatList>(null);

  // Load available dates once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/current-affairs/dates?days=60`);
        if (res.ok) {
          const { dates } = (await res.json()) as { dates: string[] };
          setAvailableDates(new Set(dates));
        }
      } catch {
        // ignore
      } finally {
        setDatesLoaded(true);
      }
    })();
  }, []);

  // Load articles when date changes
  const fetchArticles = useCallback(async (date: string) => {
    setLoading(true);
    setError(false);
    setArticles([]);
    setSourceFilter("All");
    try {
      const res = await fetch(`${API_BASE}/current-affairs?date=${date}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { articles: CurrentAffair[] };
      setArticles(data.articles ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles(selectedDate);
  }, [selectedDate, fetchArticles]);

  const sources = useMemo(() => {
    const s = new Set(articles.map((a) => a.source));
    return ["All", ...Array.from(s)];
  }, [articles]);

  const filtered = useMemo(
    () =>
      sourceFilter === "All"
        ? articles
        : articles.filter((a) => a.source === sourceFilter),
    [articles, sourceFilter],
  );

  function handleSavePress(article: CurrentAffair) {
    setSavingArticle(article);
    setSaveSubject(CORE_SUBJECTS[0]!);
    setShowSaveModal(true);
  }

  function confirmSave() {
    if (!savingArticle) return;
    setIsSaving(true);
    addTrackerNote({
      title: savingArticle.title,
      content: `**Source:** ${savingArticle.source}\n**Date:** ${savingArticle.publish_date}\n\n${savingArticle.content}`,
      subject: saveSubject,
      tags: [...(savingArticle.tags ?? []), "current-affairs"],
      isStarred: false,
    });
    setIsSaving(false);
    setShowSaveModal(false);
    setSavingArticle(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved!", `"${savingArticle.title}" added to ${saveSubject} notes.`);
  }

  function formatHeaderDate(iso: string) {
    const d = new Date(iso + "T00:00:00");
    const today = isoToday();
    if (iso === today) return "Today";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (iso === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Current Affairs</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
            The Hindu · Times of India · PIB
          </Text>
        </View>
        {articles.length > 0 && (
          <View style={[s.countBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[s.countText, { color: colors.primary }]}>
              {filtered.length} article{filtered.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Date strip */}
      <View style={s.stripWrapper}>
        <FlatList
          ref={flatRef}
          data={dateStrip}
          keyExtractor={(d) => d.iso}
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.stripContent}
          renderItem={({ item }) => {
            const isSelected = item.iso === selectedDate;
            const hasContent = availableDates.has(item.iso);
            const isToday = item.iso === isoToday();
            return (
              <TouchableOpacity
                style={[
                  s.dateCell,
                  isSelected && { backgroundColor: colors.primary },
                  !isSelected && isToday && { borderWidth: 1.5, borderColor: colors.primary },
                  { borderRadius: 14 },
                ]}
                onPress={() => {
                  setSelectedDate(item.iso);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text
                  style={[
                    s.dateCellWeekday,
                    { color: isSelected ? "rgba(255,255,255,0.75)" : colors.mutedForeground },
                  ]}
                >
                  {item.weekday}
                </Text>
                <Text
                  style={[
                    s.dateCellDay,
                    { color: isSelected ? "#fff" : colors.foreground },
                    isToday && !isSelected && { color: colors.primary },
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    s.dateCellMonth,
                    { color: isSelected ? "rgba(255,255,255,0.75)" : colors.mutedForeground },
                  ]}
                >
                  {item.month}
                </Text>
                {datesLoaded && hasContent && !isSelected && (
                  <View style={[s.dot, { backgroundColor: colors.primary }]} />
                )}
                {isSelected && (
                  <View style={[s.dot, { backgroundColor: "rgba(255,255,255,0.7)" }]} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Source filter pills */}
      {sources.length > 1 && !loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filterScroll}
          contentContainerStyle={s.filterRow}
        >
          {sources.map((src) => {
            const active = sourceFilter === src;
            const meta = src === "All" ? null : sourceStyle(src);
            return (
              <TouchableOpacity
                key={src}
                style={[
                  s.filterPill,
                  {
                    backgroundColor: active
                      ? meta?.color ?? colors.primary
                      : colors.card,
                    borderColor: active
                      ? meta?.color ?? colors.primary
                      : colors.border,
                  },
                ]}
                onPress={() => setSourceFilter(src)}
              >
                <Text
                  style={[
                    s.filterPillText,
                    { color: active ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {src}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Date heading */}
      <View style={s.dateHeadingRow}>
        <Text style={[s.dateHeading, { color: colors.foreground }]}>
          {formatHeaderDate(selectedDate)}
        </Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.centeredState}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[s.stateText, { color: colors.mutedForeground }]}>
            Loading articles…
          </Text>
        </View>
      ) : error ? (
        <View style={s.centeredState}>
          <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
          <Text style={[s.stateText, { color: colors.mutedForeground }]}>
            Couldn't load articles
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => fetchArticles(selectedDate)}
          >
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.centeredState}>
          <View style={[s.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="file-text" size={34} color={colors.primary} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>
            No articles for this date
          </Text>
          <Text style={[s.stateText, { color: colors.mutedForeground }]}>
            The admin uploads The Hindu and TOI summaries daily. Check back soon.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <ArticleCard article={item} onSave={handleSavePress} />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Save to Notes Modal */}
      {showSaveModal && savingArticle && (
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSaveModal(false)}
            activeOpacity={1}
          />
          <View style={[s.modalSheet, { backgroundColor: colors.background }]}>
            <View style={[s.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              Save to Notes
            </Text>
            <Text style={[s.modalSub, { color: colors.mutedForeground }]} numberOfLines={2}>
              {savingArticle.title}
            </Text>

            <Text style={[s.modalLabel, { color: colors.mutedForeground }]}>
              Save under Subject
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.subjectRow}
              style={{ marginBottom: 20 }}
            >
              {allSubjects.map((subj) => {
                const active = saveSubject === subj;
                return (
                  <TouchableOpacity
                    key={subj}
                    style={[
                      s.subjectPill,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSaveSubject(subj)}
                  >
                    <Text
                      style={[
                        s.subjectPillText,
                        { color: active ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      {subj}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={[s.modalCancel, { borderColor: colors.border }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={[s.modalCancelText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSave, { backgroundColor: colors.primary }]}
                onPress={confirmSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="bookmark" size={15} color="#fff" />
                    <Text style={s.modalSaveText}>Save to Notes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  countBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  stripWrapper: { paddingBottom: 4 },
  stripContent: { paddingHorizontal: 16, gap: 8 },
  dateCell: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 52,
    gap: 2,
  },
  dateCellWeekday: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
  dateCellDay: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26 },
  dateCellMonth: { fontSize: 10, fontFamily: "Inter_500Medium" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },

  filterScroll: { maxHeight: 46 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  filterPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  dateHeadingRow: { paddingHorizontal: 20, paddingVertical: 8 },
  dateHeading: { fontSize: 15, fontFamily: "Inter_700Bold" },

  listContent: { paddingHorizontal: 16, paddingBottom: 110, gap: 12 },

  articleCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  articleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sourceBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sourceText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  saveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  articleTitle: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  articleContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  expandText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  retryBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  retryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 16 },
  modalLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  subjectRow: { gap: 8, paddingVertical: 2 },
  subjectPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  subjectPillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modalBtnRow: { flexDirection: "row", gap: 10 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalSave: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalSaveText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
