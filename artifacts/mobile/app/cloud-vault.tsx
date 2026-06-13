import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  CloudNote,
  deleteCloudNote,
  fetchCloudNotes,
  formatBytes,
} from "@/lib/cloud_notes";

export const formatNoteTitle = (title: string) => {
  if (!title) return "Untitled";
  let cleanTitle = title;
  let isSystemGenerated = false;

  if (cleanTitle.startsWith("[Extracted] ")) {
    cleanTitle = cleanTitle.replace("[Extracted] ", "");
    isSystemGenerated = true;
  }
  if (cleanTitle.startsWith("[Vault Data] ")) {
    cleanTitle = cleanTitle.replace("[Vault Data] ", "");
    isSystemGenerated = true;
  }
  if (cleanTitle.includes("_")) {
    isSystemGenerated = true;
  }

  if (isSystemGenerated) {
    let subject = "";
    if (cleanTitle.includes(" - ")) {
      const parts = cleanTitle.split(" - ");
      subject = parts[1]!;
      cleanTitle = parts[0]!;
    }
    cleanTitle = cleanTitle.replace(/[-_]/g, " ");
    cleanTitle = cleanTitle.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
    if (subject) {
      cleanTitle = `${cleanTitle} (${subject})`;
    }
  }
  return cleanTitle;
};

