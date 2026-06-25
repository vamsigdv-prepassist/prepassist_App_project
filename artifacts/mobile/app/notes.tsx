import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-native-markdown-display";
import { PDFDocument } from "pdf-lib";
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
import { Stack, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CORE_SUBJECTS,
  OPTIONAL_SUBJECTS,
  TrackerNote,
  useApp,
} from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useNotesSync, type NoteUpdate } from "@/hooks/useNotesSync";
import {
  notesExtractOcr,
  notesExtractPdf,
  notesExtractUrl,
  notesGenerate,
  bm25Retrieve,
} from "@/lib/ai";
import { saveCloudNote as saveCloudVaultNote } from "@/lib/cloud_notes";
import { db, storage } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
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

export function getMarkdownContent(content: string): string {
  if (!content) return "";
  
  // If it doesn't have common HTML tags, return as is.
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }

  let md = content;
  
  // Replace Headers
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n\n');

  // Replace Bold
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');

  // Replace Italic
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');

  // Replace Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');

  // Replace List Items
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');

  // Replace Lists (strip wrappers)
  md = md.replace(/<ul[^>]*>/gi, '\n');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol[^>]*>/gi, '\n');
  md = md.replace(/<\/ol>/gi, '\n');

  // Replace br
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // Remove lingering HTML tags safely without destroying math symbols
  md = md.replace(/<\/?(?:div|span|section|article|header|footer|nav|aside|main)[^>]*>/gi, '');

  // Decode HTML entities
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");

  // Clean up excessive newlines
  md = md.replace(/\n{3,}/g, '\n\n').trim();

  return md;
}

export function getHtmlFromMarkdown(md: string): string {
  if (!md) return "";
  
  let html = md;
  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Headers
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code inline
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>');
  // Wrap sequential <li> tags in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
  // Clean up adjacent <ul> tags
  html = html.replace(/<\/ul>\s*<ul>/gim, '');
  
  // Paragraphs (wrap anything not already in a block tag)
  html = html.replace(/^(?!<(h[1-6]|ul|li|p)>)(.*$)/gim, '<p>$1</p>');
  
  // Clean empty paragraphs
  html = html.replace(/<p>\s*<\/p>/gim, '');
  
  return html;
}

