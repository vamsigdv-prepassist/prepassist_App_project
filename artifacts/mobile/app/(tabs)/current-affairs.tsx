import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
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

const SOURCES = [
  { key: "The Hindu", label: "The Hindu", color: "#DC2626", bg: "#FEF2F2" },
  { key: "Times of India", label: "Times of India", color: "#2563EB", bg: "#EFF6FF" },
  { key: "PIB Release", label: "PIB", color: "#7C3AED", bg: "#F5F3FF" },
] as const;

function sourceFor(key: string) {
  return (
    SOURCES.find((s) => s.key === key) ?? {
      key,
      label: key,
      color: "#4F39F6",
      bg: "#EEF2FF",
    }
  );
}

function isoToday(): string {
  return new Date().toISOString().split("T")[0]!;
}

function buildDateStrip(count = 60) {
  const result: { iso: string; day: number; month: string; weekday: string }[] = [];
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

function formatLongDate(iso: string) {
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

// ─── Article Detail Modal ──────────────────────────────────────────────────────
function ArticleModal({
  article,
  visible,
  onClose,
  onSave,
}: {
  article: CurrentAffair | null;
  visible: boolean;
  onClose: () => void;
  onSave: (article: CurrentAffair) => void;
}) {
  const colors = useColors();
  if (!article) return null;
  const src = sourceFor(article.source);

  const mdStyles = buildMdStyles(colors.foreground, colors.mutedForeground, colors.primary, colors.card, colors.border);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
        {/* Modal header */}
        <View style={[ms.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[ms.sourcePill, { backgroundColor: src.bg }]}>
            <Text style={[ms.sourceLabel, { color: src.color }]}>{src.label}</Text>
          </View>
          <TouchableOpacity
            style={[ms.saveBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
            onPress={() => onSave(article)}
          >
            <Feather name="bookmark" size={14} color={colors.primary} />
            <Text style={[ms.saveBtnText, { color: colors.primary }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={ms.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Date */}
          <Text style={[ms.dateText, { color: colors.mutedForeground }]}>
            {new Date(article.publish_date + "T00:00:00").toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>

          {/* Title */}
          <Text style={[ms.title, { color: colors.foreground }]}>{article.title}</Text>

          {/* Tags */}
          {article.tags?.length > 0 && (
            <View style={ms.tagRow}>
              {article.tags.map((t, i) => (
                <View key={i} style={[ms.tag, { backgroundColor: colors.primary + "12" }]}>
                  <Text style={[ms.tagText, { color: colors.primary }]}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Divider */}
          <View style={[ms.divider, { backgroundColor: colors.border }]} />

          {/* Markdown content */}
          <Markdown style={mdStyles}>{article.content}</Markdown>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Article Card ──────────────────────────────────────────────────────────────
function ArticleCard({
  article,
  onPress,
  onSave,
}: {
  article: CurrentAffair;
  onPress: () => void;
  onSave: (article: CurrentAffair) => void;
}) {
  const colors = useColors();
  const src = sourceFor(article.source);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Left accent bar */}
      <View style={[s.accentBar, { backgroundColor: src.color }]} />

      <View style={s.cardInner}>
        {/* Source + Save */}
        <View style={s.cardTop}>
          <View style={[s.sourcePill, { backgroundColor: src.bg }]}>
            <Text style={[s.sourceText, { color: src.color }]}>{article.source}</Text>
          </View>
          <TouchableOpacity
            style={[s.saveBtn, { borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              onSave(article);
            }}
          >
            <Feather name="bookmark" size={13} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={[s.cardTitle, { color: colors.foreground }]} numberOfLines={3}>
          {article.title}
        </Text>

        {/* Tags */}
        {article.tags?.length > 0 && (
          <View style={s.tagRow}>
            {article.tags.slice(0, 3).map((t, i) => (
              <View key={i} style={[s.tag, { backgroundColor: colors.primary + "12" }]}>
                <Text style={[s.tagText, { color: colors.primary }]}>#{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Preview snippet */}
        <Text style={[s.preview, { color: colors.mutedForeground }]} numberOfLines={2}>
          {article.content.replace(/#{1,6}\s|[*_~`>]/g, "")}
        </Text>

        {/* Read more hint */}
        <View style={s.readMore}>
          <Text style={[s.readMoreText, { color: colors.primary }]}>Read full article</Text>
          <Feather name="arrow-right" size={12} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
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

  // Source toggle — default to The Hindu
  const [activeSource, setActiveSource] = useState<string>(SOURCES[0].key);

  // Article detail modal
  const [modalArticle, setModalArticle] = useState<CurrentAffair | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Save-to-notes modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingArticle, setSavingArticle] = useState<CurrentAffair | null>(null);
  const [saveSubject, setSaveSubject] = useState(CORE_SUBJECTS[0]!);

  const allSubjects = useMemo(
    () => [
      ...CORE_SUBJECTS,
      ...(optionalSubject ? [optionalSubject] : []),
      ...customSubjects,
    ],
    [optionalSubject, customSubjects],
  );

  // Load available dates on mount
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

  // Fetch articles on date change
  const fetchArticles = useCallback(async (date: string) => {
    setLoading(true);
    setError(false);
    setArticles([]);
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

  // Articles filtered by the active source toggle
  const filtered = useMemo(
    () => articles.filter((a) => a.source === activeSource),
    [articles, activeSource],
  );

  // Counts per source so we can show badges on toggle buttons
  const countBySource = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of articles) {
      map[a.source] = (map[a.source] ?? 0) + 1;
    }
    return map;
  }, [articles]);

  function openArticle(article: CurrentAffair) {
    setModalArticle(article);
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleSavePress(article: CurrentAffair) {
    setSavingArticle(article);
    setSaveSubject(CORE_SUBJECTS[0]!);
    setShowSaveModal(true);
  }

  function confirmSave() {
    if (!savingArticle) return;
    addTrackerNote({
      title: savingArticle.title,
      content: `**Source:** ${savingArticle.source}\n**Date:** ${savingArticle.publish_date}\n\n${savingArticle.content}`,
      subject: saveSubject,
      tags: [...(savingArticle.tags ?? []), "current-affairs"],
      isStarred: false,
    });
    setShowSaveModal(false);
    setSavingArticle(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved!", `"${savingArticle.title}" added to ${saveSubject} notes.`);
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Current Affairs</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
            {formatLongDate(selectedDate)}
          </Text>
        </View>
        {!loading && articles.length > 0 && (
          <View style={[s.countBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[s.countText, { color: colors.primary }]}>
              {articles.length} total
            </Text>
          </View>
        )}
      </View>

      {/* Source Toggles */}
      <View style={[s.toggleRow, { borderBottomColor: colors.border }]}>
        {SOURCES.map((src) => {
          const active = activeSource === src.key;
          const count = countBySource[src.key] ?? 0;
          return (
            <TouchableOpacity
              key={src.key}
              style={[
                s.toggleBtn,
                active
                  ? { backgroundColor: src.color, borderColor: src.color }
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => {
                setActiveSource(src.key);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  s.toggleLabel,
                  { color: active ? "#fff" : colors.mutedForeground },
                ]}
                numberOfLines={1}
              >
                {src.label}
              </Text>
              {!loading && count > 0 && (
                <View
                  style={[
                    s.toggleCount,
                    {
                      backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.primary + "18",
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.toggleCountText,
                      { color: active ? "#fff" : colors.primary },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date strip */}
      <FlatList
        data={dateStrip}
        keyExtractor={(d) => d.iso}
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        style={s.strip}
        contentContainerStyle={s.stripContent}
        renderItem={({ item }) => {
          const isSelected = item.iso === selectedDate;
          const hasContent = availableDates.has(item.iso);
          const isToday = item.iso === isoToday();
          return (
            <TouchableOpacity
              style={[
                s.dateCell,
                isSelected
                  ? { backgroundColor: colors.primary }
                  : isToday
                  ? { borderWidth: 1.5, borderColor: colors.primary }
                  : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                { borderRadius: 14 },
              ]}
              onPress={() => {
                setSelectedDate(item.iso);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text
                style={[
                  s.weekday,
                  { color: isSelected ? "rgba(255,255,255,0.75)" : colors.mutedForeground },
                ]}
              >
                {item.weekday}
              </Text>
              <Text
                style={[
                  s.day,
                  { color: isSelected ? "#fff" : isToday ? colors.primary : colors.foreground },
                ]}
              >
                {item.day}
              </Text>
              <Text
                style={[
                  s.month,
                  { color: isSelected ? "rgba(255,255,255,0.75)" : colors.mutedForeground },
                ]}
              >
                {item.month}
              </Text>
              {datesLoaded && hasContent && (
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor: isSelected
                        ? "rgba(255,255,255,0.7)"
                        : colors.primary,
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Article list */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[s.stateText, { color: colors.mutedForeground }]}>
            Loading articles…
          </Text>
        </View>
      ) : error ? (
        <View style={s.center}>
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
        <View style={s.center}>
          <View
            style={[
              s.emptyIcon,
              { backgroundColor: sourceFor(activeSource).color + "15" },
            ]}
          >
            <Feather name="file-text" size={32} color={sourceFor(activeSource).color} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>
            No {activeSource} articles
          </Text>
          <Text style={[s.stateText, { color: colors.mutedForeground }]}>
            {articles.length > 0
              ? `Try switching to another source above.`
              : `No articles published for this date yet.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <ArticleCard
              article={item}
              onPress={() => openArticle(item)}
              onSave={handleSavePress}
            />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Article detail modal */}
      <ArticleModal
        article={modalArticle}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={(a) => {
          setModalVisible(false);
          handleSavePress(a);
        }}
      />

      {/* Save-to-notes bottom sheet */}
      {showSaveModal && savingArticle && (
        <View style={s.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSaveModal(false)}
            activeOpacity={1}
          />
          <View style={[s.sheet, { backgroundColor: colors.background }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.foreground }]}>
              Save to Notes
            </Text>
            <Text
              style={[s.sheetSub, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {savingArticle.title}
            </Text>
            <Text style={[s.sheetLabel, { color: colors.mutedForeground }]}>
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
            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={[s.cancelText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={confirmSave}
              >
                <Feather name="bookmark" size={15} color="#fff" />
                <Text style={s.confirmText}>Save to Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Markdown styles builder ──────────────────────────────────────────────────
function buildMdStyles(
  fg: string,
  muted: string,
  primary: string,
  card: string,
  border: string,
) {
  return StyleSheet.create({
    body: {
      fontSize: 15,
      lineHeight: 26,
      color: fg,
      fontFamily: "Inter_400Regular",
    },
    heading1: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: fg,
      marginTop: 20,
      marginBottom: 8,
    },
    heading2: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: fg,
      marginTop: 18,
      marginBottom: 6,
    },
    heading3: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: fg,
      marginTop: 14,
      marginBottom: 4,
    },
    strong: {
      fontFamily: "Inter_700Bold",
      color: fg,
    },
    em: {
      fontStyle: "italic",
      color: muted,
    },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: {
      marginBottom: 4,
      flexDirection: "row",
    },
    bullet_list_icon: {
      color: primary,
      fontSize: 16,
      marginRight: 6,
      marginTop: 2,
    },
    ordered_list_icon: {
      color: primary,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      marginRight: 6,
      marginTop: 2,
    },
    blockquote: {
      backgroundColor: primary + "10",
      borderLeftColor: primary,
      borderLeftWidth: 4,
      paddingLeft: 14,
      paddingVertical: 8,
      marginVertical: 8,
      borderRadius: 4,
    },
    code_inline: {
      backgroundColor: card,
      color: primary,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    fence: {
      backgroundColor: card,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    hr: {
      backgroundColor: border,
      height: 1,
      marginVertical: 16,
    },
    paragraph: {
      marginBottom: 12,
    },
  });
}

// ─── Article modal styles ──────────────────────────────────────────────────────
const ms = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  sourcePill: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignItems: "center",
  },
  sourceLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  dateText: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 28, marginBottom: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginBottom: 16 },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────
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
  countBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  toggleRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  toggleLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  toggleCount: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  toggleCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  strip: { maxHeight: 90 },
  stripContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  dateCell: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 52,
    gap: 1,
  },
  weekday: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" },
  day: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26 },
  month: { fontSize: 10, fontFamily: "Inter_500Medium" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  listContent: { padding: 14, paddingBottom: 110, gap: 12 },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  accentBar: { width: 4 },
  cardInner: { flex: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sourcePill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  sourceText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  saveBtn: { padding: 6, borderRadius: 20, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  preview: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  readMore: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  readMoreText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  stateText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  retryBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 16 },
  sheetLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  subjectRow: { gap: 8, paddingVertical: 2 },
  subjectPill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  subjectPillText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sheetBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 2, borderRadius: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  confirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
