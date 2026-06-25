import React, { useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useAuth } from "@/contexts/AuthContext";
import { uploadNoteStorage, saveCloudNote } from "@/lib/cloud_notes";
import { notesExtractPdf, notesExtractOcr } from "@/lib/ai";
import { CORE_SUBJECTS, OPTIONAL_SUBJECTS } from "@/contexts/AppContext";
import { db, storage } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";

interface StagedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  isManualText?: boolean;
  rawText?: string;
}

export default function RawNotesStaging() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  // Text Note State
  const [isTextNoteModalOpen, setIsTextNoteModalOpen] = useState(false);
  const [newTextNoteTitle, setNewTextNoteTitle] = useState("");
  const [newTextNoteContent, setNewTextNoteContent] = useState("");

  // Feed Modal State
  const [activeFile, setActiveFile] = useState<StagedFile | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(CORE_SUBJECTS[0]);
  const [isFeeding, setIsFeeding] = useState(false);
  const [feedingStatus, setFeedingStatus] = useState("");
  const [feedSuccess, setFeedSuccess] = useState(false);

  const allSubjects = [
    { title: "Core Studies", items: CORE_SUBJECTS },
    { title: "Optional Mastery", items: OPTIONAL_SUBJECTS },
  ];

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets[0]) {
        const file = res.assets[0];
        if (file.size && file.size > 4 * 1024 * 1024) {
          if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
            if (file.size > 100 * 1024 * 1024) {
              Alert.alert("File Too Large", "Please select PDFs under 100MB.");
              return;
            }
          } else {
            Alert.alert("File Too Large", "Please select non-PDF files under 4MB for optimal AI processing.");
            return;
          }
        }
        setStagedFiles((prev) => [
          ...prev,
          { uri: file.uri, name: file.name, size: file.size || 0, mimeType: file.mimeType || "application/pdf" },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        const file = res.assets[0];
        if (file.fileSize && file.fileSize > 4 * 1024 * 1024) {
          Alert.alert("File Too Large", "Please select files under 4MB for optimal AI processing.");
          return;
        }
        setStagedFiles((prev) => [
          ...prev,
          { uri: file.uri, name: file.fileName || "Image_Note.jpg", size: file.fileSize || 0, mimeType: file.mimeType || "image/jpeg" },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createManualTextNote = () => {
    if (!newTextNoteTitle.trim() || !newTextNoteContent.trim()) {
      Alert.alert("Required", "Title and Content are required.");
      return;
    }
    setStagedFiles((prev) => [
      ...prev,
      {
        uri: "",
        name: `${newTextNoteTitle}.txt`,
        size: newTextNoteContent.length,
        mimeType: "text/plain",
        isManualText: true,
        rawText: newTextNoteContent,
      },
    ]);
    setNewTextNoteTitle("");
    setNewTextNoteContent("");
    setIsTextNoteModalOpen(false);
  };

  const openIntegrationModal = (file: StagedFile) => {
    setActiveFile(file);
    setPageTitle(file.name.split(".")[0]);
    setHashtags("");
    setFeedSuccess(false);
    setFeedingStatus("");
  };

  const finalizeFeed = async () => {
    if (!activeFile || !user) return;
    if (!pageTitle.trim()) {
      Alert.alert("Required", "Title map required securely.");
      return;
    }

    setIsFeeding(true);
    setFeedingStatus("Authenticating Blob Data...");

    try {
      let extractedText = "Media Object: Synchronized safely to Cloud Vault.";
      let secureUrl = "";

      if (activeFile.isManualText) {
        extractedText = activeFile.rawText || "";
        setFeedingStatus("Syncing Manual Text Nodes...");
      } else {
        const isImage = activeFile.mimeType.startsWith("image/");

        // Extract AI Text
        try {
          if (isImage) {
            setFeedingStatus("Reading Document with Vision AI...");
            const b64 = await FileSystem.readAsStringAsync(activeFile.uri, { encoding: "base64" });
            const ocrRes = await notesExtractOcr(`data:${activeFile.mimeType};base64,${b64}`);
            if (ocrRes) extractedText = ocrRes;
          } else if (activeFile.mimeType === "application/pdf" || activeFile.name.endsWith(".pdf")) {
            setFeedingStatus("Pushing Bytes to Extraction Engine...");
            const res = await fetch(activeFile.uri);
            const arrayBuffer = await res.arrayBuffer();
            
            const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const storageRef = ref(storage, `extract-split/${user.uid}/${jobId}.pdf`);
            const metadata = { contentType: "application/pdf" };
            const uploadTask = uploadBytesResumable(storageRef, arrayBuffer, metadata);
            
            await new Promise((resolve, reject) => {
               uploadTask.on('state_changed', null, (error) => reject(error), () => resolve(true));
            });

            setFeedingStatus("Extracting Document AI (This might take a minute)...");
            extractedText = await new Promise<string>((resolve, reject) => {
               const unsubscribe = onSnapshot(doc(db, 'pdf_jobs', jobId), (docSnap) => {
                  if (docSnap.exists()) {
                     const jobData = docSnap.data();
                     if (jobData.status === 'COMPLETE') {
                        unsubscribe();
                        const combined = jobData.chunks ? Object.values(jobData.chunks).join("\n\n---\n\n") : jobData.text;
                        resolve(combined || "AI Extraction complete but no text generated.");
                     } else if (jobData.status === 'FAILED') {
                        unsubscribe();
                        reject(new Error(jobData.error || "Failed to parse PDF"));
                     }
                  }
               });
            });
          }
        } catch (extractErr) {
          console.warn("AI Extraction failed, saving physical file only", extractErr);
          extractedText = "AI Extraction Offline: Local Byte payload deployed safely.";
        }

        // Upload Physical Blob
        setFeedingStatus("Pushing Bytes to Vault Storage...");
        secureUrl = await uploadNoteStorage(activeFile.uri, user.uid, activeFile.name);
      }

      setFeedingStatus("Synchronizing Cloud Matrices...");
      const processedTags = hashtags.split(",").map((t) => t.trim()).filter(Boolean);

      const categoryType = CORE_SUBJECTS.includes(selectedSubject)
        ? "core"
        : OPTIONAL_SUBJECTS.includes(selectedSubject)
          ? "optional"
          : "other";

      await saveCloudNote({
        userId: user.uid,
        title: pageTitle,
        subject: selectedSubject,
        categoryType,
        type: activeFile.isManualText ? "text" : "file",
        content: extractedText,
        fileUrl: secureUrl || undefined,
        tags: processedTags,
        fileSizeBytes: activeFile.size,
        isStaged: true,
      });

      setFeedSuccess(true);
      setStagedFiles((prev) => prev.filter((f) => f.name !== activeFile.name));

      setTimeout(() => {
        setActiveFile(null);
        setIsFeeding(false);
      }, 2000);
    } catch (err: any) {
      Alert.alert("Feeding Failed", err.message);
      setIsFeeding(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Raw Notes <Text style={{ color: "#F97316" }}>Staging</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>
          Drop PDFs, Docs, or Images here to feed them directly into your assigned Cloud database using explicit dynamic hashtags and structural folders.
        </Text>

        <View style={styles.uploadBox}>
          <View style={styles.uploadIconWrap}>
            <Feather name="upload-cloud" size={32} color="#8B5A2B" />
          </View>
          <Text style={styles.uploadTitle}>Stage Resources to Matrix</Text>
          <Text style={styles.uploadSubtitle}>Secure universal vault. Drag any resource or create text notes manually below.</Text>

          <View style={styles.uploadBtnRow}>
            <TouchableOpacity style={styles.browseBtn} onPress={pickDocument}>
              <Feather name="file" size={16} color="#2A2A2A" />
              <Text style={styles.browseBtnText}>Browse Files</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.browseBtn} onPress={pickImage}>
              <Feather name="image" size={16} color="#2A2A2A" />
              <Text style={styles.browseBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.textNoteBtn} onPress={() => setIsTextNoteModalOpen(true)}>
            <Feather name="edit-3" size={16} color="#fff" />
            <Text style={styles.textNoteBtnText}>Create Text Note</Text>
          </TouchableOpacity>
        </View>

        {stagedFiles.length > 0 && (
          <View style={styles.stagedSection}>
            <View style={styles.stagedHeader}>
              <View style={styles.stagedTitleRow}>
                <Feather name="folder-plus" size={18} color="#F97316" />
                <Text style={styles.stagedTitle}>Staged Nodes ({stagedFiles.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setStagedFiles([])}>
                <Text style={styles.clearAllText}>CLEAR ALL</Text>
              </TouchableOpacity>
            </View>

            {stagedFiles.map((file, idx) => {
              const isImage = file.mimeType.startsWith("image/");
              return (
                <View key={idx} style={styles.fileCard}>
                  <View style={styles.fileCardTop}>
                    <View style={styles.fileInfoRow}>
                      <View style={[styles.fileIconBox, isImage ? { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" } : { backgroundColor: "#FDF4ED", borderColor: "rgba(249,115,22,0.2)" }]}>
                        <Feather name={isImage ? "image" : "file-text"} size={20} color={isImage ? "#6366F1" : "#F97316"} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                        <Text style={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}>
                      <Feather name="x" size={20} color="#A89F91" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.feedBtn} onPress={() => openIntegrationModal(file)}>
                    <Text style={styles.feedBtnText}>Feed To Cloud Target</Text>
                    <Feather name="book-open" size={16} color="#2E4A35" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Manual Note Modal */}
      {isTextNoteModalOpen && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalWrap}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Feather name="pen-tool" size={20} color="#F97316" />
                <Text style={styles.modalTitleText}>Create Manual Note</Text>
              </View>
              <TouchableOpacity onPress={() => setIsTextNoteModalOpen(false)}>
                <Feather name="x" size={24} color="#A89F91" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>NOTE TITLE</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Personal Summary on Polity"
                value={newTextNoteTitle}
                onChangeText={setNewTextNoteTitle}
                placeholderTextColor="#A89F91"
              />
              <Text style={styles.inputLabel}>CONTENT MATRIX</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Type your notes here..."
                value={newTextNoteContent}
                onChangeText={setNewTextNoteContent}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#A89F91"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsTextNoteModalOpen(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#F97316" }]} onPress={createManualTextNote}>
                  <Text style={styles.actionBtnText}>Add to Staging Array</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Feed Integration Modal */}
      {activeFile && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalWrap}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitleText}>Configure Cloud Node Metadata</Text>
              <TouchableOpacity onPress={() => !isFeeding && setActiveFile(null)}>
                <Feather name="x" size={24} color="#A89F91" />
              </TouchableOpacity>
            </View>
            {!feedSuccess ? (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.activeFileBadge}>
                  <Feather name="file" size={16} color="#F97316" />
                  <Text style={styles.activeFileName} numberOfLines={1}>{activeFile.name}</Text>
                </View>

                <Text style={styles.inputLabel}>IDENTIFIER MAP</Text>
                <TextInput
                  style={styles.textInput}
                  value={pageTitle}
                  onChangeText={setPageTitle}
                  placeholderTextColor="#A89F91"
                />

                <Text style={styles.inputLabel}>HASHTAG VECTORS (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  value={hashtags}
                  onChangeText={setHashtags}
                  placeholder="#UPSC, #History, #Exam..."
                  placeholderTextColor="#A89F91"
                />
                <Text style={styles.helperText}>Tracking tags strictly separated by commas.</Text>

                {/* React Native doesn't have a native 'select' element without third party libraries like RNPickerSelect, so we'll render a simple list or map it. */}
                <Text style={styles.inputLabel}>SUBJECT FOLDER PIPELINE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
                  {CORE_SUBJECTS.map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.subjectPill, selectedSubject === sub && styles.subjectPillActive]}
                      onPress={() => setSelectedSubject(sub)}
                    >
                      <Text style={[styles.subjectPillText, selectedSubject === sub && styles.subjectPillTextActive]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                  {OPTIONAL_SUBJECTS.map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.subjectPill, selectedSubject === sub && styles.subjectPillActive, { borderColor: "#6366F1" }]}
                      onPress={() => setSelectedSubject(sub)}
                    >
                      <Text style={[styles.subjectPillText, selectedSubject === sub && { color: "#fff" }]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={[styles.modalActions, { marginTop: 20 }]}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setActiveFile(null)} disabled={isFeeding}>
                    <Text style={styles.cancelBtnText}>Abort Sequence</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#F97316", opacity: isFeeding ? 0.7 : 1 }]}
                    onPress={finalizeFeed}
                    disabled={isFeeding || !pageTitle.trim()}
                  >
                    {isFeeding ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ActivityIndicator color="#fff" size="small" />
                        <Text style={styles.actionBtnText}>{feedingStatus}</Text>
                      </View>
                    ) : (
                      <Text style={styles.actionBtnText}>Initialize Cloud Feeding</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.successBox}>
                <View style={styles.successIconBox}>
                  <Feather name="check-circle" size={32} color="#2E4A35" />
                </View>
                <Text style={styles.successTitle}>Nodes Feed Successfully!</Text>
                <Text style={styles.successSubtitle}>Target explicitly secured in Cloud Arrays.</Text>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFCFB" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_900Black", color: "#2A2A2A" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  subtitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(139,90,43,0.8)", marginBottom: 24, lineHeight: 20 },
  uploadBox: {
    backgroundColor: "rgba(243,239,233,0.4)",
    borderWidth: 2,
    borderColor: "#D1C8B8",
    borderStyle: "dashed",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginBottom: 32,
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E0D8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  uploadTitle: { fontSize: 18, fontFamily: "Inter_900Black", color: "#2A2A2A", marginBottom: 8 },
  uploadSubtitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#8B5A2B", textAlign: "center", marginBottom: 24 },
  uploadBtnRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1C8B8",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#2A2A2A" },
  textNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F97316",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  textNoteBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  stagedSection: { gap: 16 },
  stagedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E5E0D8", paddingBottom: 12 },
  stagedTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stagedTitle: { fontSize: 18, fontFamily: "Inter_900Black", color: "#2A2A2A" },
  clearAllText: { fontSize: 11, fontFamily: "Inter_800ExtraBold", color: "#A89F91" },
  fileCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E0D8",
    borderRadius: 16,
    padding: 16,
  },
  fileCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  fileInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1, paddingRight: 16 },
  fileIconBox: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fileName: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#2A2A2A" },
  fileSize: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(139,90,43,0.6)", marginTop: 4 },
  feedBtn: {
    backgroundColor: "#EEF9F0",
    borderWidth: 1,
    borderColor: "#D1E8D5",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  feedBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#2E4A35" },
  modalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 100,
  },
  modalWrap: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "100%",
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E0D8",
    backgroundColor: "#FDFCFB",
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitleText: { fontSize: 18, fontFamily: "Inter_900Black", color: "#2A2A2A" },
  modalBody: { padding: 24 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_900Black", color: "#8B5A2B", marginBottom: 8, marginTop: 16, letterSpacing: 1 },
  textInput: {
    backgroundColor: "#F3EFE9",
    borderWidth: 1,
    borderColor: "#E5E0D8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#2A2A2A",
  },
  textArea: { minHeight: 120, maxHeight: 250, fontFamily: "Inter_500Medium" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, backgroundColor: "#F3EFE9", paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#A89F91" },
  actionBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, alignItems: "center" },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  activeFileBadge: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FDF4ED", borderWidth: 1, borderColor: "rgba(249,115,22,0.2)", borderRadius: 12, padding: 16, marginBottom: 8 },
  activeFileName: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#8B5A2B", flex: 1 },
  helperText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#A89F91", marginTop: 6 },
  subjectScroll: { flexDirection: "row", marginTop: 8 },
  subjectPill: {
    borderWidth: 1,
    borderColor: "#E5E0D8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: "#FDFCFB",
  },
  subjectPillActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  subjectPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#2A2A2A" },
  subjectPillTextActive: { color: "#fff" },
  successBox: { padding: 48, alignItems: "center", justifyContent: "center" },
  successIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF9F0", borderWidth: 4, borderColor: "#D1E8D5", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  successTitle: { fontSize: 24, fontFamily: "Inter_900Black", color: "#2E4A35", marginBottom: 8, textAlign: "center" },
  successSubtitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#4E7658", textAlign: "center" },
});
