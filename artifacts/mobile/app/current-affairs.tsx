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
import { Stack } from "expo-router";
import Markdown from "react-native-markdown-display";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import DateTimePicker from "@react-native-community/datetimepicker";

import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { CORE_SUBJECTS, useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

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
  { key: "All", label: "All Sources", color: "#0F172B", bg: "#F1F5F9" },
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

// No longer need buildDateStrip

function formatLongDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Article Detail Modal ──────────────────────────────────────────────────────
function ArticleModal({
  article,
  visible,
  onClose,
}: {
  article: CurrentAffair | null;
  visible: boolean;
  onClose: () => void;
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
}: {
  article: CurrentAffair;
  onPress: () => void;
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
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState<string | null>(isoToday());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [articles, setArticles] = useState<CurrentAffair[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Source toggle — default to All
  const [activeSource, setActiveSource] = useState<string>(SOURCES[0].key);

  // Article detail modal
  const [modalArticle, setModalArticle] = useState<CurrentAffair | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // No longer fetching available dates since we use a native picker

  // Fetch articles on date change from Firebase natively
  const fetchArticles = useCallback(async (date: string | null) => {
    setLoading(true);
    setError(false);
    setArticles([]);
    try {
      let snap;

      if (!date) {
        // Fetch recent
        const q = query(
          collection(db, "current_affairs"),
          orderBy("createdAt", "desc"),
          limit(100)
        );
        snap = await getDocs(q);
      } else {
        const q = query(
          collection(db, "current_affairs"),
          where("publishDate", "==", date),
          limit(100)
        );
        snap = await getDocs(q);

        // Fallback to legacy date format like web app
        if (snap.empty && date.includes('-')) {
           const [y, m, d] = date.split('-');
           const fallbackDate = `${d}/${m}/${y}`;
           const qFallback = query(
              collection(db, "current_affairs"),
              where("publishDate", "==", fallbackDate),
              limit(100)
           );
           snap = await getDocs(qFallback);
        }
      }

      const docs: CurrentAffair[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        docs.push({
          id: docSnap.id,
          title: data.title || "",
          source: data.source || "Unknown",
          content: data.content || "",
          tags: data.tags || [],
          publish_date: data.publishDate || (date ? date : new Date().toISOString().split("T")[0]),
          created_at: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
      // Sort in memory to avoid needing a Firestore composite index
      docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setArticles(docs);
    } catch (e) {
      console.error("Firebase fetch error:", e);
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
    () => activeSource === "All" ? articles : articles.filter((a) => a.source === activeSource),
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

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Current Affairs</Text>
        </View>
        <TouchableOpacity
          style={[s.dateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Feather name="calendar" size={14} color={colors.foreground} />
          <Text style={[s.dateBtnText, { color: colors.foreground }]}>
            {selectedDate ? formatLongDate(selectedDate) : "Recent Updates"}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
          style={[StyleSheet.absoluteFill, { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }]}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: colors.card, paddingBottom: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <TouchableOpacity onPress={() => { setSelectedDate(null); setShowDatePicker(false); }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary }}>View Recent</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={new Date((selectedDate || isoToday()) + "T12:00:00")}
              mode="date"
              display="inline"
              maximumDate={new Date()}
              onChange={(event, date) => {
                if (date) {
                  const tzDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                  setSelectedDate(tzDate.toISOString().split("T")[0]!);
                }
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Source Toggles */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.toggleRowContent}
          style={s.toggleRow}
        >
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
        </ScrollView>
      </View>

      {/* Horizontal List replaced by native picker above */}

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
            No articles found
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
      />
    </View>
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
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  dateBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  countBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  toggleRow: {
    paddingBottom: 12,
  },
  toggleRowContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
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