export default function CloudVaultManager() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colors = useColors();

  const [notes, setNotes] = useState<CloudNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size">("date");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "raw" | "tracker">("all");
  const [selectedNote, setSelectedNote] = useState<CloudNote | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    let mounted = true;
    fetchCloudNotes(user.uid)
      .then((data) => {
        if (mounted) {
          setNotes(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to hydrate Vault Data", err);
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  const getWeight = (n: CloudNote) => n.fileSizeBytes || 102400;

  const handleDeleteNode = (note: CloudNote) => {
    Alert.alert(
      "Purge Document?",
      "Are you absolutely sure you want to permanently purge this document from your Cloud Database? This is non-reversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Purge",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(note.id || "processing");
            const freedSpace = getWeight(note);
            try {
              await deleteCloudNote(note);
              setNotes((prev) => prev.filter((n) => n.id !== note.id));
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              if (freedSpace > 0) {
                Alert.alert("Success!", `You have freed ${formatBytes(freedSpace)} of Cloud Space.`);
              } else {
                Alert.alert("Success", "Node purged successfully.");
              }
            } catch (e: any) {
              Alert.alert("Failed to securely purge data", e.message);
            }
            setIsDeleting(null);
          },
        },
      ]
    );
  };


  const handleDownloadNode = async (note: CloudNote) => {
    try {
      if (note.fileUrl && note.type === "file") {
        // Physical blob: open in browser to download natively
        await WebBrowser.openBrowserAsync(note.fileUrl);
      } else {
        // Extracted text: generate text file and share/save
        const safeTitle = (note.title || "extracted-note").replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const fileUri = `${FileSystem.documentDirectory}${safeTitle}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, note.content || "No extracted content.", {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/plain",
            dialogTitle: `Save ${safeTitle}.txt`,
          });
        } else {
          Alert.alert("Sharing Unavailable", "Cannot save file on this device.");
        }
      }
    } catch (e: any) {
      Alert.alert("Download Failed", e.message);
    }
  };

  const totalUploads = notes.length;
  const documentNodesCount = notes.filter((n) => n.type === "file").length;

  let displayedNotes = [...notes];
  if (categoryFilter === "raw") {
    displayedNotes = displayedNotes.filter((n) => n.isStaged);
  } else if (categoryFilter === "tracker") {
    displayedNotes = displayedNotes.filter((n) => !n.isStaged);
  }

  if (sortBy === "size") {
    displayedNotes.sort((a, b) => getWeight(b) - getWeight(a));
  } else {
    displayedNotes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  if (searchQuery.trim()) {
    const sq = searchQuery.toLowerCase();
    displayedNotes = displayedNotes.filter(
      (n) => n.title.toLowerCase().includes(sq) || n.subject.toLowerCase().includes(sq)
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <FlatList
        data={displayedNotes}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Hero Header */}
            <View style={styles.heroSection}>
              <View style={styles.heroPill}>
                <Feather name="database" size={12} color="#4338CA" />
                <Text style={styles.heroPillText}>User Cloud Array</Text>
              </View>
              <Text style={styles.heroTitle}>Secured Data Vault</Text>
              <Text style={styles.heroSubtitle}>
                Complete chronological tracker of every PDF, document, and structural text node you have explicitly injected into our Cloud infrastructure. Total control over your raw data arrays.
              </Text>
            </View>

            {/* Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCardGray}>
                <Text style={styles.metricLabelGray}>Total Vault Nodes</Text>
                <Text style={styles.metricValueGray}>{totalUploads}</Text>
              </View>
              <View style={styles.metricCardIndigo}>
                <Text style={styles.metricLabelIndigo}>Physical Blobs (PDF)</Text>
                <Text style={styles.metricValueIndigo}>{documentNodesCount}</Text>
              </View>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filterContainer}>
              {(["all", "raw", "tracker"] as const).map((cat) => {
                const active = categoryFilter === cat;
                const label = cat === "all" ? "All Data" : cat === "raw" ? "Raw Uploads" : "Notes Tracker";
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setCategoryFilter(cat);
                    }}
                    style={[
                      styles.filterButton,
                      active && styles.filterButtonActive,
                    ]}
                  >
                    <Text style={[styles.filterButtonText, active ? { color: "#0F172A" } : { color: "#64748B" }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Search & Sort */}
            <View style={styles.searchSortContainer}>
              <View style={styles.searchBox}>
                <Feather name="search" size={16} color="#94A3B8" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Query documents by Title or Subject..."
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                />
              </View>

              <View style={styles.sortRow}>
                <View style={styles.sortLabel}>
                  <Feather name="list" size={12} color="#94A3B8" />
                  <Text style={styles.sortLabelText}>SORT SCOPE:</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(["date", "size"] as const).map((sortOpt) => {
                    const active = sortBy === sortOpt;
                    const label = sortOpt === "date" ? "Chronology Pipeline" : "Memory Weight";
                    return (
                      <Pressable
                        key={sortOpt}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSortBy(sortOpt);
                        }}
                        style={[
                          styles.sortButton,
                          active ? { backgroundColor: "#4F46E5" } : { backgroundColor: "#F8FAFC" },
                        ]}
                      >
                        <Text style={[styles.sortButtonText, active ? { color: "#FFFFFF" } : { color: "#64748B" }]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Warning Message */}
            <View style={styles.warningBox}>
              <Feather name="alert-triangle" size={14} color="#4338CA" style={{ marginTop: 2 }} />
              <Text style={styles.warningText}>
                Warning: Purging a physical blob natively from the Cloud Vault permanently deletes it from Firebase Data Storage Arrays. AI Extracted texts derived from that blob will remain intact in other system scopes unless manually pruned.
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Synchronizing with Firebase Vault...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="database" size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>Silo is Empty</Text>
              <Text style={styles.emptySubtitle}>
                You haven't pushed any Raw Notes or PDFs into the Vault Array yet. Or your search query returned zero matches.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const isLegacy = !item.fileSizeBytes;
          const displayedBytes = formatBytes(getWeight(item));
          const isFile = item.type === "file";
          const isDocx = item.fileUrl?.toLowerCase().includes(".docx");
          const formatTypology = isFile ? (isDocx ? "DOCX Blob" : "PDF Blob") : "Extracted Text";

          const dateStr = item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
            : "Archive Era";
          const timeStr = item.createdAt
            ? new Date(item.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
            : "00:00";

          return (
            <View style={styles.nodeCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.nodeIconBox}>
                  <Feather name={isFile ? "file" : "align-left"} size={20} color={isFile ? "#4F46E5" : "#059669"} />
                </View>
                <View style={styles.cardHeaderContent}>
                  <Text style={styles.nodeTitle} numberOfLines={1}>
                    {formatNoteTitle(item.title)}
                  </Text>
                  <View style={styles.nodeMetaRow}>
                    <View style={styles.metaBadge}>
                      <Feather name="hash" size={10} color="#64748B" />
                      <Text style={styles.metaBadgeText}>{item.subject}</Text>
                    </View>
                    <Text style={styles.metaDot}>•</Text>
                    <View style={styles.metaBadge}>
                      <Feather name="clock" size={10} color="#64748B" />
                      <Text style={styles.metaBadgeText}>{dateStr}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.cardBadgesRow}>
                <View style={[styles.formatBadge, isFile ? styles.formatBadgeFile : styles.formatBadgeText]}>
                  <Text style={[styles.formatBadgeTextContent, isFile ? { color: "#475569" } : { color: "#FFFFFF" }]}>
                    {formatTypology}
                  </Text>
                </View>
                <View style={styles.sizeBadge}>
                  <Feather name="hard-drive" size={10} color="#64748B" />
                  <Text style={styles.sizeBadgeText}>{displayedBytes}</Text>
                </View>
                {isLegacy && (
                  <View style={styles.legacyBadge}>
                    <Text style={styles.legacyBadgeText}>LEGACY</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBottomRow}>
                <View style={{ flex: 1 }} />
                <View style={styles.nodeActions}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedNote(item);
                    }}
                    style={styles.actionBtn}
                  >
                    <Feather name="eye" size={14} color="#475569" />
                    <Text style={styles.actionBtnText}>View Payload</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDownloadNode(item)}
                    style={styles.actionBtn}
                  >
                    <Feather name="download" size={14} color="#475569" />
                  </Pressable>

                  <Pressable
                    onPress={() => handleDeleteNode(item)}
                    disabled={isDeleting === item.id}
                    style={styles.trashBtn}
                  >
                    {isDeleting === item.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Payload Viewer Modal */}
      <Modal visible={!!selectedNote} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedNote(null)}>
        <View style={{ flex: 1, backgroundColor: "#FDFCFB", paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.nodeIconBox, selectedNote?.type === "file" ? { backgroundColor: "#EEF2FF" } : { backgroundColor: "#ECFDF5" }]}>
                <Feather name="file-text" size={20} color={selectedNote?.type === "file" ? "#4F46E5" : "#059669"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {formatNoteTitle(selectedNote?.title || "")}
                </Text>
                <View style={styles.nodeSubjectRow}>
                  <Feather name="hash" size={10} color="#94A3B8" />
                  <Text style={styles.nodeSubjectText}>{selectedNote?.subject}</Text>
                </View>
              </View>
            </View>
            <Pressable onPress={() => setSelectedNote(null)} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
            {selectedNote?.type === "file" && selectedNote.fileUrl && !selectedNote.fileUrl.toLowerCase().includes(".docx") ? (
              <View style={styles.pdfPlaceholder}>
                <Feather name="external-link" size={32} color="#4F46E5" style={{ marginBottom: 12 }} />
                <Text style={styles.pdfPlaceholderText}>This is a PDF blob.</Text>
                <Pressable
                  onPress={() => WebBrowser.openBrowserAsync(selectedNote.fileUrl!)}
                  style={styles.openPdfBtn}
                >
                  <Text style={styles.openPdfBtnText}>Open Document</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.markdownContainer}>
                <Markdown
                  style={{
                    body: { fontSize: 15, lineHeight: 26, color: "#334155", fontFamily: "Inter_400Regular" },
                    heading1: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 20, marginBottom: 12 },
                    heading2: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#0F172A", marginTop: 16, marginBottom: 10 },
                    heading3: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#0F172A", marginTop: 14, marginBottom: 8 },
                    strong: { fontFamily: "Inter_700Bold", color: "#0F172A" },
                  }}
                >
                  {selectedNote?.content || "No extracted content available."}
                </Markdown>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFCFB",
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroSection: {
    marginBottom: 20,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  heroPillText: {
    color: "#4338CA",
    fontFamily: "Inter_800ExtraBold",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 34,
    fontFamily: "Inter_800ExtraBold",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
    lineHeight: 24,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  metricCardGray: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
  },
  metricLabelGray: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValueGray: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
    color: "#0F172A",
  },
  metricCardIndigo: {
    flex: 1,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    borderRadius: 16,
    padding: 16,
  },
  metricLabelIndigo: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    color: "#818CF8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValueIndigo: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
    color: "#4338CA",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchSortContainer: {
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0F172A",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  sortLabelText: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sortButtonText: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#4338CA",
    lineHeight: 18,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  nodeCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  nodeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderContent: {
    flex: 1,
  },
  nodeTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  nodeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaDot: {
    color: "#CBD5E1",
    fontSize: 10,
  },
  cardBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  formatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  formatBadgeFile: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  formatBadgeText: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  formatBadgeTextContent: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sizeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sizeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#475569",
  },
  legacyBadge: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  legacyBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    color: "#D97706",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginBottom: 16,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nodeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#334155",
  },
  trashBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#0F172A",
    marginBottom: 4,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  markdownContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 20,
  },
  pdfPlaceholder: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
  },
  pdfPlaceholderText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#4338CA",
    marginBottom: 20,
  },
  openPdfBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  openPdfBtnText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