export function getPlainTextSnippet(content: string): string {
  if (!content) return "";
  let text = getMarkdownContent(content);
  // Strip common markdown characters and normalize newlines to spaces
  text = text.replace(/[#*`~_]/g, '');
  text = text.replace(/\n+/g, ' ').trim();
  return text;
}

type SortOption = "newest" | "az" | "starred";

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    fetchCloudNotes,
    createCloudNote,
    updateCloudNote,
    deleteCloudNote,
    fetchNoteUpdates,
    mergeNoteUpdate,
    ignoreNoteUpdate,
  } = useNotesSync();
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

  // Cloud sync handled by AppContext subscribeUserNotes automatically
  const [synced, setSynced] = useState(true);

  // Build pending note updates directly from real-time trackerNotes
  useEffect(() => {
    if (!user) { setNoteUpdatesMap({}); return; }
    
    const map: Record<string, NoteUpdate[]> = {};
    for (const note of trackerNotes) {
      if (note.hasUpdates && note.updatesList && note.updatesList.length > 0) {
        const ignoredSet = new Set(note.ignoredUpdateIds || []);
        
        note.updatesList.forEach((u: any) => {
          if (!ignoredSet.has(u.id)) {
            if (!map[note.id]) map[note.id] = [];
            map[note.id].push({
               id: u.id,
               note_id: note.id,
               title: u.title || "Update",
               source: u.source || "Global Vault",
               date: u.date || new Date().toISOString(),
               excerpt: u.excerpt || "",
               content: u.content || "",
               imageUrl: u.imageUrl || undefined,
               status: "pending",
               created_at: new Date().toISOString()
            });
          }
        });
      }
    }
    
    setNoteUpdatesMap(map);
  }, [user, trackerNotes]);

  // Note: Local BM25 auto-mapper has been removed. 
  // Staged notes are now natively vectorized and mapped to Core Notes via the /api/rag/sync backend pipeline 
  // matching the prepassist-web-v2 architecture precisely.

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
  const [extractingProgress, setExtractingProgress] = useState("");
  const [showContentPreview, setShowContentPreview] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  const [customOptional, setCustomOptional] = useState("");
  const [newCustomSubject, setNewCustomSubject] = useState("");

  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedSourcesFull, setExpandedSourcesFull] = useState<Record<string, boolean>>({});

  // ── Note Updates (RAG) ──────────────────────────────────────────────────
  const [noteUpdatesMap, setNoteUpdatesMap] = useState<Record<string, NoteUpdate[]>>({});
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [updatesModalNote, setUpdatesModalNote] = useState<TrackerNote | null>(null);
  const [updatesLoading, setUpdatesLoading] = useState(false);

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

  useEffect(() => {
    if (viewingNote) {
      const updated = trackerNotes.find(n => n.id === viewingNote.id);
      if (updated && (updated.hasUpdates !== viewingNote.hasUpdates || updated.content !== viewingNote.content || updated.mergedSources?.length !== viewingNote.mergedSources?.length)) {
        setViewingNote(updated);
      }
    }
  }, [trackerNotes]);

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

  // ── Note Updates handlers ─────────────────────────────────────────────
  const openUpdatesModal = (note: TrackerNote) => {
    setUpdatesModalNote(note);
    setShowUpdatesModal(true);
  };

  const pendingUpdatesForModal = updatesModalNote
    ? (noteUpdatesMap[updatesModalNote.id] ?? [])
    : [];

  const handleMergeAllUpdates = async (note: TrackerNote) => {
    setUpdatesLoading(true);
    try {
       const updatesToMerge = pendingUpdatesForModal.map(u => ({
           id: u.id.replace("fb_", ""),
           title: u.title,
           content: u.content,
           source: u.source,
           date: u.created_at
       }));

       const updatesString = updatesToMerge.map((u, i) => `Update ${i+1} (${u.date} - ${u.source}): ${u.title}\n${u.content}`).join('\n\n');

       const prompt = `You are a hyper-intelligent UPSC Civil Services exam mentor specializing exclusively in synthesizing robust conceptual structures.

Your objective is to seamlessly MERGE and SUMMARIZE new global current affairs updates strictly into the user's existing core Notes, explicitly retaining all foundational information securely.

### Existing Core Notes:
${note.content}

### Newly Detected Constraints (Global Updates):
${updatesString}

INSTRUCTIONS:
1. Meticulously synthesize all provided updates (Global News & Vault Data) into the existing notes.
2. If the existing notes have logical sections (e.g., ### Headers), interweave new updates into their corresponding sections based on context.
3. If an update introduces a new dimension, create a professional "### Contemporary Context" or specific sub-header to house it.
4. Prioritize factual density and academic depth; bold key terms and use clean bullet points for readability.
5. Ensure the final document flows as a single, cohesive, and deeply exhaustive study manual.
6. Explicitly retain the student's original foundational information; do not summarize the original notes away.
7. OUTPUT STRICTLY THE RAW MARKDOWN TEXT. NO INTRODUCTIONS, NO CODE BLOCKS, NO CONVERSATIONAL CHATTER. DO NOT add any 'Sources Integrated' or footer section at the end.`;

       const openRouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";

       const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
           method: "POST",
           headers: { 
               "Authorization": `Bearer ${openRouterKey}`, 
               "Content-Type": "application/json" 
           },
           body: JSON.stringify({
               model: "openai/gpt-4o-mini",
               max_tokens: 3500,
               temperature: 0.3,
               messages: [{ role: "user", content: prompt }]
           })
       });
       
       if (!res.ok) throw new Error("AI Merge Failed from OpenRouter");
       const data = await res.json();
       let mergedText = data.choices?.[0]?.message?.content || "";
       
       // Robustly strip outer markdown code blocks (e.g. ```markdown ... ```)
       mergedText = mergedText.replace(/^```[a-z]*\n/i, "").replace(/\n```$/, "").trim();

       // Convert markdown -> HTML natively without external libraries
       const finalHtml = getHtmlFromMarkdown(mergedText);

       const mergedItems = updatesToMerge.map(u => ({
           title: u.title,
           source: u.source,
           date: u.created_at,
           excerpt: u.content,
           content: u.content,
           imageUrl: "" 
       }));

       const previousSources = note.mergedSources || [];
       const allMergedSources = [...previousSources, ...mergedItems];

       const now = Date.now();
       
       updateTrackerNote(note.id, { content: finalHtml, lastSyncedAt: now, mergedSources: allMergedSources, hasUpdates: false, updatesList: [] });
       
       if (user) {
           const incomingIds = pendingUpdatesForModal.map(u => u.id).filter(Boolean);
           const newIgnored = Array.from(new Set([...(note.ignoredUpdateIds || []), ...incomingIds]));
           updateCloudNote(note.id, { 
               content: finalHtml, 
               mergedSources: allMergedSources, 
               hasUpdates: false, 
               updatesList: [],
               ignoredUpdateIds: newIgnored
           });
       }

       setNoteUpdatesMap(prev => ({ ...prev, [note.id]: [] }));
       setShowUpdatesModal(false);
    } catch (e) {
       console.warn("Merge All Failed:", e);
       Alert.alert("Merge Failed", "Could not process AI merge. Please try again.");
    } finally {
       setUpdatesLoading(false);
    }
  };

  const handleIgnoreAllUpdates = async (note: TrackerNote) => {
    setUpdatesLoading(true);
    try {
       const incomingIds = pendingUpdatesForModal.map(u => u.id);
       const newIgnored = Array.from(new Set([...(note.ignoredUpdateIds || []), ...incomingIds]));

       updateTrackerNote(note.id, { hasUpdates: false, updatesList: [] });
       if (user) {
           updateCloudNote(note.id, { 
               hasUpdates: false, 
               updatesList: [],
               ignoredUpdateIds: newIgnored
           });
       }

       setNoteUpdatesMap(prev => ({ ...prev, [note.id]: [] }));
       setShowUpdatesModal(false);
    } catch (e) {
       console.warn("Ignore All Failed:", e);
    } finally {
       setUpdatesLoading(false);
    }
  };

  const handleMergeUpdate = async (update: NoteUpdate, note: TrackerNote) => {
    setUpdatesLoading(true);
    const merged = note.content
      ? `${note.content}\n\n---\n\n${update.content}`
      : update.content;
      
    const newMergedSource = {
      title: update.title,
      source: update.source,
      date: update.created_at,
      excerpt: update.content,
      content: update.content,
      imageUrl: ""
    };
    
    const previousSources = note.mergedSources || [];
    const allMergedSources = [...previousSources, newMergedSource];
    
    const incomingId = update.id;
    const newIgnored = incomingId ? Array.from(new Set([...(note.ignoredUpdateIds || []), incomingId])) : (note.ignoredUpdateIds || []);
    const remainingUpdates = pendingUpdatesForModal.filter(u => u.id !== update.id);
    const hasUpdates = remainingUpdates.length > 0;
    
    const now = Date.now();
    updateTrackerNote(note.id, { content: merged, lastSyncedAt: now, mergedSources: allMergedSources, hasUpdates, updatesList: remainingUpdates });
    
    if (user) {
       updateCloudNote(note.id, { 
           content: merged, 
           mergedSources: allMergedSources, 
           hasUpdates, 
           updatesList: remainingUpdates,
           ignoredUpdateIds: newIgnored
       });
    }

    setNoteUpdatesMap((prev) => {
      return { ...prev, [note.id]: remainingUpdates };
    });
    setUpdatesLoading(false);
    if (!hasUpdates) setShowUpdatesModal(false);
  };

  const handleIgnoreUpdate = async (update: NoteUpdate, note: TrackerNote) => {
    setUpdatesLoading(true);
    
    const incomingId = update.id;
    const newIgnored = Array.from(new Set([...(note.ignoredUpdateIds || []), incomingId]));
    const remainingUpdates = pendingUpdatesForModal.filter(u => u.id !== update.id);
    const hasUpdates = remainingUpdates.length > 0;

    updateTrackerNote(note.id, { hasUpdates, updatesList: remainingUpdates });
    
    if (user) {
       updateCloudNote(note.id, { 
           hasUpdates, 
           updatesList: remainingUpdates,
           ignoredUpdateIds: newIgnored
       });
    }

    setNoteUpdatesMap((prev) => {
      return { ...prev, [note.id]: remainingUpdates };
    });
    setUpdatesLoading(false);
    if (!hasUpdates) setShowUpdatesModal(false);
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
    
    // 100 MB Limit check natively in mobile app
    if (asset.size && asset.size > 100 * 1024 * 1024) {
      Alert.alert("File Too Large", "Please select a document smaller than 100 MB.");
      return;
    }
    
    setIsExtracting(true);
    setExtractingProgress("");
    try {
      if (!user) throw new Error("User not authenticated.");
      
      const fetchRes = await fetch(asset.uri);
      const arrayBuffer = await fetchRes.arrayBuffer();

      setExtractingProgress("Uploading to AI Engine...");
      
      const isPdf = asset.name.endsWith(".pdf") || asset.mimeType === "application/pdf";
      const ext = isPdf ? "pdf" : "docx";
      const contentType = asset.mimeType || (isPdf ? "application/pdf" : "application/octet-stream");
      
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const bucket = isPdf ? 'extract-split' : 'extract-single';
      const storageRef = ref(storage, `${bucket}/${user.uid}/${jobId}.${ext}`);
      const metadata = { contentType };
      const uploadTask = uploadBytesResumable(storageRef, arrayBuffer, metadata);

      await new Promise((resolve, reject) => {
         uploadTask.on('state_changed', null, (error) => reject(error), () => resolve(true));
      });

      setExtractingProgress("Extracting Content (This might take a minute)...");
      const extractedText = await new Promise<string>((resolve, reject) => {
         const unsubscribe = onSnapshot(doc(db, 'pdf_jobs', jobId), (docSnap) => {
            if (docSnap.exists()) {
               const jobData = docSnap.data();
               if (jobData.status === 'COMPLETE') {
                  unsubscribe();
                  if (isPdf && jobData.chunks) {
                     const combined = Object.values(jobData.chunks).join("\n\n---\n\n");
                     resolve(combined || "AI Extraction complete but no text generated.");
                  } else {
                     resolve(jobData.text || "AI Extraction complete but no text generated.");
                  }
               } else if (jobData.status === 'FAILED') {
                  unsubscribe();
                  reject(new Error(jobData.error || "Failed to parse document"));
               }
            }
         });
      });

      if (extractedText) setAddContent(extractedText);
      if (!addTitle.trim() && asset.name) {
        setAddTitle(asset.name.replace(/\.(pdf|docx?)$/i, ""));
      }
    } catch (e: any) {
      Alert.alert("Extraction failed", e?.message ?? "Could not read the document.");
    } finally {
      setIsExtracting(false);
      setExtractingProgress("");
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
    // Sync to cloud (Firebase onSnapshot will merge it automatically)
    if (user) {
      await createCloudNote(notePayload);
    }
  };

  const s = styles(colors);

  return (
    <View style={[s.safeArea, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
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
                  pendingUpdatesCount={(noteUpdatesMap[note.id] ?? []).length}
                  onSeeUpdates={() => openUpdatesModal(note)}
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
                  pendingUpdatesCount={(noteUpdatesMap[note.id] ?? []).length}
                  onSeeUpdates={() => openUpdatesModal(note)}
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
              style={{ flexGrow: 0, flexShrink: 0 }}
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
                        {extractingProgress || "Extracting document content…"}
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
                  <Markdown style={buildMarkdownStyles(colors)}>{getMarkdownContent(addContent)}</Markdown>
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
                          {getMarkdownContent(viewingNote.content)}
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

                      {/* Merged Sources Permanent Section */}
                      {viewingNote.mergedSources && viewingNote.mergedSources.length > 0 && (
                        <View style={s.mergedSourcesContainer}>
                          <View style={s.mergedSourcesHeader}>
                            <Feather name="layers" size={14} color="#059669" style={{ marginRight: 6 }} />
                            <Text style={s.mergedSourcesTitle}>
                              DOCUMENT COMPOSED FROM • {viewingNote.mergedSources.length} SOURCE{viewingNote.mergedSources.length !== 1 ? 'S' : ''}
                            </Text>
                          </View>

                          {viewingNote.mergedSources.map((src: any, i: number) => {
                            const key = `merged-src-${i}`;
                            const isOpen = expandedSources[key] !== false;
                            const isFullOpen = expandedSourcesFull[key] !== false;
                            const hasFullContent = src.content && src.content !== src.excerpt;
                            
                            const isVault = src.source?.toLowerCase().includes("vault") || src.title.includes("[Vault Data]");

                            return (
                              <View key={i} style={s.mergedSourceCard}>
                                <TouchableOpacity
                                  style={s.mergedSourceTrigger}
                                  onPress={() => setExpandedSources(prev => ({ ...prev, [key]: !isOpen }))}
                                  activeOpacity={0.7}
                                >
                                  <View style={s.mergedSourceNumberWrap}>
                                    <Text style={s.mergedSourceNumberText}>{i + 1}</Text>
                                  </View>
                                  <View style={s.mergedSourceInfo}>
                                    <Text style={s.mergedSourceCardTitle} numberOfLines={1}>{src.title}</Text>
                                    <Text style={s.mergedSourceCardMeta}>{src.source} • {src.date}</Text>
                                  </View>
                                  <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={18} color="#10B981" />
                                </TouchableOpacity>

                                {isOpen && (
                                  <View style={s.mergedSourceContent}>
                                    <View style={s.mergedSourceTagsRow}>
                                      <View style={[s.mergedSourceTag, { backgroundColor: isVault ? "#F3E8FF" : "#D1FAE5", borderColor: isVault ? "#E9D5FF" : "#A7F3D0" }]}>
                                        <Text style={[s.mergedSourceTagText, { color: isVault ? "#7E22CE" : "#047857" }]}>
                                          {isVault ? "PERSONAL VAULT" : "GLOBAL NEWS"}
                                        </Text>
                                      </View>
                                      <View style={{ flex: 1 }} />
                                      <View style={s.mergedSourceDateBox}>
                                        <Text style={s.mergedSourceDateText}>DATE: {src.date}</Text>
                                      </View>
                                    </View>

                                    <View style={s.mergedSourceTextBox}>
                                      <Markdown style={buildMarkdownStyles(colors)}>
                                        {getMarkdownContent(isFullOpen ? (src.content || src.excerpt || "No content available.") : (src.excerpt || src.content || "No content available."))}
                                      </Markdown>
                                      {hasFullContent && (
                                        <TouchableOpacity 
                                          style={s.mergedSourceReadMoreBtn}
                                          onPress={() => setExpandedSourcesFull(prev => ({ ...prev, [key]: !isFullOpen }))}
                                        >
                                          <Text style={s.mergedSourceReadMoreText}>
                                            {isFullOpen ? "Show Less" : "Read Full Content"}
                                          </Text>
                                        </TouchableOpacity>
                                      )}
                                    </View>

                                    {src.imageUrl && !src.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                      <Image source={{ uri: src.imageUrl }} style={s.mergedSourceImage} />
                                    ) : (
                                      isVault && (!src.excerpt || src.excerpt.includes("Note:")) && (
                                        <View style={s.mergedSourceStagedBox}>
                                          <View style={s.mergedSourceStagedIcon}>
                                            <Feather name="file-text" size={24} color="#F97316" />
                                          </View>
                                          <Text style={s.mergedSourceStagedText}>Staged Vault Document</Text>
                                        </View>
                                      )
                                    )}

                                    <View style={s.mergedSourceFooterBox}>
                                      <View style={s.mergedSourceSourceBox}>
                                        <Text style={s.mergedSourceSourceText}>SOURCE: {src.source}</Text>
                                      </View>
                                    </View>
                                  </View>
                                )}
                              </View>
                            );
                          })}
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

      {/* Note Updates Modal */}
      <Modal
        visible={showUpdatesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUpdatesModal(false)}
      >
        <SafeAreaView style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={s.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>
                Note Updates
              </Text>
              {updatesModalNote && (
                <Text
                  style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4 }}
                  numberOfLines={1}
                >
                  {updatesModalNote.title}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowUpdatesModal(false)} hitSlop={8}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {pendingUpdatesForModal.length === 0 ? (
              <View style={s.emptyBox}>
                <Feather name="check-circle" size={32} color="#10B981" />
                <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
                  All updates processed
                </Text>
              </View>
            ) : (
              pendingUpdatesForModal.map((update) => (
                <View
                  key={update.id}
                  style={[s.updateItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={s.updateItemHeader}>
                    <View style={s.updateDot} />
                    <Text style={[s.updateTitle, { color: colors.foreground }]}>{update.title}</Text>
                    <Text style={[s.updateDate, { color: colors.mutedForeground }]}>
                      {new Date(update.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  {update.source ? (
                    (() => {
                      const isVault = update.source.toLowerCase().includes("vault") || update.source.toLowerCase().includes("raw note");
                      const bgColor = isVault ? "#F3E8FF" : "#10B98112";
                      const fgColor = isVault ? "#7E22CE" : "#10B981";
                      return (
                        <View style={[s.updateSourceRow, { backgroundColor: bgColor }]}>
                          <Feather name="database" size={11} color={fgColor} />
                          <Text style={[s.updateSourceText, { color: fgColor }]}>{update.source}</Text>
                        </View>
                      );
                    })()
                  ) : null}
                  <View style={s.updateContentBox}>
                    <Markdown style={buildMarkdownStyles(colors)}>
                      {getMarkdownContent(update.content)}
                    </Markdown>
                  </View>

                  <View style={[s.updateActionRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={s.updateActionBtn}
                      onPress={() => updatesModalNote && handleIgnoreUpdate(update, updatesModalNote)}
                      disabled={updatesLoading}
                    >
                      <Text style={[s.updateActionText, { color: colors.mutedForeground }]}>Ignore</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.updateActionBtn, { backgroundColor: "#10B9811A", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }]}
                      onPress={() => updatesModalNote && handleMergeUpdate(update, updatesModalNote)}
                      disabled={updatesLoading}
                    >
                      <Text style={[s.updateActionText, { color: "#10B981", fontWeight: "600" }]}>Merge Update</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* AI Merge Footer - Mirrored from Web App */}
          {pendingUpdatesForModal.length > 0 && updatesModalNote && (
            <View style={[s.modalFooter, { borderTopColor: colors.border, flexDirection: "row", gap: 12, paddingBottom: insets.bottom || 20 }]}>
              <TouchableOpacity
                style={[s.ignoreAllBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                onPress={() => handleIgnoreAllUpdates(updatesModalNote)}
                disabled={updatesLoading}
              >
                <Text style={[s.ignoreAllBtnText, { color: colors.foreground }]}>Ignore All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.mergeAllBtn, updatesLoading && { opacity: 0.6 }]}
                onPress={() => handleMergeAllUpdates(updatesModalNote)}
                disabled={updatesLoading}
              >
                {updatesLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="zap" size={16} color="#fff" />
                    <Text style={s.mergeAllBtnText}>AI Summarize & Merge</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
    </View>
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
  pendingUpdatesCount = 0,
  onSeeUpdates,
}: {
  note: TrackerNote;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onStar: () => void;
  onDelete: () => void;
  pendingUpdatesCount?: number;
  onSeeUpdates?: () => void;
}) {
  const s = styles(colors);
  const accent = subjectColor(note.subject);
  const hasUpdates = pendingUpdatesCount > 0;
  const updateColor = hasUpdates ? "#10B981" : colors.mutedForeground;

  return (
    <Pressable
      style={({ pressed }) => [s.noteCard, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <View style={[s.noteAccentBar, { backgroundColor: accent }]} />
      <View style={s.noteCardInner}>
        <View style={s.noteCardTop}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[s.noteTitle, { color: colors.foreground, flexShrink: 1 }]} numberOfLines={1}>
              {note.title}
            </Text>
            {note.isStaged && (
              <View style={[s.tag, { backgroundColor: "#FDF4ED" }]}>
                <Text style={[s.tagText, { color: "#F97316" }]}>Raw Upload</Text>
              </View>
            )}
          </View>
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
            {getPlainTextSnippet(note.content)}
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

        {/* Updates footer row */}
        {!note.isStaged && (
          <View style={s.noteUpdatesRow}>
            <View style={s.noteUpdatesBadge}>
              <View
                style={[
                  s.noteUpdatesDot,
                  { backgroundColor: hasUpdates ? "#10B981" : colors.mutedForeground + "60" },
                ]}
              />
              <Text style={[s.noteUpdatesBadgeText, { color: updateColor }]}>
                Updates{hasUpdates ? ` (${pendingUpdatesCount})` : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={hasUpdates ? onSeeUpdates : undefined}
              disabled={!hasUpdates}
              hitSlop={6}
            >
              <Text
                style={[
                  s.seeUpdatesText,
                  { color: updateColor, opacity: hasUpdates ? 1 : 0.45 },
                ]}
              >
                See Updates →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {note.lastSyncedAt ? (
          <Text style={[s.lastSyncedText, { color: colors.mutedForeground }]}>
            Last synced:{" "}
            {new Date(note.lastSyncedAt).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        ) : null}
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
    noteUpdatesRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    noteUpdatesBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    noteUpdatesDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    noteUpdatesBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
    },
    seeUpdatesText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
    },
    lastSyncedText: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
      marginTop: 4,
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
    updateItem: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      gap: 10,
    },
    updateItemHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    updateDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#10B981",
    },
    updateTitle: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    updateDate: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
    },
    updateSourceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      alignSelf: "flex-start",
    },
    updateSourceText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: "#10B981",
    },
    updateContentBox: {
      padding: 16,
    },
    updateActionRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: 12,
      borderTopWidth: 1,
      gap: 12,
    },
    updateActionBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    updateActionText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    ignoreAllBtn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    ignoreAllBtnText: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    mergeAllBtn: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "#10B981",
      borderRadius: 12,
      paddingVertical: 14,
      shadowColor: "#10B981",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    mergeAllBtnText: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: "#fff",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
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
    mergedSourcesContainer: {
      marginTop: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    mergedSourcesHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    mergedSourcesTitle: {
      fontSize: 11,
      fontFamily: "Inter_800ExtraBold",
      color: "#059669",
      letterSpacing: 0.5,
    },
    mergedSourceCard: {
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    mergedSourceTrigger: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    mergedSourceNumberWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    mergedSourceNumberText: {
      fontSize: 12,
      fontFamily: "Inter_800ExtraBold",
      color: "#059669",
    },
    mergedSourceInfo: {
      flex: 1,
    },
    mergedSourceCardTitle: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 4,
    },
    mergedSourceCardMeta: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    mergedSourceContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 16,
      backgroundColor: colors.background,
    },
    mergedSourceTagsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    mergedSourceTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
    },
    mergedSourceTagText: {
      fontSize: 9,
      fontFamily: "Inter_800ExtraBold",
      letterSpacing: 0.5,
    },
    mergedSourceDateBox: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    mergedSourceDateText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    mergedSourceTextBox: {
      backgroundColor: colors.muted,
      padding: 12,
      borderRadius: 12,
      marginBottom: 12,
    },
    mergedSourceReadMoreBtn: {
      marginTop: 8,
      paddingVertical: 8,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    mergedSourceReadMoreText: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      color: "#059669",
    },
    mergedSourceImage: {
      width: "100%",
      height: 200,
      borderRadius: 12,
      marginBottom: 12,
    },
    mergedSourceStagedBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "#FFF7ED",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#FFEDD5",
      marginBottom: 12,
    },
    mergedSourceStagedIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#FFEDD5",
      alignItems: "center",
      justifyContent: "center",
    },
    mergedSourceStagedText: {
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      color: "#C2410C",
    },
    mergedSourceFooterBox: {
      flexDirection: "row",
      alignItems: "center",
    },
    mergedSourceSourceBox: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    mergedSourceSourceText: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    }
  });
}
