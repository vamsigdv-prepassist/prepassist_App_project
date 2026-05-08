import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Card,
  EmptyState,
  GradientButton,
  Pill,
  ScreenHeader,
} from "@/components/ui";
import { SUBJECT_PALETTE, useApp, type VaultDocument } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { extractPdfChunks } from "@/lib/ai";

const SUBJECT_OPTIONS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Ethics",
  "Other",
];

type PickedFile = {
  name: string;
  base64: string;
  size: number;
};

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { documents, addDocument, removeDocument } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]!);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [indexing, setIndexing] = useState(false);

  const resetForm = () => {
    setTitle("");
    setSubject(SUBJECT_OPTIONS[0]!);
    setPicked(null);
    setIndexing(false);
  };

  const closeModal = () => {
    if (indexing) return;
    setModalOpen(false);
    resetForm();
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      let base64 = "";
      if (Platform.OS === "web") {
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        base64 = await blobToBase64(blob);
      } else {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      setPicked({
        name: asset.name ?? "document.pdf",
        base64,
        size: asset.size ?? 0,
      });
      if (!title.trim()) {
        const cleanName = (asset.name ?? "Document").replace(/\.pdf$/i, "");
        setTitle(cleanName);
      }
      if (Platform.OS !== "web")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      Alert.alert("Couldn't open file", "Please try a different PDF.");
    }
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a document title.");
      return;
    }
    if (!picked) {
      Alert.alert(
        "PDF required",
        "Tap 'Choose PDF' to upload a syllabus or notes file.",
      );
      return;
    }
    setIndexing(true);
    try {
      const { pages, chunks, truncated, chunkCount } = await extractPdfChunks(
        picked.base64,
      );
      const colorIdx = Math.floor(Math.random() * SUBJECT_PALETTE.length);
      addDocument({
        title: title.trim(),
        subject,
        pages: pages || 0,
        color: SUBJECT_PALETTE[colorIdx]!,
        chunks,
        sourceFile: picked.name,
        truncated,
        chunkCount: chunkCount || chunks.length,
      });
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
      resetForm();
    } catch (e) {
      Alert.alert(
        "Indexing failed",
        "We couldn't read text from that PDF. It may be a scanned image — try a text-based PDF.",
      );
    } finally {
      setIndexing(false);
    }
  };

  const handleDelete = (doc: VaultDocument) => {
    Alert.alert(
      "Remove document?",
      `"${doc.title}" and its chat history will be permanently removed from your vault.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeDocument(doc.id),
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + (isWeb ? 67 : 8),
        }}
      >
        <ScreenHeader
          title="Vault"
          subtitle="RAG-indexed PDFs you can speak to"
          right={
            <Pressable
              onPress={() => setModalOpen(true)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.headerBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="plus" size={20} color="#fff" />
            </Pressable>
          }
        />
      </View>

      <FlatList
        data={documents}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + (isWeb ? 110 : 100),
          gap: 10,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          documents.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Pill
                label={`${documents.length} indexed`}
                icon="database"
                color={colors.primary}
                background={colors.primary + "12"}
              />
              <Pill
                label={`${documents.reduce((s, d) => s + d.pages, 0)} pages`}
                icon="layers"
                color={colors.accent}
                background={colors.accent + "12"}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState
              icon="archive"
              title="Your vault is empty"
              subtitle="Upload syllabus PDFs or notes to start chatting with your study material."
              cta="Add document"
              onCtaPress={() => setModalOpen(true)}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => handleDelete(item)}
            onPress={() => router.push(`/vault-chat/${item.id}` as never)}
            style={({ pressed }) => ({
              transform: pressed ? [{ scale: 0.99 }] : [],
            })}
          >
            <Card>
              <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                <View
                  style={[
                    styles.docIcon,
                    { backgroundColor: item.color + "18" },
                  ]}
                >
                  <Feather name="file-text" size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 15,
                      letterSpacing: -0.2,
                    }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      marginTop: 4,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <Text
                      style={{
                        color: item.color,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                      }}
                    >
                      {item.subject}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                      }}
                    >
                      · {item.pages} pages
                    </Text>
                    {item.chunks && item.chunks.length > 0 ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Feather
                          name="zap"
                          size={11}
                          color={colors.primary}
                        />
                        <Text
                          style={{
                            color: colors.primary,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 11,
                          }}
                        >
                          {item.chunkCount ?? item.chunks.length} chunks
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Feather
                  name="message-circle"
                  size={18}
                  color={colors.mutedForeground}
                />
              </View>
            </Card>
          </Pressable>
        )}
      />

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ marginBottom: 18 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_800ExtraBold",
                  fontSize: 22,
                  letterSpacing: -0.5,
                }}
              >
                New document
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                We'll extract the text and index it into your vault.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              PDF FILE
            </Text>
            <Pressable
              onPress={indexing ? undefined : pickPdf}
              style={({ pressed }) => [
                styles.fileBox,
                {
                  borderColor: picked ? colors.primary : colors.border,
                  backgroundColor: picked
                    ? colors.primary + "0F"
                    : colors.background,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: picked
                    ? colors.primary + "20"
                    : colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather
                  name={picked ? "file-text" : "upload-cloud"}
                  size={20}
                  color={picked ? colors.primary : colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  {picked ? picked.name : "Choose PDF"}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  {picked
                    ? `${formatSize(picked.size)} · tap to replace`
                    : "PDF up to ~15 MB"}
                </Text>
              </View>
            </Pressable>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              TITLE
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              editable={!indexing}
              placeholder="e.g., Indian Polity — Laxmikanth"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.foreground,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              SUBJECT
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {SUBJECT_OPTIONS.map((s) => {
                const active = subject === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => !indexing && setSubject(s)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: active
                        ? colors.primary
                        : colors.secondary,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : colors.secondaryForeground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                      }}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={closeModal}
                style={{ flex: 1 }}
              />
              <View style={{ flex: 1 }}>
                {indexing ? (
                  <View
                    style={{
                      height: 50,
                      borderRadius: 999,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 10,
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: "Inter_700Bold",
                        fontSize: 14,
                      }}
                    >
                      Indexing…
                    </Text>
                  </View>
                ) : (
                  <GradientButton
                    label="Index document"
                    icon="upload-cloud"
                    onPress={handleAdd}
                  />
                )}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function formatSize(bytes: number) {
  if (!bytes) return "PDF";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const idx = result.indexOf("base64,");
        resolve(idx >= 0 ? result.slice(idx + 7) : result);
      } else {
        reject(new Error("FileReader did not return a string"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,43,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    marginBottom: 16,
  },
  fileBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
});
