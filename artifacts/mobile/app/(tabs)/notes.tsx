import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-native-markdown-display";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
  OPTIONAL_SUBJECTS,
  TrackerNote,
  useApp,
} from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useRouter } from "expo-router";
import { useNotesSync } from "@/hooks/useNotesSync";
import {
  notesExtractOcr,
  notesExtractPdf,
  notesExtractUrl,
  notesGenerate,
} from "@/lib/ai";

function buildMarkdownStyles(colors: {
  foreground: string;
  mutedForeground: string;
  primary: string;
  border: string;
  muted: string;
}) {
  return {
    body: {
      color: colors.foreground,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: "Inter_400Regular",
    },
    heading1: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginTop: 16,
      marginBottom: 6,
    },
    heading2: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginTop: 14,
      marginBottom: 4,
    },
    heading3: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginTop: 12,
      marginBottom: 3,
    },
    strong: {
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    em: {
      fontFamily: "Inter_400Regular",
      fontStyle: "italic" as const,
    },
    bullet_list: { marginBottom: 6 },
    ordered_list: { marginBottom: 6 },
    bullet_list_item: { marginBottom: 2 },
    ordered_list_item: { marginBottom: 2 },
    list_item: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
    },
    bullet_list_icon: {
      color: colors.primary,
      fontSize: 15,
      marginRight: 6,
      marginTop: 2,
    },
    code_inline: {
      backgroundColor: colors.muted,
      color: colors.primary,
      borderRadius: 4,
      paddingHorizontal: 5,
      fontFamily: "Inter_500Medium",
      fontSize: 13,
    },
    fence: {
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    code_block: {
      backgroundColor: colors.muted,
      borderRadius: 8,
      padding: 12,
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.foreground,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: 12,
      marginLeft: 0,
      color: colors.mutedForeground,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 12,
    },
    paragraph: { marginBottom: 8 },
    link: { color: colors.primary },
    table: { borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
    th: {
      backgroundColor: colors.muted,
      fontFamily: "Inter_700Bold",
      padding: 8,
    },
    td: { padding: 8, borderTopWidth: 1, borderTopColor: colors.border },
  };
}

const SUBJECT_ACCENT: Record<string, string> = {
  Polity: "#4F39F6",
  History: "#06B6D4",
  Geography: "#10B981",
  Economy: "#F59E0B",
  Environment: "#22C55E",
  "Art & Culture": "#EC4899",
  "Science & Tech": "#8B5CF6",
};

function subjectColor(subject: string): string {
  return (
    SUBJECT_ACCENT[subject] ||
    "#" +
      (
        parseInt(
          subject.split("").reduce((a, c) => a + c.charCodeAt(0), 0).toString(),
          10,
        ) % 0xffffff
      )
        .toString(16)
        .padStart(6, "0")
  );
}

type SortOption = "newest" | "az" | "starred";

