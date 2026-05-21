import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CORE_SUBJECTS,
  SavedArticle,
  useApp,
} from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { notesExtractUrl } from "@/lib/ai";

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const slug = u.pathname.replace(/\/$/, "").split("/").pop() ?? "";
    const readable = slug.replace(/[-_]/g, " ").replace(/\.\w+$/, "").trim();
    return readable || u.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 60);
  }
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ArticlesScreen() {
  const {
    savedArticles,
    addSavedArticle,
    updateSavedArticle,
    removeSavedArticle,
    addTrackerNote,
    customSubjects,
    optionalSubject,
  } = useApp();
  const colors = useColors();
  const s = useMemo(() => styles(colors), [colors]);

  const allSubjects = useMemo(
    () => [
      ...CORE_SUBJECTS,
      ...(optionalSubject ? [optionalSubject] : []),
      ...customSubjects,
    ],
    [optionalSubject, customSubjects],
  );

  const [multiSelect, setMultiSelect] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const [showExtractModal, setShowExtractModal] = useState(false);
  const [extractIds, setExtractIds] = useState<string[]>([]);
  const [extractSubject, setExtractSubject] = useState(CORE_SUBJECTS[0]!);
  const [noteTitle, setNoteTitle] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractDone, setExtractDone] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleLongPress(article: SavedArticle) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Article", `Remove "${article.title}" from Saved Articles?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeSavedArticle(article.id);
          setSelected((prev) => prev.filter((x) => x !== article.id));
        },
      },
    ]);
  }

  function handleAddUrl() {
    const url = urlInput.trim();
    if (!isValidUrl(url)) {
      Alert.alert("Invalid URL", "Please enter a valid http/https URL.");
      return;
    }
    addSavedArticle({ url, title: titleFromUrl(url) });
    setUrlInput("");
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function openExtractModal(ids: string[]) {
    const first = savedArticles.find((a) => ids[0] === a.id);
    setExtractIds(ids);
    setNoteTitle(first ? first.title : "");
    setExtractSubject(CORE_SUBJECTS[0]!);
    setExtractError("");
    setExtractDone(false);
    setShowExtractModal(true);
  }

  async function handleExtract() {
    if (!noteTitle.trim()) {
      setExtractError("Please enter a note title.");
      return;
    }
    setIsExtracting(true);
    setExtractError("");

    const articles = savedArticles.filter((a) => extractIds.includes(a.id));
    const combinedParts: string[] = [];

    for (const article of articles) {
      try {
        let text = article.content ?? "";
        if (!text) {
          const result = await notesExtractUrl(article.url);
          text = result.text;
          updateSavedArticle(article.id, {
            content: text,
            extractedAt: Date.now(),
          });
        }
        combinedParts.push(
          articles.length > 1
            ? `## ${article.title}\n\n${text}`
            : text,
        );
      } catch {
        setExtractError(
          `Failed to extract "${article.title}". Check the URL and try again.`,
        );
        setIsExtracting(false);
        return;
      }
    }

    addTrackerNote({
      title: noteTitle.trim(),
      content: combinedParts.join("\n\n---\n\n"),
      subject: extractSubject,
      tags: ["article"],
      isStarred: false,
    });

    for (const id of extractIds) {
      updateSavedArticle(id, { extractedAt: Date.now() });
    }

    setIsExtracting(false);
    setExtractDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelected([]);
    setMultiSelect(false);
  }

  function closeExtractModal() {
    setShowExtractModal(false);
    setExtractIds([]);
    setExtractDone(false);
    setExtractError("");
  }

  function renderArticle({ item }: { item: SavedArticle }) {
    const isSelected = selected.includes(item.id);
    const extracted = !!item.extractedAt;

    return (
      <TouchableOpacity
        style={[
          s.articleCard,
          { borderColor: isSelected ? colors.primary : colors.border },
          isSelected && { backgroundColor: colors.primary + "0D" },
        ]}
        activeOpacity={0.75}
        onPress={() => {
          if (multiSelect) {
            toggleSelect(item.id);
          } else {
            WebBrowser.openBrowserAsync(item.url);
          }
        }}
        onLongPress={() => handleLongPress(item)}
      >
        {multiSelect && (
          <View
            style={[
              s.checkbox,
              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            {isSelected && <Feather name="check" size={12} color="#fff" />}
          </View>
        )}

        <Image
          source={{ uri: getFaviconUrl(item.url) }}
          style={s.favicon}
          defaultSource={require("@/assets/images/icon.png")}
        />

        <View style={s.articleInfo}>
          <Text style={[s.articleTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[s.articleMeta, { color: colors.mutedForeground }]}>
            {getDomain(item.url)} · {formatDate(item.savedAt)}
          </Text>
        </View>

        <View style={s.articleRight}>
          {extracted ? (
            <View style={[s.statusBadge, { backgroundColor: "#10B98120" }]}>
              <Feather name="check-circle" size={11} color="#10B981" />
              <Text style={[s.statusText, { color: "#10B981" }]}>Extracted</Text>
            </View>
          ) : (
            <View style={[s.statusBadge, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="clock" size={11} color={colors.primary} />
              <Text style={[s.statusText, { color: colors.primary }]}>New</Text>
            </View>
          )}
          {!multiSelect && (
            <TouchableOpacity
              style={[s.extractBtn, { borderColor: colors.primary }]}
              onPress={() => openExtractModal([item.id])}
            >
              <Text style={[s.extractBtnText, { color: colors.primary }]}>Extract</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>Saved Articles</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
            {savedArticles.length} article{savedArticles.length !== 1 ? "s" : ""} saved
          </Text>
        </View>
        {savedArticles.length > 0 && (
          <TouchableOpacity
            style={[s.selectBtn, { borderColor: colors.border }]}
            onPress={() => {
              setMultiSelect((v) => !v);
              setSelected([]);
            }}
          >
            <Text style={[s.selectBtnText, { color: multiSelect ? colors.primary : colors.mutedForeground }]}>
              {multiSelect ? "Cancel" : "Select"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Share hint banner */}
      {savedArticles.length === 0 && (
        <View style={[s.hintBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Feather name="share-2" size={16} color={colors.primary} />
          <Text style={[s.hintText, { color: colors.primary }]}>
            {Platform.OS === "android"
              ? "Share any webpage to PrepAssist using your browser's Share button — it'll appear here instantly."
              : "Tap + to paste a URL, or use the Share sheet → Copy Link → paste it here. iOS Share Extension coming soon."}
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={savedArticles}
        keyExtractor={(a) => a.id}
        renderItem={renderArticle}
        contentContainerStyle={
          savedArticles.length === 0 ? s.emptyContainer : s.listContent
        }
        ListEmptyComponent={
          <View style={s.emptyInner}>
            <View style={[s.emptyIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="bookmark" size={36} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.foreground }]}>No saved articles yet</Text>
            <Text style={[s.emptyBody, { color: colors.mutedForeground }]}>
              Articles you save from other apps will appear here. Tap + to add a URL manually.
            </Text>
          </View>
        }
      />

      {/* Multi-select bottom bar */}
      {multiSelect && selected.length > 0 && (
        <View style={[s.multiBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[s.multiBarBtn, { backgroundColor: colors.primary }]}
            onPress={() => openExtractModal(selected)}
          >
            <Feather name="download" size={16} color="#fff" />
            <Text style={s.multiBarBtnText}>
              Extract {selected.length} Article{selected.length > 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => {
          setUrlInput("");
          setShowAddModal(true);
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>

      {/* ── Add URL Modal ── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setShowAddModal(false)} />
        <View style={[s.sheet, { backgroundColor: colors.background }]}>
          <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[s.sheetTitle, { color: colors.foreground }]}>Add Article URL</Text>
          <Text style={[s.sheetSub, { color: colors.mutedForeground }]}>
            Paste a link to any article, news page, or blog post.
          </Text>
          <TextInput
            style={[s.urlInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
            placeholder="https://..."
            placeholderTextColor={colors.mutedForeground}
            value={urlInput}
            onChangeText={setUrlInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleAddUrl}
            autoFocus
          />
          <View style={s.sheetRow}>
            <TouchableOpacity
              style={[s.sheetCancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={[s.sheetCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sheetSaveBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddUrl}
            >
              <Text style={s.sheetSaveText}>Save Article</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Extract Modal ── */}
      <Modal
        visible={showExtractModal}
        transparent
        animationType="slide"
        onRequestClose={closeExtractModal}
      >
        <Pressable style={s.backdrop} onPress={closeExtractModal} />
        <View style={[s.sheet, s.extractSheet, { backgroundColor: colors.background }]}>
          <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />

          {extractDone ? (
            <View style={s.successState}>
              <View style={[s.successIcon, { backgroundColor: "#10B98120" }]}>
                <Feather name="check-circle" size={40} color="#10B981" />
              </View>
              <Text style={[s.successTitle, { color: colors.foreground }]}>Saved to Notes!</Text>
              <Text style={[s.successBody, { color: colors.mutedForeground }]}>
                The extracted content has been saved under{" "}
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                  {extractSubject}
                </Text>
                .
              </Text>
              <TouchableOpacity
                style={[s.sheetSaveBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
                onPress={closeExtractModal}
              >
                <Text style={s.sheetSaveText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[s.sheetTitle, { color: colors.foreground }]}>Extract & Save as Note</Text>
              <Text style={[s.sheetSub, { color: colors.mutedForeground }]}>
                {extractIds.length === 1
                  ? "The article content will be scraped and saved as a note."
                  : `Content from ${extractIds.length} articles will be merged into one note.`}
              </Text>

              {/* Article previews */}
              <View style={[s.articlePreviewList, { borderColor: colors.border }]}>
                {extractIds.slice(0, 3).map((id) => {
                  const a = savedArticles.find((x) => x.id === id);
                  if (!a) return null;
                  return (
                    <View key={id} style={s.articlePreviewRow}>
                      <Image
                        source={{ uri: getFaviconUrl(a.url) }}
                        style={s.previewFavicon}
                        defaultSource={require("@/assets/images/icon.png")}
                      />
                      <Text
                        style={[s.previewTitle, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {a.title}
                      </Text>
                      {a.extractedAt && (
                        <Feather name="check-circle" size={13} color="#10B981" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                  );
                })}
                {extractIds.length > 3 && (
                  <Text style={[s.previewMore, { color: colors.mutedForeground }]}>
                    +{extractIds.length - 3} more
                  </Text>
                )}
              </View>

              {/* Note title */}
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Note Title</Text>
              <TextInput
                style={[s.urlInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                placeholder="Enter note title…"
                placeholderTextColor={colors.mutedForeground}
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              {/* Subject picker */}
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Save under Subject</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.subjectScroll}
                contentContainerStyle={s.subjectRow}
              >
                {allSubjects.map((subj) => {
                  const active = extractSubject === subj;
                  return (
                    <TouchableOpacity
                      key={subj}
                      style={[
                        s.subjectPill,
                        { borderColor: active ? colors.primary : colors.border },
                        active && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setExtractSubject(subj)}
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

              {!!extractError && (
                <Text style={s.errorText}>{extractError}</Text>
              )}

              <View style={s.sheetRow}>
                <TouchableOpacity
                  style={[s.sheetCancelBtn, { borderColor: colors.border }]}
                  onPress={closeExtractModal}
                  disabled={isExtracting}
                >
                  <Text style={[s.sheetCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.sheetSaveBtn, { backgroundColor: colors.primary, opacity: isExtracting ? 0.7 : 1 }]}
                  onPress={handleExtract}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.sheetSaveText}>Extract & Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
    },
    headerSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    selectBtn: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    selectBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    hintBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 10,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    hintText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 19,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 120,
      gap: 10,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    emptyInner: { alignItems: "center" },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      marginBottom: 8,
      textAlign: "center",
    },
    emptyBody: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 21,
    },
    articleCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 14,
      borderWidth: 1,
      padding: 12,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: "#CBD5E1",
      alignItems: "center",
      justifyContent: "center",
    },
    favicon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: "#E2E8F0",
    },
    articleInfo: {
      flex: 1,
      gap: 4,
    },
    articleTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      lineHeight: 20,
    },
    articleMeta: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    articleRight: {
      alignItems: "flex-end",
      gap: 8,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    statusText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
    extractBtn: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    extractBtnText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    multiBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      paddingBottom: 32,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    multiBarBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      paddingVertical: 14,
    },
    multiBarBtnText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    fab: {
      position: "absolute",
      bottom: 100,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#4F39F6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      paddingBottom: 36,
    },
    extractSheet: {
      maxHeight: "88%",
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      marginBottom: 6,
    },
    sheetSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      lineHeight: 20,
      marginBottom: 16,
    },
    urlInput: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      marginBottom: 16,
    },
    sheetRow: {
      flexDirection: "row",
      gap: 10,
    },
    sheetCancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: "center",
    },
    sheetCancelText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    sheetSaveBtn: {
      flex: 2,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    sheetSaveText: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    articlePreviewList: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      gap: 8,
    },
    articlePreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    previewFavicon: {
      width: 20,
      height: 20,
      borderRadius: 4,
      backgroundColor: "#E2E8F0",
    },
    previewTitle: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    previewMore: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      paddingTop: 4,
    },
    fieldLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    subjectScroll: { marginBottom: 16 },
    subjectRow: { gap: 8, paddingVertical: 2 },
    subjectPill: {
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    subjectPillText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    errorText: {
      color: "#EF4444",
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      marginBottom: 12,
    },
    successState: {
      alignItems: "center",
      paddingVertical: 20,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      marginBottom: 8,
    },
    successBody: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 21,
    },
  });
}