export default function NotesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { fetchCloudNotes, createCloudNote, updateCloudNote, deleteCloudNote } = useNotesSync();
  const {
    trackerNotes,
    addTrackerNote,
    updateTrackerNote,
    removeTrackerNote,
    optionalSubject,
    setOptionalSubject,
    customSubjects,
    addCustomSubject,
    removeCustomSubject,
  } = useApp();

  // On login, pull cloud notes and merge into local state (cloud wins for new ones)
  const [synced, setSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    if (!user || synced) return;
    (async () => {
      setSyncing(true);
      const cloudNotes = await fetchCloudNotes();
      const localIds = new Set(trackerNotes.map((n) => n.id));
      for (const cn of cloudNotes) {
        if (!localIds.has(cn.id)) {
          addTrackerNote({
            title: cn.title,
            content: cn.content,
            subject: cn.subject,
            tags: cn.tags,
            isStarred: cn.isStarred,
            imageUri: cn.imageUri,
          });
        }
      }
      setSynced(true);
      setSyncing(false);
    })();
  }, [user]);

  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showOptionalModal, setShowOptionalModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [viewingNote, setViewingNote] = useState<TrackerNote | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [addTitle, setAddTitle] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addTags, setAddTags] = useState("");
  const [addImage, setAddImage] = useState<string | null>(null);

  type AddMode = "type" | "camera" | "url" | "pdf" | "generate";
  const [addMode, setAddMode] = useState<AddMode>("type");
  const [addUrl, setAddUrl] = useState("");
  const [addTopic, setAddTopic] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [showContentPreview, setShowContentPreview] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  const [customOptional, setCustomOptional] = useState("");
  const [newCustomSubject, setNewCustomSubject] = useState("");

  const searchInputRef = useRef<TextInput>(null);

  const sortNotes = (notes: TrackerNote[]) => {
    const sorted = [...notes];
    if (sortOption === "newest") sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortOption === "az") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortOption === "starred")
      sorted.sort((a, b) =>
        a.isStarred === b.isStarred
          ? b.createdAt - a.createdAt
          : b.isStarred
          ? 1
          : -1,
      );
    return sorted;
  };

  const allSubjects = useMemo(() => {
    const core = [...CORE_SUBJECTS, ...customSubjects];
    const optional = optionalSubject ? [optionalSubject] : [];
    return { core, optional };
  }, [customSubjects, optionalSubject]);

  const notesForSubject = (subject: string) =>
    trackerNotes.filter((n) => n.subject === subject);

  const activeNotes = useMemo(
    () => sortNotes(activeSubject ? notesForSubject(activeSubject) : []),
    [activeSubject, trackerNotes, sortOption],
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return sortNotes(
      trackerNotes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.subject.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      ),
    );
  }, [searchQuery, trackerNotes, sortOption]);

  const openNote = (note: TrackerNote) => {
    setViewingNote(note);
    setIsEditing(false);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags.join(", "));
    setShowViewModal(true);
  };

  const saveEdit = () => {
    if (!viewingNote) return;
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const patch = {
      title: editTitle.trim() || viewingNote.title,
      content: editContent,
      tags,
    };
    updateTrackerNote(viewingNote.id, patch);
    setViewingNote((prev) =>
      prev ? { ...prev, ...patch } : null,
    );
    setIsEditing(false);
    if (user) updateCloudNote(viewingNote.id, patch);
  };

  const toggleStar = (note: TrackerNote) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newStarred = !note.isStarred;
    updateTrackerNote(note.id, { isStarred: newStarred });
    if (viewingNote?.id === note.id)
      setViewingNote((prev) => (prev ? { ...prev, isStarred: newStarred } : null));
    if (user) updateCloudNote(note.id, { isStarred: newStarred });
  };

  const confirmDelete = (note: TrackerNote) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete Note", `Delete "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          removeTrackerNote(note.id);
          if (showViewModal) setShowViewModal(false);
          if (user) deleteCloudNote(note.id);
        },
      },
    ]);
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setAddImage(res.assets[0].uri);
  };

  const captureImage = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets[0]) setAddImage(res.assets[0].uri);
  };

  // ── Extraction handlers ──────────────────────────────────────────────────

  const captureForOcr = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85, base64: true });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setAddImage(asset.uri);
    setIsExtracting(true);
    try {
      const b64 = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" })}`;
      const text = await notesExtractOcr(b64);
      if (text) setAddContent(text);
    } catch (e: any) {
      Alert.alert("OCR failed", e?.message ?? "Could not read image. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const galleryForOcr = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      base64: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    setAddImage(asset.uri);
    setIsExtracting(true);
    try {
      const b64 = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" })}`;
      const text = await notesExtractOcr(b64);
      if (text) setAddContent(text);
    } catch (e: any) {
      Alert.alert("OCR failed", e?.message ?? "Could not read image. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const extractFromUrl = async () => {
    if (!addUrl.trim().startsWith("http")) {
      Alert.alert("Invalid URL", "Please enter a valid URL starting with http or https.");
      return;
    }
    setIsExtracting(true);
    try {
      const { text, title } = await notesExtractUrl(addUrl.trim());
      if (text) setAddContent(text);
      if (title && !addTitle.trim()) setAddTitle(title);
    } catch (e: any) {
      Alert.alert("Extraction failed", e?.message ?? "Could not extract content from that URL.");
    } finally {
      setIsExtracting(false);
    }
  };

  const pickPdfForExtraction = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/msword",
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setIsExtracting(true);
    try {
      let pdfBase64: string;
      if (Platform.OS === "web") {
        const blob = await fetch(asset.uri).then((r) => r.blob());
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        pdfBase64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: "base64",
        });
      }
      const { text } = await notesExtractPdf(pdfBase64);
      if (text) setAddContent(text);
      if (!addTitle.trim() && asset.name) {
        setAddTitle(asset.name.replace(/\.(pdf|docx?)$/i, ""));
      }
    } catch (e: any) {
      Alert.alert("Extraction failed", e?.message ?? "Could not read the document.");
    } finally {
      setIsExtracting(false);
    }
  };

  const generateNotes = async () => {
    if (!addTopic.trim()) {
      Alert.alert("Enter a topic", "Please type a topic to generate notes for.");
      return;
    }
    setIsExtracting(true);
    try {
      const { text, title } = await notesGenerate(addTopic.trim());
      if (text) setAddContent(text);
      if (!addTitle.trim()) setAddTitle(title || addTopic.trim());
    } catch (e: any) {
      Alert.alert("Generation failed", e?.message ?? "Could not generate notes. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const resetAddModal = () => {
    setAddTitle("");
    setAddContent("");
    setAddTags("");
    setAddImage(null);
    setAddUrl("");
    setAddTopic("");
    setAddMode("type");
    setIsExtracting(false);
    setShowContentPreview(false);
  };

  const saveNote = async () => {
    if (!addTitle.trim() || !activeSubject) return;
    const tags = addTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const notePayload = {
      title: addTitle.trim(),
      content: addContent.trim(),
      subject: activeSubject,
      tags,
      isStarred: false,
      imageUri: addImage ?? undefined,
    };
    const localNote = addTrackerNote(notePayload);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAddModal();
    setShowAddModal(false);
    // Sync to cloud (fire-and-forget, update id if returned)
    if (user) {
      const cloudId = await createCloudNote(notePayload);
      if (cloudId && cloudId !== localNote.id) {
        // update local note id to match cloud id so future updates work
        updateTrackerNote(localNote.id, { id: cloudId } as any);
      }
    }
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        {activeSubject ? (
          <TouchableOpacity
            onPress={() => setActiveSubject(null)}
            style={s.backBtn}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
        ) : null}
        <Text style={s.headerTitle} numberOfLines={1}>
          {activeSubject ?? "Notes Tracker"}
        </Text>
        {activeSubject ? (
          <TouchableOpacity
            style={s.addFab}
            onPress={() => setShowAddModal(true)}
            hitSlop={4}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Cloud sync banner */}
      {!user && !activeSubject && (
        <TouchableOpacity
          style={[s.syncBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}
          onPress={() => router.push("/login" as any)}
        >
          <Feather name="cloud-off" size={14} color={colors.primary} />
          <Text style={[s.syncBannerText, { color: colors.primary }]}>
            Sign in to sync notes across web & app
          </Text>
          <Feather name="arrow-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}

      {user && syncing && !activeSubject && (
        <View style={[s.syncBanner, { backgroundColor: "#10B981" + "12", borderColor: "#10B981" + "30" }]}>
          <Feather name="refresh-cw" size={14} color="#10B981" />
          <Text style={[s.syncBannerText, { color: "#10B981" }]}>Syncing with cloud…</Text>
        </View>
      )}

      {user && !syncing && !activeSubject && (
        <View style={[s.syncBanner, { backgroundColor: "#10B981" + "12", borderColor: "#10B981" + "30" }]}>
          <Feather name="cloud" size={14} color="#10B981" />
          <Text style={[s.syncBannerText, { color: "#10B981" }]}>
            Signed in · notes synced to cloud
          </Text>
          <TouchableOpacity onPress={() => { signOut(); setSynced(false); }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#10B981" }}>Sign out</Text>
          </TouchableOpacity>
        </View>
      )}

      {!activeSubject && (
        <View style={s.searchRow}>
          <Feather name="search" size={16} color={colors.mutedForeground} style={s.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={s.searchInput}
            placeholder="Search subjects, topics or #tags..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {activeSubject && (
        <View style={s.sortRow}>
          {(["newest", "az", "starred"] as SortOption[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.sortChip, sortOption === opt && s.sortChipActive]}
              onPress={() => setSortOption(opt)}
            >
              <Text style={[s.sortChipText, sortOption === opt && s.sortChipTextActive]}>
                {opt === "newest" ? "Newest" : opt === "az" ? "A–Z" : "Starred"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {searchQuery.trim() ? (
          <>
            <Text style={s.sectionLabel}>
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </Text>
            {searchResults.length === 0 ? (
              <View style={s.emptyBox}>
                <Feather name="search" size={32} color={colors.mutedForeground} />
                <Text style={s.emptyText}>No notes matched your search.</Text>
              </View>
            ) : (
              searchResults.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  colors={colors}
                  onPress={() => openNote(note)}
                  onStar={() => toggleStar(note)}
                  onDelete={() => confirmDelete(note)}
                />
              ))
            )}
          </>
        ) : activeSubject ? (
          <>
            {activeNotes.length === 0 ? (
              <View style={s.emptyBox}>
                <Feather name="file-text" size={40} color={colors.mutedForeground} />
                <Text style={s.emptyText}>No notes yet for {activeSubject}.</Text>
                <Text style={s.emptyHint}>Tap + to add your first note.</Text>
              </View>
            ) : (
              activeNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  colors={colors}
                  onPress={() => openNote(note)}
                  onStar={() => toggleStar(note)}
                  onDelete={() => confirmDelete(note)}
                />
              ))
            )}
          </>
        ) : (
          <>
            <Text style={s.sectionLabel}>Core Studies</Text>
            <View style={s.grid}>
              {allSubjects.core.map((subject) => (
                <SubjectCard
                  key={subject}
                  subject={subject}
                  count={notesForSubject(subject).length}
                  accent={subjectColor(subject)}
                  colors={colors}
                  onPress={() => {
                    setActiveSubject(subject);
                    setSearchQuery("");
                  }}
                  onLongPress={
                    customSubjects.includes(subject)
                      ? () => {
                          Alert.alert("Remove folder?", `Remove "${subject}"?`, [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Remove",
                              style: "destructive",
                              onPress: () => removeCustomSubject(subject),
                            },
                          ]);
                        }
                      : undefined
                  }
                />
              ))}
              <TouchableOpacity
                style={[s.subjectCard, s.addSubjectCard]}
                onPress={() => setShowCustomModal(true)}
              >
                <View style={[s.subjectIcon, { backgroundColor: colors.muted }]}>
                  <Feather name="folder-plus" size={18} color={colors.mutedForeground} />
                </View>
                <Text style={[s.subjectName, { color: colors.mutedForeground }]}>
                  Add Folder
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.sectionLabel, { marginTop: 24 }]}>Optional Mastery</Text>
            <View style={s.grid}>
              {allSubjects.optional.length > 0 ? (
                allSubjects.optional.map((subject) => (
                  <SubjectCard
                    key={subject}
                    subject={subject}
                    count={notesForSubject(subject).length}
                    accent={subjectColor(subject)}
                    colors={colors}
                    onPress={() => {
                      setActiveSubject(subject);
                      setSearchQuery("");
                    }}
                    onLongPress={() => {
                      Alert.alert("Remove optional subject?", `Remove "${subject}"?`, [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => setOptionalSubject(null),
                        },
                      ]);
                    }}
                  />
                ))
              ) : null}
              <TouchableOpacity
                style={[s.subjectCard, s.addSubjectCard]}
                onPress={() => setShowOptionalModal(true)}
              >
                <View style={[s.subjectIcon, { backgroundColor: colors.muted }]}>
                  <Feather name="plus-circle" size={18} color={colors.mutedForeground} />
                </View>
                <Text style={[s.subjectName, { color: colors.mutedForeground }]}>
                  {optionalSubject ? "Change Optional" : "Set Optional"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* Add Note Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onDismiss={resetAddModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>New Note</Text>
              <TouchableOpacity
                onPress={() => { setShowAddModal(false); resetAddModal(); }}
                hitSlop={8}
              >
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* Mode tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.modeTabs}
            >
              {(
                [
                  { key: "type", icon: "edit-2", label: "Type" },
                  { key: "camera", icon: "camera", label: "Camera" },
                  { key: "url", icon: "globe", label: "Web URL" },
                  { key: "pdf", icon: "file-text", label: "PDF / Doc" },
                  { key: "generate", icon: "zap", label: "AI Generate" },
                ] as { key: AddMode; icon: string; label: string }[]
              ).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    s.modeTab,
                    { borderColor: colors.border },
                    addMode === tab.key && s.modeTabActive,
                  ]}
                  onPress={() => setAddMode(tab.key)}
                >
                  <Feather
                    name={tab.icon as any}
                    size={14}
                    color={addMode === tab.key ? "#fff" : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      s.modeTabText,
                      { color: addMode === tab.key ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">

              {/* ── Source-specific input ── */}

              {addMode === "camera" && (
                <View style={s.sourceBlock}>
                  <Text style={[s.sourceHint, { color: colors.mutedForeground }]}>
                    Capture your handwritten notes — AI will extract the text automatically.
                  </Text>
                  {addImage && (
                    <View style={s.imagePreviewWrap}>
                      <Image source={{ uri: addImage }} style={s.imagePreview} />
                      <TouchableOpacity style={s.removeImgBtn} onPress={() => setAddImage(null)}>
                        <Feather name="x-circle" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {isExtracting ? (
                    <View style={s.extractingRow}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={[s.extractingText, { color: colors.mutedForeground }]}>
                        Reading handwriting…
                      </Text>
                    </View>
                  ) : (
                    <View style={s.imageRow}>
                      <TouchableOpacity
                        style={[s.imageBtn, { borderColor: colors.border }]}
                        onPress={captureForOcr}
                      >
                        <Feather name="camera" size={18} color={colors.primary} />
                        <Text style={[s.imageBtnText, { color: colors.primary }]}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.imageBtn, { borderColor: colors.border }]}
                        onPress={galleryForOcr}
                      >
                        <Feather name="image" size={18} color={colors.primary} />
                        <Text style={[s.imageBtnText, { color: colors.primary }]}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {addMode === "url" && (
                <View style={s.sourceBlock}>
                  <Text style={[s.sourceHint, { color: colors.mutedForeground }]}>
                    Paste any article or website URL — AI will extract and structure the content.
                  </Text>
                  <View style={s.urlRow}>
                    <TextInput
                      style={[s.urlInput, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="https://..."
                      placeholderTextColor={colors.mutedForeground}
                      value={addUrl}
                      onChangeText={setAddUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                      returnKeyType="go"
                      onSubmitEditing={extractFromUrl}
                    />
                    <TouchableOpacity
                      style={[s.urlBtn, { backgroundColor: colors.primary }, isExtracting && { opacity: 0.5 }]}
                      onPress={extractFromUrl}
                      disabled={isExtracting}
                    >
                      {isExtracting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Feather name="arrow-right" size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {isExtracting && (
                    <Text style={[s.extractingText, { color: colors.mutedForeground, marginTop: 8 }]}>
                      Extracting content from URL…
                    </Text>
                  )}
                </View>
              )}

              {addMode === "pdf" && (
                <View style={s.sourceBlock}>
                  <Text style={[s.sourceHint, { color: colors.mutedForeground }]}>
                    Upload a PDF or Word document — AI will convert it into clean study notes.
                  </Text>
                  {isExtracting ? (
                    <View style={s.extractingRow}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={[s.extractingText, { color: colors.mutedForeground }]}>
                        Extracting document content…
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.uploadBtn, { borderColor: colors.primary }]}
                      onPress={pickPdfForExtraction}
                    >
                      <Feather name="upload-cloud" size={22} color={colors.primary} />
                      <Text style={[s.uploadBtnText, { color: colors.primary }]}>
                        Choose PDF or Word File
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {addMode === "generate" && (
                <View style={s.sourceBlock}>
                  <Text style={[s.sourceHint, { color: colors.mutedForeground }]}>
                    Enter any UPSC topic — AI will generate comprehensive study notes instantly.
                  </Text>
                  <View style={s.urlRow}>
                    <TextInput
                      style={[s.urlInput, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="e.g. Fundamental Rights, Federalism…"
                      placeholderTextColor={colors.mutedForeground}
                      value={addTopic}
                      onChangeText={setAddTopic}
                      returnKeyType="go"
                      onSubmitEditing={generateNotes}
                    />
                    <TouchableOpacity
                      style={[s.urlBtn, { backgroundColor: colors.primary }, isExtracting && { opacity: 0.5 }]}
                      onPress={generateNotes}
                      disabled={isExtracting}
                    >
                      {isExtracting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Feather name="zap" size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {isExtracting && (
                    <Text style={[s.extractingText, { color: colors.mutedForeground, marginTop: 8 }]}>
                      Generating notes with AI…
                    </Text>
                  )}
                </View>
              )}

              {/* ── Common fields (always shown) ── */}

              <Text style={s.fieldLabel}>Title *</Text>
              <TextInput
                style={[s.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="Note title..."
                placeholderTextColor={colors.mutedForeground}
                value={addTitle}
                onChangeText={setAddTitle}
              />

              {/* Content label + Edit/Preview toggle */}
              <View style={s.contentLabelRow}>
                <Text style={s.fieldLabel}>
                  {addMode === "type" ? "Content" : "Extracted Content"}
                </Text>
                {addContent.length > 0 && (
                  <View style={s.previewToggleRow}>
                    <TouchableOpacity
                      style={[
                        s.previewToggleBtn,
                        !showContentPreview && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setShowContentPreview(false)}
                    >
                      <Text style={[
                        s.previewToggleText,
                        { color: !showContentPreview ? "#fff" : colors.mutedForeground },
                      ]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        s.previewToggleBtn,
                        showContentPreview && { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setShowContentPreview(true)}
                    >
                      <Text style={[
                        s.previewToggleText,
                        { color: showContentPreview ? "#fff" : colors.mutedForeground },
                      ]}>Preview</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {showContentPreview && addContent.length > 0 ? (
                <View style={[s.previewBox, { borderColor: colors.border }]}>
                  <Markdown style={buildMarkdownStyles(colors)}>{addContent}</Markdown>
                </View>
              ) : (
                <TextInput
                  style={[s.fieldInput, s.fieldTextarea, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder={
                    addMode === "type"
                      ? "Write your notes here…"
                      : "Content will appear here after extraction — you can edit it."
                  }
                  placeholderTextColor={colors.mutedForeground}
                  value={addContent}
                  onChangeText={(t) => { setAddContent(t); setShowContentPreview(false); }}
                  multiline
                  textAlignVertical="top"
                />
              )}

              <Text style={s.fieldLabel}>Tags (comma separated)</Text>
              <TextInput
                style={[s.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
                placeholder="e.g. federalism, article 370"
                placeholderTextColor={colors.mutedForeground}
                value={addTags}
                onChangeText={setAddTags}
                autoCapitalize="none"
              />

              {/* Image attach (type mode only) */}
              {addMode === "type" && (
                <>
                  <Text style={s.fieldLabel}>Attach Image</Text>
                  {addImage ? (
                    <View style={s.imagePreviewWrap}>
                      <Image source={{ uri: addImage }} style={s.imagePreview} />
                      <TouchableOpacity style={s.removeImgBtn} onPress={() => setAddImage(null)}>
                        <Feather name="x-circle" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={s.imageRow}>
                      <TouchableOpacity
                        style={[s.imageBtn, { borderColor: colors.border }]}
                        onPress={pickImage}
                      >
                        <Feather name="image" size={18} color={colors.primary} />
                        <Text style={[s.imageBtnText, { color: colors.primary }]}>Gallery</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.imageBtn, { borderColor: colors.border }]}
                        onPress={captureImage}
                      >
                        <Feather name="camera" size={18} color={colors.primary} />
                        <Text style={[s.imageBtnText, { color: colors.primary }]}>Camera</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={[s.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[s.saveBtn, (!addTitle.trim() || !activeSubject) && s.saveBtnDisabled]}
                onPress={saveNote}
                disabled={!addTitle.trim() || !activeSubject}
              >
                <Text style={s.saveBtnText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* View/Edit Note Modal */}
      <Modal visible={showViewModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]}>
            {viewingNote && (
              <>
                <View style={s.modalHeader}>
                  {isEditing ? (
                    <TextInput
                      style={[s.modalTitleInput, { color: colors.foreground }]}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="Title"
                    />
                  ) : (
                    <Text style={[s.modalTitle, { color: colors.foreground, flex: 1 }]} numberOfLines={2}>
                      {viewingNote.title}
                    </Text>
                  )}
                  <View style={s.modalHeaderActions}>
                    <TouchableOpacity onPress={() => toggleStar(viewingNote)} hitSlop={8} style={{ marginRight: 12 }}>
                      <Feather
                        name="star"
                        size={20}
                        color={viewingNote.isStarred ? "#F59E0B" : colors.mutedForeground}
                      />
                    </TouchableOpacity>
                    {isEditing ? (
                      <TouchableOpacity onPress={saveEdit} hitSlop={8} style={{ marginRight: 12 }}>
                        <Feather name="check" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => setIsEditing(true)} hitSlop={8} style={{ marginRight: 12 }}>
                        <Feather name="edit-2" size={18} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => confirmDelete(viewingNote)} hitSlop={8} style={{ marginRight: 12 }}>
                      <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowViewModal(false); setIsEditing(false); }} hitSlop={8}>
                      <Feather name="x" size={22} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[s.noteMeta, { borderBottomColor: colors.border }]}>
                  <View style={[s.subjectPill, { backgroundColor: subjectColor(viewingNote.subject) + "22" }]}>
                    <Text style={[s.subjectPillText, { color: subjectColor(viewingNote.subject) }]}>
                      {viewingNote.subject}
                    </Text>
                  </View>
                  <Text style={[s.noteDate, { color: colors.mutedForeground }]}>
                    {new Date(viewingNote.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Text>
                </View>

                <ScrollView contentContainerStyle={s.modalScroll}>
                  {isEditing ? (
                    <>
                      <TextInput
                        style={[s.fieldInput, s.fieldTextarea, { color: colors.foreground, borderColor: colors.border }]}
                        value={editContent}
                        onChangeText={setEditContent}
                        multiline
                        textAlignVertical="top"
                        placeholder="Note content..."
                        placeholderTextColor={colors.mutedForeground}
                      />
                      <Text style={s.fieldLabel}>Tags</Text>
                      <TextInput
                        style={[s.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
                        value={editTags}
                        onChangeText={setEditTags}
                        placeholder="tag1, tag2"
                        placeholderTextColor={colors.mutedForeground}
                        autoCapitalize="none"
                      />
                    </>
                  ) : (
                    <>
                      {viewingNote.imageUri && (
                        <Image
                          source={{ uri: viewingNote.imageUri }}
                          style={s.viewImage}
                          resizeMode="cover"
                        />
                      )}
                      {viewingNote.content ? (
                        <Markdown style={buildMarkdownStyles(colors)}>
                          {viewingNote.content}
                        </Markdown>
                      ) : (
                        <Text style={[s.noteContent, { color: colors.mutedForeground, fontStyle: "italic" }]}>
                          No text content.
                        </Text>
                      )}
                      {viewingNote.tags.length > 0 && (
                        <View style={s.tagRow}>
                          {viewingNote.tags.map((tag) => (
                            <View key={tag} style={[s.tag, { backgroundColor: colors.muted }]}>
                              <Text style={[s.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Optional Subject Modal */}
      <Modal visible={showOptionalModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>Optional Subject</Text>
            <TouchableOpacity onPress={() => { setShowOptionalModal(false); setCustomOptional(""); }} hitSlop={8}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <Text style={[s.modalSubtitle, { color: colors.mutedForeground }]}>
            One optional subject can be tracked at a time.
          </Text>
          <ScrollView contentContainerStyle={s.modalScroll}>
            <View style={s.optionalGrid}>
              {OPTIONAL_SUBJECTS.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[
                    s.optionalItem,
                    { borderColor: optionalSubject === sub ? colors.primary : colors.border },
                    optionalSubject === sub && { backgroundColor: colors.primary + "15" },
                  ]}
                  onPress={() => {
                    setOptionalSubject(sub);
                    setShowOptionalModal(false);
                  }}
                >
                  <Text
                    style={[
                      s.optionalItemText,
                      { color: optionalSubject === sub ? colors.primary : colors.foreground },
                    ]}
                  >
                    {sub}
                  </Text>
                  {optionalSubject === sub && (
                    <Feather name="check" size={14} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.fieldLabel, { marginTop: 20 }]}>Custom Subject</Text>
            <View style={s.customRow}>
              <TextInput
                style={[s.fieldInput, { flex: 1, color: colors.foreground, borderColor: colors.border }]}
                placeholder="e.g. Philosophy"
                placeholderTextColor={colors.mutedForeground}
                value={customOptional}
                onChangeText={setCustomOptional}
              />
              <TouchableOpacity
                style={[s.customAddBtn, { backgroundColor: colors.primary }]}
                disabled={!customOptional.trim()}
                onPress={() => {
                  setOptionalSubject(customOptional.trim());
                  setShowOptionalModal(false);
                  setCustomOptional("");
                }}
              >
                <Text style={s.customAddBtnText}>Set</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Custom Core Subject Modal */}
      <Modal visible={showCustomModal} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>New Folder</Text>
            <TouchableOpacity onPress={() => { setShowCustomModal(false); setNewCustomSubject(""); }} hitSlop={8}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={s.modalScroll}>
            <Text style={s.fieldLabel}>Subject / Topic Name</Text>
            <TextInput
              style={[s.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. Internal Security"
              placeholderTextColor={colors.mutedForeground}
              value={newCustomSubject}
              onChangeText={setNewCustomSubject}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (newCustomSubject.trim()) {
                  addCustomSubject(newCustomSubject.trim());
                  setShowCustomModal(false);
                  setNewCustomSubject("");
                }
              }}
            />
            <TouchableOpacity
              style={[
                s.saveBtn,
                { marginTop: 16 },
                !newCustomSubject.trim() && s.saveBtnDisabled,
              ]}
              disabled={!newCustomSubject.trim()}
              onPress={() => {
                addCustomSubject(newCustomSubject.trim());
                setShowCustomModal(false);
                setNewCustomSubject("");
              }}
            >
              <Text style={s.saveBtnText}>Create Folder</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SubjectCard({
  subject,
  count,
  accent,
  colors,
  onPress,
  onLongPress,
}: {
  subject: string;
  count: number;
  accent: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const s = styles(colors);
  return (
    <Pressable
      style={({ pressed }) => [s.subjectCard, { opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={[s.subjectIcon, { backgroundColor: accent + "22" }]}>
        <Feather name="book-open" size={18} color={accent} />
      </View>
      <Text style={[s.subjectName, { color: colors.foreground }]} numberOfLines={2}>
        {subject}
      </Text>
      <Text style={[s.subjectCount, { color: accent }]}>
        {count} {count === 1 ? "note" : "notes"}
      </Text>
      {count > 0 && (
        <View style={[s.subjectDot, { backgroundColor: accent }]} />
      )}
    </Pressable>
  );
}

function NoteCard({
  note,
  colors,
  onPress,
  onStar,
  onDelete,
}: {
  note: TrackerNote;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  const s = styles(colors);
  const accent = subjectColor(note.subject);
  return (
    <Pressable
      style={({ pressed }) => [s.noteCard, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <View style={[s.noteAccentBar, { backgroundColor: accent }]} />
      <View style={s.noteCardInner}>
        <View style={s.noteCardTop}>
          <Text style={[s.noteTitle, { color: colors.foreground }]} numberOfLines={1}>
            {note.title}
          </Text>
          <TouchableOpacity onPress={onStar} hitSlop={8}>
            <Feather
              name="star"
              size={16}
              color={note.isStarred ? "#F59E0B" : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
        {note.content ? (
          <Text style={[s.noteSnippet, { color: colors.mutedForeground }]} numberOfLines={2}>
            {note.content}
          </Text>
        ) : note.imageUri ? (
          <Text style={[s.noteSnippet, { color: colors.mutedForeground, fontStyle: "italic" }]}>
            📷 Image attached
          </Text>
        ) : null}
        <View style={s.noteCardBottom}>
          {note.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={[s.tag, { backgroundColor: accent + "18" }]}>
              <Text style={[s.tagText, { color: accent }]}>#{tag}</Text>
            </View>
          ))}
          <Text style={[s.noteDate, { color: colors.mutedForeground, marginLeft: "auto" }]}>
            {new Date(note.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    backBtn: { marginRight: 12 },
    headerTitle: {
      flex: 1,
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    addFab: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    syncBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
    },
    syncBannerText: {
      flex: 1,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: colors.muted,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
    },
    sortRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      marginBottom: 8,
      gap: 8,
    },
    sortChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.muted,
    },
    sortChipActive: { backgroundColor: colors.primary },
    sortChipText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    sortChipTextActive: { color: "#fff" },
    scroll: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionLabel: {
      fontSize: 13,
      fontFamily: "Inter_700Bold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 12,
      marginTop: 8,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    subjectCard: {
      width: "47%",
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      position: "relative",
      overflow: "hidden",
    },
    addSubjectCard: { borderStyle: "dashed" },
    subjectIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    subjectName: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 4,
    },
    subjectCount: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    subjectDot: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    emptyBox: {
      alignItems: "center",
      paddingVertical: 60,
      gap: 12,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    emptyHint: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    noteCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      flexDirection: "row",
      overflow: "hidden",
    },
    noteAccentBar: { width: 4 },
    noteCardInner: { flex: 1, padding: 14 },
    noteCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    noteTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      flex: 1,
      marginRight: 8,
    },
    noteSnippet: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
      marginBottom: 8,
    },
    noteCardBottom: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
    },
    noteDate: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
    },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    tagText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 10,
    },
    modal: { flex: 1 },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#E2E8F0",
    },
    modalHeaderActions: { flexDirection: "row", alignItems: "center" },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      flex: 1,
    },
    modalTitleInput: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: "#4F39F6",
      paddingBottom: 2,
    },
    modalSubtitle: {
      paddingHorizontal: 20,
      paddingTop: 8,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
    modalScroll: { padding: 20 },
    modalFooter: {
      padding: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    fieldLabel: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: "#94A3B8",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
      marginTop: 14,
    },
    fieldInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      backgroundColor: "transparent",
    },
    fieldTextarea: { minHeight: 140, paddingTop: 12 },
    imageRow: { flexDirection: "row", gap: 10 },
    imageBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 12,
    },
    imageBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    imagePreviewWrap: { position: "relative" },
    imagePreview: { width: "100%", height: 180, borderRadius: 10 },
    removeImgBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 12,
    },
    saveBtn: {
      backgroundColor: "#4F39F6",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: {
      color: "#fff",
      fontSize: 15,
      fontFamily: "Inter_700Bold",
    },
    optionalGrid: { gap: 8 },
    optionalItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    optionalItemText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    customRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    customAddBtn: {
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    customAddBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
    noteMeta: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: 10,
    },
    subjectPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    subjectPillText: { fontSize: 12, fontFamily: "Inter_700Bold" },
    viewImage: {
      width: "100%",
      height: 200,
      borderRadius: 12,
      marginBottom: 16,
    },
    noteContent: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      lineHeight: 24,
    },
    contentLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 14,
      marginBottom: 6,
    },
    previewToggleRow: {
      flexDirection: "row",
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#4F39F6",
    },
    previewToggleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    previewToggleText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    previewBox: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      minHeight: 140,
    },
    modeTabs: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      flexDirection: "row",
    },
    modeTab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
    },
    modeTabActive: {
      backgroundColor: "#4F39F6",
      borderColor: "#4F39F6",
    },
    modeTabText: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    sourceBlock: {
      marginBottom: 4,
      gap: 10,
    },
    sourceHint: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 18,
      marginBottom: 4,
    },
    urlRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    urlInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    urlBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    uploadBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderRadius: 12,
      paddingVertical: 24,
    },
    uploadBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    extractingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
    },
    extractingText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
  });
}
